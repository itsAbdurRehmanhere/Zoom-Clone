const WS_URL = (import.meta.env.VITE_BASE_URL || 'http://localhost:8000').replace(/^http/, 'ws')

export default class Signaling{
    constructor(code){
        this.code = code
        this.ws = null
        this.handlers = {}
        this.closedByUs = false
    }

    on(type, handler){
        this.handlers[type] = handler
        return this
    }

    connect({token, name, guestId}){
        return new Promise((resolve, reject) =>{
            const ws = new WebSocket(`${WS_URL}/ws/room/${this.code}`)
            this.ws = ws

            ws.onopen = () => this.send({type: 'join', token, name, guest_id:guestId})

            ws.onmessage= (e) => {
                const message = JSON.parse(e.data)
                if(message.type === 'joined') resolve(message)
                this.handlers[message.type]?.(message)
            }

            ws.onclose = (e) =>{
                reject(e)
                if(!this.closedByUs) this.handlers.close?.(e)
            }
        })
    }

    send(msg){
        if(this.ws?.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify(msg))
    }

    close(){
        this.closedByUs = true
        this.ws?.close()
    }
}