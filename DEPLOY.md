# 🚀 دليل النشر الاحترافي - Render.com

## المتطلبات
1. حساب [Render.com](https://render.com)
2. حساب [Railway](https://railway.app) أو MySQL آخر
3. بوت تيليغرام من [@BotFather](https://t.me/BotFather)

---

## الخطوة 1: إنشاء قاعدة البيانات على Railway

1. اذهب إلى [railway.app](https://railway.app)
2. اضغط **New Project** → **Provision MySQL**
3. انتظر حتى يتم الإنشاء
4. اضغط على قاعدة البيانات → **Variables** → انسخ `DATABASE_URL`

---

## الخطوة 2: رفع الكود على GitHub

```bash
cd ads-reward-pro
git init
git add .
git commit -m "Ads Reward Pro v2.0"
git branch -M main
git remote add origin https://github.com/USERNAME/ads-reward-pro.git
git push -u origin main
```

---

## الخطوة 3: إنشاء Web Service على Render

### 3.1 خدمة API (Backend)

1. **Dashboard** → **New** → **Web Service**
2. اربط مستودع GitHub
3. اضبط الإعدادات:

```
Name: ads-reward-api
Region: Oregon (US West)
Branch: main
Root Directory: (leave empty)
Runtime: Node
Build Command: cd server && npm install
Start Command: cd server && npm start
Plan Type: Free
```

4. اضغط **Create Web Service**

### 3.2 إضافة متغيرات البيئة

اضغط على **Environment** وأضف:

```env
BOT_TOKEN=7812345678:AAFxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
DATABASE_URL=mysql://root:password@-host:3306/railway
JWT_SECRET=yourSecureRandomStringAtLeast32Characters
ADMIN_CHAT_ID=5279238199
ADMIN_KEY=YourSecureAdminKey2026
MIN_WITHDRAW=10000
AD_REWARD=100
AD_COOLDOWN=30
STARS_RATE=1000
DAILY_GIFT_AMOUNT=200
TELEGRAM_BOT_USERNAME=your_bot_username
WEBAPP_URL=https://your-frontend.onrender.com
ADSGRAM_BLOCK_ID=29281
NODE_ENV=production
PORT=3000
```

---

## الخطوة 4: إنشاء Static Site (Frontend)

1. **Dashboard** → **New** → **Static Site**
2. اربط نفس المستودع
3. اضبط الإعدادات:

```
Name: ads-reward-frontend
Region: Oregon
Branch: main
Build Command: cd client && npm install && npm run build
Publish Directory: client/dist
```

4. اضغط **Create Static Site**

---

## الخطوة 5: إعداد قاعدة البيانات

1. اذهب إلى Railway Dashboard
2. اضغط على قاعدة البيانات
3. اضغط **Connect** → **MySQL CLI**
4. انسخ الـ connection string

5. في Render، في خدمة API:
   - اذهب إلى **Shell**
   - شغل:

```sql
-- Users Table
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    telegram_id BIGINT UNIQUE NOT NULL,
    username VARCHAR(255) DEFAULT '',
    first_name VARCHAR(255) DEFAULT '',
    last_name VARCHAR(255) DEFAULT '',
    balance BIGINT DEFAULT 0,
    total_earned BIGINT DEFAULT 0,
    referral_count INT DEFAULT 0,
    daily_spins INT DEFAULT 5,
    spins_used_today INT DEFAULT 0,
    ads_today INT DEFAULT 0,
    hourly_gift_available TINYINT(1) DEFAULT 1,
    referral_code VARCHAR(50) UNIQUE,
    referred_by BIGINT DEFAULT NULL,
    language VARCHAR(10) DEFAULT 'ar',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Activities Log
CREATE TABLE IF NOT EXISTS activities (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    type VARCHAR(50) NOT NULL,
    points BIGINT DEFAULT 0,
    details TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Daily Stats
CREATE TABLE IF NOT EXISTS daily_stats (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    date DATE NOT NULL,
    ads_watched INT DEFAULT 0,
    wheel_spins INT DEFAULT 0,
    gifts_claimed INT DEFAULT 0,
    earnings BIGINT DEFAULT 0,
    UNIQUE KEY unique_user_date (user_id, date)
);

-- Ad Watches
CREATE TABLE IF NOT EXISTS ad_watches (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    reward_amount INT DEFAULT 0,
    watched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Wheel Spins
CREATE TABLE IF NOT EXISTS wheel_spins (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    reward_amount INT DEFAULT 0,
    sector_index INT DEFAULT 0,
    spun_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Gift Claims
CREATE TABLE IF NOT EXISTS gift_claims (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    gift_type VARCHAR(20) DEFAULT 'hourly',
    reward_amount INT DEFAULT 0,
    claimed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Withdrawals
CREATE TABLE IF NOT EXISTS withdrawals (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    amount_points BIGINT NOT NULL,
    amount_stars INT NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    admin_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP NULL
);

-- Admin Logs
CREATE TABLE IF NOT EXISTS admin_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    admin_id BIGINT,
    action VARCHAR(100),
    target_user_id INT,
    details TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## الخطوة 6: إعداد Mini App على Telegram

1. افتح @BotFather
2. اختر بوتك
3. اضغط **Bot Settings** → **Menu Button**
4. اختر **Menu Button URL**
5. أدخل: `https://your-frontend.onrender.com`

---

## الخطوة 7: اختبار البوت

1. ابحث عن بوتك على تيليغرام
2. أرسل `/start`
3. اضغط على **فتح التطبيق**
4. جرب جميع الميزات!

---

## ⚠️ ملاحظات مهمة

### الأمان
- لا تشارك `ADMIN_KEY` و `ADMIN_CHAT_ID`
- استخدم رموز عشوائية قوية
- فعّل HTTPS دائماً

### حدود Free Tier
- الخدمات تنام بعد 15 دقيقة
- وقت الاستجابة الأول قد يكون بطيء

---

## 🔧 استكشاف الأخطاء

### البوت لا يستجيب؟
```bash
# تحقق من logs
render logs <service-id>
```

### خطأ في قاعدة البيانات؟
- تأكد من `DATABASE_URL` صحيح
- تأكد من الجداول موجودة

### Mini App لا يعمل؟
- تحقق من `WEBAPP_URL` في .env
- تأكد من بناء الـ frontend成功了

---

**تم! 🎉**