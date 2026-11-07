import { useEffect, useRef, useState } from 'react'
import { useSelector } from 'react-redux'

export default function ChatPanel({ onSend, onClose }) {
  const messages = useSelector((state) => state.chat.messages)
  const me = useSelector((state) => state.auth.user)
  const [text, setText] = useState('')
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  const handleSubmit = (e) => {
    e.preventDefault()
    const value = text.trim()
    if (!value) return
    onSend(value)
    setText('')
  }

  return (
    <aside className="flex w-80 shrink-0 flex-col border-l border-slate-700 bg-slate-900">
      <div className="flex items-center justify-between border-b border-slate-700 px-4 py-3">
        <h2 className="font-medium">Chat</h2>
        <button onClick={onClose} className="text-sm text-slate-400 hover:text-white">
          Close
        </button>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.length === 0 && <p className="text-sm text-slate-400">No messages yet.</p>}
        {messages.map((m) => {
          const mine = m.user_id === me?.id
          const time = new Date(m.created_at).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })
          return (
            <div key={m.id} className={mine ? 'text-right' : ''}>
              <p className="text-xs text-slate-400">
                {mine ? 'You' : m.name} · {time}
              </p>
              <p
                className={`inline-block max-w-full whitespace-pre-wrap wrap-break-word rounded-lg px-3 py-2 text-left text-sm ${
                  mine ? 'bg-blue-600' : 'bg-slate-700'
                }`}
              >
                {m.text}
              </p>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2 border-t border-slate-700 p-3">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={2000}
          placeholder="Message everyone"
          className="flex-1 rounded bg-slate-800 px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={!text.trim()}
          className="rounded bg-blue-600 px-3 py-2 text-sm disabled:opacity-50"
        >
          Send
        </button>
      </form>
    </aside>
  )
}