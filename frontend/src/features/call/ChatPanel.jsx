// import { useEffect, useRef, useState } from 'react'
// import { useSelector } from 'react-redux'

// export default function ChatPanel({ onSend, onClose }) {
//   const messages = useSelector((state) => state.chat.messages)
//   const me = useSelector((state) => state.auth.user)
//   const [text, setText] = useState('')
//   const bottomRef = useRef(null)

//   useEffect(() => {
//     bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
//   }, [messages.length])

//   const handleSubmit = (e) => {
//     e.preventDefault()
//     const value = text.trim()
//     if (!value) return
//     onSend(value)
//     setText('')
//   }

//   return (
//     <aside className="flex w-80 shrink-0 flex-col border-l border-slate-700 bg-slate-900">
//       <div className="flex items-center justify-between border-b border-slate-700 px-4 py-3">
//         <h2 className="font-medium">Chat</h2>
//         <button onClick={onClose} className="text-sm text-slate-400 hover:text-white">
//           Close
//         </button>
//       </div>

//       <div className="flex-1 space-y-3 overflow-y-auto p-4">
//         {messages.length === 0 && <p className="text-sm text-slate-400">No messages yet.</p>}
//         {messages.map((m) => {
//           const mine = m.user_id === me?.id
//           const time = new Date(m.created_at).toLocaleTimeString([], {
//             hour: '2-digit',
//             minute: '2-digit',
//           })
//           return (
//             <div key={m.id} className={mine ? 'text-right' : ''}>
//               <p className="text-xs text-slate-400">
//                 {mine ? 'You' : m.name} · {time}
//               </p>
//               <p
//                 className={`inline-block max-w-full whitespace-pre-wrap wrap-break-word rounded-lg px-3 py-2 text-left text-sm ${
//                   mine ? 'bg-blue-600' : 'bg-slate-700'
//                 }`}
//               >
//                 {m.text}
//               </p>
//             </div>
//           )
//         })}
//         <div ref={bottomRef} />
//       </div>

//       <form onSubmit={handleSubmit} className="flex gap-2 border-t border-slate-700 p-3">
//         <input
//           value={text}
//           onChange={(e) => setText(e.target.value)}
//           maxLength={2000}
//           placeholder="Message everyone"
//           className="flex-1 rounded bg-slate-800 px-3 py-2 text-sm"
//         />
//         <button
//           type="submit"
//           disabled={!text.trim()}
//           className="rounded bg-blue-600 px-3 py-2 text-sm disabled:opacity-50"
//         >
//           Send
//         </button>
//       </form>
//     </aside>
//   )
// }

import { useEffect, useRef, useState } from 'react'
import { useSelector } from 'react-redux'

export default function ChatPanel({ onSend, onClose, isHost, myKey, chatBlocked }) {
  const messages = useSelector((state) => state.chat.messages)
  // const me = useSelector((state) => state.auth.user)
  const [text, setText] = useState('')
  const [scope, setScope] = useState('everyone') // 'everyone' | 'host'
  const bottomRef = useRef(null)
  const mine = m.sender === myKey

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  const handleSubmit = (e) => {
    e.preventDefault()
    const value = text.trim()
    if (!value) return
    onSend(value, !isHost && scope === 'host')
    setText('')
  }

  return (
    <aside className="fixed inset-0 z-30 flex flex-col bg-slate-900 sm:static sm:inset-auto sm:z-auto sm:w-80 sm:shrink-0 sm:border-l sm:border-slate-700">
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
                className={`inline-block max-w-full whitespace-pre-wrap break-words rounded-lg px-3 py-2 text-left text-sm ${
                  m.private ? 'bg-amber-600' : mine ? 'bg-blue-600' : 'bg-slate-700'
                }`}
              >
                {m.text}
              </p>
              {m.private && (
                <p className="mt-0.5 text-xs text-amber-400">
                  {mine ? 'Only the host can see this' : 'Private message to you'}
                </p>
              )}
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>
        {chatBlocked ? (
    <p className="border-t border-slate-700 p-3 text-center text-sm text-slate-400">
      The host has turned chat off.
    </p>
  ) : (
    <form onSubmit={handleSubmit} className="space-y-2 border-t border-slate-700 p-3">
        {!isHost && (
          <div className="flex gap-1 text-xs">
            <span className="py-1 text-slate-400">To:</span>
            {[
              ['everyone', 'Everyone'],
              ['host', 'Host only'],
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setScope(value)}
                className={`rounded-full px-3 py-1 ${
                  scope === value
                    ? value === 'host' ? 'bg-amber-600' : 'bg-blue-600'
                    : 'bg-slate-700 text-slate-300'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        )}
        <div className="flex gap-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={2000}
            placeholder={!isHost && scope === 'host' ? 'Message to host only' : 'Message everyone'}
            className="flex-1 rounded bg-slate-800 px-3 py-2 text-base sm:text-sm"
          />
          <button
            type="submit"
            disabled={!text.trim()}
            className="rounded bg-blue-600 px-3 py-2 text-sm disabled:opacity-50"
          >
            Send
          </button>
        </div>
      </form>
  )}

      
    </aside>
  )
}