import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function JoinByCode() {
  const [value, setValue] = useState("");
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    const match = value.match(/[a-z]{3}-[a-z]{4}-[a-z]{3}/i);
    if (match) navigate(`/room/${match[0].toLowerCase()}/lobby`);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full max-w-sm space-y-2 rounded-xl bg-slate-800 p-6"
    >
      <h2 className="font-medium text-white">Join a meeting</h2>
      <p className="text-sm text-slate-400">
        No account needed. Enter a code or paste a link.
      </p>
      <div className="flex gap-2">
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="abc-defg-hij"
          className="flex-1 rounded bg-slate-700 px-3 py-2 text-white"
        />
        <button type="submit" className="rounded bg-slate-600 px-4 py-2 text-white">
          Join
        </button>
      </div>
    </form>
  );
}