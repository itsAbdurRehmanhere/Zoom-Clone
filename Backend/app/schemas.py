from pydantic import BaseModel, EmailStr, Field, ConfigDict

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