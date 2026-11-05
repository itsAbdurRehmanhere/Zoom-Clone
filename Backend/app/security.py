from datetime import datetime, timezone, timedelta
import jwt
from pwdlib import PasswordHash
from .config import settings

_hasher = PasswordHash.recommended()

def hash_password(password:str) -> str:
    return _hasher.hash(password)

def verify_password(password:str, hashed:str) -> str:
    return _hasher.verify(password, hashed)

def create_access_token(user_id:int) ->str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    payload = {"sub": str(user_id), "exp": expire}
    return jwt.encode(payload, settings.secret_key, algorithm = settings.algorithm)

def decode_access_token(token:str) ->dict:
    return jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])