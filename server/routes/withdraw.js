const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');

const auth = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    try { req.user = jwt.verify(token, process.env.JWT_SECRET); next(); }
    catch { res.status(401).json({ error: 'Invalid token' }); }
};

// Request Withdrawal
router.post('/request', auth, async (req, res) => {
    try {
        const { amount } = req.body;
        const pool = req.app.get('db');
        const minWithdraw = parseInt(process.env.MIN_WITHDRAW);
        const starsRate = parseInt(process.env.STARS_RATE);

        if (!amount || amount < minWithdraw) {
            return res.status(400).json({ error: `Minimum withdrawal: ${minWithdraw} points` });
        }

        // Check balance
        const [[user]] = await pool.query('SELECT balance FROM users WHERE id = ?', [req.user.id]);

        if (user.balance < amount) {
            return res.status(400).json({ error: 'Insufficient balance' });
        }

        // Check pending withdrawal
        const [pending] = await pool.query(
            'SELECT id FROM withdrawals WHERE user_id = ? AND status = "pending"',
            [req.user.id]
        );

        if (pending.length > 0) {
            return res.status(400).json({ error: 'You have a pending withdrawal request' });
        }

        const stars = Math.floor(amount / starsRate);

        // Create withdrawal request
        await pool.query(
            'INSERT INTO withdrawals (user_id, amount_points, amount_stars) VALUES (?, ?, ?)',
            [req.user.id, amount, stars]
        );

        // Deduct from balance
        await pool.query('UPDATE users SET balance = balance - ? WHERE id = ?', [amount, req.user.id]);

        // Log activity
        await pool.query(
            'INSERT INTO activities (user_id, type, details, points) VALUES (?, ?, ?, ?)',
            [req.user.id, 'withdraw', `Withdrawal request: ${stars} stars`, -amount]
        );

        res.json({
            success: true,
            message: `Withdrawal requested! ${amount} points = ⭐${stars}`,
            stars
        });

    } catch (error) {
        console.error('Withdraw error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get Withdrawal History
router.get('/history', auth, async (req, res) => {
    try {
        const pool = req.app.get('db');
        const [withdrawals] = await pool.query(
            'SELECT * FROM withdrawals WHERE user_id = ? ORDER BY created_at DESC LIMIT 50',
            [req.user.id]
        );

        res.json({ success: true, withdrawals });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Get Withdrawal Info
router.get('/info', auth, async (req, res) => {
    res.json({
        success: true,
        info: {
            min_withdraw: parseInt(process.env.MIN_WITHDRAW),
            stars_rate: parseInt(process.env.STARS_RATE),
            currency: 'Telegram Stars'
        }
    });
});

module.exports = router;