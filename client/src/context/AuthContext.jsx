import React, { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from '../api';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('user');
    return saved ? JSON.parse(saved) : null;
  });
  const [loading, setLoading] = useState(true);
  const [initialChecked, setInitialChecked] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token && !user) {
      authApi.me().then(data => {
        setUser(data);
        localStorage.setItem('user', JSON.stringify(data));
      }).catch(() => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
      }).finally(() => {
        setLoading(false);
        setInitialChecked(true);
      });
    } else {
      setLoading(false);
      setInitialChecked(true);
    }
  }, []);

  const login = async (username, password) => {
    setLoading(true);
    try {
      const data = await authApi.login({ username, password });
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      setUser(data.user);
      return data.user;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, initialChecked }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
