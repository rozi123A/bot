import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { getTranslation } from '../i18n/translations';

export default function Withdraw() {
    const { user, api, showToast, refreshProfile } = useApp();
    const [amount, setAmount] = useState('');
    const [loading, setLoading] = useState(false);
    const [info, setInfo] = useState(null);
    const [history, setHistory] = useState([]);
    const t = (key) => getTranslation(user?.language || 'ar', key);

    useEffect(() => {
        loadInfo();
        loadHistory();
    }, []);

    const loadInfo = async () => {
        try {
            const data = await api.get('/api/withdraw/info');
            if (data.success) setInfo(data.info);
        } catch (err) { console.error(err); }
    };

    const loadHistory = async () => {
        try {
            const data = await api.get('/api/withdraw/history');
            if (data.success) setHistory(data.withdrawals);
        } catch (err) { console.error(err); }
    };

    const handleWithdraw = async () => {
        const points = parseInt(amount);
        if (!points || points <= 0) {
            showToast(t('errors.generic'), 'error');
            return;
        }

        setLoading(true);
        try {
            const data = await api.post('/api/withdraw/request', { amount: points });

            if (data.success) {
                showToast(data.message, 'success');
                setAmount('');
                refreshProfile();
                loadHistory();
            } else {
                showToast(data.error, 'error');
            }
        } catch (err) {
            showToast(err.response?.data?.error || t('errors.generic'), 'error');
        } finally {
            setLoading(false);
        }
    };

    const stars = Math.floor(parseInt(amount || 0) / (info?.stars_rate || 1000));

    return (
        <div>
            <div className="card-3d">
                <div className="section-title">⭐ {t('withdraw.title')}</div>

                {/* Info */}
                <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: 12, padding: 16, marginBottom: 16 }}>
                    <div className="info-row">
                        <span>{language === 'ar' ? 'الرصيد المتاح' : language === 'ru' ? 'Доступный баланс' : 'Available Balance'}</span>
                        <span style={{ color: 'var(--accent)', fontWeight: '700' }}>
                            {user?.balance?.toLocaleString()} {t('withdraw.points')}
                        </span>
                    </div>
                    <div className="info-row">
                        <span>{t('withdraw.minRequired')}</span>
                        <span>{info?.min_withdraw?.toLocaleString()}</span>
                    </div>
                    <div className="info-row">
                        <span>{t('ads.config.rate')}</span>
                        <span>{info?.stars_rate} = ⭐1</span>
                    </div>
                </div>

                {/* Input */}
                <div className="input-group">
                    <input
                        type="number"
                        placeholder={language === 'ar' ? 'أدخل عدد النقاط' : language === 'ru' ? 'Введите количество очков' : 'Enter points amount'}
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                    />
                </div>

                {/* Preview */}
                {amount && (
                    <div style={{
                        background: 'linear-gradient(135deg, rgba(255, 215, 0, 0.2), rgba(245, 158, 11, 0.2))',
                        borderRadius: 12,
                        padding: 16,
                        textAlign: 'center',
                        marginBottom: 16,
                        border: '1px solid rgba(255, 215, 0, 0.3)'
                    }}>
                        <div style={{ fontSize: '2rem', fontWeight: '800', color: '#ffd700' }}>
                            ⭐ {stars}
                        </div>
                        <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                            {parseInt(amount).toLocaleString()} {t('withdraw.points')}
                        </div>
                    </div>
                )}

                <button
                    className="btn btn-primary"
                    onClick={handleWithdraw}
                    disabled={loading || !amount}
                >
                    {loading ? (
                        <><div className="spinner"></div></>
                    ) : (
                        <>📤 {t('withdraw.request')}</>
                    )}
                </button>
            </div>

            {/* History */}
            {history.length > 0 && (
                <div className="card-3d">
                    <div className="section-title">📋 {t('withdraw.history')}</div>

                    {history.map((item, i) => (
                        <div key={i} style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '12px',
                            background: 'rgba(0,0,0,0.2)',
                            borderRadius: 10,
                            marginBottom: 8
                        }}>
                            <div>
                                <div style={{ fontWeight: '600' }}>⭐ {item.amount_stars}</div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                    {item.amount_points?.toLocaleString()} {t('withdraw.points')}
                                </div>
                            </div>
                            <div style={{
                                padding: '4px 10px',
                                borderRadius: 6,
                                fontSize: '0.75rem',
                                background: item.status === 'approved' ? 'rgba(34, 197, 94, 0.3)' :
                                           item.status === 'pending' ? 'rgba(251, 191, 36, 0.3)' :
                                           'rgba(239, 68, 68, 0.3)',
                                color: item.status === 'approved' ? '#86efac' :
                                       item.status === 'pending' ? '#fde047' : '#fca5a5'
                            }}>
                                {t(`withdraw.status.${item.status}`)}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

const language = 'ar';