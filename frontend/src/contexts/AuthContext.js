import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const AuthContext = createContext(null);

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(() => localStorage.getItem('dnvt_token'));

  const checkAuth = useCallback(async () => {
    // CRITICAL: If returning from OAuth callback, skip the /me check.
    // AuthCallback will exchange the session_id and establish the session first.
    if (window.location.hash?.includes('session_id=')) {
      setLoading(false);
      return;
    }

    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`${API}/auth/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
      } else {
        localStorage.removeItem('dnvt_token');
        setToken(null);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const login = async (email, senha) => {
    let response;
    try {
      response = await fetch(`${API}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, senha })
      });
    } catch (networkError) {
      throw new Error('Erro de conexão com o servidor. Verifique sua internet.');
    }

    if (!response.ok) {
      let errorMsg = 'Email ou senha incorretos';
      try {
        const error = await response.json();
        errorMsg = error.detail || error.error || errorMsg;
      } catch (e) {}
      throw new Error(errorMsg);
    }

    const data = await response.json();
    localStorage.setItem('dnvt_token', data.access_token);
    setToken(data.access_token);
    setUser(data.user);
    return data;
  };

  const register = async (nome, email, senha, telefone, tipo) => {
    const response = await fetch(`${API}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome, email, senha, telefone, tipo })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Erro ao registrar');
    }

    const data = await response.json();
    localStorage.setItem('dnvt_token', data.access_token);
    setToken(data.access_token);
    setUser(data.user);
    return data;
  };

  const googleLogin = async (sessionId) => {
    const response = await fetch(`${API}/auth/google/session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: sessionId })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Erro ao autenticar com Google');
    }

    const data = await response.json();
    localStorage.setItem('dnvt_token', data.access_token);
    setToken(data.access_token);
    setUser(data.user);
    return data;
  };

  const refreshUser = useCallback(async () => {
    if (!token) return;
    
    try {
      const response = await fetch(`${API}/auth/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
      }
    } catch (error) {
      console.error('Refresh user failed:', error);
    }
  }, [token]);

  const logout = () => {
    localStorage.removeItem('dnvt_token');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, googleLogin, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
