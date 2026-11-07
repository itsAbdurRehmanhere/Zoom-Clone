import { createSlice } from "@reduxjs/toolkit";

const chatSlice = createSlice({
    name: 'chat',
    initialState : {messages: [], unread: 0, open: false},
    reducers: {
        setMessages(state, action) {
            state.messages = action.payload
        },
        addMessages(state, action){
            const m = action.payload
            if( state.messages.some((x) => x.id === m.id)) return
            state.messages.push(m)
            if(!state.open) state.unread += 1
        },
        toggleChat(state){
            state.open = !state.open
            if(state.open) state.unread = 0
        },
        clearChat(state){
            state.messages = []
            state.unread = 0
        },
    },
})

export const {setMessages, addMessages, toggleChat, clearChat} = chatSlice.actions
export default chatSlice.reducer