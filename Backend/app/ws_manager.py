from dataclasses import dataclass
from fastapi import WebSocket

@dataclass
class Peer:
    peer_id: str
    user_id: int
    name: str
    ws: WebSocket
    
    def public(self) ->dict:
        return{"peer_id": self.peer_id, "user_id": self.user_id, "name": self.name}
    
class ConnectionManager:
    def __init__(self):
        self.rooms: dict[str, dict[str, Peer]] ={}
        
    def members(self, code: str) ->list[Peer]:
        return list(self.rooms.get(code, {}).values())
    
    def add(self, code: str, peer:Peer) -> None:
        self.rooms.setdefault(code, {})[peer.peer_id] = peer
        
    def remove(self, code:str, peer_id:str) -> None:
        room = self.rooms.get(code)
        if not room:
            return
        room.pop(peer_id, None)
        if not room:
            del self.rooms[code]
            
    async def send(self, code: str, peer_id: str, message: dict) -> None:
        peer = self.rooms.get(code, {}).get(peer_id)
        if peer:
            await peer.ws.send_json(message)
            
    async def broadcast(self, code: str, message: dict, exclude: str | None = None) -> None:
        for peer in self.members(code):
            if peer.peer_id == exclude:
                continue
            try:
                await peer.ws.send_json(message)
            except Exception:
                pass