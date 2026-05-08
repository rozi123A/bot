const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');

const auth = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    try {
        req.user = jwt.verify(token, process.env.JWT_SECRET);
        next();
    } catch { res.status(401).json({ error: 'Invalid token' }); }
};

// Get Profile
router.get('/profile', auth, async (req, res) => {
    try {
        const pool = req.app.get('db');
        const [users] = await pool.query(
            `SELECT id, telegram_id, username, first_name, last_name, balance, total_earned,
                    referral_count, daily_spins, spins_used_today, ads_today, hourly_gift_available,
                    referral_code, language, created_at
             FROM users WHERE id = ?`,
            [req.user.id]
        );

        if (!users.length) return res.status(404).json({ error: 'User not found' });

        const user = users[0];

        // Get today's stats
        const today = new Date().toISOString().split('T')[0];
        const [stats] = await pool.query(
            'SELECT * FROM daily_stats WHERE user_id = ? AND date = ?',
            [user.id, today]
        );

        res.json({
            success: true,
            user: {
                ...user,
                spins_remaining: user.daily_spins - user.spins_used_today,
                referral_link: `https://t.me/${process.env.TELEGRAM_BOT_USERNAME}?start=ref_${user.referral_code}`,
                today_stats: stats[0] || {
                    ads_watched: 0,
                    wheel_spins: 0,
                    gifts_claimed: 0,
                    earnings: 0
                }
            }
        });
    } catch (error) {
        console.error('Profile error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Update Language
router.post('/language', auth, async (req, res) => {
    try {
        const { language } = req.body;
        const pool = req.app.get('db');

        await pool.query('UPDATE users SET language = ? WHERE id = ?', [language, req.user.id]);

        res.json({ success: true, language });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Reset User Balance (Self)
router.post('/reset', auth, async (req, res) => {
    try {
        const pool = req.app.get('db');

        await pool.query('UPDATE users SET balance = 0, total_earned = 0 WHERE id = ?', [req.user.id]);

        res.json({ success: true, message: 'Balance reset successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Get Activity History
router.get('/activities', auth, async (req, res) => {
    try {
        const pool = req.app.get('db');
        const page = parseInt(req.query.page) || 1;
        const limit = 20;
        const offset = (page - 1) * limit;

        const [activities] = await pool.query(
            'SELECT * FROM activities WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?',
            [req.user.id, limit, offset]
        );

        const [[{ total }]] = await pool.query(
            'SELECT COUNT(*) as total FROM activities WHERE user_id = ?',
            [req.user.id]
        );

        res.json({
            success: true,
            activities,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;