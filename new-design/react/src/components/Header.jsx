import React from 'react'

export default function Header({ onNavigate = () => {} }){
  const [dark,setDark] = React.useState(() => localStorage.getItem('theme') === 'dark')
  React.useEffect(()=>{ document.documentElement.dataset.theme = dark ? 'dark' : ''; localStorage.setItem('theme', dark ? 'dark' : 'light') }, [dark])
  const [token, setToken] = React.useState(() => localStorage.getItem('token'))
  React.useEffect(()=>{ const onStorage = ()=> setToken(localStorage.getItem('token')); window.addEventListener('storage', onStorage); return ()=> window.removeEventListener('storage', onStorage); }, [])
  return (
    <header className="flex items-center justify-between p-4 bg-gradient-to-r from-indigo-600 to-cyan-400 text-white rounded-lg m-4">
      <div className="flex items-center gap-3">
        <svg width="40" height="40" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
          <defs>
            <linearGradient id="g1" x1="0" x2="1">
              <stop offset="0" stopColor="#4F46E5"/>
              <stop offset="1" stopColor="#06B6D4"/>
            </linearGradient>
          </defs>
          <rect width="48" height="48" rx="8" fill="url(#g1)" />
          <path d="M18 33C24 33 30 27 30 21C30 15 24 11 18 11" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
          <circle cx="32" cy="16" r="2.5" fill="white" />
        </svg>
        <div>
          <div className="font-bold">Concursando</div>
          <div className="text-xs opacity-80">IA para seu concurso</div>
        </div>
      </div>
      <nav className="flex items-center gap-3">
        <button onClick={()=>onNavigate('home')} className="text-white/90">Home</button>
        <button onClick={()=>onNavigate('dashboard')} className="text-white/90">Dashboard</button>
        <button onClick={()=>onNavigate('quiz')} className="bg-white/20 px-3 py-1 rounded text-white">Iniciar</button>
        <button aria-pressed={dark} onClick={()=>setDark(d=>!d)} className="ml-2 bg-white/10 p-2 rounded">{dark? '🌙':'☀️'}</button>
        {!token ? (
          <button onClick={()=>onNavigate('login')} className="ml-2 bg-white/10 px-3 py-1 rounded">Login</button>
        ) : (
          <button onClick={()=>{ localStorage.removeItem('token'); localStorage.removeItem('username'); setToken(null); onNavigate('home'); }} className="ml-2 bg-white/10 px-3 py-1 rounded">Logout</button>
        )}
      </nav>
    </header>
  )
}
