import { useEffect, useState } from "react";

export default function useSpeaking(stream) {
    const [speaking, setSpeaking] = useState(false)

    useEffect(() =>{
        if(!stream || stream.getAudioTracks().length === 0) return

        const ctx = new AudioContext()
        const source = ctx.createMediaStreamSource(stream)
        const analyser = ctx.createAnalyser()
        analyser.fftSize = 512
        source.connect(analyser)
        const data = new Uint8Array(analyser.frequencyBinCount)

        const interval = setInterval(() => {
            analyser.getByteFrequencyData(data)
            const average = data.reduce((sum, v) => sum + v, 0)/ data.length
            setSpeaking(average > 20)
        }, 150)
        return() =>{
            clearInterval(interval)
            source.disconnect()
            ctx.close()
        }
    },[stream])

    return speaking
}
