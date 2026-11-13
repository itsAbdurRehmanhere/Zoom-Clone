import { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useNavigate, useParams } from "react-router-dom";
import useLocalMedia, { describeMediaError } from "../../lib/useLocalMedia";
import { fetchRoom } from "../rooms/roomsSlice";
import {
  setDisplayName,
  setAudioDevice,
  setVideoDevice,
  toggleCam,
  toggleMic,
} from "./callSettingsSlice";

export default function Lobby() {
  const { code } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const videoRef = useRef();

  const user = useSelector((state) => state.auth.user);
  const token = useSelector((state) => state.auth.token);
  const authLoading = !!token && !user;
  const {
    current: room,
    status,
    error: roomError,
  } = useSelector((state) => state.rooms);
  const settings = useSelector((state) => state.callSettings);
  const [name, setName] = useState(settings.displayName);

  const {
    stream,
    error: mediaError,
    devices,
  } = useLocalMedia({
    audioDeviceId: settings.audioDeviceId,
    videoDeviceId: settings.videoDeviceId,
  });

  useEffect(() => {
    dispatch(fetchRoom(code));
  }, [code, dispatch]);

  useEffect(() => {
    setName((n) => n || user?.name || "");
  }, [user]);

  useEffect(() => {
    if (videoRef.current) videoRef.current.srcObject = stream;
  }, [stream]);

  useEffect(() => {
    stream?.getAudioTracks().forEach((t) => (t.enabled = settings.micOn));
    stream?.getVideoTracks().forEach((t) => (t.enabled = settings.camOn));
  }, [stream, settings.micOn, settings.camOn]);

  const handleJoin = () => {
    dispatch(setDisplayName(name.trim()));
    navigate(`/room/${code}`);
  };
  if (authLoading) return <p className="p-6 text-white">Loading...</p>;
  if (status === "loading") return <p className="p-6 text-white">Loading...</p>;
  if (roomError) {
    return (
      <div className="p-6 text-white">
        <p>{roomError}</p>
        <Link to="/" className="text-blue-400">
          Back to Dashboard
        </Link>
      </div>
    );
  }
  return (
    <div className="min-h-screen bg-slate-900 p-6 text-white">
      <div className="mx-auto grid max-w-4xl gap-8 md:grid-cols-2">
        <div className="space-y-3">
          <div className="relative aspect-video overflow-hidden rounded-xl bg-slate-800">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="h-full w-full -scale-x-100 object-cover"
            />
            {(mediaError || !settings.camOn) && (
              <div className="absolute inset-0 flex items-center justify-center bg-slate-800 p-4 text-center text-sm text-slate-300">
                {mediaError ? describeMediaError(mediaError) : "Camera is off"}
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => dispatch(toggleMic())}
              className={`rounded px-4 py-2 ${settings.micOn ? "bg-slate-700" : "bg-red-600"}`}
            >
              {settings.micOn ? "Mic on" : "Mic off"}
            </button>
            <button
              onClick={() => dispatch(toggleCam())}
              className={`rounded px-4 py-2 ${settings.camOn ? "bg-slate-700" : "bg-red-600"}`}
            >
              {settings.camOn ? "Camera on" : "Camera off"}
            </button>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <h1 className="text-2xl font-semibold">{room?.title}</h1>
            <p className="text-sm text-slate-400">{code}</p>
            {room?.locked && (
              <p className="mt-2 rounded bg-amber-900/60 px-3 py-2 text-sm">
                This meeting has a waiting room. After you join, the host will
                let you in.
              </p>
            )}
          </div>

          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            className="w-full rounded bg-slate-800 px-3 py-2 text-base sm:text-sm"
          />

          <label className="block text-sm text-slate-400">
            Microphone
            <select
              value={settings.audioDeviceId ?? ""}
              onChange={(e) => dispatch(setAudioDevice(e.target.value || null))}
              className="mt-1 w-full rounded bg-slate-800 px-3 py-2 text-white"
            >
              <option value="">Default</option>
              {devices.audioInputs.map((d, i) => (
                <option key={d.deviceId} value={d.deviceId}>
                  {d.label || `Microphone ${i + 1}`}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm text-slate-400">
            Camera
            <select
              value={settings.videoDeviceId ?? ""}
              onChange={(e) => dispatch(setVideoDevice(e.target.value || null))}
              className="mt-1 w-full rounded bg-slate-800 px-3 py-2 text-white"
            >
              <option value="">Default</option>
              {devices.videoInputs.map((d, i) => (
                <option key={d.deviceId} value={d.deviceId}>
                  {d.label || `Camera ${i + 1}`}
                </option>
              ))}
            </select>
          </label>

          <button
            onClick={handleJoin}
            disabled={!name.trim()}
            className="w-full rounded bg-blue-600 py-3 font-medium disabled:opacity-50"
          >
            Join now
          </button>
          {!user && (
            <p className="text-sm text-slate-400">
              Have an account?{" "}
              <Link
                to="/login"
                state={{ from: location }}
                className="text-blue-400"
              >
                Log in
              </Link>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
