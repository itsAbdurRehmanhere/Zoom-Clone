import { createSlice, createAsyncThunk, isAnyOf } from "@reduxjs/toolkit";
import api from "../../utils/api";

export const login = createAsyncThunk('auth/login', async (creds, {rejectWithValue}) =>{
    try{
        const data = await api('/auth/login', {method: 'POST', body: creds})
        localStorage.setItem('token', data.access_token)
        return data
    }
    catch(err){
        return rejectWithValue(err.message)
    }
})

export const signup = createAsyncThunk('auth/signup', async(info, {rejectWithValue}) => {
    try{
        const data = await api('/auth/signup', {method:'POST', body: info})
        localStorage.setItem('token', data.access_token)
        return data
    }catch(err){
        return rejectWithValue(err.message)
    }
})


export const fetchMe = createAsyncThunk('auth/fetchMe', async(_, {rejectWithValue}) =>{
    try{
        return await api('/auth/me')
    }
    catch(err){
        localStorage.removeItem('token')
        return rejectWithValue(err.message)
    }
})

const authSlice = createSlice({
    name: 'auth',
    initialState: {
        user: null,
        token : localStorage.getItem('token'),
        status: 'idle',
        error: null,
    },
    reducers: {
        logout(state){
            state.user = null
            state.token = null
            localStorage.removeItem('token')
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchMe.fullfilled, (state, action) =>{
                state.user = action.payload
            })
            .addCase(fetchMe.rejected, (state, action) => {
                state.user = null
                state.token = null
            })
            .addMatcher(isAnyOf(login.pending, signup.pending),(state) => {
                state.status = 'loading'
                state.error = null
            })
            .addMatcher(isAnyOf(login.fullfilled, signup.fullfilled), (state, action) =>{
                state.status = 'succeeded'
                state.token = action.payload.access_token
                state.user = action.payload.user
            })

            .addMatcher(isAnyOf(login.rejected, signup.rejected), (state, action) =>{
                state.status = 'failed'
                state.error = action.payload
            })
    },
})


export const {logout} = authSlice.actions
export default authSlice.reducer