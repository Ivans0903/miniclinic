import React, { createContext, useState, useEffect, useContext } from 'react';
import api from '../services/api';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('token') || null);
  const [loading, setLoading] = useState(true);

  // Verifikasi token saat pertama kali disitus
  useEffect(() => {
    const initAuth = async () => {
      const savedToken = localStorage.getItem('token');
      if (savedToken) {
        try {
          const response = await api.get('/auth/me');
          if (response.data && response.data.success) {
            setUser(response.data.data);
            setToken(savedToken);
          } else {
            handleLogout();
          }
        } catch (err) {
          console.error("Session verification failed:", err);
          handleLogout();
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const handleLogin = async (username, password) => {
    try {
      const response = await api.post('/auth/login', { username, password });
      
      if (response.data && response.data.success) {
        const { token: jwtToken, user: userData } = response.data.data;
        
        localStorage.setItem('token', jwtToken);
        localStorage.setItem('user_session', JSON.stringify(userData));
        
        setToken(jwtToken);
        setUser(userData);
        
        return { success: true, user: userData };
      } else {
        return { success: false, message: response.data.message || 'Login gagal' };
      }
    } catch (error) {
      console.error("Login error:", error);
      const msg = error.response?.data?.message || error.response?.data?.error?.auth || "Username atau password salah";
      return { success: false, message: msg };
    }
  };

  const handleLogout = async () => {
    try {
      if (token) {
        await api.post('/auth/logout');
      }
    } catch (error) {
      console.error("Logout error", error);
    } finally {
      localStorage.removeItem('token');
      localStorage.removeItem('user_session');
      setToken(null);
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, isAuthenticated: !!token && !!user, loading, handleLogin, handleLogout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
