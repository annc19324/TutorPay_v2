const express = require('express');
const bcrypt = require('bcryptjs');
const pool = require('../db/connection');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Apply auth middleware
router.use(authenticateToken, requireAdmin);

// Get all users with stats
router.get('/users', async (req, res) => {
  try {
    const { page = 1, limit = 20, search = '', role = '' } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE 1=1';
    const params = [];
    let paramIdx = 1;

    if (search) {
      whereClause += ` AND (u.username ILIKE $${paramIdx} OR u.full_name ILIKE $${paramIdx} OR u.email ILIKE $${paramIdx})`;
      params.push(`%${search}%`);
      paramIdx++;
    }
    if (role) {
      whereClause += ` AND u.role = $${paramIdx}`;
      params.push(role);
      paramIdx++;
    }

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM users u ${whereClause}`,
      params
    );

    params.push(limit, offset);
    const result = await pool.query(
      `SELECT u.id, u.username, u.email, u.full_name, u.phone, u.role, u.is_active, u.avatar_url, u.created_at,
              COUNT(DISTINCT s.id) as session_count,
              COALESCE(SUM(s.total_amount), 0) as total_earned
       FROM users u
       LEFT JOIN sessions s ON s.user_id = u.id AND s.status = 'completed'
       ${whereClause}
       GROUP BY u.id
       ORDER BY u.created_at DESC
       LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
      params
    );

    res.json({
      users: result.rows,
      total: parseInt(countResult.rows[0].count),
      page: parseInt(page),
      limit: parseInt(limit)
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get single user
router.get('/users/:id', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, username, email, full_name, phone, role, is_active, avatar_url, created_at
       FROM users WHERE id = $1`,
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json({ user: result.rows[0] });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Toggle user active status
router.patch('/users/:id/toggle-status', async (req, res) => {
  try {
    const result = await pool.query(
      `UPDATE users SET is_active = NOT is_active, updated_at = NOW()
       WHERE id = $1 RETURNING id, username, is_active`,
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json({ message: 'Status updated', user: result.rows[0] });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Reset user password (admin)
router.post('/users/:id/reset-password', async (req, res) => {
  try {
    const { new_password } = req.body;
    if (!new_password || new_password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    const hash = await bcrypt.hash(new_password, 12);
    const result = await pool.query(
      `UPDATE users SET password_hash = $1, updated_at = NOW()
       WHERE id = $2 RETURNING id, username`,
      [hash, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    await pool.query(
      `INSERT INTO activity_logs (user_id, action, details) VALUES ($1, 'admin_reset_password', $2)`,
      [req.user.id, JSON.stringify({ target_user: req.params.id })]
    );

    res.json({ message: `Password reset for user ${result.rows[0].username}` });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update user role
router.patch('/users/:id/role', async (req, res) => {
  try {
    const { role } = req.body;
    if (!['admin', 'user'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role' });
    }
    const result = await pool.query(
      `UPDATE users SET role = $1, updated_at = NOW() WHERE id = $2 RETURNING id, username, role`,
      [role, req.params.id]
    );
    res.json({ message: 'Role updated', user: result.rows[0] });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete user
router.delete('/users/:id', async (req, res) => {
  try {
    if (req.params.id === req.user.id) {
      return res.status(400).json({ message: 'Cannot delete your own account' });
    }
    await pool.query('DELETE FROM users WHERE id = $1', [req.params.id]);
    res.json({ message: 'User deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Dashboard stats
router.get('/stats', async (req, res) => {
  try {
    const [usersCount, sessionsCount, totalRevenue, recentUsers] = await Promise.all([
      pool.query('SELECT COUNT(*) as count, COUNT(*) FILTER (WHERE is_active) as active FROM users'),
      pool.query(`SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE status='completed') as completed FROM sessions`),
      pool.query(`SELECT COALESCE(SUM(total_amount), 0) as total FROM sessions WHERE status = 'completed'`),
      pool.query(`SELECT id, username, full_name, email, role, created_at FROM users ORDER BY created_at DESC LIMIT 5`)
    ]);

    // Monthly sessions trend (last 6 months)
    const trend = await pool.query(`
      SELECT DATE_TRUNC('month', session_date) as month,
             COUNT(*) as count,
             COALESCE(SUM(total_amount), 0) as revenue
      FROM sessions
      WHERE session_date >= NOW() - INTERVAL '6 months' AND status = 'completed'
      GROUP BY month
      ORDER BY month
    `);

    res.json({
      users: usersCount.rows[0],
      sessions: sessionsCount.rows[0],
      revenue: totalRevenue.rows[0].total,
      recentUsers: recentUsers.rows,
      trend: trend.rows
    });
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Activity logs
router.get('/logs', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT al.*, u.username, u.full_name
      FROM activity_logs al
      LEFT JOIN users u ON al.user_id = u.id
      ORDER BY al.created_at DESC
      LIMIT 100
    `);
    res.json({ logs: result.rows });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
