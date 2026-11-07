import { useEffect, useState } from "react";

export function describeMediaError(err) {
  switch (err?.name) {
    case "NotAllowedError":
      return "Camera and microphone access is blocked. Allow it in the address bar, then reload.";
    case "NotFoundError":
      return "No camera or microphone was found.";
    case "NotReadableError":
      return "Your camera or microphone is being used by another app.";
    case "OverconstrainedError":
      return "The selected device is unavailable. Switch back to Default.";
    default:
      return "Could not access your camera or microphone.";
  }
}
export default function useLocalMedia({audioDeviceId, videoDeviceId}){

    const [stream, setStream] = useState(null)
    const [error, setError] = useState(null)
    const [devices, setDevices] = useState({audioInputs:[], videoInputs:[]})

    useEffect(() =>{
        let cancelled = false
        let acquired = null

        async function start() {
            try{
                const s = await navigator.mediaDevices.getUserMedia({
                    audio: audioDeviceId ? {deviceId: {exact: audioDeviceId}} : true,
                    video: videoDeviceId ? {deviceId: {exact: videoDeviceId}} : true,
                })
                if (cancelled){
                    s.getTracks().forEach((t) => t.stop())
                    return
                }
                acquired = s
                setStream(s)
                setError(null)
            }catch(err){
                if(!cancelled){
                    setStream(null)
                    setError(err)
                }
            }
            if (cancelled) return
            const list = await navigator.mediaDevices.enumerateDevices()
            if (cancelled) return
            setDevices({
                audioInputs: list.filter((d) => d.kind === 'audioinput'),
                videoInputs: list.filter((d) => d.kind === 'videoinput')
            })
        }
        start()

        return() =>{
            cancelled = true
            acquired?.getTracks().forEach((t) => t.stop())
        }
    }, [audioDeviceId, videoDeviceId])
    return {stream, error, devices}

}
