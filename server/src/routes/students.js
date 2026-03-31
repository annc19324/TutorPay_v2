const express = require('express');
const pool = require('../db/connection');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();
router.use(authenticateToken);

// Get all students for current user
router.get('/', async (req, res) => {
  try {
    const { search = '', is_active } = req.query;
    let whereClause = 'WHERE user_id = $1';
    const params = [req.user.id];
    let idx = 2;

    if (search) {
      whereClause += ` AND (full_name ILIKE $${idx} OR parent_name ILIKE $${idx})`;
      params.push(`%${search}%`);
      idx++;
    }
    if (is_active !== undefined) {
      whereClause += ` AND is_active = $${idx}`;
      params.push(is_active === 'true');
    }

    const result = await pool.query(
      `SELECT s.*, 
              COUNT(DISTINCT sess.id) as session_count,
              COALESCE(SUM(sess.total_amount) FILTER (WHERE sess.status='completed'), 0) as total_owed
       FROM students s
       LEFT JOIN sessions sess ON sess.student_id = s.id
       ${whereClause}
       GROUP BY s.id
       ORDER BY s.created_at DESC`,
      params
    );
    res.json({ students: result.rows });
  } catch (error) {
    console.error('Get students error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create student
router.post('/', async (req, res) => {
  try {
    const { full_name, grade, parent_name, parent_phone, address, notes } = req.body;
    if (!full_name) return res.status(400).json({ message: 'Full name is required' });

    const result = await pool.query(
      `INSERT INTO students (user_id, full_name, grade, parent_name, parent_phone, address, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [req.user.id, full_name, grade, parent_name, parent_phone, address, notes]
    );
    res.status(201).json({ student: result.rows[0] });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Update student
router.put('/:id', async (req, res) => {
  try {
    const { full_name, grade, parent_name, parent_phone, address, notes, is_active } = req.body;
    const result = await pool.query(
      `UPDATE students SET full_name=$1, grade=$2, parent_name=$3, parent_phone=$4,
       address=$5, notes=$6, is_active=$7, updated_at=NOW()
       WHERE id=$8 AND user_id=$9 RETURNING *`,
      [full_name, grade, parent_name, parent_phone, address, notes, is_active, req.params.id, req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: 'Student not found' });
    res.json({ student: result.rows[0] });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete student
router.delete('/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM students WHERE id=$1 AND user_id=$2', [req.params.id, req.user.id]);
    res.json({ message: 'Student deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
