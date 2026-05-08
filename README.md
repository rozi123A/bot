# 🎁 Ads Reward Pro v2.0

بوت تيليغرام احترافي للربح من الإعلانات مع Telegram Mini App متكامل.

## ✨ المميزات

- 📺 **الإعلانات**: 100 نقطة لكل إعلان (cooldown 30 ثانية)
- 🎰 **عجلة الحظ**: 5 لفائيات يومياً مع جوائز 50-1000 نقطة
- 🎁 **الهدية اليومية**: 200 نقطة كل ساعة
- 👥 **نظام الإحالات**: 500 نقطة لكل صديق + 10% أرباح
- ⭐ **سحب Telegram Stars**: حد أدنى 10,000 نقطة
- 📊 **سجل النشاط**: تتبع جميع العمليات
- 🌐 **3 لغات**: العربية، الإنجليزية، الروسية
- 🎨 **تصميم 3D احترافي**: واجهة عصرية وجذابة

## 🛠️ التقنيات

- **Backend**: Node.js + Express
- **Database**: MySQL
- **Frontend**: React + Vite
- **Bot**: Telegraf
- **Design**: CSS3 مع تأثيرات 3D

## 🚀 التثبيت

```bash
# تثبيت جميع dependencies
npm run install:all

# تطوير
npm run dev

# بناء للإنتاج
npm run build

# تشغيل
npm run start
```

## 📁 هيكل المشروع

```
ads-reward-pro/
├── server/
│   ├── index.js          # Server main
│   ├── routes/           # API routes
│   └── database/         # SQL schema
├── client/
│   ├── src/
│   │   ├── pages/       # App pages
│   │   ├── context/     # React context
│   │   └── i18n/        # Translations
│   └── index.html
├── DEPLOY.md             # دليل النشر
└── README.md
```

## 📋 متغيرات البيئة

راجع `.env.example` في مجلد `server/`

## 🌐 اللغات المدعومة

- 🇸🇦 العربية (افتراضي)
- 🇬🇧 English
- 🇷🇺 Русский

## 📜 الرخصة

MIT License