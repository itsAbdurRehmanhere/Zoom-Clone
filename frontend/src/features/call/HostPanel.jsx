function Toggle({ label, hint, checked, onChange }) {
  return (
    <label className="flex items-center justify-between gap-3 rounded-lg bg-slate-800 px-3 py-3">
      <span>
        <span className="block text-sm">{label}</span>
        {hint && <span className="block text-xs text-slate-400">{hint}</span>}
      </span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-5 w-5 accent-blue-600"
      />
    </label>
  );
}

export default function HostPanel({
  settings,
  participants,
  onChange,
  onKick,
  onClose,
}) {
  if (!settings) return null;
  const peers = Object.values(participants);

  return (
    <aside className="fixed inset-0 z-30 flex flex-col bg-slate-900 sm:static sm:inset-auto sm:z-auto sm:w-80 sm:shrink-0 sm:border-l sm:border-slate-700">
      <div className="flex items-center justify-between border-b border-slate-700 px-4 py-3">
        <h2 className="font-medium">Host controls</h2>
        <button
          onClick={onClose}
          className="text-sm text-slate-400 hover:text-white"
        >
          Close
        </button>
      </div>

      <div className="flex-1 space-y-5 overflow-y-auto p-4">
        <div className="space-y-2">
          <Toggle
            label="Lock meeting"
            hint="No one new can join"
            checked={settings.locked}
            onChange={(v) => onChange({ locked: v })}
          />
          <Toggle
            label="Allow chat"
            hint="Applies to everyone except you"
            checked={settings.chat_enabled}
            onChange={(v) => onChange({ chat_enabled: v })}
          />
          <Toggle
            label="Allow microphones"
            hint="Applies to everyone except you"
            checked={settings.audience_mic}
            onChange={(v) => onChange({ audience_mic: v })}
          />
          <Toggle
            label="Allow cameras and sharing"
            hint="Applies to everyone except you"
            checked={settings.audience_cam}
            onChange={(v) => onChange({ audience_cam: v })}
          />
        </div>

        <div>
          <h3 className="mb-2 text-sm font-medium text-slate-300">
            Participants ({peers.length})
          </h3>
          {peers.length === 0 && (
            <p className="text-sm text-slate-400">Nobody else is here yet.</p>
          )}
          <ul className="space-y-2">
            {peers.map((p) => (
              <li
                key={p.peer_id}
                className="flex items-center justify-between rounded-lg bg-slate-800 px-3 py-2"
              >
                <span className="min-w-0 truncate text-sm">
                  {p.name}
                  {p.user_id == null && (
                    <span className="ml-2 text-xs text-slate-400">guest</span>
                  )}
                </span>
                {!p.is_host && (
                  <button
                    onClick={() => {
                      if (window.confirm(`Remove ${p.name} from the meeting?`))
                        onKick(p.peer_id);
                    }}
                    className="ml-3 shrink-0 rounded bg-red-600 px-3 py-1 text-xs"
                  >
                    Remove
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </aside>
  );
}
