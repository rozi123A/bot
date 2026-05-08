import React from 'react';
import { useApp } from '../context/AppContext';
import { getTranslation } from '../i18n/translations';

export default function Settings() {
    const { user, api, showToast, changeLanguage, language } = useApp();
    const t = (key) => getTranslation(language, key);

    const handleReset = async () => {
        if (!confirm(language === 'ar' ? 'هل أنت متأكد؟ لا يمكن التراجع!' :
                    language === 'ru' ? 'Вы уверены? Это нельзя отменить!' :
                    'Are you sure? This cannot be undone!')) {
            return;
        }

        try {
            const data = await api.post('/api/user/reset', {});
            if (data.success) {
                showToast(t('success.reset'), 'success');
                window.location.reload();
            }
        } catch (err) {
            showToast(t('errors.generic'), 'error');
        }
    };

    const handleLanguageChange = (lang) => {
        changeLanguage(lang);
    };

    return (
        <div>
            <div className="card-3d">
                <div className="section-title">🌐 {t('settings.language')}</div>

                <div className="lang-selector">
                    {['ar', 'en', 'ru'].map(lang => (
                        <button
                            key={lang}
                            className={`lang-btn ${language === lang ? 'active' : ''}`}
                            onClick={() => handleLanguageChange(lang)}
                        >
                            {t(`settings.languages.${lang}`)}
                        </button>
                    ))}
                </div>
            </div>

            <div className="card-3d">
                <div className="section-title">👤 {language === 'ar' ? 'معلوماتك' : language === 'ru' ? 'Ваша информация' : 'Your Info'}</div>

                <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: 12, padding: 16 }}>
                    <div className="info-row">
                        <span>{language === 'ar' ? 'الاسم' : language === 'ru' ? 'Имя' : 'Name'}</span>
                        <span>{user?.first_name} {user?.last_name}</span>
                    </div>
                    <div className="info-row">
                        <span>@{language === 'ar' ? 'المستخدم' : language === 'ru' ? 'Username' : 'Username'}</span>
                        <span>{user?.username || '-'}</span>
                    </div>
                    <div className="info-row">
                        <span>{t('home.balance')}</span>
                        <span style={{ color: 'var(--accent)' }}>{user?.balance?.toLocaleString()}</span>
                    </div>
                    <div className="info-row">
                        <span>{t('home.totalEarned')}</span>
                        <span>{user?.total_earned?.toLocaleString()}</span>
                    </div>
                    <div className="info-row">
                        <span>{t('home.referrals')}</span>
                        <span>{user?.referral_count || 0}</span>
                    </div>
                </div>
            </div>

            <div className="card-3d" style={{ borderColor: 'rgba(239, 68, 68, 0.5)' }}>
                <div className="section-title" style={{ color: 'var(--danger)' }}>
                    ⚠️ {t('settings.danger')}
                </div>

                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: 16 }}>
                    {language === 'ar' ? 'تصفير الرصيد سيحذف جميع نقاطك. هذا الإجراء لا يمكن التراجع عنه!' :
                     language === 'ru' ? 'Сброс баланса удалит все ваши очки. Это нельзя отменить!' :
                     'Resetting balance will delete all your points. This cannot be undone!'}
                </p>

                <button className="btn btn-danger" onClick={handleReset}>
                    🗑️ {t('settings.reset')}
                </button>
            </div>
        </div>
    );
}