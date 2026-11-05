import { useSelector } from "react-redux"
import { Navigate, Outlet, useLocation } from "react-router-dom"

export default function ProtectedRoute() {
    const token = useSelector((state) => state.auth.token)
    const location = useLocation()
    if(!token){
        return <Navigate to= "/login" replace state = {{from: location}} />
    }

    return (
        <Outlet />)
}