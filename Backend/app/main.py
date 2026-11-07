from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .config import settings
from .database import Base, engine
from .routers import auth, room, signaling


Base.metadata.create_all(bind=engine)

app = FastAPI(title = "Zoom Clone API")

app.add_middleware(
    CORSMiddleware,
    allow_origins = [settings.frontend_origin],
    allow_methods = ["*"],
    allow_headers=["*"]
)

app.include_router(auth.router)
app.include_router(room.router)
app.include_router(signaling.router)


@app.api_route("/health", methods=["GET", "HEAD"])
def health():
    return {"status" : "ok"}