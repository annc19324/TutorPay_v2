const express = require('express');
const pool = require('../db/connection');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();
router.use(authenticateToken);

const DAYS = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ nhật'];

// Get all time slots for current user
router.get('/', async (req, res) => {
  try {
    const { student_id } = req.query;
    let where = 'WHERE ts.user_id = $1';
    const params = [req.user.id];
    if (student_id) {
      where += ' AND ts.student_id = $2';
      params.push(student_id);
    }

    const result = await pool.query(
      `SELECT ts.*,
              st.full_name as student_name,
              sub.name as subject_name
       FROM time_slots ts
       LEFT JOIN students st ON st.id = ts.student_id
       LEFT JOIN subjects sub ON sub.id = ts.subject_id
       ${where}
       ORDER BY ts.day_of_week, ts.start_time`,
      params
    );
    res.json({ time_slots: result.rows });
  } catch (error) {
    console.error('Get timeslots error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create time slot
router.post('/', async (req, res) => {
  try {
    const { student_id, subject_id, day_of_week, start_time, end_time,
            rate_type, rate_per_hour, rate_per_session, label, notes } = req.body;

    if (!start_time || !end_time) {
      return res.status(400).json({ message: 'Giờ bắt đầu và kết thúc là bắt buộc' });
    }
    if (end_time <= start_time) {
      return res.status(400).json({ message: 'Giờ kết thúc phải sau giờ bắt đầu' });
    }

    const result = await pool.query(
      `INSERT INTO time_slots (user_id, student_id, subject_id, day_of_week, start_time, end_time,
                               rate_type, rate_per_hour, rate_per_session, label, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       RETURNING *`,
      [req.user.id, student_id || null, subject_id || null,
       day_of_week !== undefined ? day_of_week : null,
       start_time, end_time,
       rate_type || 'hourly',
       rate_per_hour || null, rate_per_session || null, label || null, notes || null]
    );
    res.status(201).json({ time_slot: result.rows[0] });
  } catch (error) {
    console.error('Create timeslot error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update time slot
router.put('/:id', async (req, res) => {
  try {
    const { student_id, subject_id, day_of_week, start_time, end_time,
            rate_type, rate_per_hour, rate_per_session, label, notes, is_active } = req.body;

    const result = await pool.query(
      `UPDATE time_slots SET
         student_id=$1, subject_id=$2, day_of_week=$3, start_time=$4, end_time=$5,
         rate_type=$6, rate_per_hour=$7, rate_per_session=$8, label=$9, notes=$10,
         is_active=$11, updated_at=NOW()
       WHERE id=$12 AND user_id=$13
       RETURNING *`,
      [student_id || null, subject_id || null,
       day_of_week !== undefined ? day_of_week : null,
       start_time, end_time,
       rate_type || 'hourly',
       rate_per_hour || null, rate_per_session || null,
       label || null, notes || null, is_active !== undefined ? is_active : true,
       req.params.id, req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: 'Not found' });
    res.json({ time_slot: result.rows[0] });
  } catch (error) {
    console.error('Update timeslot error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete time slot
router.delete('/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM time_slots WHERE id=$1 AND user_id=$2', [req.params.id, req.user.id]);
    res.json({ message: 'Deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Quick-create sessions from time slots (for a specific date range)
router.post('/generate-sessions', async (req, res) => {
  try {
    const { from_date, to_date, time_slot_ids } = req.body;
    if (!from_date || !to_date) {
      return res.status(400).json({ message: 'from_date và to_date là bắt buộc' });
    }

    const slots = await pool.query(
      `SELECT * FROM time_slots WHERE id = ANY($1::uuid[]) AND user_id = $2`,
      [time_slot_ids, req.user.id]
    );

    const created = [];
    const from = new Date(from_date);
    const to = new Date(to_date);

    for (const slot of slots.rows) {
      const current = new Date(from);
      while (current <= to) {
        // day_of_week: 0=Mon..6=Sun; JS getDay: 0=Sun,1=Mon..6=Sat
        const jsDay = current.getDay();
        const appDay = jsDay === 0 ? 6 : jsDay - 1; // convert to our format

        if (slot.day_of_week === null || slot.day_of_week === appDay) {
          const dateStr = current.toISOString().split('T')[0];

          // Calc duration & amount
          const [sh, sm] = slot.start_time.split(':').map(Number);
          const [eh, em] = slot.end_time.split(':').map(Number);
          const durationHours = (eh * 60 + em - sh * 60 - sm) / 60;
          const totalAmount = slot.rate_type === 'per_session'
            ? parseFloat(slot.rate_per_session || 0)
            : durationHours * parseFloat(slot.rate_per_hour || 0);

          const r = await pool.query(
            `INSERT INTO sessions (user_id, student_id, subject_id, session_date, start_time, end_time,
                                   rate_type, rate_per_hour, rate_per_session, total_amount, status)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'completed')
             ON CONFLICT DO NOTHING
             RETURNING id`,
            [req.user.id, slot.student_id, slot.subject_id, dateStr,
             slot.start_time, slot.end_time,
             slot.rate_type, slot.rate_per_hour, slot.rate_per_session, totalAmount]
          );
          if (r.rows.length > 0) created.push(r.rows[0].id);
        }
        current.setDate(current.getDate() + 1);
      }
    }

    res.json({ created: created.length, message: `Đã tạo ${created.length} buổi học` });
  } catch (error) {
    console.error('Generate sessions error:', error.message);
    res.status(500).json({ message: 'Server error', detail: error.message });
  }
});

module.exports = router;
