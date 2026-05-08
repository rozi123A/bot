import React, { useState } from 'react';
import { useApp } from './context/AppContext';
import { getTranslation } from './i18n/translations';
import Home from './pages/Home';
import Ads from './pages/Ads';
import Wheel from './pages/Wheel';
import Gift from './pages/Gift';
import Withdraw from './pages/Withdraw';
import Activity from './pages/Activity';
import Settings from './pages/Settings';

const TABS = [
    { id: 'home', icon: '🏠' },
    { id: 'ads', icon: '📺' },
    { id: 'wheel', icon: '🎰' },
    { id: 'gift', icon: '🎁' },
    { id: 'withdraw', icon: '⭐' },
    { id: 'activity', icon: '📊' },
    { id: 'settings', icon: '⚙️' }
];

export default function App() {
    const { user, loading, language, toast } = useApp();
    const [activeTab, setActiveTab] = useState('home');

    const t = (key) => getTranslation(language, key);

    const renderPage = () => {
        switch (activeTab) {
            case 'home': return <Home />;
            case 'ads': return <Ads />;
            case 'wheel': return <Wheel />;
            case 'gift': return <Gift />;
            case 'withdraw': return <Withdraw />;
            case 'activity': return <Activity />;
            case 'settings': return <Settings />;
            default: return <Home />;
        }
    };

    if (loading) {
        return (
            <div className="app" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ textAlign: 'center' }}>
                    <div className="spinner" style={{ width: 50, height: 50 }}></div>
                    <p style={{ marginTop: 20, color: 'var(--text-secondary)' }}>{t('app.loading')}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="app">
            {/* Toast */}
            {toast && (
                <div className={`toast ${toast.type}`}>
                    {toast.message}
                </div>
            )}

            {/* Header */}
            <header className="header">
                <h1>🎁 {t('app.name')}</h1>
                {user && (
                    <p>{language === 'ar' ? 'مرحباً' : language === 'ru' ? 'Привет' : 'Welcome'}, {user.first_name}! 👋</p>
                )}
            </header>

            {/* Content */}
            {renderPage()}

            {/* Navigation */}
            <nav className="bottom-nav">
                {TABS.map(tab => (
                    <button
                        key={tab.id}
                        className={`nav-item ${activeTab === tab.id ? 'active' : ''}`}
                        onClick={() => setActiveTab(tab.id)}
                    >
                        <span className="nav-icon">{tab.icon}</span>
                        <span>{t(`nav.${tab.id}`)}</span>
                    </button>
                ))}
            </nav>
        </div>
    );
}