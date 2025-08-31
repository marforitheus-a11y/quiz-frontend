import React from 'react'
import api from '../lib/api'

export default function Login({ onSuccess = () => {} }){
  const [identifier, setIdentifier] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');

  async function submit(e){
    e && e.preventDefault();
    setLoading(true); setError('');
    try{
      const data = await api.request('/login', { method: 'POST', body: JSON.stringify({ loginIdentifier: identifier, password }) });
      if (data && data.token) {
        localStorage.setItem('token', data.token);
        try { const payload = JSON.parse(atob(data.token.split('.')[1])); localStorage.setItem('username', payload.username || ''); onSuccess(payload.role); } catch(e){ onSuccess('user'); }
      }
    }catch(err){ setError(err.message || String(err)); }
    setLoading(false);
  }

  return (
    <div className="max-w-md mx-auto bg-white p-6 rounded shadow">
      <h2 className="text-lg font-bold mb-4">Entrar</h2>
      <form onSubmit={submit}>
        <label className="block mb-2">Usuário ou E-mail</label>
        <input value={identifier} onChange={e=>setIdentifier(e.target.value)} className="w-full mb-3 p-2 border rounded" />
        <label className="block mb-2">Senha</label>
        <input type="password" value={password} onChange={e=>setPassword(e.target.value)} className="w-full mb-3 p-2 border rounded" />
        {error && <div className="text-red-600 mb-2">{error}</div>}
        <div className="flex gap-2 justify-end">
          <button type="submit" disabled={loading} className="px-4 py-2 bg-indigo-600 text-white rounded">{loading ? 'Entrando...' : 'Entrar'}</button>
        </div>
      </form>
    </div>
  )
}
