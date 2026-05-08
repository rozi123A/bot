import React from 'react';
import { useApp } from '../context/AppContext';
import { getTranslation } from '../i18n/translations';

export default function Home() {
    const { user, refreshProfile, showToast } = useApp();
    const t = (key) => getTranslation(user?.language || 'ar', key);

    if (!user) return null;

    const handleCopy = () => {
        navigator.clipboard.writeText(user.referral_link);
        showToast(t('success.copied'), 'success');
    };

    return (
        <div>
            {/* Balance Card */}
            <div className="card-3d balance-card">
                <div className="balance-amount">{user.balance?.toLocaleString()}</div>
                <div className="balance-label">{t('home.balance')}</div>
                <div className="total-earned">
                    {t('home.totalEarned')}: {user.total_earned?.toLocaleString()} {t('withdraw.points')}
                </div>
            </div>

            {/* Stats */}
            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-value">{user.ads_today || 0}</div>
                    <div className="stat-label">{t('home.adsToday')}</div>
                </div>
                <div className="stat-card">
                    <div className="stat-value">{user.spins_remaining || 0}</div>
                    <div className="stat-label">{t('home.spinsLeft')}</div>
                </div>
                <div className="stat-card">
                    <div className="stat-value">{user.referral_count || 0}</div>
                    <div className="stat-label">{t('home.referrals')}</div>
                </div>
                <div className="stat-card">
                    <div className="stat-value">{(user.referral_count || 0) * 500}</div>
                    <div className="stat-label">{t('home.referralEarnings')}</div>
                </div>
            </div>

            {/* Referral */}
            <div className="card-3d" style={{ marginTop: 16 }}>
                <div className="section-title">🔗 {t('home.referralLink')}</div>
                <p style={{ color: 'var(--text-secondary)', marginBottom: 12 }}>
                    {language === 'ar' ? 'اكسب 500 نقطة لكل صديق!' : language === 'ru' ? 'Заработайте 500 очков за друга!' : 'Earn 500 points per friend!'}
                </p>
                <div style={{
                    background: 'rgba(0,0,0,0.3)',
                    padding: 12,
                    borderRadius: 10,
                    fontSize: '0.85rem',
                    wordBreak: 'break-all',
                    color: 'var(--secondary)',
                    marginBottom: 12
                }}>
                    {user.referral_link}
                </div>
                <button className="btn btn-secondary" onClick={handleCopy}>
                    📋 {t('home.copyLink')}
                </button>
            </div>
        </div>
    );
}

const language = 'ar';