const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');

const auth = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    try { req.user = jwt.verify(token, process.env.JWT_SECRET); next(); }
    catch { res.status(401).json({ error: 'Invalid token' }); }
};

// Claim Hourly Gift
router.post('/claim', auth, async (req, res) => {
    try {
        const pool = req.app.get('db');
        const userId = req.user.id;
        const giftAmount = parseInt(process.env.DAILY_GIFT_AMOUNT) || 200;

        // Check if gift available
        const [[user]] = await pool.query(
            'SELECT hourly_gift_available FROM users WHERE id = ?',
            [userId]
        );

        if (!user.hourly_gift_available) {
            return res.status(400).json({ error: 'Gift already claimed! Wait for next hour.' });
        }

        // Give gift
        await pool.query(
            'UPDATE users SET hourly_gift_available = 0, balance = balance + ?, total_earned = total_earned + ? WHERE id = ?',
            [giftAmount, giftAmount, userId]
        );

        // Log gift claim
        await pool.query('INSERT INTO gift_claims (user_id, gift_type, reward_amount) VALUES (?, ?, ?)', [userId, 'hourly', giftAmount]);
        await pool.query('INSERT INTO activities (user_id, type, details, points) VALUES (?, ?, ?, ?)', [userId, 'gift', 'Hourly gift', giftAmount]);

        // Update daily stats
        const today = new Date().toISOString().split('T')[0];
        await pool.query(
            `INSERT INTO daily_stats (user_id, date, gifts_claimed, earnings) VALUES (?, ?, 1, ?)
             ON DUPLICATE KEY UPDATE gifts_claimed = gifts_claimed + 1, earnings = earnings + ?`,
            [userId, today, giftAmount, giftAmount]
        );

        const [[updated]] = await pool.query('SELECT balance FROM users WHERE id = ?', [userId]);

        res.json({
            success: true,
            message: `You received ${giftAmount} points! 🎁`,
            points: giftAmount,
            balance: updated.balance
        });

    } catch (error) {
        console.error('Gift error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get Gift Status
router.get('/status', auth, async (req, res) => {
    try {
        const pool = req.app.get('db');
        const [[user]] = await pool.query(
            'SELECT hourly_gift_available FROM users WHERE id = ?',
            [req.user.id]
        );

        res.json({
            success: true,
            available: !!user.hourly_gift_available,
            gift_amount: parseInt(process.env.DAILY_GIFT_AMOUNT) || 200
        });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;