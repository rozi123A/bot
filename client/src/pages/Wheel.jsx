import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { getTranslation } from '../i18n/translations';

const SECTORS = [50, 75, 100, 150, 200, 250, 500, 1000];

export default function Wheel() {
    const { user, api, showToast, refreshProfile } = useApp();
    const [spinning, setSpinning] = useState(false);
    const [rotation, setRotation] = useState(0);
    const [result, setResult] = useState(null);
    const t = (key) => getTranslation(user?.language || 'ar', key);

    const spinsLeft = (user?.daily_spins || 5) - (user?.spins_used_today || 0);

    const spin = async () => {
        if (spinning || spinsLeft <= 0) return;

        setSpinning(true);
        setResult(null);

        try {
            const data = await api.post('/api/wheel/spin', {});

            if (data.success) {
                // Calculate rotation to land on winning sector
                const sectorAngle = 360 / SECTORS.length;
                const targetIndex = data.sector_index;
                const targetAngle = 360 - (targetIndex * sectorAngle) - (sectorAngle / 2);

                // Add multiple rotations for effect
                const newRotation = rotation + (5 * 360) + targetAngle - (rotation % 360);

                setRotation(newRotation);
                setResult(data.reward);

                setTimeout(() => {
                    showToast(`🎉 +${data.reward} ${t('withdraw.points')}!`, 'success');
                    refreshProfile();
                    setSpinning(false);
                }, 5000);
            } else {
                showToast(data.error, 'error');
                setSpinning(false);
            }
        } catch (err) {
            showToast(err.response?.data?.error || t('errors.generic'), 'error');
            setSpinning(false);
        }
    };

    return (
        <div className="card-3d">
            <div className="section-title">🎰 {t('wheel.title')}</div>

            <div style={{ textAlign: 'center', color: 'var(--text-secondary)', marginBottom: 10 }}>
                {t('home.spinsLeft')}: <span style={{ color: 'var(--accent)', fontWeight: '700' }}>{spinsLeft}</span>
            </div>

            {/* 3D Wheel */}
            <div className="wheel-3d">
                <div className="wheel-pointer"></div>
                <div
                    className="wheel-outer"
                    style={{
                        transition: spinning ? 'transform 5s cubic-bezier(0.17, 0.67, 0.12, 0.99)' : 'none',
                        transform: `rotate(${rotation}deg)`
                    }}
                >
                    {/* Sector Labels */}
                    {SECTORS.map((value, i) => (
                        <div
                            key={i}
                            style={{
                                position: 'absolute',
                                width: '100%',
                                height: '100%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'flex-end',
                                paddingRight: '30px',
                                transform: `rotate(${(360 / SECTORS.length) * i}deg)`,
                                transformOrigin: 'center'
                            }}
                        >
                            <span style={{
                                transform: `rotate(${(360 / SECTORS.length) / 2}deg)`,
                                fontWeight: '700',
                                fontSize: '0.75rem',
                                color: '#fff',
                                textShadow: '1px 1px 2px rgba(0,0,0,0.5)'
                            }}>
                                {value}
                            </span>
                        </div>
                    ))}
                </div>
                <div className="wheel-inner">🎯</div>
            </div>

            {/* Result */}
            {result && (
                <div style={{
                    background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.3), rgba(22, 163, 74, 0.3))',
                    borderRadius: 16,
                    padding: 20,
                    textAlign: 'center',
                    margin: '16px 0',
                    border: '2px solid var(--accent-green)'
                }}>
                    <div style={{ fontSize: '2.5rem', fontWeight: '800', color: 'var(--accent)' }}>
                        +{result}
                    </div>
                    <div>{t('withdraw.points')}!</div>
                </div>
            )}

            <button
                className="btn btn-primary"
                onClick={spin}
                disabled={spinning || spinsLeft <= 0}
            >
                {spinning ? (
                    <>
                        <div className="spinner"></div>
                        {t('wheel.spinning')}
                    </>
                ) : spinsLeft <= 0 ? (
                    t('wheel.noSpins')
                ) : (
                    <>🎲 {t('wheel.spin')}</>
                )}
            </button>
        </div>
    );
}