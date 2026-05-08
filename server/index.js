require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const cron = require('node-cron');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Database Pool
const pool = mysql.createPool(process.env.DATABASE_URL);
app.set('db', pool);

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/user', require('./routes/user'));
app.use('/api/ad', require('./routes/ad'));
app.use('/api/wheel', require('./routes/wheel'));
app.use('/api/gift', require('./routes/gift'));
app.use('/api/withdraw', require('./routes/withdraw'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/activity', require('./routes/activity'));

// Health Check
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        version: '2.0.0',
        uptime: process.uptime()
    });
});

// Serve static files in production
app.use(express.static('../client/dist'));
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/dist/index.html'));
});

// Initialize Telegram Bot
const { Telegraf, Markup } = require('telegraf');
const bot = new Telegraf(process.env.BOT_TOKEN);

bot.start(async (ctx) => {
    try {
        const from = ctx.from;
        const args = ctx.payload || '';
        let referrerId = null;

        if (args.startsWith('ref_')) {
            referrerId = parseInt(args.replace('ref_', ''));
        }

        const connection = await pool.getConnection();

        // Check if user exists
        const [users] = await connection.query(
            'SELECT * FROM users WHERE telegram_id = ?',
            [from.id]
        );

        if (users.length === 0) {
            const referralCode = `REF${from.id}`;

            // Create new user
            await connection.query(
                `INSERT INTO users (telegram_id, username, first_name, last_name, referral_code, referred_by)
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [from.id, from.username || '', from.first_name || '', from.last_name || '', referralCode, referrerId]
            );

            // Give referral bonus to referrer
            if (referrerId && referrerId !== from.id) {
                await connection.query(
                    'UPDATE users SET balance = balance + 500, referral_count = referral_count + 1 WHERE telegram_id = ?',
                    [referrerId]
                );

                // Log referral activity
                await connection.query(
                    `INSERT INTO activities (user_id, type, details, points) VALUES (?, 'referral', ?, 500)`,
                    [referrerId, `Referral: ${from.first_name || 'User'}`]
                );
            }
        }

        connection.release();

        // Mini App Button
        const keyboard = Markup.inlineKeyboard([
            [Markup.button.webApp('🎁 فتح التطبيق', `${process.env.WEBAPP_URL}?start=${from.id}`)]
        ]);

        await ctx.replyWithPhoto(
            { url: 'https://i.imgur.com/placeholder.png' },
            {
                caption: `<b>🎉 مرحباً بك في Ads Reward Pro!</b>\n\n` +
                        `اكسب نقاطاً من:\n` +
                        `• 📺 مشاهدة الإعلانات\n` +
                        `• 🎰 عجلة الحظ\n` +
                        `• 🎁 الهدية اليومية\n` +
                        `• 👥 الإحالات\n\n` +
                        `🔗 رابط الإحالة الخاص بك:\n` +
                        `t.me/${process.env.TELEGRAM_BOT_USERNAME}?start=ref_${from.id}`,
                parse_mode: 'HTML',
                reply_markup: keyboard.reply_markup
            }
        );
    } catch (error) {
        console.error('Start error:', error);
        ctx.reply('حدث خطأ، يرجى المحاولة لاحقاً');
    }
});

// Help command
bot.help((ctx) => {
    ctx.replyWithHTML(
        `<b>📋 دليل الاستخدام</b>\n\n` +
        `<b>📺 الإعلانات:</b> 100 نقطة لكل إعلان\n` +
        `<b>🎰 العجلة:</b> 5 لفائيات يومياً\n` +
        `<b>🎁 الهدية:</b> متاحة كل ساعة\n` +
        `<b>👥 الإحالات:</b> 500 نقطة لكل صديق\n` +
        `<b>⭐ السحب:</b> نجوم تيليغرام\n\n` +
        `<b>⚠️ الحد الأدنى:</b> 10,000 نقطة`
    );
});

bot.launch();
console.log('🤖 Telegram Bot is running');

// ============================================
// CRON JOBS
// ============================================

// Reset daily spins at midnight
cron.schedule('0 0 * * *', async () => {
    try {
        const conn = await pool.getConnection();
        await conn.query('UPDATE users SET daily_spins = 5, spins_used_today = 0, ads_today = 0');
        await conn.release();
        console.log('✅ Daily resets completed');
    } catch (e) {
        console.error('Reset error:', e);
    }
});

// Hourly gift reset
cron.schedule('0 * * * *', async () => {
    try {
        const conn = await pool.getConnection();
        await conn.query('UPDATE users SET hourly_gift_available = 1');
        await conn.release();
        console.log('✅ Hourly gifts reset');
    } catch (e) {
        console.error('Gift reset error:', e);
    }
});

// Start Server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
});

process.on('SIGINT', () => { bot.stop('SIGINT'); process.exit(); });
process.on('SIGTERM', () => { bot.stop('SIGTERM'); process.exit(); });