const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

function validateTelegramInitData(initData, botToken) {
    try {
        if (!initData || !botToken) return true; // Skip validation if no data

        const params = new URLSearchParams(initData);
        const hash = params.get('hash');
        params.delete('hash');

        const dataCheckString = Array.from(params.entries())
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([key, value]) => `${key}=${value}`)
            .join('\n');

        const secretKey = crypto
            .createHmac('sha256', 'WebAppData')
            .update(botToken)
            .digest();

        const calculatedHash = crypto
            .createHmac('sha256', secretKey)
            .update(dataCheckString)
            .digest('hex');

        return calculatedHash === hash;
    } catch (e) {
        console.error('Validation error:', e.message);
        return false;
    }
}

router.post('/login', async (req, res) => {
    try {
        const { initData, telegram_id, username, first_name, last_name, language } = req.body;
        const pool = req.app.get('db');
        const connection = await pool.getConnection();

        // Validate initData if provided (Telegram Mini App)
        if (initData && process.env.BOT_TOKEN) {
            const isValid = validateTelegramInitData(initData, process.env.BOT_TOKEN);
            if (!isValid) {
                connection.release();
                console.log('❌ Invalid initData from user:', telegram_id);
                return res.status(401).json({ error: 'Invalid token' });
            }
        }

        let [users] = await connection.query(
            'SELECT * FROM users WHERE telegram_id = ?',
            [telegram_id]
        );

        let isNewUser = false;

        if (users.length === 0) {
            isNewUser = true;
            const referralCode = `REF${telegram_id}`;

            await connection.query(
                `INSERT INTO users (telegram_id, username, first_name, last_name, referral_code, language)
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [telegram_id, username || '', first_name || '', last_name || '', referralCode, language || 'ar']
            );

            [users] = await connection.query(
                'SELECT * FROM users WHERE telegram_id = ?',
                [telegram_id]
            );

            await connection.query(
                'INSERT INTO activities (user_id, type, details, points) VALUES (?, ?, ?, ?)',
                [users[0].id, 'signup', 'New user registered', 0]
            );
        } else {
            if (language) {
                await connection.query('UPDATE users SET language = ? WHERE id = ?', [language, users[0].id]);
                users[0].language = language;
            }
        }

        const user = users[0];
        connection.release();

        const token = jwt.sign(
            { id: user.id, telegram_id: user.telegram_id },
            process.env.JWT_SECRET,
            { expiresIn: '30d' }
        );

        res.json({
            success: true,
            token,
            isNewUser,
            user: {
                id: user.id,
                telegram_id: user.telegram_id,
                username: user.username,
                first_name: user.first_name,
                last_name: user.last_name,
                balance: user.balance,
                total_earned: user.total_earned,
                referral_count: user.referral_count,
                daily_spins: user.daily_spins,
                spins_used_today: user.spins_used_today,
                ads_today: user.ads_today,
                hourly_gift_available: user.hourly_gift_available,
                referral_code: user.referral_code,
                language: user.language,
                referral_link: `https://t.me/${process.env.TELEGRAM_BOT_USERNAME}?start=ref_${user.referral_code}`
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
});

router.post('/verify', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) return res.status(401).json({ valid: false });

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        res.json({ valid: true, user: decoded });
    } catch {
        res.status(401).json({ valid: false });
    }
});

module.exports = router;