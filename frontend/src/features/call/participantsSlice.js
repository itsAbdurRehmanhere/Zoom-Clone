import { createSlice } from "@reduxjs/toolkit"


const initialState = { selfId: null, byId: {}}

const withDefaults = (peer) => ({...peer, micOn: true, camOn: true, connectionState: 'new'})

const participantsSlice = createSlice({
    name: 'participants',
    initialState,
    reducers: {
        setSelf(state, action) {
            state.selfId = action.payload
        },
        setPeers(state, action){
            state.byId = {}
            action.payload.forEach((p) =>{
                state.byId[p.peer_id] = withDefaults(p)
            })
        },

        addPeer(state, action) {
            state.byId[action.payload.peer_id] = withDefaults(action.payload)
        },
        updatePeer(state, action){
            const { peer_id, ...patch} = action.payload
            if(state.byId[peer_id]) Object.assign(state.byId[peer_id], patch)
        },

        removePeer(state, action){
            delete state.byId[action.payload]
        },

        resetParticipants: () => initialState,
    },
})


export const { setSelf, setPeers, addPeer, updatePeer, removePeer, resetParticipants } = participantsSlice.actions

export default participantsSlice.reducer