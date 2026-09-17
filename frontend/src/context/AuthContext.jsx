import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { authApi } from '../api/auth.api.js';
import { getSession, setSession as persistSession } from '../api/client.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSessionState] = useState(() => getSession());
  const [loading, setLoading] = useState(false);

  const applySession = useCallback((data) => {
    persistSession(data);
    setSessionState(data);
  }, []);

  const login = useCallback(
    async (email, password) => {
      setLoading(true);
      try {
        const data = await authApi.login({ email, password });
        applySession(data);
        return data.user;
      } finally {
        setLoading(false);
      }
    },
    [applySession],
  );

  const register = useCallback(
    async (fullName, email, password) => {
      setLoading(true);
      try {
        const data = await authApi.register({ fullName, email, password });
        applySession(data);
        return data.user;
      } finally {
        setLoading(false);
      }
    },
    [applySession],
  );

  const logout = useCallback(async () => {
    const current = getSession();
    persistSession(null);
    setSessionState(null);
    if (current?.refreshToken) {
      // Best-effort - the user is logged out locally regardless of whether this succeeds.
      authApi.logout(current.refreshToken).catch(() => {});
    }
  }, []);

  // api/client.js dispatches this after a failed silent refresh (expired
  // or revoked refresh token) so every open tab reacts, not just the one
  // that happened to make the failing request.
  useEffect(() => {
    const onExpired = () => setSessionState(null);
    window.addEventListener('docflow:session-expired', onExpired);
    return () => window.removeEventListener('docflow:session-expired', onExpired);
  }, []);

  const value = {
    user: session?.user ?? null,
    isAuthenticated: Boolean(session?.accessToken),
    loading,
    login,
    register,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider.');
  return ctx;
}
