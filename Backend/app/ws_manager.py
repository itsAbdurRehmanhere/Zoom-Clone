from dataclasses import dataclass

from fastapi import WebSocket


@dataclass
class Peer:
    peer_id: str
    key: str
    user_id: int | None
    name: str
    is_host: bool
    ws: WebSocket

    def public(self) -> dict:
        return {
            "peer_id": self.peer_id,
            "user_id": self.user_id,
            "key": self.key,
            "name": self.name,
            "is_host": self.is_host,
        }


class ConnectionManager:
    def __init__(self):
        self.rooms: dict[str, dict[str, Peer]] = {}
        self.settings: dict[str, dict] = {}
        self.kicked: dict[str, set[str]] = {}

    def members(self, code: str) -> list[Peer]:
        return list(self.rooms.get(code, {}).values())

    def add(self, code: str, peer: Peer) -> None:
        self.rooms.setdefault(code, {})[peer.peer_id] = peer

    def remove(self, code: str, peer_id: str) -> None:
        room = self.rooms.get(code)
        if not room:
            return
        room.pop(peer_id, None)
        if not room:
            del self.rooms[code]
            self.settings.pop(code, None)

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

    async def send_private(self, code: str, sender_key: str, message: dict) -> None:
        """Deliver to the sender and to any host."""
        for peer in self.members(code):
            if peer.is_host or peer.key == sender_key:
                try:
                    await peer.ws.send_json(message)
                except Exception:
                    pass

    def is_kicked(self, code: str, key: str) -> bool:
        return key in self.kicked.get(code, set())

    async def kick(self, code: str, peer_id: str) -> bool:
        peer = self.rooms.get(code, {}).get(peer_id)
        if not peer or peer.is_host:
            return False
        self.kicked.setdefault(code, set()).add(peer.key)
        try:
            await peer.ws.send_json({"type": "kicked"})
            await peer.ws.close(code=4405)
        except Exception:
            pass
        return True

# from dataclasses import dataclass
# from fastapi import WebSocket

# @dataclass
# class Peer:
#     peer_id: str
#     user_id: int
#     name: str
#     ws: WebSocket
    
#     def public(self) ->dict:
#         return{"peer_id": self.peer_id, "user_id": self.user_id, "name": self.name}
    
# class ConnectionManager:
#     def __init__(self):
#         self.rooms: dict[str, dict[str, Peer]] ={}
        
#     def members(self, code: str) ->list[Peer]:
#         return list(self.rooms.get(code, {}).values())
    
#     def add(self, code: str, peer:Peer) -> None:
#         self.rooms.setdefault(code, {})[peer.peer_id] = peer
        
#     def remove(self, code:str, peer_id:str) -> None:
#         room = self.rooms.get(code)
#         if not room:
#             return
#         room.pop(peer_id, None)
#         if not room:
#             del self.rooms[code]
            
#     async def send(self, code: str, peer_id: str, message: dict) -> None:
#         peer = self.rooms.get(code, {}).get(peer_id)
#         if peer:
#             await peer.ws.send_json(message)
            
#     async def broadcast(self, code: str, message: dict, exclude: str | None = None) -> None:
#         for peer in self.members(code):
#             if peer.peer_id == exclude:
#                 continue
#             try:
#                 await peer.ws.send_json(message)
#             except Exception:
#                 pass
#     async def send_to_users(self, code: str, user_ids: set[int], message: dict) -> None:
#         for peer in self.members(code):
#             if peer.user_id in user_ids:
#                 try:
#                     await peer.ws.send_json(message)
#                 except Exception:
#                     pass