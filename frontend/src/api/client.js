import axios from 'axios';

// At build time VITE_API_URL points at the backend. Defaults to the same-origin
// /api path, which nginx proxies to the backend container in production.
const baseURL = import.meta.env.VITE_API_URL || '/api';

export const api = axios.create({ baseURL });

const TOKEN_KEY = 'wms_token';

export function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

// Attach the bearer token to every request.
api.interceptors.request.use((cfg) => {
  const token = getToken();
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

// Normalise error messages so the UI can show one consistent shape.
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const message = err.response?.data?.error || err.message || 'Request failed.';
    return Promise.reject(new Error(message));
  }
);
