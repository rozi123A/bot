import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { getTranslation } from '../i18n/translations';

export default function Ads() {
    const { user, api, showToast, refreshProfile } = useApp();
    const [cooldown, setCooldown] = useState(0);
    const [watching, setWatching] = useState(false);
    const [config, setConfig] = useState(null);
    const t = (key) => getTranslation(user?.language || 'ar', key);

    useEffect(() => {
        loadConfig();
    }, []);

    useEffect(() => {
        let timer;
        if (cooldown > 0) {
            timer = setInterval(() => setCooldown(c => c > 0 ? c - 1 : 0), 1000);
        }
        return () => clearInterval(timer);
    }, [cooldown]);

    const loadConfig = async () => {
        try {
            const data = await api.get('/api/ad/config');
            if (data.success) setConfig(data.config);
        } catch (err) { console.error(err); }
    };

    const watchAd = async () => {
        if (cooldown > 0 || watching) return;
        setWatching(true);

        try {
            // Simulate watching (3 seconds)
            await new Promise(r => setTimeout(r, 3000));

            const data = await api.post('/api/ad/watch', {});

            if (data.success) {
                showToast(`+${data.points_earned} ${t('ads.earned')}`, 'success');
                setCooldown(data.cooldown);
                refreshProfile();
            } else {
                showToast(data.error, 'error');
            }
        } catch (err) {
            if (err.response?.status === 429) {
                setCooldown(err.response.data.cooldown_remaining);
                showToast(err.response.data.error, 'error');
            } else {
                showToast(t('errors.generic'), 'error');
            }
        } finally {
            setWatching(false);
        }
    };

    return (
        <div className="card-3d" style={{ textAlign: 'center' }}>
            <div className="section-title">📺 {t('ads.title')}</div>

            <div style={{ fontSize: '4rem', margin: '20px 0' }}>🎬</div>

            <div style={{ fontSize: '2rem', fontWeight: '700', color: 'var(--accent)', marginBottom: 8 }}>
                +{config?.reward || 100}
            </div>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 20 }}>
                {t('withdraw.points')} / {t('ads.title').toLowerCase()}
            </p>

            <button
                className="btn btn-primary"
                onClick={watchAd}
                disabled={cooldown > 0 || watching}
            >
                {watching ? (
                    <>
                        <div className="spinner"></div>
                        {t('ads.watching')}
                    </>
                ) : cooldown > 0 ? (
                    <>⏱️ {t('ads.cooldown')} {cooldown} {t('ads.seconds')}</>
                ) : (
                    <>▶️ {t('ads.watchNow')}</>
                )}
            </button>

            {config && (
                <div style={{ marginTop: 24, padding: 16, background: 'rgba(0,0,0,0.2)', borderRadius: 12 }}>
                    <div className="info-row">
                        <span>{t('ads.config.minWithdraw')}</span>
                        <span>{config.minWithdraw?.toLocaleString()}</span>
                    </div>
                    <div className="info-row">
                        <span>{t('ads.config.rate')}</span>
                        <span>{config.starsRate} = ⭐1</span>
                    </div>
                </div>
            )}
        </div>
    );
}