import secrets
import string
from fastapi import APIRouter, HTTPException, Depends, status
from sqlalchemy import select
from sqlalchemy.orm import Session
from ..database import get_db
from ..deps import get_current_user
from ..models import Room, User
from ..schemas import RoomCreate, RoomOut, RoomPublic

router = APIRouter(prefix="/rooms", tags=["rooms"])

def generate_room_code() -> str:
    parts = (
        "".join(secrets.choice(string.ascii_lowercase) for _ in range(n))
        for n in (3,4,3)
    )
    return "-".join(parts)

@router.post("", response_model=RoomOut, status_code=status.HTTP_201_CREATED)
def create_room(
    data: RoomCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    code = generate_room_code()
    while db.scalar(select(Room).where(Room.code == code)):
        code = generate_room_code()
        
    room = Room(code=code, title = data.title, host_id = user.id, scheduled_at = data.scheduled_at)
    db.add(room)
    db.commit()
    db.refresh(room)
    return room

@router.get("", response_model=list[RoomOut])
def my_rooms(
    db:Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    stmt = select(Room).where(Room.host_id == user.id).order_by(Room.created_at.desc())
    return db.scalars(stmt).all()

@router.get("/{code}", response_model=RoomOut)
def get_room(
    code: str,
    db: Session = Depends(get_db),
    user: User= Depends(get_current_user),
):
    room = db.scalar(select(Room).where(Room.code == code))
    if not room:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Meeting not found")
    return room

@router.get("/{code}/public", response_model=RoomPublic)
def get_room_public(code: str, db: Session = Depends(get_db)):
    room = db.scalar(select(Room).where(Room.code == code))
    if not room:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Meeting not found")
    return room