const express = require('express');
const pool = require('../db/connection');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();
router.use(authenticateToken);

// Get all sessions with filters
router.get('/', async (req, res) => {
  try {
    const { month, year, student_id, subject_id, status, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE sess.user_id = $1';
    const params = [req.user.id];
    let idx = 2;

    if (month && year) {
      whereClause += ` AND EXTRACT(MONTH FROM sess.session_date) = $${idx} AND EXTRACT(YEAR FROM sess.session_date) = $${idx+1}`;
      params.push(month, year);
      idx += 2;
    } else if (year) {
      whereClause += ` AND EXTRACT(YEAR FROM sess.session_date) = $${idx}`;
      params.push(year);
      idx++;
    }
    if (student_id) {
      whereClause += ` AND sess.student_id = $${idx}`;
      params.push(student_id);
      idx++;
    }
    if (subject_id) {
      whereClause += ` AND sess.subject_id = $${idx}`;
      params.push(subject_id);
      idx++;
    }
    if (status) {
      whereClause += ` AND sess.status = $${idx}`;
      params.push(status);
      idx++;
    }

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM sessions sess ${whereClause}`, params
    );

    params.push(limit, offset);
    const result = await pool.query(
      `SELECT sess.*,
              st.full_name as student_name,
              sub.name as subject_name
       FROM sessions sess
       LEFT JOIN students st ON st.id = sess.student_id
       LEFT JOIN subjects sub ON sub.id = sess.subject_id
       ${whereClause}
       ORDER BY sess.session_date DESC, sess.start_time DESC
       LIMIT $${idx} OFFSET $${idx+1}`,
      params
    );

    res.json({
      sessions: result.rows,
      total: parseInt(countResult.rows[0].count),
      page: parseInt(page),
      limit: parseInt(limit)
    });
  } catch (error) {
    console.error('Get sessions error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Summary stats
router.get('/stats', async (req, res) => {
  try {
    const { month, year } = req.query;
    const params = [req.user.id];
    let dateFilter = '';

    if (month && year) {
      dateFilter = `AND EXTRACT(MONTH FROM sess.session_date) = $2 AND EXTRACT(YEAR FROM sess.session_date) = $3`;
      params.push(month, year);
    } else if (year) {
      dateFilter = `AND EXTRACT(YEAR FROM sess.session_date) = $2`;
      params.push(year);
    }

    // Summary totals - no join needed, simple query
    const summaryParams = [req.user.id];
    let summaryDate = '';
    if (month && year) {
      summaryDate = `AND EXTRACT(MONTH FROM session_date) = $2 AND EXTRACT(YEAR FROM session_date) = $3`;
      summaryParams.push(month, year);
    } else if (year) {
      summaryDate = `AND EXTRACT(YEAR FROM session_date) = $2`;
      summaryParams.push(year);
    }

    const result = await pool.query(
      `SELECT 
        COUNT(*) as total_sessions,
        COALESCE(SUM(duration_hours), 0) as total_hours,
        COALESCE(SUM(total_amount) FILTER (WHERE status = 'completed'), 0) as total_amount,
        COALESCE(AVG(rate_per_hour) FILTER (WHERE status = 'completed'), 0) as avg_rate
       FROM sessions
       WHERE user_id = $1 ${summaryDate}`,
      summaryParams
    );

    // By student - explicit table-qualified columns to avoid ambiguity
    const byStudent = await pool.query(
      `SELECT st.full_name as student_name, sess.student_id,
              COUNT(*) as sessions,
              COALESCE(SUM(sess.duration_hours), 0) as hours,
              COALESCE(SUM(sess.total_amount), 0) as amount
       FROM sessions sess
       LEFT JOIN students st ON st.id = sess.student_id
       WHERE sess.user_id = $1
         AND sess.status = 'completed'
         ${dateFilter.replace('sess.session_date', 'sess.session_date')}
       GROUP BY sess.student_id, st.full_name
       ORDER BY amount DESC`,
      params
    );

    // Monthly breakdown (current year)
    const currentYear = year || new Date().getFullYear();
    const monthly = await pool.query(
      `SELECT EXTRACT(MONTH FROM session_date) as month,
              COUNT(*) as sessions,
              COALESCE(SUM(duration_hours), 0) as hours,
              COALESCE(SUM(total_amount), 0) as amount
       FROM sessions
       WHERE user_id = $1
         AND status = 'completed'
         AND EXTRACT(YEAR FROM session_date) = $2
       GROUP BY EXTRACT(MONTH FROM session_date)
       ORDER BY month`,
      [req.user.id, currentYear]
    );

    res.json({
      summary: result.rows[0],
      byStudent: byStudent.rows,
      monthly: monthly.rows
    });
  } catch (error) {
    console.error('Stats error:', error.message, error.detail);
    res.status(500).json({ message: 'Server error', detail: error.message });
  }
});

// Create session
router.post('/', async (req, res) => {
  try {
    const { student_id, subject_id, session_date, start_time, end_time, rate_type, rate_per_hour, rate_per_session, status, notes } = req.body;

    if (!session_date || !start_time || !end_time) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    if (end_time <= start_time) {
      return res.status(400).json({ message: 'End time must be after start time' });
    }

    const [sh, sm] = start_time.split(':').map(Number);
    const [eh, em] = end_time.split(':').map(Number);
    const durationHours = (eh * 60 + em - sh * 60 - sm) / 60;
    const finalRateType = rate_type || 'hourly';
    const totalAmount = finalRateType === 'per_session'
      ? parseFloat(rate_per_session || 0)
      : durationHours * parseFloat(rate_per_hour || 0);

    const result = await pool.query(
      `INSERT INTO sessions (user_id, student_id, subject_id, session_date, start_time, end_time, rate_type, rate_per_hour, rate_per_session, total_amount, status, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING *`,
      [req.user.id, student_id || null, subject_id || null, session_date, start_time, end_time, finalRateType, rate_per_hour || null, rate_per_session || null, totalAmount, status || 'completed', notes]
    );

    res.status(201).json({ session: result.rows[0] });
  } catch (error) {
    console.error('Create session error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update session
router.put('/:id', async (req, res) => {
  try {
    const { student_id, subject_id, session_date, start_time, end_time, rate_type, rate_per_hour, rate_per_session, status, notes } = req.body;

    const [sh, sm] = start_time.split(':').map(Number);
    const [eh, em] = end_time.split(':').map(Number);
    const durationHours = (eh * 60 + em - sh * 60 - sm) / 60;
    const finalRateType = rate_type || 'hourly';
    const totalAmount = finalRateType === 'per_session'
      ? parseFloat(rate_per_session || 0)
      : durationHours * parseFloat(rate_per_hour || 0);

    const result = await pool.query(
      `UPDATE sessions SET
        student_id=$1, subject_id=$2, session_date=$3, start_time=$4, end_time=$5,
        rate_type=$6, rate_per_hour=$7, rate_per_session=$8, total_amount=$9, status=$10, notes=$11, updated_at=NOW()
       WHERE id=$12 AND user_id=$13
       RETURNING *`,
      [student_id || null, subject_id || null, session_date, start_time, end_time, finalRateType, rate_per_hour || null, rate_per_session || null, totalAmount, status, notes, req.params.id, req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: 'Session not found' });
    res.json({ session: result.rows[0] });
  } catch (error) {
    console.error('Update session error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete session
router.delete('/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM sessions WHERE id=$1 AND user_id=$2', [req.params.id, req.user.id]);
    res.json({ message: 'Session deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
