import { createAsyncThunk, createSlice, current } from "@reduxjs/toolkit";
import api from "../../lib/api";

export const fetchRooms = createAsyncThunk('/rooms/fetchRooms', async(_, {rejectWithValue}) =>{
    try{
        return await api('/rooms')
    }catch(err){
        return rejectWithValue(err.message)
    }
})

export const createRoom = createAsyncThunk('room/createRoom', async(info, {rejectWithValue}) =>{
    try{
        return await api('/rooms', {method: 'POST', body:info})
    }catch(err){
        return rejectWithValue(err.message)
    }
})

export const fetchRoom = createAsyncThunk('/rooms/fetchRoom', async(code, {rejectWithValue}) =>{
    try{
        return await api(`/rooms/${code}`)
    }catch(err){
        return rejectWithValue(err.message)
    }
})

const roomSlice = createSlice({
    name: 'rooms',
    initialState:{
        items: [],
        current: null,
        status: 'idle',
        error : null
    },
    reducers: {},
    extraReducers: (builder) =>{
        builder
        .addCase(fetchRooms.fulfilled, (state, action) =>{
            state.items = action.payload
        })
        .addCase(createRoom.fulfilled, (state, action)=>{
            state.items.unshift(action.payload)
        })
        .addCase(fetchRoom.pending, (state) =>{
            state.current = null,
            state.status = 'loading',
            state.error = null
        })
        .addCase(fetchRoom.fulfilled, (state, action)=>{
            state.current = action.payload,
            state.status = 'idle'
        })
        .addCase(fetchRoom.rejected, (state, action) =>{
            state.status = 'failed',
            state.error = action.payload
        })
    },
})

export default roomSlice.reducer