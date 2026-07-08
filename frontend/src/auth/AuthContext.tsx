import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { api, setAccessToken } from '../lib/api';

export interface AuthUser {
  id: number;
  username: string;
  email: string;
  fullName: string;
  role: string;
  permissions: string[];
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  can: (...anyOf: string[]) => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  async function bootstrap() {
    try {
      const refresh = await api.post('/auth/refresh');
      setAccessToken(refresh.data.accessToken);
      setUser(refresh.data.user);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    bootstrap();
    const onUnauthorized = () => {
      setAccessToken(null);
      setUser(null);
    };
    window.addEventListener('wms:unauthorized', onUnauthorized);
    return () => window.removeEventListener('wms:unauthorized', onUnauthorized);
  }, []);

  async function login(username: string, password: string) {
    const res = await api.post('/auth/login', { username, password });
    setAccessToken(res.data.accessToken);
    setUser(res.data.user);
  }

  async function logout() {
    await api.post('/auth/logout').catch(() => {});
    setAccessToken(null);
    setUser(null);
  }

  function can(...anyOf: string[]) {
    if (!user) return false;
    return anyOf.some((p) => user.permissions.includes(p));
  }

  return <AuthContext.Provider value={{ user, loading, login, logout, can }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
