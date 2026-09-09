import React, { createContext, useState, useEffect } from 'react';
import api from '../services/api';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    // 1. Auth Context / State Store
    const [user, setUser] = useState(() => {
        const savedUser = localStorage.getItem('user_session');
        return savedUser ? JSON.parse(savedUser) : null;
    });
    
    const [token, setToken] = useState(() => {
        return localStorage.getItem('jwt_token') || null;
    });

    const isAuthenticated = token !== null;

    const handleLogin = async (username, password) => {
        const clientErrors = {};
        if (!username) clientErrors.username = "Username tidak boleh kosong";
        if (!password) clientErrors.password = "Password tidak boleh kosong";

        if (Object.keys(clientErrors).length > 0) {
            return { success: false, errors: clientErrors };
        }

        try {
            const response = await api.post('/login', { username, password });
            
            if (response.data.success) {
                const resData = response.data.data;
                // SAVE_TO_STORAGE
                localStorage.setItem('jwt_token', resData.token);
                localStorage.setItem('user_session', JSON.stringify(resData.user));
                
                // UPDATE_STATE
                setToken(resData.token);
                setUser(resData.user);
                
                return { success: true }; // REDIRECT diatur di layer Komponen (UI)
            }
        } catch (error) {
            const errorMessage = error.response?.data?.message || "Terjadi kesalahan saat login";
            return { success: false, message: errorMessage };
        }
    };

    const handleLogout = async () => {
        try {
            await api.post('/logout'); 
        } catch (error) {
            console.error("Logout error", error);
        } finally {
            // REMOVE_FROM_STORAGE
            localStorage.removeItem('jwt_token');
            localStorage.removeItem('user_session');
            
            // UPDATE_STATE
            setToken(null);
            setUser(null);
        }
    };

    return (
        <AuthContext.Provider value={{ user, token, isAuthenticated, handleLogin, handleLogout }}>
            {children}
        </AuthContext.Provider>
    );
};
