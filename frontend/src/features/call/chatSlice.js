import { createSlice } from "@reduxjs/toolkit";

const chatSlice = createSlice({
    name: 'chat',
    initialState : {message: [], unread: 0, open: false},
    reducers: {
        setMessages(state, action) {
            state.message = action.payload
        },
        addMessages(state, action){
            const m = action.payload
            if( state.message.some((x) => x.id === m.id)) return
            state.message.push(m)
            if(!state.open) state.unread += 1
        },
        toggleChat(state){
            state.open = !state.open
            if(state.open) state.unread = 0
        },
        clearChat(state){
            state.message = []
            state.unread = 0
        },
    },
})

export const {setMessages, addMessages, toggleChat, clearChat} = chatSlice.actions
export default chatSlice.reducer