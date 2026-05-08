const express = require('express');
const router = express.Router();

const adminAuth = (req, res, next) => {
    if (req.headers['x-admin-key'] !== process.env.ADMIN_KEY) {
        return res.status(403).json({ error: 'Access denied' });
    }
    next();
};

// Get Dashboard Stats
router.get('/stats', adminAuth, async (req, res) => {
    try {
        const pool = req.app.get('db');

        const [[users]] = await pool.query('SELECT COUNT(*) as total, SUM(balance) as total_balance FROM users');
        const [[earnings]] = await pool.query('SELECT SUM(total_earned) as total FROM users');
        const [[adsWatched]] = await pool.query('SELECT COUNT(*) as total FROM ad_watches');
        const [[pendingW]] = await pool.query('SELECT COUNT(*) as count, SUM(amount_points) as points, SUM(amount_stars) as stars FROM withdrawals WHERE status = "pending"');
        const [[approvedW]] = await pool.query('SELECT COUNT(*) as count, SUM(amount_points) as points, SUM(amount_stars) as stars FROM withdrawals WHERE status = "approved"');

        const today = new Date().toISOString().split('T')[0];
        const [[todayStats]] = await pool.query(
            'SELECT SUM(ads_watched) as ads, SUM(wheel_spins) as spins, SUM(earnings) as earnings FROM daily_stats WHERE date = ?',
            [today]
        );

        res.json({
            success: true,
            stats: {
                total_users: users.total || 0,
                total_balance: users.total_balance || 0,
                total_earnings: earnings.total || 0,
                total_ads_watched: adsWatched.total || 0,
                pending_withdrawals: pendingW.count || 0,
                pending_points: pendingW.points || 0,
                pending_stars: pendingW.stars || 0,
                approved_withdrawals: approvedW.count || 0,
                approved_stars: approvedW.stars || 0,
                today_ads: todayStats?.ads || 0,
                today_spins: todayStats?.spins || 0,
                today_earnings: todayStats?.earnings || 0
            }
        });
    } catch (error) {
        console.error('Admin stats error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get Pending Withdrawals
router.get('/withdrawals', adminAuth, async (req, res) => {
    try {
        const pool = req.app.get('db');
        const [withdrawals] = await pool.query(
            `SELECT w.*, u.telegram_id, u.username, u.first_name
             FROM withdrawals w
             JOIN users u ON w.user_id = u.id
             WHERE w.status = 'pending'
             ORDER BY w.created_at ASC`
        );
        res.json({ success: true, withdrawals });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Approve Withdrawal
router.post('/withdrawals/:id/approve', adminAuth, async (req, res) => {
    try {
        const pool = req.app.get('db');
        const { id } = req.params;

        await pool.query('UPDATE withdrawals SET status = "approved", processed_at = NOW() WHERE id = ?', [id]);
        await pool.query(
            'INSERT INTO admin_logs (admin_id, action, target_user_id, details) VALUES (?, ?, (SELECT user_id FROM withdrawals WHERE id = ?), ?)',
            [process.env.ADMIN_CHAT_ID, 'approve_withdrawal', id, `Approved withdrawal #${id}`]
        );

        res.json({ success: true, message: 'Withdrawal approved!' });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Reject Withdrawal
router.post('/withdrawals/:id/reject', adminAuth, async (req, res) => {
    try {
        const pool = req.app.get('db');
        const { id } = req.params;
        const { reason } = req.body;

        // Get withdrawal to return points
        const [[withdrawal]] = await pool.query('SELECT * FROM withdrawals WHERE id = ?', [id]);

        if (withdrawal) {
            await pool.query('UPDATE users SET balance = balance + ? WHERE id = ?', [withdrawal.amount_points, withdrawal.user_id]);
        }

        await pool.query('UPDATE withdrawals SET status = "rejected", processed_at = NOW(), admin_notes = ? WHERE id = ?', [reason || '', id]);

        res.json({ success: true, message: 'Withdrawal rejected, points returned' });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Get Users List
router.get('/users', adminAuth, async (req, res) => {
    try {
        const pool = req.app.get('db');
        const page = parseInt(req.query.page) || 1;
        const limit = 50;
        const offset = (page - 1) * limit;

        const [users] = await pool.query(
            `SELECT id, telegram_id, username, first_name, balance, total_earned, referral_count, created_at
             FROM users ORDER BY created_at DESC LIMIT ? OFFSET ?`,
            [limit, offset]
        );

        const [[{ total }]] = await pool.query('SELECT COUNT(*) as total FROM users');

        res.json({ success: true, users, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Reset User
router.post('/users/:id/reset', adminAuth, async (req, res) => {
    try {
        const pool = req.app.get('db');
        const { id } = req.params;

        await pool.query('UPDATE users SET balance = 0, total_earned = 0 WHERE id = ?', [id]);
        await pool.query(
            'INSERT INTO admin_logs (admin_id, action, target_user_id, details) VALUES (?, ?, ?, ?)',
            [process.env.ADMIN_CHAT_ID, 'reset_user', id, 'User balance reset']
        );

        res.json({ success: true, message: 'User reset successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Add Balance to User
router.post('/users/:id/add-balance', adminAuth, async (req, res) => {
    try {
        const pool = req.app.get('db');
        const { id } = req.params;
        const { amount } = req.body;

        await pool.query('UPDATE users SET balance = balance + ?, total_earned = total_earned + ? WHERE id = ?', [amount, amount, id]);
        await pool.query('INSERT INTO activities (user_id, type, details, points) VALUES (?, ?, ?, ?)', [id, 'admin', 'Admin bonus', amount]);

        res.json({ success: true, message: `Added ${amount} points!` });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;