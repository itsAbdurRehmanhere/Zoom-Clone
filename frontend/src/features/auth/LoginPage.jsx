import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { login } from "./authSlice";


export default function LoginPage() {
    const [form, setForm] = useState({
        email:'',
        password:'',
    })
    const dispatch = useDispatch()
    const navigate = useNavigate()
    const location = useLocation()
    const {status, error} = useSelector((state) => state.auth)

    const from = location.state?.form?.pathname || '/'

    const handleChange = (e) => setForm({...form, [e.target.name]: e.target.value})

    const handleSubmit = async (e) =>{
        e.preventDefault()
        const result = await dispatch(login(form))
        if (login.fulfilled.match(result)) navigate(from, {replace: true})
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-900">
            <form onSubmit = {handleSubmit} className = "w-full max-w-sm space-y-4 rounded-xl bg-slate-800 p-6">
                <h1 className="text-2xl font-semibold text-white">Log in</h1>
                {error && <p className="text-sm text-red-600">{error}</p>}
                <input name= "email" type="email" value={form.email} onChange={handleChange} placeholder="Email" required className="w-full rounded bg-slate-700 px-3 py-2 text-white" />
                <input name= "password" type="password" value={form.password} onChange={handleChange} placeholder="Password" required className="w-full rounded bg-slate-700 px-3 py-2 text-white"/>
                <button type="submit" disabled={status === 'loading'} className="w-full rounded bg-blue-600 py-2 text-white disabled:opacity-50">
                    {status === 'loading' ? 'Loading...' : 'Log in'}
                </button>
                <p className = "text-sm text-slate-400">
                    No account? <Link to="/signup" className="text-blue-400" >Sign up</Link>
                </p>

            </form>
        </div>
    )
}