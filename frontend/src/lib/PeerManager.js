const ICE_SERVERS = [{urls: 'stun:stun.l.google.com:19302'}]

export default class PeerManager{
    constructor({signaling, localStream, onRemoteStream, onConnectionState}){
        this.signaling = signaling
        this.localStream = localStream
        this.onRemoteStream = onRemoteStream
        this.onConnectionState = onConnectionState
        this.pcs = new Map()
        this.pendingIce = new Map()
        this.videoTrackOverride = null
        this.iceServers = ICE_SERVERS
    }

    createPeer(peerId){
        const pc = new RTCPeerConnection({iceServers: this.iceServers})
        this.pcs.set(peerId, pc)

        // if(this.localStream){
        //     this.localStream.getTracks().forEach((track) => pc.addTrack(track, this.localStream))
        // } else{
        //     pc.addTransceiver('audio', {direction: 'recvonly'})
        //     pc.addTransceiver('video', {direction: 'recvonly'})
        // }

        if(this.localStream){
            this.localStream.getAudioTracks().forEach((t) => pc.addTrack(t, this.localStream))
            const video = this.videoTrackOverride ?? this.localStream.getVideoTracks()[0]
            if(video) pc.addTrack(video, this.localStream)
        }else {
            pc.addTransceiver('audio', {direction: 'recvonly'})
            pc.addTransceiver('video', {direction: 'recvonly'})
        }

        pc.onicecandidate = (e) => {
            if(e.candidate){
                this.signaling.send({type: 'ice', to: peerId, candidate: e.candidate})
            }
        }

        pc.ontrack = (e) => this.onRemoteStream(peerId, e.streams[0])
        pc.onconnectionstatechange = () => this.onConnectionState?.(peerId, pc.connectionState)

        return pc
    }

    async callPeer(peerId){
    const pc = this.createPeer(peerId)
    const offer = await pc.createOffer()
    await pc.setLocalDescription(offer)
    this.signaling.send({type: 'offer', to: peerId, sdp: pc.localDescription})
    }

    async handleOffer({from, sdp}){
    const pc = this.pcs.get(from) ?? this.createPeer(from)
    await pc.setRemoteDescription(sdp)
    await this.flushIce(from)
    const answer = await pc.createAnswer()
    await pc.setLocalDescription(answer)
    this.signaling.send({type: 'answer', to: from, sdp: pc.localDescription})
    }

    async handleAnswer({from, sdp}){
        const pc = this.pcs.get(from)
        if(!pc) return
        await pc.setRemoteDescription(sdp)
        await this.flushIce(from)
    }

    async addIce(peerId, candidate){
        const pc = this.pcs.get(peerId)
        if(!pc) return
        if(pc.remoteDescription){
            try{
                await pc.addIceCandidate(candidate)
            }catch(err){
                console.warn('addIceCandidate failed', err)
            }
        } else {
            const queue = this.pendingIce.get(peerId) ?? []
            queue.push(candidate)
            this.pendingIce.set(peerId, queue)
        }
    }

    async flushIce(peerId){
        const pc = this.pcs.get(peerId)
        const queue = this.pendingIce.get(peerId) ?? []
        this.pendingIce.delete(peerId)
        for (const candidate of queue){
            try{
                await pc.addIceCandidate(candidate)
            } catch (err){
                console.warn('addIceCandidate failed', err)
            }
        }
    }

    async setVideoTrack(track){
        this.videoTrackOverride = track
        const next = track ?? this.localStream?.getVideoTracks()[0] ?? null
        for (const pc of this.pcs.values()){
            const sender = pc.getSenders().find((s) => s.track?.kind === 'video')
            if (sender) await sender.replaceTrack(next)
        }
    }

        async replaceCameraTrack(track){
        if (this.videoTrackOverride) return // screen share is on; the camera comes back when it stops
        for (const pc of this.pcs.values()){
            const sender = pc.getSenders().find((s) => s.track?.kind === 'video')
            if (sender) await sender.replaceTrack(track)
        }
    }

    removePeer(peerId){
        this.pcs.get(peerId)?.close()
        this.pcs.delete(peerId)
        this.pendingIce.delete(peerId)
    }

    closeAll(){
        this.pcs.forEach((pc) => pc.close())
        this.pcs.clear()
        this.pendingIce.clear()
    }

}