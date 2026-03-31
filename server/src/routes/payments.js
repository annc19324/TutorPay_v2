const express = require('express');
const pool = require('../db/connection');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();
router.use(authenticateToken);

// Get all payments
router.get('/', async (req, res) => {
  try {
    const { student_id, month, year } = req.query;
    let whereClause = 'WHERE p.user_id = $1';
    const params = [req.user.id];
    let idx = 2;

    if (student_id) {
      whereClause += ` AND p.student_id = $${idx}`;
      params.push(student_id); idx++;
    }
    if (month && year) {
      whereClause += ` AND EXTRACT(MONTH FROM p.payment_date) = $${idx} AND EXTRACT(YEAR FROM p.payment_date) = $${idx+1}`;
      params.push(month, year); idx += 2;
    }

    const result = await pool.query(
      `SELECT p.*, st.full_name as student_name
       FROM payments p
       LEFT JOIN students st ON st.id = p.student_id
       ${whereClause}
       ORDER BY p.payment_date DESC`,
      params
    );
    res.json({ payments: result.rows });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Create payment
router.post('/', async (req, res) => {
  try {
    const { student_id, amount, payment_date, payment_method, reference_code, notes } = req.body;
    if (!amount || !payment_date) return res.status(400).json({ message: 'Amount and date required' });

    const result = await pool.query(
      `INSERT INTO payments (user_id, student_id, amount, payment_date, payment_method, reference_code, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [req.user.id, student_id, amount, payment_date, payment_method || 'cash', reference_code, notes]
    );
    res.status(201).json({ payment: result.rows[0] });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete payment
router.delete('/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM payments WHERE id=$1 AND user_id=$2', [req.params.id, req.user.id]);
    res.json({ message: 'Payment deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Balance summary per student
router.get('/balance', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT st.id, st.full_name,
              COALESCE(SUM(sess.total_amount) FILTER (WHERE sess.status='completed'), 0) as total_owed,
              COALESCE(SUM(p.amount), 0) as total_paid,
              COALESCE(SUM(sess.total_amount) FILTER (WHERE sess.status='completed'), 0) - COALESCE(SUM(p.amount), 0) as balance
       FROM students st
       LEFT JOIN sessions sess ON sess.student_id = st.id AND sess.user_id = $1
       LEFT JOIN payments p ON p.student_id = st.id AND p.user_id = $1
       WHERE st.user_id = $1
       GROUP BY st.id, st.full_name
       ORDER BY balance DESC`,
      [req.user.id]
    );
    res.json({ balance: result.rows });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
