import asyncio
import uuid
import jwt
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from sqlalchemy import select, or_
from ..database import SessionLocal
from ..models import Room, User, Message
from ..security import decode_access_token
from ..ws_manager import ConnectionManager, Peer


router = APIRouter()
manager = ConnectionManager()

MAX_PEERS = 6
RELAY_TYPES = {"offer", "answer", "ice"}
MAX_CHAT_LENGTH = 2000
HISTORY_LIMIT = 50


def authenticate(token:str, code:str):
    """Return (user_dict, None) or (None, close_code). Uses a short-lived DB session."""
    with SessionLocal() as db:
        try:
            user_id = int(decode_access_token(token)["sub"])
        except (jwt.PyJWTError, KeyError, ValueError):
            return None, 4401
        user = db.get(User, user_id)
        if not user:
            return None, 4401
        
        # if not db.scalar(select(Room.id).where(Room.code == code)):
        #     return None, 4404
        # return {"id": user_id, "name": user.name}, None
        
        room = db.scalar(select(Room).where(Room.code == code))
        if not room:
            return None, 4404
        return {"id": user_id, "name": user.name, "room_id": room.id, "host_id":room.host_id}, None
    
def message_to_dict(m: Message) -> dict:
    return{
        "type": "chat",
        "id" : m.id,
        "user_id": m.user_id,
        "name" : m.sender_name,
        "text" : m.text,
        "private" : m.private_to_host,
        "created_at" : m.created_at.isoformat(),
    }
    
# def load_history(room_id: int) -> list[dict]:
    # with SessionLocal() as db:
    #     stmt = (
    #         select(Message)
    #         .where(Message.room_id == room_id)
    #         # .order_by(Message.id.desc())
    #         # .limit(HISTORY_LIMIT)
    #     )
    #     if user_id != host_id:
    #         stmt = stmt.order_by(Me)
    #     return [message_to_dict(m) for m in reversed(db.scalars(stmt).all())]
 
def load_history(room_id: int, user_id: int, host_id: int) -> list[dict]:
    with SessionLocal() as db:
        stmt = select(Message).where(Message.room_id == room_id)
        if user_id != host_id:
            stmt = stmt.where(
                or_(Message.private_to_host.is_(False), Message.user_id == user_id)
            )
        stmt = stmt.order_by(Message.id.desc()).limit(HISTORY_LIMIT)
        return [message_to_dict(m) for m in reversed(db.scalars(stmt).all())]
    
# def save_message(room_id: int, user_id: int, name: str, text: str) -> dict:
#     with SessionLocal() as db:
        
#         m = Message(room_id=room_id, user_id=user_id, sender_name=name, text=text)
#         db.add(m)
#         db.commit()
#         db.refresh(m)
#         return message_to_dict(m)
    
def save_message(room_id: int, user_id: int, name: str, text: str, private: bool) -> dict:
    with SessionLocal() as db:
        m = Message(
            room_id=room_id, user_id=user_id, sender_name=name,
            text=text, private_to_host=private,
        )
        db.add(m)
        db.commit()
        db.refresh(m)
        return message_to_dict(m)

    
    

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
        # user, err = authenticate(first.get("token", ""), code)
        user, err = await asyncio.to_thread(authenticate, first.get("token", ""), code)
        if err:
            await ws.close(code=err)
            return
        if len(manager.members(code)) >= MAX_PEERS:
            await ws.close(code=4403)
            return
        
        name = (first.get("name") or "").strip()[:50] or user["name"]
        peer = Peer(peer_id=uuid.uuid4().hex, user_id= user["id"], name=name, ws=ws)
        
        existing = [p.public() for p in manager.members(code)]
        manager.add(code, peer)
        
        # await ws.send_json({"type": "joined", "peer_id": peer.peer_id, "peers": existing})
        history = await asyncio.to_thread(load_history, user["room_id"], user["id"], user["host_id"])
        await ws.send_json(
            {"type": "joined", "peer_id": peer.peer_id, "peers": existing, "messages": history}
        )
        await manager.broadcast(
            code, {"type": "peer_joined", "peer":peer.public()}, exclude=peer.peer_id
        )
        
        while True:
            msg = await ws.receive_json()
            mtype = msg.get("type")
            
            if mtype in RELAY_TYPES:
                await manager.send(code, msg.get("to", ""), {**msg, "from":peer.peer_id})
                
            elif mtype == "state":
                await manager.broadcast(
                    code,
                    {
                        "type": "peer_state",
                        "peer_id": peer.peer_id,
                        "micOn": bool(msg.get("micOn", True)),
                        "camOn": bool(msg.get("camOn", True)),
                    },
                    exclude=peer.peer_id,
                )
                
            elif mtype == "chat":
                text = str(msg.get("text", "")).strip()[:MAX_CHAT_LENGTH]
                if not text:
                    continue
                private =bool(msg.get("private")) and user["id"] != user["host_id"]
                saved = await asyncio.to_thread(
                    save_message, user["room_id"], user["id"], peer.name, text, private
                )
                if private:
                    await manager.send_to_users(code, {user["id"], user["host_id"]}, saved)
                else:
                    await manager.broadcast(code, saved)
    except WebSocketDisconnect:
        pass
    finally:
        if peer:
            manager.remove(code, peer.peer_id)
            await manager.broadcast(code, {"type": "peer_left", "peer_id": peer.peer_id})