import { createContext, useContext, useEffect, useState } from 'react';
import { api, setToken, getToken } from '../api/client.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // On load, if a token exists, confirm it's still valid.
  useEffect(() => {
    const token = getToken();
    if (!token) { setLoading(false); return; }
    api
      .get('/auth/me')
      .then((res) => setUser(res.data.user))
      .catch(() => setToken(null))
      .finally(() => setLoading(false));
  }, []);

  async function login(username, password) {
    const res = await api.post('/auth/login', { username, password });
    setToken(res.data.token);
    setUser(res.data.user);
  }

  function logout() {
    setToken(null);
    setUser(null);
  }

  // Role ranking mirrors the backend so the UI can hide what a user can't do.
  const rank = { worker: 1, manager: 2, admin: 3 };
  const can = (minRole) => (rank[user?.role] || 0) >= (rank[minRole] || 0);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, can }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
