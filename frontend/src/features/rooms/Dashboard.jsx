import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { createRoom, fetchRooms } from "./roomsSlice";
import { logout } from "../auth/authSlice";

export default function Dashboard() {
  const [title, setTitle] = useState("");
  const [code, setCode] = useState("");
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const user = useSelector((state) => state.auth.user);
  const items = useSelector((state) => state.rooms.items);

  useEffect(() => {
    dispatch(fetchRooms());
  }, [dispatch]);

  const handleCreate = async () => {
    const result = await dispatch(
      createRoom({ title: title.trim() || "Untitled meeting" }),
    );
    if (createRoom.fulfilled.match(result))
      navigate(`/room/${result.payload.code}`);
  };

  const handleJoin = (e) => {
    e.preventDefault();
    const value = code.trim().split("/").pop().toLowerCase();
    if (value) navigate(`/room/${value}`);
  };

  const copyLink = (roomCode) =>
    navigator.clipboard.writeText(`${window.location.origin}/room/${roomCode}`);

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <header className="flex items-center justify-between border-b border-slate-7-- px-6 py-4">
        <h1 className="text-xl font-semibold">Meet</h1>
        <div className="flex items-center gap-4">
          <span className=" text-slate-300">{user?.name}</span>
          <button
            onClick={() => dispatch(logout())}
            className=" text-sm text-slate-400 hover:text-white"
          >
            Log out
          </button>
        </div>
      </header>


      <main className="mx-auto max-w-3xl space-y-8 p-6">
        <section className="space-y-3 rounded-xl bg-slate-800 p-5">
          <h2 className="font-medium">New Meeting</h2>
          <div className="flex gap-2">
            <input value={title} onChange={(e) => setTitle(e.target.value)}
            placeholder="Meeting title (Optional)"
            className="flex-1 rounde bg-slate-700 px-3 py-2"
            />
            <button onClick={handleCreate} className="rounded bg-blue-600 px-4 py-2">Start</button>
          </div>
        </section>

        <section className="space-y-3 rounded-xl bg-slate-800 p-5">
          <h2 className="font-medium">Join with code or link</h2>
          <form onSubmit={handleJoin} className="flex gap-2">
            <input value={code} onChange={(e) => setCode(e.target.value)}
            placeholder="abc-defg-hij"
            className="flex-1 rounded bg-slate-700 px-3 py-2" />
            <button type="submit" className="rounded bg-slate-600 px-4 py-2">Join</button>
          </form>
        </section>

        <section className="space-y-3">
          <h2 className="font-medium">Your meetings</h2>
          {items.length === 0 && <p className="text-slate-400">No meetings yet</p>}
          {items.map((room)=>(
            <div key={room.id} className="flex items-center justify-between rounded-xl bg-slate-800 p-4">
              <div>
                <p className="font-medium">{room.title}</p>
                <p className="text-sm text-slate-400">{room.code}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={()=> copyLink(room.code)} className="rounde bg-slate-700 px-3 py-1 text-sm">Copy link</button>
                <button onClick={() => navigate(`/room/${room.code}`)} className="rounded bg-blue-600 px-3 py-1 text-sm">Join</button>
              </div>
            </div>
          ))}
        </section>

      </main>
    </div>
  );
}
