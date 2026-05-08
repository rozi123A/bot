import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { getTranslation } from '../i18n/translations';

export default function Gift() {
    const { user, api, showToast, refreshProfile } = useApp();
    const [available, setAvailable] = useState(true);
    const [claiming, setClaiming] = useState(false);
    const [countdown, setCountdown] = useState(0);
    const t = (key) => getTranslation(user?.language || 'ar', key);

    useEffect(() => {
        checkStatus();
    }, []);

    const checkStatus = async () => {
        try {
            const data = await api.get('/api/gift/status');
            setAvailable(data.available);
        } catch (err) { console.error(err); }
    };

    useEffect(() => {
        let timer;
        if (countdown > 0) {
            timer = setInterval(() => setCountdown(c => c - 1), 1000);
        } else if (!available) {
            setAvailable(true);
        }
        return () => clearInterval(timer);
    }, [countdown, available]);

    const claimGift = async () => {
        if (!available || claiming) return;
        setClaiming(true);

        try {
            const data = await api.post('/api/gift/claim', {});

            if (data.success) {
                showToast(`🎁 +${data.points} ${t('withdraw.points')}!`, 'success');
                setAvailable(false);
                setCountdown(3600); // 1 hour
                refreshProfile();
            } else {
                showToast(data.error, 'error');
            }
        } catch (err) {
            showToast(err.response?.data?.error || t('errors.generic'), 'error');
        } finally {
            setClaiming(false);
        }
    };

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div className="card-3d" style={{ textAlign: 'center' }}>
            <div className="section-title">🎁 {t('gift.title')}</div>

            <p style={{ color: 'var(--text-secondary)', marginBottom: 20 }}>
                {language === 'ar' ? 'احصل على هدية كل ساعة!' :
                 language === 'ru' ? 'Получите подарок каждый час!' :
                 'Get a gift every hour!'}
            </p>

            {/* Gift Box */}
            <div className="gift-box" onClick={claimGift}>
                <div className="gift-box-inner">
                    {claiming ? '⏳' : available ? '🎁' : '🔒'}
                </div>
            </div>

            {available ? (
                <button
                    className="btn btn-success"
                    onClick={claimGift}
                    disabled={claiming}
                >
                    {claiming ? (
                        <>
                            <div className="spinner" style={{ borderTopColor: 'white' }}></div>
                            {language === 'ar' ? 'جاري...' : language === 'ru' ? 'Получаем...' : 'Claiming...'}
                        </>
                    ) : (
                        <>🎁 {t('gift.claim')}</>
                    )}
                </button>
            ) : (
                <div style={{
                    background: 'rgba(0,0,0,0.3)',
                    borderRadius: 12,
                    padding: 16,
                    marginTop: 16
                }}>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: 8 }}>
                        {language === 'ar' ? 'الهدية متاحة بعد:' :
                         language === 'ru' ? 'Подарок будет доступен через:' :
                         'Gift available in:'}
                    </p>
                    <div style={{ fontSize: '2rem', fontWeight: '700', color: 'var(--accent)' }}>
                        {formatTime(countdown)}
                    </div>
                </div>
            )}

            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: 20 }}>
                {language === 'ar' ? '🎁 +200 نقطة لكل ساعة' :
                 language === 'ru' ? '🎁 +200 очков каждый час' :
                 '🎁 +200 points every hour'}
            </p>
        </div>
    );
}

const language = 'ar';