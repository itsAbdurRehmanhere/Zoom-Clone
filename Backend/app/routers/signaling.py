import asyncio
import hashlib
import re
import uuid

import jwt
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from sqlalchemy import or_, select

from ..database import SessionLocal
from ..models import Message, Room, User
from ..security import decode_access_token
from ..ws_manager import ConnectionManager, Peer
from .ice import fetch_ice_servers

router = APIRouter()
manager = ConnectionManager()

MAX_PEERS = 6
MAX_WAITING = 20
RELAY_TYPES = {"offer", "answer", "ice"}
MAX_CHAT_LENGTH = 2000
HISTORY_LIMIT = 50
SETTING_KEYS = ("locked", "chat_enabled", "audience_mic", "audience_cam")
GUEST_ID_RE = re.compile(r"^[A-Za-z0-9-]{8,64}$")


def load_room(code: str) -> dict | None:
    with SessionLocal() as db:
        room = db.scalar(select(Room).where(Room.code == code))
        if not room:
            return None
        return {
            "id": room.id,
            "host_id": room.host_id,
            "settings": {k: getattr(room, k) for k in SETTING_KEYS},
        }


def load_user(token: str) -> dict | None:
    try:
        user_id = int(decode_access_token(token)["sub"])
    except (jwt.PyJWTError, KeyError, ValueError):
        return None
    with SessionLocal() as db:
        user = db.get(User, user_id)
        if not user:
            return None
        return {"id": user.id, "name": user.name}


def guest_key(raw: str) -> str:
    return "g:" + hashlib.sha256(raw.encode()).hexdigest()[:16]


def message_to_dict(m: Message) -> dict:
    return {
        "type": "chat",
        "id": m.id,
        "user_id": m.user_id,
        "sender": m.sender_key,
        "name": m.sender_name,
        "text": m.text,
        "private": m.private_to_host,
        "created_at": m.created_at.isoformat(),
    }


# def load_history(room_id: int, key: str, is_host: bool) -> list[dict]:
#     with SessionLocal() as db:
#         stmt = select(Message).where(Message.room_id == room_id)
#         if not is_host:
#             stmt = stmt.where(
#                 or_(Message.private_to_host.is_(False), Message.sender_key == key)
#             )
#         stmt = stmt.order_by(Message.id.desc()).limit(HISTORY_LIMIT)
#         return [message_to_dict(m) for m in reversed(db.scalars(stmt).all())]
    
    
def load_history(room_id: int, key: str, is_host: bool, since) -> list[dict]:
    with SessionLocal() as db:
        stmt = select(Message).where(
            Message.room_id == room_id, Message.created_at >= since
        )
        if not is_host:
            stmt = stmt.where(
                or_(Message.private_to_host.is_(False), Message.sender_key == key)
            )
        stmt = stmt.order_by(Message.id.desc()).limit(HISTORY_LIMIT)
        return [message_to_dict(m) for m in reversed(db.scalars(stmt).all())]


def save_message(
    room_id: int, user_id: int | None, key: str, name: str, text: str, private: bool
) -> dict:
    with SessionLocal() as db:
        m = Message(
            room_id=room_id,
            user_id=user_id,
            sender_key=key,
            sender_name=name,
            text=text,
            private_to_host=private,
        )
        db.add(m)
        db.commit()
        db.refresh(m)
        return message_to_dict(m)


def save_settings(room_id: int, changes: dict) -> None:
    with SessionLocal() as db:
        room = db.get(Room, room_id)
        if not room:
            return
        for k, v in changes.items():
            setattr(room, k, v)
        db.commit()


async def push_waiting(code: str) -> None:
    """Tell the host(s) who is waiting right now."""
    await manager.send_hosts(
        code, {"type": "waiting_list", "waiting": manager.waiting_public(code)}
    )


async def admit(code: str, peer: Peer, settings: dict) -> None:
    """Put a peer into the room and send it the `joined` message."""
    settings = manager.settings.setdefault(code, settings)
    existing = [p.public() for p in manager.members(code)]
    manager.add(code, peer)

    since = manager.sessions[code]
    history, ice_servers = await asyncio.gather(
        asyncio.to_thread(load_history, peer.room_id, peer.key, peer.is_host, since),
        asyncio.to_thread(fetch_ice_servers),
    )
    await peer.ws.send_json(
        {
            "type": "joined",
            "peer_id": peer.peer_id,
            "you": {"key": peer.key, "is_host": peer.is_host},
            "peers": existing,
            "messages": history,
            "settings": settings,
            "ice_servers": ice_servers,
        }
    )
    await manager.broadcast(
        code, {"type": "peer_joined", "peer": peer.public()}, exclude=peer.peer_id
    )
    if peer.is_host:
        await push_waiting(code)


async def refuse(peer: Peer, close_code: int) -> None:
    try:
        if close_code == 4407:
            await peer.ws.send_json({"type": "denied"})
        await peer.ws.close(code=close_code)
    except Exception:
        pass


