from pydantic import BaseModel, EmailStr, Field, ConfigDict
from datetime import datetime

class SignupIn(BaseModel):
    name:str = Field(min_length=1, max_length=100)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    
class LogIn(BaseModel):
    email: EmailStr
    password: str

class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    email: EmailStr
    
class AuthOut(BaseModel):
    access_token: str
    user: UserOut
    
    
class RoomCreate(BaseModel):
    title: str = Field(default="Untitled meeting", min_length=1, max_length=100)
    scheduled_at: datetime | None= None
    
class RoomOut(BaseModel):
    model_config =ConfigDict(from_attributes=True)
    
    id: int
    code: str
    title: str
    host_id: int
    scheduled_at: datetime | None
    created_at: datetime
    locked: bool
    chat_enabled: bool
    audience_mic: bool
    audience_cam: bool
    
    
class RoomPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    code: str
    title: str
    locked: bool