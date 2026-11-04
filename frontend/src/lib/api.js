const BASE_URL = import.meta.env.VITE_BASE_URL || 'http://localhost:8000';

export async function api(path, {method = 'GET', body} = {}) {
    const token = localStorage.getItem('token')

    const res = await fetch(`$BASE_URL${path}`,{
        method,
        headers: {
            'Content-type' : 'application/json',
            ...(token && {Authorization: `Bearer ${token}`}),
        },
        body: body ? JSON.stringify(body) : undefined,
    })

    const data = await res.json().catch(() => null)
    if(!res.ok) throw new Error(data?.message || 'Request failed')
    return data
}