async def let_in(code: str, peer: Peer, settings: dict) -> None:
    """Used when the host admits someone. Never lets an error reach the host's socket."""
    if len(manager.members(code)) >= MAX_PEERS:
        await refuse(peer, 4403)
        return
    try:
        await admit(code, peer, settings)
    except Exception:
        manager.remove(code, peer.peer_id)


@router.websocket("/ws/room/{code}")
async def room_socket(ws: WebSocket, code: str):
    await ws.accept()
    peer = None
    try:
        try:
            first = await asyncio.wait_for(ws.receive_json(), timeout=10)
        except asyncio.TimeoutError:
            await ws.close(code=4408)
            return

        if first.get("type") != "join":
            await ws.close(code=4400)
            return

        room = await asyncio.to_thread(load_room, code)
        if not room:
            await ws.close(code=4404)
            return

        # a token means "logged in"; an invalid token is an error, not a silent guest
        token = first.get("token")
        user = None
        if token:
            user = await asyncio.to_thread(load_user, token)
            if not user:
                await ws.close(code=4401)
                return

        if user:
            key = f"u:{user['id']}"
            user_id = user["id"]
            is_host = user["id"] == room["host_id"]
            default_name = user["name"]
        else:
            raw = str(first.get("guest_id") or "")
            if not GUEST_ID_RE.match(raw):
                raw = uuid.uuid4().hex
            key = guest_key(raw)
            user_id = None
            is_host = False
            default_name = "Guest"

        if manager.is_kicked(code, key):
            await ws.close(code=4405)
            return

        name = (first.get("name") or "").strip()[:50] or default_name
        peer = Peer(
            peer_id=uuid.uuid4().hex,
            key=key,
            user_id=user_id,
            name=name,
            is_host=is_host,
            room_id=room["id"],
            ws=ws,
        )

        settings = manager.settings.get(code) or room["settings"]
        if settings["locked"] and not is_host:
            if len(manager.waiting.get(code, {})) >= MAX_WAITING:
                await ws.close(code=4403)
                return
            manager.add_waiting(code, peer)
            await ws.send_json({"type": "waiting"})
            await push_waiting(code)
        else:
            if len(manager.members(code)) >= MAX_PEERS:
                await ws.close(code=4403)
                return
            await admit(code, peer, settings)

        while True:
            msg = await ws.receive_json()
            if not manager.is_member(code, peer.peer_id):
                continue  # still waiting: ignore everything they send

            settings = manager.settings.get(code, settings)
            mtype = msg.get("type")

            if mtype in RELAY_TYPES:
                await manager.send(code, msg.get("to", ""), {**msg, "from": peer.peer_id})

            elif mtype == "state":
                allow_mic = peer.is_host or settings["audience_mic"]
                allow_cam = peer.is_host or settings["audience_cam"]
                await manager.broadcast(
                    code,
                    {
                        "type": "peer_state",
                        "peer_id": peer.peer_id,
                        "micOn": bool(msg.get("micOn", True)) and allow_mic,
                        "camOn": bool(msg.get("camOn", True)) and allow_cam,
                    },
                    exclude=peer.peer_id,
                )

            elif mtype == "chat":
                if not peer.is_host and not settings["chat_enabled"]:
                    await ws.send_json({"type": "error", "reason": "chat_disabled"})
                    continue
                text = str(msg.get("text", "")).strip()[:MAX_CHAT_LENGTH]
                if not text:
                    continue
                private = bool(msg.get("private")) and not peer.is_host
                saved = await asyncio.to_thread(
                    save_message, room["id"], user_id, key, peer.name, text, private
                )
                if private:
                    await manager.send_private(code, key, saved)
                else:
                    await manager.broadcast(code, saved)

            elif mtype == "host" and peer.is_host:
                action = msg.get("action")
                if action == "kick":
                    await manager.kick(code, str(msg.get("peer_id", "")))

                elif action == "settings":
                    changes = {k: bool(msg[k]) for k in SETTING_KEYS if k in msg}
                    if changes:
                        settings.update(changes)
                        await asyncio.to_thread(save_settings, room["id"], changes)
                        await manager.broadcast(
                            code, {"type": "room_settings", "settings": settings}
                        )
                        # turning the waiting room off lets everyone waiting in
                        if changes.get("locked") is False:
                            for w in manager.waiting_peers(code):
                                manager.pop_waiting(code, w.peer_id)
                                await let_in(code, w, settings)
                            await push_waiting(code)

                elif action in ("admit", "deny"):
                    target = manager.pop_waiting(code, str(msg.get("peer_id", "")))
                    if target:
                        if action == "admit":
                            await let_in(code, target, settings)
                        else:
                            await refuse(target, 4407)
                        await push_waiting(code)
    except (WebSocketDisconnect, RuntimeError):
        pass
    finally:
        if peer:
            was_member = manager.is_member(code, peer.peer_id)
            manager.remove(code, peer.peer_id)
            manager.pop_waiting(code, peer.peer_id)
            if was_member:
                await manager.broadcast(code, {"type": "peer_left", "peer_id": peer.peer_id})
            else:
                await push_waiting(code)