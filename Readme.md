# Zoom Clone

A Zoom-style video meeting app built from scratch: real-time video calls over WebRTC, a FastAPI signaling server, JWT authentication, and in-meeting chat with private-to-host messages.

**Live demo:** https://zoom-clone-orcin-two.vercel.app
(Hosted on free tiers. The first request after a period of inactivity can take about a minute while the backend wakes up.)

<!-- Add a demo GIF or video here -->
<!-- ![Demo](docs/demo.gif) -->

## Features

- **Accounts:** sign up, log in, and stay signed in across refreshes (JWT).
- **Meetings:** create a meeting, get a shareable code and link, and see your meetings on a dashboard.
- **Lobby:** preview your camera, pick microphone and camera devices, set a display name, and choose mic/camera state before joining.
- **Video calls:** multi-party WebRTC calls with a responsive video grid that fits the screen.
- **In-call controls:** mute, camera on/off, screen sharing, leave, copy invite link.
- **Active speaker indicator:** a ring around whoever is talking, detected with the Web Audio API.
- **Chat:** messages go to everyone, or privately to the host only. Privacy is enforced on the server, including chat history.
- **Room limits:** the server rejects joins to full or missing rooms with specific close codes.

## Tech stack

| Layer | Tools |
|---|---|
| Frontend | React, Vite, JavaScript, React Router, Redux Toolkit, Tailwind CSS v4 |
| Backend | FastAPI, SQLAlchemy, PostgreSQL, PyJWT, pwdlib (argon2) |
| Real time | WebRTC (peer-to-peer media), WebSocket signaling |
| Hosting | Vercel (frontend), Render (backend), Neon (Postgres) |

## How it works

The video and audio never pass through the server. The server only helps browsers find each other.

```mermaid
sequenceDiagram
    participant A as Browser A (already in room)
    participant S as FastAPI signaling (WebSocket)
    participant B as Browser B (joins)

    B->>S: join { token, name }
    S-->>B: joined + list of existing peers
    S-->>A: peer-joined
    B->>S: offer (to A)
    S->>A: offer (relayed)
    A->>S: answer
    S->>B: answer (relayed)
    A-->>B: ICE candidates (via signaling)
    A<<->>B: Direct audio/video (WebRTC)
```

- **Signaling:** a WebSocket at `/ws/room/{code}`. The first message must be a `join` carrying the JWT, so the token never appears in a URL. The server relays `offer`, `answer` and `ice` messages between peers and broadcasts participant state and chat.
- **Mesh topology:** every participant holds one `RTCPeerConnection` per other participant. The newcomer sends the offers, which avoids both sides offering at once (glare).
- **ICE handling:** candidates that arrive before the remote description is set are queued and flushed afterwards.
- **Screen sharing:** uses `replaceTrack` on the existing connections, so no renegotiation is needed.
- **Mute and camera toggles:** flip `track.enabled` on the shared local tracks.
- **State kept out of Redux:** `MediaStream` and `RTCPeerConnection` objects are not serializable, so they live in refs and a `PeerManager` class. Redux holds auth, rooms, call settings, participants and chat.

### Close codes used by the signaling socket

| Code | Meaning |
|---|---|
| 4400 | Bad join message |
| 4401 | Unauthorized (missing or invalid token) |
| 4403 | Room full |
| 4404 | Room not found |
| 4408 | Join timeout |

## Design decisions

- **Mesh instead of an SFU.** A mesh needs no media server, which keeps the project free to host and easy to follow. The trade-off is that upload bandwidth grows with each participant, so it is practical for roughly 4 to 6 people. Larger meetings would need an SFU such as LiveKit or mediasoup.
- **Server-side chat privacy.** The "private to host" flag is stored with the message. Delivery goes only to the sender and the host, and history queries filter on the same rule. The client is never trusted to hide messages.
- **First-message authentication.** Browsers cannot set headers on a WebSocket, and putting the token in the URL leaks it into logs. Authenticating in the first message avoids that.
- **Short-lived DB sessions in the WebSocket handler.** Sync SQLAlchemy calls run through `asyncio.to_thread`, and sessions are opened per operation, so a long call never holds a connection.

