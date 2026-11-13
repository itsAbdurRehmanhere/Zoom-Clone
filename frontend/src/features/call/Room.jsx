import { useCallback, useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import PeerManager from "../../lib/PeerManager";
import Signaling from "../../lib/signaling";
import useLocalMedia, { describeMediaError } from "../../lib/useLocalMedia";
import { fetchRoom } from "../rooms/roomsSlice";
import {
  addPeer,
  removePeer,
  resetParticipants,
  setPeers,
  setSelf,
  updatePeer,
} from "./participantsSlice";
import VideoGrid from "./VideoGrid";
import Controls from "./Controls";
import { toggleCam, toggleMic } from "./callSettingsSlice";
import ChatPanel from "./ChatPanel";
import { addMessages, clearChat, setMessages, toggleChat } from "./chatSlice";
import getGuestId from "../../lib/guest";
import HostPanel from "./HostPanel";

const CLOSE_MESSAGES = {
  4401: "Your session expired. Please log in again.",
  4403: "This meeting is full.",
  4404: "Meeting not found.",
  4405: "You were removed from this meeting by the host.",
  4406: "This meeting is locked by the host.",
};

export default function Room() {
  const { code } = useParams();
  const displayName = useSelector((state) => state.callSettings.displayName);

  // refreshed the page or came from a link: go through the lobby first
  if (!displayName) return <Navigate to={`/room/${code}/lobby`} replace />;
  return <CallScreen code={code} />;
}

function CallScreen({ code }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const token = useSelector((state) => state.auth.token);
  const room = useSelector((state) => state.rooms.current);
  const settings = useSelector((state) => state.callSettings);
  const participants = useSelector((state) => state.participants.byId);
  const chatOpen = useSelector((state) => state.chat.open);
  const unread = useSelector((state) => state.chat.unread);

  const sendChat = (text, isPrivate) =>
    signalingRef.current?.send({ type: "chat", text, private: isPrivate });
  const [isHost, setIsHost] = useState(false);
  const [myKey, setMyKey] = useState(null);
  const [roomSettings, setRoomSettings] = useState(null);
  const [hostOpen, setHostOpen] = useState(false);

  const [remoteStreams, setRemoteStreams] = useState({});
  const [connectionError, setConnectionError] = useState(null);
  const [screenStream, setScreenStream] = useState(null);
  const sharing = screenStream !== null;

  const signalingRef = useRef(null);
  const managerRef = useRef(null);
  const screenRef = useRef(null);
  const stateRef = useRef({ micOn: settings.micOn, camOn: settings.camOn });

  const { stream, error: mediaError } = useLocalMedia({
    audioDeviceId: settings.audioDeviceId,
    videoDeviceId: settings.videoDeviceId,
  });

  const sendState = useCallback(() => {
    signalingRef.current?.send({ type: "state", ...stateRef.current });
  }, []);

  useEffect(() => {
    dispatch(fetchRoom(code));
  }, [code, dispatch]);

  // apply mic/camera on/off to the real tracks
  useEffect(() => {
    stream?.getAudioTracks().forEach((t) => (t.enabled = settings.micOn));
    stream?.getVideoTracks().forEach((t) => (t.enabled = settings.camOn));
  }, [stream, settings.micOn, settings.camOn]);

  // tell everyone else whenever it changes
  useEffect(() => {
    stateRef.current = {
      micOn: settings.micOn,
      camOn: settings.camOn || sharing,
    };
    sendState();
  }, [settings.micOn, settings.camOn, sharing, sendState]);

  const stopSharing = useCallback(() => {
    screenRef.current?.getTracks().forEach((t) => t.stop());
    screenRef.current = null;
    setScreenStream(null);
    managerRef.current?.setVideoTrack(null);
  }, []);

  const startSharing = async () => {
    try {
      const screen = await navigator.mediaDevices.getDisplayMedia({
        video: true,
      });
      const track = screen.getVideoTracks()[0];
      track.onended = stopSharing; // the browser's own "Stop sharing" bar
      screenRef.current = screen;
      setScreenStream(screen);
      await managerRef.current?.setVideoTrack(track);
    } catch (err) {
      if (err.name !== "NotAllowedError") console.error(err); // picker cancelled
    }
  };

  const toggleShare = () =>
    screenRef.current ? stopSharing() : startSharing();
    const micAllowed = isHost || (roomSettings?.audience_mic ?? true);
  const camAllowed = isHost || (roomSettings?.audience_cam ?? true);
  const chatAllowed = isHost || (roomSettings?.chat_enabled ?? true);

  // when the host turns mic/camera off for the audience, switch ours off too
  useEffect(() => {
    if (!micAllowed && settings.micOn) dispatch(toggleMic());
  }, [micAllowed, settings.micOn, dispatch]);

  useEffect(() => {
    if (!camAllowed && settings.camOn) dispatch(toggleCam());
  }, [camAllowed, settings.camOn, dispatch]);

  useEffect(() => {
    if (!camAllowed && screenRef.current) stopSharing();
  }, [camAllowed, stopSharing]);

  const updateRoom = (changes) =>
    signalingRef.current?.send({ type: "host", action: "settings", ...changes });
  const kickPeer = (peerId) =>
    signalingRef.current?.send({ type: "host", action: "kick", peer_id: peerId });

  // only one side panel open at a time
  const handleToggleChat = () => {
    if (!chatOpen) setHostOpen(false);
    dispatch(toggleChat());
  };
  const handleToggleHost = () => {
    if (!hostOpen && chatOpen) dispatch(toggleChat());
    setHostOpen((o) => !o);
  };

  // stop sharing if the user leaves the page
  useEffect(() => stopSharing, [stopSharing]);

  useEffect(() => {
    if (!stream && !mediaError) return;

    let cancelled = false;
    const signaling = new Signaling(code);
    const manager = new PeerManager({
      signaling,
      localStream: stream,
      onRemoteStream: (peerId, remote) =>
        setRemoteStreams((prev) => ({ ...prev, [peerId]: remote })),
      onConnectionState: (peerId, state) =>
        dispatch(updatePeer({ peer_id: peerId, connectionState: state })),
    });
    signalingRef.current = signaling;
    managerRef.current = manager;

    signaling
      .on("peer_joined", ({ peer }) => {
        dispatch(addPeer(peer));
        sendState(); // so the newcomer learns our mic/camera state
      })
      .on("offer", (msg) => manager.handleOffer(msg))
      .on("answer", (msg) => manager.handleAnswer(msg))
      .on("ice", (msg) => manager.addIce(msg.from, msg.candidate))
      .on("peer_state", (msg) =>
        dispatch(
          updatePeer({
            peer_id: msg.peer_id,
            micOn: msg.micOn,
            camOn: msg.camOn,
          }),
        ),
      )
      .on("peer_left", ({ peer_id }) => {
        manager.removePeer(peer_id);
        dispatch(removePeer(peer_id));
        setRemoteStreams((prev) => {
          const next = { ...prev };
          delete next[peer_id];
          return next;
        });
      })
      .on("close", (e) =>
        setConnectionError(CLOSE_MESSAGES[e.code] || "Connection lost."),
      )
      .on("chat", (msg) => dispatch(addMessages(msg)))
      .on("room_settings", (m) => setRoomSettings(m.settings));

    signaling
      .connect({ token, name: settings.displayName, guestId: getGuestId() })
      .then(async (joined) => {
        if (cancelled) return;
        if (joined.ice_servers) manager.iceServers = joined.ice_servers;
        setIsHost(joined.you?.is_host ?? false);
        setMyKey(joined.you?.key ?? null);
        setRoomSettings(joined.settings ?? null);
        dispatch(setSelf(joined.peer_id));
        dispatch(setPeers(joined.peers));
        dispatch(setMessages(joined.messages ?? []));
        sendState();
        for (const p of joined.peers) await manager.callPeer(p.peer_id);
      })
      .catch((e) => {
        if (!cancelled)
          setConnectionError(CLOSE_MESSAGES[e?.code] || "Could not connect.");
      });

    return () => {
      cancelled = true;
      signalingRef.current = null;
      managerRef.current = null;
      signaling.close();
      manager.closeAll();
      dispatch(resetParticipants());
      dispatch(clearChat());
      setRemoteStreams({});
    };
  }, [
    stream,
    mediaError,
    code,
    token,
    settings.displayName,
    dispatch,
    sendState,
  ]);

  const copyLink = () =>
    navigator.clipboard.writeText(`${window.location.origin}/room/${code}`);

  if (connectionError) {
    return (
      <div className="p-6 text-white">
        <p>{connectionError}</p>
        <Link to="/" className="text-blue-400">
          Back to dashboard
        </Link>
      </div>
    );
  }

    return (
    <div className="flex h-dvh flex-col bg-slate-900 text-white">
      <header className="shrink-0 border-b border-slate-700 px-4 py-2 sm:py-3">
        <h1 className="truncate font-medium">{room?.title}</h1>
        <p className="text-xs text-slate-400">{code}</p>
      </header>

      {mediaError && (
        <p className="bg-yellow-900 px-4 py-2 text-sm">
          {describeMediaError(mediaError)} You joined without camera or mic.
        </p>
      )}

      <div className="flex min-h-0 flex-1">
        <VideoGrid
          localStream={sharing ? screenStream : stream}
          localName={settings.displayName}
          localMirrored={!sharing}
          camOn={settings.camOn || sharing}
          micOn={settings.micOn}
          remoteStreams={remoteStreams}
          participants={participants}
        />
        {chatOpen && (
          <ChatPanel
            onSend={sendChat}
            onClose={() => dispatch(toggleChat())}
            isHost={isHost}
            myKey={myKey}
            chatBlocked={!chatAllowed}
          />
        )}
        {isHost && hostOpen && (
          <HostPanel
            settings={roomSettings}
            participants={participants}
            onChange={updateRoom}
            onKick={kickPeer}
            onClose={() => setHostOpen(false)}
          />
        )}
      </div>

      <Controls
        micOn={settings.micOn}
        camOn={settings.camOn}
        sharing={sharing}
        hasMedia={!!stream}
        micBlocked={!micAllowed}
        camBlocked={!camAllowed}
        isHost={isHost}
        hostOpen={hostOpen}
        onToggleMic={() => dispatch(toggleMic())}
        onToggleCam={() => dispatch(toggleCam())}
        onToggleShare={toggleShare}
        onCopyLink={copyLink}
        onLeave={() => navigate("/")}
        chatOpen={chatOpen}
        unread={unread}
        onToggleChat={handleToggleChat}
        onToggleHost={handleToggleHost}
      />
    </div>
  );
}
