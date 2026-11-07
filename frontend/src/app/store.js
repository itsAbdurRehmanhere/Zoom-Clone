import authReducer from "../features/auth/authSlice";
import roomsReducer from "../features/rooms/roomsSlice";
import callSettingsReducer from '../features/call/callSettingsSlice'
import participantsReducer from '../features/call/participantsSlice'
import { configureStore } from "@reduxjs/toolkit";
import chatReducer from '../features/call/chatSlice'

export const store = configureStore({
    reducer:{
        auth: authReducer,
        rooms: roomsReducer,
        callSettings: callSettingsReducer,
        participants: participantsReducer, 
        chat : chatReducer,
    },
})