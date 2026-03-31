const express = require('express');
const pool = require('../db/connection');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();
router.use(authenticateToken);

// Get all subjects
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM subjects ORDER BY name');
    res.json({ subjects: result.rows });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get user tutor rates
router.get('/rates', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT tr.*, sub.name as subject_name, st.full_name as student_name
       FROM tutor_rates tr
       LEFT JOIN subjects sub ON sub.id = tr.subject_id
       LEFT JOIN students st ON st.id = tr.student_id
       WHERE tr.user_id = $1
       ORDER BY tr.created_at DESC`,
      [req.user.id]
    );
    res.json({ rates: result.rows });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Create/update tutor rate
router.post('/rates', async (req, res) => {
  try {
    const { subject_id, student_id, rate_per_hour, effective_from, notes } = req.body;
    if (!rate_per_hour) return res.status(400).json({ message: 'Rate is required' });

    const result = await pool.query(
      `INSERT INTO tutor_rates (user_id, subject_id, student_id, rate_per_hour, effective_from, notes)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [req.user.id, subject_id, student_id, rate_per_hour, effective_from, notes]
    );
    res.status(201).json({ rate: result.rows[0] });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Update profile
router.put('/profile', async (req, res) => {
  try {
    const { full_name, phone, email } = req.body;
    const result = await pool.query(
      `UPDATE users SET full_name=$1, phone=$2, email=$3, updated_at=NOW()
       WHERE id=$4 RETURNING id, username, email, full_name, phone, role`,
      [full_name, phone, email, req.user.id]
    );
    res.json({ user: result.rows[0] });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
