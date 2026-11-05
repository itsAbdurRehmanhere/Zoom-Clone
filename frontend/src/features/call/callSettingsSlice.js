import { createSlice } from "@reduxjs/toolkit";

const callSettingsSlice = createSlice({
  name: "callSettings",
  initialState: {
    displayName: "",
    micOn: true,
    camOn: true,
    audioDeviceId: null,
    videoDeviceId: null,
  },
  reducers: {
    setDisplayName(state, action) {
      state.displayName = action.payload;
    },
    toggleMic(state) {
      state.micOn = !state.micOn;
    },
    toggleCam(state) {
      state.camOn = !state.camOn;
    },
    setAudioDevice(state, action) {
      state.audioDeviceId = action.payload;
    },
    setVideoDevice(state, action) {
      state.videoDeviceId = action.payload;
    },
  },
});

export const {
  setDisplayName,
  toggleMic,
  toggleCam,
  setAudioDevide,
  setViderDevice,
} = callSettingsSlice.actions;

export default callSettingsSlice.reducer;
