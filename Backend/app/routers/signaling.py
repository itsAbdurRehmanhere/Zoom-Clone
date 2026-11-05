import asyncio
import uuid
import jwt
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from sqlalchemy import select
from ..database import SessionLocal
from ..models import Room, User
from ..security import decode_access_token
from ..ws_manager import ConnectionManager, Peer


router = APIRouter()
manager = ConnectionManager()

MAX_PEERS = 6
RELAY_TYPES = {"offer", "answer", "ice"}


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
        
        if not db.scalar(select(Room.id).where(Room.code == code)):
            return None, 4404
        return {"id": user_id, "name": user.name}, None
    
    

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
        user, err = authenticate(first.get("token", ""), code)
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
        
        await ws.send_json({"type": "joined", "peer_id": peer.peer_id, "peers": existing})
        await manager.broadcast(
            code, {"type": "peer_joined", "peer":peer.punlic()}, exclude=peer.peer_id
        )
        
        while True:
            msg = await ws.receive_json()
            mtype = msg.get("type")
            
            if mtype in RELAY_TYPES:
                await manager.send(code, msg.get("to", ""), {**msg, "from":peer.peer_id})
                
            elif mtypr == "state":
                await manager.broadcast(
                    code,
                    {
                        "typr": "peer_state",
                        "peer_id": peer.peer_id,
                        "micOn": bool(msg.get("micOn", True))
                        "camOn": bool(msg.get("camOn", True))
                    },
                    exclude=peer.peer_id,
                )
    except WebSocketDisconnect:
        pass
    finally:
        if peer:
            manager.remove(code, peer.peer_id)
            await manager.broadcast(code, {"type": "peer_left", "peer_id": peer.peer_id})