## Project structure

```
.
├── frontend/
│   └── src/
│       ├── app/            # Redux store
│       ├── lib/            # api client, Signaling, PeerManager, media hooks
│       └── features/
│           ├── auth/       # login, signup, auth slice
│           ├── rooms/      # dashboard, rooms slice
│           └── call/       # lobby, room, video grid, controls, chat
└── Backend/
    └── app/
        ├── main.py         # app, CORS, router registration
        ├── config.py       # settings from environment
        ├── database.py     # engine and session
        ├── models.py       # User, Room, Message
        ├── schemas.py
        ├── security.py     # password hashing, JWT
        ├── deps.py         # auth dependencies
        ├── ws_manager.py   # in-memory room connections
        └── routers/
            ├── auth.py
            ├── room.py
            └── signaling.py
```

## Running locally

### Prerequisites

- Node.js 18+
- Python 3.10+
- Docker (for PostgreSQL), or any local PostgreSQL

### Backend

```bash
cd Backend
python -m venv venv
# Windows: venv\Scripts\activate    macOS/Linux: source venv/bin/activate
pip install -r requirements.txt
docker compose up -d        # starts PostgreSQL
```

Create `Backend/.env`:

```env
DATABASE_URL=postgresql+psycopg2://USER:PASSWORD@localhost:5432/zoom
SECRET_KEY=replace-with-a-long-random-string
FRONTEND_ORIGIN=http://localhost:5173
```

URL-encode special characters in the password (`@` becomes `%40`). Then start the server:

```bash
uvicorn app.main:app --reload
```

The API runs at http://localhost:8000. A health check is available at `/health`.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

The app runs at http://localhost:5173. To point it at a different backend, set `VITE_BASE_URL` (defaults to `http://localhost:8000`).

To test a call locally, open the app in two browser windows (use a private window and a second account for the second participant).

## Environment variables

| Variable | Where | Purpose |
|---|---|---|
| `DATABASE_URL` | Backend | PostgreSQL connection string (`postgresql+psycopg2://...`) |
| `SECRET_KEY` | Backend | Signs JWTs |
| `FRONTEND_ORIGIN` | Backend | Allowed CORS origin. Must match the frontend URL exactly |
| `VITE_BASE_URL` | Frontend | Backend base URL. The WebSocket URL is derived from it |

## Deployment

| Piece | Service | Notes |
|---|---|---|
| Frontend | Vercel | Root directory `frontend`. `vercel.json` rewrites all paths to `/` for client-side routing |
| Backend | Render (free web service) | Build `pip install -r requirements.txt`, start `uvicorn app.main:app --host 0.0.0.0 --port $PORT` |
| Database | Neon (free Postgres) | Engine uses `pool_pre_ping=True` because the database suspends when idle |

## Known limitations

- **Free-tier hosting.** The backend sleeps after inactivity and can restart, which clears in-memory room state and drops WebSocket connections.
- **Single process.** Room connections are kept in memory, so the backend runs as one process. Scaling to several workers would need a shared pub/sub layer such as Redis.
- **No TURN relay yet.** Calls between two restrictive networks (some mobile or corporate connections) may fail to connect without one. Only a public STUN server is configured today.
- **Mesh size.** Best for small meetings.
- **Tokens expire** after a fixed lifetime and there is no refresh flow yet.

## Roadmap

- [ ] Free TURN relay for calls across restrictive networks
- [ ] WebSocket reconnect and ICE restart
- [ ] Connection quality indicator and better error states
- [ ] Meeting scheduling and history
- [ ] Database migrations with Alembic
- [ ] Backend tests and CI

## License

Add a license of your choice (MIT is common for portfolio projects).