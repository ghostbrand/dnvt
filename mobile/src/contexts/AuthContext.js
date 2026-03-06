import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../config';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(null);

  useEffect(() => {
    loadStoredAuth();
  }, []);

  const loadStoredAuth = async () => {
    try {
      const storedToken = await AsyncStorage.getItem('dnvt_token');
      if (storedToken) {
        setToken(storedToken);
        // Verify token
        const response = await fetch(`${API_URL}/auth/me`, {
          headers: { 'Authorization': `Bearer ${storedToken}` }
        });
        if (response.ok) {
          const userData = await response.json();
          setUser(userData);
        } else {
          await AsyncStorage.removeItem('dnvt_token');
        }
      }
    } catch (error) {
      console.error('Error loading auth:', error);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, senha) => {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, senha })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Erro ao fazer login');
    }

    const data = await response.json();
    await AsyncStorage.setItem('dnvt_token', data.access_token);
    setToken(data.access_token);
    setUser(data.user);
    return data;
  };

  const register = async (nome, email, senha, telefone) => {
    const response = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome, email, senha, telefone, tipo: 'CIDADAO' })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Erro ao registrar');
    }

    const data = await response.json();
    await AsyncStorage.setItem('dnvt_token', data.access_token);
    setToken(data.access_token);
    setUser(data.user);
    return data;
  };

  const logout = async () => {
    await AsyncStorage.removeItem('dnvt_token');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout }}>
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
