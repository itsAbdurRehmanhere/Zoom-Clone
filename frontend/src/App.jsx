import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchMe } from "./features/auth/authSlice";
import { Route, Routes } from "react-router-dom";
import LoginPage from "./features/auth/LoginPage";
import SignupPage from "./features/auth/SignupPage";
import Dashboard from "./features/rooms/Dashboard";
import Room from "./features/call/Room";
import ProtectedRoute from "./routes/ProtectedRoute";

export default function App() {
  const dispatch = useDispatch()
  const {token, user} = useSelector((state) => state.auth)

  useEffect(() =>{
    if(token && ! user)
      dispatch(fetchMe())
    },[token, user, dispatch])

    return (
     <Routes>
      <Route path="/login" element={<LoginPage/>}/>
      <Route path="/signup" element={<SignupPage/>}/>
      <Route element={<ProtectedRoute/>}>
        <Route path="/" element={<Dashboard/>}/>
        <Route path="/room/:roomId" element={<Room/>}/>
      </Route>
     </Routes> 
    )
}

