const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');

const auth = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    try { req.user = jwt.verify(token, process.env.JWT_SECRET); next(); }
    catch { res.status(401).json({ error: 'Invalid token' }); }
};

// Watch Ad
router.post('/watch', auth, async (req, res) => {
    try {
        const pool = req.app.get('db');
        const userId = req.user.id;
        const reward = parseInt(process.env.AD_REWARD);
        const cooldown = parseInt(process.env.AD_COOLDOWN);

        // Check cooldown
        const [lastWatch] = await pool.query(
            'SELECT watched_at FROM ad_watches WHERE user_id = ? ORDER BY id DESC LIMIT 1',
            [userId]
        );

        if (lastWatch.length > 0) {
            const diff = (Date.now() - new Date(lastWatch[0].watched_at).getTime()) / 1000;
            if (diff < cooldown) {
                return res.status(429).json({
                    error: `Wait ${Math.ceil(cooldown - diff)} seconds`,
                    cooldown_remaining: Math.ceil(cooldown - diff)
                });
            }
        }

        // Record ad watch
        await pool.query('INSERT INTO ad_watches (user_id, reward_amount) VALUES (?, ?)', [userId, reward]);
        await pool.query('UPDATE users SET balance = balance + ?, total_earned = total_earned + ?, ads_today = ads_today + 1 WHERE id = ?', [reward, reward, userId]);

        // Update daily stats
        const today = new Date().toISOString().split('T')[0];
        await pool.query(
            `INSERT INTO daily_stats (user_id, date, ads_watched, earnings) VALUES (?, ?, 1, ?)
             ON DUPLICATE KEY UPDATE ads_watched = ads_watched + 1, earnings = earnings + ?`,
            [userId, today, reward, reward]
        );

        // Log activity
        await pool.query('INSERT INTO activities (user_id, type, details, points) VALUES (?, ?, ?, ?)', [userId, 'ad', 'Watched ad', reward]);

        // Get updated balance
        const [[user]] = await pool.query('SELECT balance FROM users WHERE id = ?', [userId]);

        res.json({
            success: true,
            message: `You earned ${reward} points!`,
            points_earned: reward,
            balance: user.balance,
            cooldown: cooldown
        });

    } catch (error) {
        console.error('Ad watch error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get Ad Config
router.get('/config', auth, async (req, res) => {
    res.json({
        success: true,
        config: {
            reward: parseInt(process.env.AD_REWARD),
            cooldown: parseInt(process.env.AD_COOLDOWN),
            minWithdraw: parseInt(process.env.MIN_WITHDRAW),
            starsRate: parseInt(process.env.STARS_RATE),
            adsgramBlockId: process.env.ADSGRAM_BLOCK_ID
        }
    });
});

module.exports = router;