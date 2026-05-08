const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');

const auth = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    try { req.user = jwt.verify(token, process.env.JWT_SECRET); next(); }
    catch { res.status(401).json({ error: 'Invalid token' }); }
};

// Get All Activities
router.get('/', auth, async (req, res) => {
    try {
        const pool = req.app.get('db');
        const page = parseInt(req.query.page) || 1;
        const limit = 25;
        const offset = (page - 1) * limit;
        const type = req.query.type;

        let query = 'SELECT * FROM activities WHERE user_id = ?';
        let countQuery = 'SELECT COUNT(*) as total FROM activities WHERE user_id = ?';
        const params = [req.user.id];

        if (type) {
            query += ' AND type = ?';
            countQuery += ' AND type = ?';
            params.push(type);
        }

        query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';

        const [activities] = await pool.query(query, [...params, limit, offset]);
        const [[{ total }]] = await pool.query(countQuery, params);

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
        console.error('Activity error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get Activity Stats
router.get('/stats', auth, async (req, res) => {
    try {
        const pool = req.app.get('db');
        const userId = req.user.id;

        // Today's stats
        const today = new Date().toISOString().split('T')[0];
        const [todayStats] = await pool.query(
            'SELECT * FROM daily_stats WHERE user_id = ? AND date = ?',
            [userId, today]
        );

        // Weekly stats
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        const [weekStats] = await pool.query(
            `SELECT SUM(ads_watched) as ads, SUM(wheel_spins) as spins, SUM(gifts_claimed) as gifts, SUM(earnings) as earnings
             FROM daily_stats WHERE user_id = ? AND date >= ?`,
            [userId, weekAgo]
        );

        // Total stats
        const [totalStats] = await pool.query(
            `SELECT
                COUNT(CASE WHEN type = 'ad' THEN 1 END) as total_ads,
                COUNT(CASE WHEN type = 'wheel' THEN 1 END) as total_spins,
                COUNT(CASE WHEN type = 'gift' THEN 1 END) as total_gifts,
                COUNT(CASE WHEN type = 'referral' THEN 1 END) as total_referrals,
                COUNT(CASE WHEN type = 'withdraw' THEN 1 END) as total_withdraws
             FROM activities WHERE user_id = ?`,
            [userId]
        );

        res.json({
            success: true,
            today: todayStats[0] || { ads_watched: 0, wheel_spins: 0, gifts_claimed: 0, earnings: 0 },
            week: weekStats[0] || { ads: 0, spins: 0, gifts: 0, earnings: 0 },
            totals: totalStats[0]
        });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;