/**
 * AuthContext — Manages user authentication state across the app
 * Stores JWT in localStorage, auto-verifies on mount
 */

import { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const API_URL =
    import.meta.env.VITE_API_URL || 'https://navix-backend-uly4.onrender.com';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    // Check for existing token on mount
    useEffect(() => {
        const token = localStorage.getItem('navix_token');
        if (token) {
            axios.get(`${API_URL}/api/auth/profile`, {
                headers: { Authorization: `Bearer ${token}` },
            })
            .then(res => {
                setUser(res.data.user);
            })
            .catch(() => {
                localStorage.removeItem('navix_token');
            })
            .finally(() => setLoading(false));
        } else {
            setLoading(false);
        }
    }, []);

    const login = async (username, password) => {
        const res = await axios.post(`${API_URL}/api/auth/login`, { username, password });
        localStorage.setItem('navix_token', res.data.token);
        setUser(res.data.user);
        return res.data;
    };

    const signup = async (username, password) => {
        const res = await axios.post(`${API_URL}/api/auth/signup`, { username, password });
        localStorage.setItem('navix_token', res.data.token);
        setUser(res.data.user);
        return res.data;
    };

    const logout = () => {
        localStorage.removeItem('navix_token');
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, signup, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within AuthProvider');
    return ctx;
}
