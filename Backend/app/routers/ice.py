import time

import httpx
from fastapi import APIRouter, Depends

from ..config import settings
from ..deps import get_current_user

router = APIRouter(prefix="/ice-servers", tags=["ice"])

FALLBACK = [{"urls": "stun:stun.l.google.com:19302"}]
_cache = {"servers": None, "expires": 0.0}


def fetch_ice_servers() -> list:
    now = time.time()
    if _cache["servers"] and now < _cache["expires"]:
        return _cache["servers"]

    if not settings.metered_domain or not settings.metered_turn_api_key:
        return FALLBACK

    try:
        r = httpx.get(
            f"https://{settings.metered_domain}/api/v1/turn/credentials",
            params={"apiKey": settings.metered_turn_api_key},
            timeout=5,
        )
        r.raise_for_status()
        servers = r.json()
    except Exception:
        return FALLBACK

    _cache["servers"] = servers
    _cache["expires"] = now + 3600
    return servers


@router.get("")
def get_ice_servers(user=Depends(get_current_user)):
    return fetch_ice_servers()

# import time

# import httpx
# from fastapi import APIRouter, Depends

# from ..config import settings
# from ..deps import get_current_user

# router = APIRouter(prefix="/ice-servers", tags=["ice"])

# FALLBACK = [{"urls": "stun:stun.l.google.com:19302"}]
# _cache = {"servers": None, "expires": 0.0}


# @router.get("")
# def get_ice_servers(user=Depends(get_current_user)):
#     now = time.time()
#     if _cache["servers"] and now < _cache["expires"]:
#         return _cache["servers"]
    
#     if not settings.metered_domain or not settings.metered_turn_api_key:
#         return FALLBACK
    
#     try:
#         r = httpx.get(
#             f"https://{settings.metered_domain}/api/v1/turn/credentials",
#             params={"apiKey": settings.metered_turn_api_key},
#             timeout=5,
#         )
#         r.raise_for_status()
#         servers = r.json()
#     except Exception:
#         return FALLBACK

#     _cache["servers"] = servers
#     _cache["expires"] = now + 3600
#     return servers