import authReducer from "../features/auth/authSlice";
import roomsReducer from "../features/rooms/roomsSlice";
import callSettingsReducer from '../features/call/callSettingsSlice'
import { configureStore } from "@reduxjs/toolkit";

export const store = configureStore({
    reducer:{
        auth: authReducer,
        rooms: roomsReducer,
        callSettings: callSettingsReducer, 
    },
})