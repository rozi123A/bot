import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { getTranslation } from '../i18n/translations';

const TYPE_ICONS = {
    ad: '📺',
    wheel: '🎰',
    gift: '🎁',
    referral: '👥',
    withdraw: '⭐',
    signup: '🎉'
};

export default function Activity() {
    const { user, api } = useApp();
    const [activities, setActivities] = useState([]);
    const [loading, setLoading] = useState(true);
    const t = (key) => getTranslation(user?.language || 'ar', key);

    useEffect(() => {
        loadActivities();
    }, []);

    const loadActivities = async () => {
        try {
            const data = await api.get('/api/activity');
            if (data.success) setActivities(data.activities);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    const formatDate = (date) => {
        const d = new Date(date);
        return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div className="card-3d">
            <div className="section-title">📊 {t('activity.title')}</div>

            {loading ? (
                <div style={{ textAlign: 'center', padding: 40 }}>
                    <div className="spinner"></div>
                </div>
            ) : activities.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-secondary)' }}>
                    <div style={{ fontSize: '3rem', marginBottom: 16 }}>📭</div>
                    {t('activity.noActivity')}
                </div>
            ) : (
                activities.map((activity, i) => (
                    <div key={i} className="activity-item">
                        <div className={`activity-icon ${activity.type}`}>
                            {TYPE_ICONS[activity.type] || '📌'}
                        </div>
                        <div className="activity-details">
                            <div>{t(`activity.types.${activity.type}`) || activity.type}</div>
                            <div className="activity-date">{formatDate(activity.created_at)}</div>
                        </div>
                        <div className={`activity-points ${activity.points < 0 ? 'negative' : ''}`}>
                            {activity.points > 0 ? '+' : ''}{activity.points?.toLocaleString()}
                        </div>
                    </div>
                ))
            )}
        </div>
    );
}