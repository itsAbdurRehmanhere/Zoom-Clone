import { useEffect, useRef } from 'react'
import useSpeaking from '../../lib/useSpeaking'
import useIsMobile from '../../lib/useIsMobile'

function VideoTile({ stream, name, muted = false, mirrored = false, camOn = true, micOn = true }) {
  const ref = useRef(null)
  const speaking = useSpeaking(stream)

  useEffect(() => {
    if (ref.current) ref.current.srcObject = stream ?? null
  }, [stream])

  return (
    <div
      className={`relative h-full min-h-0 min-w-0 overflow-hidden rounded-xl bg-slate-800 ring-4 transition-shadow ${
        speaking ? 'ring-green-500' : 'ring-transparent'
      }`}
    >
      <video
        ref={ref}
        autoPlay
        playsInline
        muted={muted}
        className={`h-full w-full object-cover ${mirrored ? '-scale-x-100' : ''}`}
      />
      {!camOn && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-800 text-4xl font-semibold">
          {name?.[0]?.toUpperCase()}
        </div>
      )}
      <div className="absolute bottom-2 left-2 rounded bg-black/60 px-2 py-1 text-sm">
        {name}
        {!micOn && ' (muted)'}
      </div>
    </div>
  )
}

export default function VideoGrid({
  localStream,
  localName,
  localMirrored,
  camOn,
  micOn,
  remoteStreams,
  participants,
}) {
  const peers = Object.values(participants)
  const total = peers.length + 1
//   const cols = total === 1 ? 'grid-cols-1' : total <= 4 ? 'grid-cols-2' : 'grid-cols-3'

//   return (
//     <div className='flex min-h-0 flex-1 overflow-auto'>
//         <div 
//         className={`m-auto grid w-full gap-3 p-3 ${
//             total === 1 ? 'max-w-3xl' : 'max-w-6xl'
//         }${cols}`}
//         >
//       <VideoTile
//         stream={localStream}
//         name={`${localName} (You)`}
//         muted
//         mirrored={localMirrored}
//         camOn={camOn}
//         micOn={micOn}
//       />
//       {peers.map((p) => (
//         <VideoTile
//           key={p.peer_id}
//           stream={remoteStreams[p.peer_id]}
//           name={p.name}
//           camOn={p.camOn}
//           micOn={p.micOn}
//         />
//       ))}
//     </div>
//     </div>
//   )

    const isMobile = useIsMobile()
  const cols = isMobile
    ? total <= 2 ? 1 : 2
    : total === 1 ? 1 : total <= 4 ? 2 : 3
  const rows = Math.ceil(total / cols)

  return (
    <div
            className="grid min-h-0 min-w-0 flex-1 gap-2 p-2 sm:gap-3 sm:p-3"
      style={{
        gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
        gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`,
      }}
    >
      <VideoTile
        stream={localStream}
        name={`${localName} (You)`}
        muted
        mirrored={localMirrored}
        camOn={camOn}
        micOn={micOn}
      />
      {peers.map((p) => (
        <VideoTile
          key={p.peer_id}
          stream={remoteStreams[p.peer_id]}
          name={p.name}
          camOn={p.camOn}
          micOn={p.micOn}
        />
      ))}
    </div>
  )
}