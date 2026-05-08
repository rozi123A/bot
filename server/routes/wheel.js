const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');

const SECTORS = [
    { value: 50, label: { ar: '50 نقطة', en: '50 points', ru: '50 очков' } },
    { value: 75, label: { ar: '75 نقطة', en: '75 points', ru: '75 очков' } },
    { value: 100, label: { ar: '100 نقطة', en: '100 points', ru: '100 очков' } },
    { value: 150, label: { ar: '150 نقطة', en: '150 points', ru: '150 очков' } },
    { value: 200, label: { ar: '200 نقطة', en: '200 points', ru: '200 очков' } },
    { value: 250, label: { ar: '250 نقطة', en: '250 points', ru: '250 очков' } },
    { value: 500, label: { ar: '500 نقطة', en: '500 points', ru: '500 очков' } },
    { value: 1000, label: { ar: '1000 نقطة', en: '1000 points', ru: '1000 очков' } }
];

const auth = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    try { req.user = jwt.verify(token, process.env.JWT_SECRET); next(); }
    catch { res.status(401).json({ error: 'Invalid token' }); }
};

// Spin Wheel
router.post('/spin', auth, async (req, res) => {
    try {
        const pool = req.app.get('db');
        const userId = req.user.id;

        // Check spins
        const [[user]] = await pool.query(
            'SELECT daily_spins, spins_used_today FROM users WHERE id = ?',
            [userId]
        );

        const spinsRemaining = user.daily_spins - user.spins_used_today;
        if (spinsRemaining <= 0) {
            return res.status(400).json({ error: 'No spins remaining!' });
        }

        // Weighted random selection (lower values more common)
        const weights = [20, 18, 15, 12, 10, 8, 5, 2];
        const totalWeight = weights.reduce((a, b) => a + b, 0);
        let random = Math.random() * totalWeight;
        let sectorIndex = 0;

        for (let i = 0; i < weights.length; i++) {
            random -= weights[i];
            if (random <= 0) {
                sectorIndex = i;
                break;
            }
        }

        const reward = SECTORS[sectorIndex].value;

        // Update user
        await pool.query(
            'UPDATE users SET spins_used_today = spins_used_today + 1, balance = balance + ?, total_earned = total_earned + ? WHERE id = ?',
            [reward, reward, userId]
        );

        // Log spin
        await pool.query('INSERT INTO wheel_spins (user_id, reward_amount, sector_index) VALUES (?, ?, ?)', [userId, reward, sectorIndex]);

        // Update daily stats
        const today = new Date().toISOString().split('T')[0];
        await pool.query(
            `INSERT INTO daily_stats (user_id, date, wheel_spins, earnings) VALUES (?, ?, 1, ?)
             ON DUPLICATE KEY UPDATE wheel_spins = wheel_spins + 1, earnings = earnings + ?`,
            [userId, today, reward, reward]
        );

        // Log activity
        await pool.query('INSERT INTO activities (user_id, type, details, points) VALUES (?, ?, ?, ?)', [userId, 'wheel', `Wheel spin - ${reward}`, reward]);

        // Get updated data
        const [[updated]] = await pool.query(
            'SELECT balance, daily_spins, spins_used_today FROM users WHERE id = ?',
            [userId]
        );

        res.json({
            success: true,
            reward,
            sector_index: sectorIndex,
            sectors_remaining: updated.daily_spins - updated.spins_used_today,
            balance: updated.balance
        });

    } catch (error) {
        console.error('Wheel error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get Wheel Info
router.get('/info', auth, async (req, res) => {
    try {
        const pool = req.app.get('db');
        const [[user]] = await pool.query(
            'SELECT daily_spins, spins_used_today FROM users WHERE id = ?',
            [req.user.id]
        );

        res.json({
            success: true,
            spins_remaining: user.daily_spins - user.spins_used_today,
            sectors: SECTORS
        });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;