export const API_URL = (typeof window !== 'undefined' && window.location && window.location.origin)
  ? (window.location.origin.includes('vercel.app') ? 'https://quiz-api-z4ri.onrender.com' : window.location.origin)
  : 'http://localhost:3000';

export default API_URL;
