const API_URL = (typeof window !== 'undefined' && window.location && window.location.origin)
  ? window.location.origin
  : 'http://localhost:3000';

function getToken() {
  return localStorage.getItem('token');
}

async function request(path, opts = {}) {
  const headers = opts.headers || {};
  if (!headers['Content-Type'] && !(opts.body instanceof FormData)) headers['Content-Type'] = 'application/json';
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${API_URL}${path}`, { ...opts, headers });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(txt || `HTTP ${res.status}`);
  }
  // if no content
  if (res.status === 204) return null;
  const ct = res.headers.get('content-type') || '';
  if (ct.includes('application/json')) return res.json();
  return res.text();
}

export default { request };
