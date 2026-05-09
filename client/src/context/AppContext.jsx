import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AppContext = createContext();
const API_URL = import.meta.env.VITE_API_URL || '';

export const AppProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [token, setToken] = useState(localStorage.getItem('token'));
    const [language, setLanguage] = useState('ar');
    const [toast, setToast] = useState(null);

    useEffect(() => {
        if (window.Telegram?.WebApp) {
            window.Telegram.WebApp.ready();
            window.Telegram.WebApp.expand();
        }
        initUser();
    }, []);

    const initUser = async () => {
        try {
            if (!window.Telegram?.WebApp?.initDataUnsafe?.user) {
                setLoading(false);
                return;
            }

            const tgUser = window.Telegram.WebApp.initDataUnsafe.user;
            const tgInitData = window.Telegram.WebApp.initData;
            const lang = localStorage.getItem('language') || tgUser.language_code || 'ar';

            // Map language codes
            const supportedLangs = ['ar', 'en', 'ru'];
            const finalLang = supportedLangs.includes(lang) ? lang : 'ar';
            setLanguage(finalLang);

            const response = await axios.post(`${API_URL}/api/auth/login`, {
                initData: tgInitData,
                telegram_id: tgUser.id,
                username: tgUser.username || '',
                first_name: tgUser.first_name,
                last_name: tgUser.last_name || '',
                language: finalLang
            });

            if (response.data.success) {
                setUser(response.data.user);
                setToken(response.data.token);
                localStorage.setItem('token', response.data.token);
            }
        } catch (err) {
            console.error('Init error:', err);
        } finally {
            setLoading(false);
        }
    };

    const api = {
        get: async (path) => {
            const response = await axios.get(`${API_URL}${path}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            return response.data;
        },
        post: async (path, data = {}) => {
            const response = await axios.post(`${API_URL}${path}`, data, {
                headers: { Authorization: `Bearer ${token}` }
            });
            return response.data;
        }
    };

    const showToast = (message, type = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    };

    const changeLanguage = async (lang) => {
        setLanguage(lang);
        localStorage.setItem('language', lang);
        try {
            await api.post('/api/user/language', { language: lang });
        } catch (err) { console.error('Language error:', err); }
    };

    const refreshProfile = async () => {
        try {
            const data = await api.get('/api/user/profile');
            if (data.success) setUser(data.user);
        } catch (err) { console.error('Refresh error:', err); }
    };

    return (
        <AppContext.Provider value={{ user, setUser, loading, token, language, setLanguage, changeLanguage, api, showToast, refreshProfile, toast }}>
            {children}
        </AppContext.Provider>
    );
};

export const useApp = () => useContext(AppContext);