function ControlButton({label, onClick, tone = 'neutral', disabled = false}){
    const tones = {
        neutral: 'bg-slate-700 hover:bg-slate-600',
        off: 'bg-red-600 hover:bg-red-500',
        on: 'bg-blue-600 hover:bg-blue-500'
    }
    return(
        <button
        onClick={onClick}
        disabled = {disabled}
        className={`rounded-full px-5 py-3 text-sm font-medium disabled:opacity-40 ${tones[tone]}`}
        >
            {label}
        </button>
    )
}

export default function Controls({
    micOn,
    camOn,
    sharing,
    hasMedia,
    chatOpen,
    unread,
    onToggleMic,
    onToggleCam,
    onToggleShare,
    onCopyLink,
    onToggleChat,
    onLeave,
}){
    return (
        <div className="flex shrink-0 flex-wrap items-center justify-center gap-3 border-t border-slate-700">
            <ControlButton
            label={micOn ? "Mute":"Unmute"}
            tone= {micOn ? "neutral": "off"}
            onClick={onToggleMic}
            disabled={!hasMedia}
            />
            <ControlButton
            label={camOn ? "Stop video":"start video"}
            tone= {camOn ? "neutral": "off"}
            onClick={onToggleCam}
            disabled={!hasMedia}
            />
            <ControlButton
            label={sharing ? "Stop sharing":"Start sharing"}
            tone= {sharing ? "neutral": "off"}
            onClick={onToggleShare}
            disabled={!hasMedia}
            />
            <ControlButton
            label={unread > 0 ? `chat(${unread})` : "Chat"}
            tone= {chatOpen ? "on" : "neutral"}
            onClick={onToggleChat}
            />
            <ControlButton label="Copy link" onClick={onCopyLink} />
            <ControlButton label="Leave" onClick={onLeave}/>
        </div>
    )
}