from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session
from ..database import get_db
from ..deps import get_current_user
from ..models import User
from ..schemas import AuthOut, LogIn, SignupIn, UserOut
from ..security import create_access_token, hash_password, verify_password

router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/signup", response_model=AuthOut, status_code=status.HTTP_201_CREATED)
def signup(data: SignupIn, db:Session = Depends(get_db)):
    email = data.email.lower()
    if db.scalar(select(User).where(User.email == email)):
        raise HTTPException(status.HTTP_409_CONFLICT, "Email already registered")
    
    user = User(name= data.name, email = data.email, password_hashed = hash_password(data.password))
    db.add(user)
    db.commit()
    db.refresh(user)
    return {"access_token": create_access_token(user.id), "user": user}


@router.post("/login", response_model=AuthOut)
def login(data:LogIn, db:Session = Depends(get_db)):
    user = db.scalar(select(User).where(User.email == data.email.lower()))
    if not user or not verify_password(data.password, user.password_hashed):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid email or Password")
    return{"access_token": create_access_token(user.id), "user": user}

@router.get("/me", response_model=UserOut)
def me(user:User = Depends(get_current_user)):
    return user