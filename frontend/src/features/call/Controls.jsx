function ControlButton({ label, onClick, tone = "neutral", disabled = false, title }) {
  const tones = {
    neutral: "bg-slate-700 hover:bg-slate-600",
    off: "bg-red-600 hover:bg-red-500",
    on: "bg-blue-600 hover:bg-blue-500",
    host: "bg-amber-600 hover:bg-amber-500",
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`rounded-full px-3 py-2 text-xs font-medium disabled:opacity-40 sm:px-5 sm:py-3 sm:text-sm ${tones[tone]}`}
    >
      {label}
    </button>
  );
}

export default function Controls({
  micOn,
  camOn,
  sharing,
  hasMedia,
  chatOpen,
  unread,
  isHost,
  hostOpen,
  waitingCount,
  canFlip,
  micBlocked,
  camBlocked,
  onToggleMic,
  onToggleCam,
  onFlipCamera,
  onToggleShare,
  onCopyLink,
  onToggleChat,
  onToggleHost,
  onLeave,
}) {
  const canShare = !!navigator.mediaDevices?.getDisplayMedia;

  return (
    <div className="flex shrink-0 flex-wrap items-center justify-center gap-2 border-t border-slate-700 p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] sm:gap-3 sm:p-4">
      <ControlButton
        label={micBlocked ? "Mic disabled" : micOn ? "Mute" : "Unmute"}
        tone={micOn && !micBlocked ? "neutral" : "off"}
        onClick={onToggleMic}
        disabled={!hasMedia || micBlocked}
        title={micBlocked ? "The host has turned microphones off" : undefined}
      />
      <ControlButton
        label={camBlocked ? "Camera disabled" : camOn ? "Stop video" : "Start video"}
        tone={camOn && !camBlocked ? "neutral" : "off"}
        onClick={onToggleCam}
        disabled={!hasMedia || camBlocked}
        title={camBlocked ? "The host has turned cameras off" : undefined}
      />
      {canFlip && (
        <ControlButton
          label="Flip camera"
          onClick={onFlipCamera}
          disabled={!hasMedia || camBlocked}
        />
      )}
      {canShare && (
        <ControlButton
          label={sharing ? "Stop sharing" : "Share"}
          tone={sharing ? "on" : "neutral"}
          onClick={onToggleShare}
          disabled={!hasMedia || camBlocked}
        />
      )}
      <ControlButton
        label={unread > 0 ? `Chat (${unread})` : "Chat"}
        tone={chatOpen ? "on" : "neutral"}
        onClick={onToggleChat}
      />
      {isHost && (
        <ControlButton
          label={waitingCount > 0 ? `Host (${waitingCount})` : "Host"}
          tone={hostOpen || waitingCount > 0 ? "host" : "neutral"}
          onClick={onToggleHost}
        />
      )}
      <ControlButton label="Copy link" onClick={onCopyLink} />
      <ControlButton label="Leave" tone="off" onClick={onLeave} />
    </div>
  );
}