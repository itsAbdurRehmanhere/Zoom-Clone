import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import { signup } from "./authSlice";



export default function SignupPage() {
  const [form, setForm] = useState({name: '', email: '', password: ''})
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const {status, error} = useSelector((state) => state.auth)


  const handleChange = (e) => setForm({...form, [e.target.name]: e.target.value})

  const handleSubmit = async(e) =>{
    e.preventDefault()
    const result = await dispatch(signup(form))
    if (signup.fulfilled.match(result)) navigate('/',{ replace: true})
  }

  return(
    <div className="min-h-screen flex items-center justify-center bg-slate-900">
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4 rounded-xl bg-slate-800 p-6">
        <h1 className="text-2xl font-semibold text-white">Sign up</h1>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <input name = "name" vlaue={form.name} onChange={handleChange}
        placeholder="Name" required
        className="w-full rounded bg-slate-700 px-3 py-2 text-white"
         />
        <input name = "email" type="email" vlaue={form.email} onChange={handleChange}
        placeholder="Email" required
        className="w-full rounded bg-slate-700 px-3 py-2 text-white"
         />
        <input name = "password" type="password" vlaue={form.password} onChange={handleChange}
        placeholder="Password (min 8 characters" required minLength={8}
        className="w-full rounded bg-slate-700 px-3 py-2 text-white"
         />
         <button type="submit" disabled={status === 'loading'}
         className="w-full rounded bg-blue-600 py-2 text-white disabled:opacity-50"
         >
          {status === 'loading' ? 'Creating account...' : 'Sign up'}
         </button>
         <p className="text-sm text-slate-400">
          Already have an account? <Link to="/login">Log in</Link>
         </p>
      </form>
    </div>
  )
}