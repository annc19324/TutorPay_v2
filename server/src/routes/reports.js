const express = require('express');
const PDFDocument = require('pdfkit');
const pool = require('../db/connection');
const { authenticateToken } = require('../middleware/auth');
const path = require('path');
const fs = require('fs');

const router = express.Router();
router.use(authenticateToken);

// Helper: format currency (VND)
const formatVND = (amount) => {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
};

// Helper: format date
const formatDate = (date) => {
  if (!date) return '';
  const d = new Date(date);
  return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
};

// Helper: format time
const formatTime = (time) => {
  if (!time) return '';
  return time.substring(0, 5);
};

// Generic PDF setup
const createPDFBase = (res, filename) => {
  const doc = new PDFDocument({ margin: 40, size: 'A4' });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  doc.pipe(res);
  return doc;
};

// Draw table header
const drawTableHeader = (doc, headers, colWidths, startX, y) => {
  doc.fillColor('#1a237e').rect(startX, y, colWidths.reduce((a, b) => a + b, 0), 22).fill();
  doc.fillColor('white').font('Helvetica-Bold').fontSize(9);
  let x = startX;
  headers.forEach((h, i) => {
    doc.text(h, x + 4, y + 7, { width: colWidths[i] - 8, align: 'left' });
    x += colWidths[i];
  });
  doc.fillColor('black').font('Helvetica').fontSize(8);
  return y + 22;
};

// Draw table row
const drawTableRow = (doc, cells, colWidths, startX, y, isEven) => {
  const rowHeight = 20;
  if (isEven) {
    doc.fillColor('#f0f4ff').rect(startX, y, colWidths.reduce((a, b) => a + b, 0), rowHeight).fill();
  }
  doc.fillColor('#222');
  let x = startX;
  cells.forEach((cell, i) => {
    doc.font('Helvetica').fontSize(8).text(String(cell), x + 4, y + 6, { width: colWidths[i] - 8, align: 'left' });
    x += colWidths[i];
  });

  // Border
  doc.strokeColor('#c0c8e0').lineWidth(0.5);
  x = startX;
  colWidths.forEach(w => {
    doc.moveTo(x, y).lineTo(x, y + rowHeight).stroke();
    x += w;
  });
  doc.moveTo(startX, y).lineTo(x, y).stroke();
  doc.moveTo(startX, y + rowHeight).lineTo(x, y + rowHeight).stroke();

  return y + rowHeight;
};

// PDF Header
const drawPDFHeader = (doc, title, subtitle, user) => {
  // Header bar
  doc.fillColor('#1a237e').rect(0, 0, 595, 80).fill();
  
  doc.fillColor('white')
    .font('Helvetica-Bold').fontSize(22)
    .text('TUTORPAY', 40, 15);
  
  doc.font('Helvetica').fontSize(10)
    .text('Hệ thống quản lý lương gia sư', 40, 42);

  doc.font('Helvetica-Bold').fontSize(16)
    .text(title, 200, 15, { align: 'right', width: 355 });
  doc.font('Helvetica').fontSize(10)
    .text(subtitle, 200, 42, { align: 'right', width: 355 });

  doc.fillColor('#333').font('Helvetica').fontSize(9)
    .text(`Gia sư: ${user.full_name} | Tài khoản: ${user.username}`, 40, 90)
    .text(`Ngày xuất: ${formatDate(new Date())}`, 40, 105);

  doc.moveTo(40, 120).lineTo(555, 120).strokeColor('#1a237e').lineWidth(2).stroke();
  
  return 130;
};

// Monthly salary report PDF
router.get('/salary-report', async (req, res) => {
  try {
    const { month, year } = req.query;
    const mth = month || new Date().getMonth() + 1;
    const yr = year || new Date().getFullYear();

    const [userResult, sessionsResult, summaryResult] = await Promise.all([
      pool.query('SELECT * FROM users WHERE id=$1', [req.user.id]),
      pool.query(
        `SELECT sess.*, st.full_name as student_name, sub.name as subject_name
         FROM sessions sess
         LEFT JOIN students st ON st.id = sess.student_id
         LEFT JOIN subjects sub ON sub.id = sess.subject_id
         WHERE sess.user_id = $1
           AND EXTRACT(MONTH FROM sess.session_date) = $2
           AND EXTRACT(YEAR FROM sess.session_date) = $3
         ORDER BY sess.session_date, sess.start_time`,
        [req.user.id, mth, yr]
      ),
      pool.query(
        `SELECT 
          COUNT(*) as total_sessions,
          COALESCE(SUM(duration_hours), 0) as total_hours,
          COALESCE(SUM(total_amount) FILTER (WHERE status='completed'), 0) as total_amount
         FROM sessions
         WHERE user_id=$1 AND EXTRACT(MONTH FROM session_date)=$2 AND EXTRACT(YEAR FROM session_date)=$3`,
        [req.user.id, mth, yr]
      )
    ]);

    const user = userResult.rows[0];
    const sessions = sessionsResult.rows;
    const summary = summaryResult.rows[0];

    const monthNames = ['', 'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
      'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'];

    const doc = createPDFBase(res, `bang-luong-${yr}-${mth}.pdf`);
    let y = drawPDFHeader(doc, 'BẢNG LƯƠNG GIA SƯ', `${monthNames[mth]} - ${yr}`, user);

    // Summary box
    y += 10;
    doc.fillColor('#e8eaf6').roundedRect(40, y, 515, 65, 8).fill();
    doc.fillColor('#1a237e').font('Helvetica-Bold').fontSize(10).text('TỔNG KẾT', 50, y + 10);
    doc.fillColor('#333').font('Helvetica').fontSize(9)
      .text(`Tổng số buổi dạy: ${summary.total_sessions}`, 50, y + 28)
      .text(`Tổng giờ dạy: ${parseFloat(summary.total_hours).toFixed(2)} giờ`, 200, y + 28)
      .text(`Tổng thu nhập: ${formatVND(summary.total_amount)}`, 380, y + 28);
    y += 80;

    // Table
    if (sessions.length === 0) {
      doc.fillColor('#999').fontSize(12).text('Không có buổi dạy nào trong tháng này.', 40, y + 20, { align: 'center' });
    } else {
      const headers = ['Ngày', 'Học sinh', 'Môn', 'Bắt đầu', 'Kết thúc', 'Giờ', 'Đơn giá/h', 'Thành tiền', 'TT'];
      const colWidths = [65, 95, 55, 45, 45, 35, 70, 80, 35];
      const startX = 28;

      y = drawTableHeader(doc, headers, colWidths, startX, y);
      sessions.forEach((sess, i) => {
        if (y > 750) {
          doc.addPage();
          y = 30;
          y = drawTableHeader(doc, headers, colWidths, startX, y);
        }
        y = drawTableRow(doc, [
          formatDate(sess.session_date),
          sess.student_name || 'N/A',
          sess.subject_name || 'N/A',
          formatTime(sess.start_time),
          formatTime(sess.end_time),
          parseFloat(sess.duration_hours).toFixed(1),
          formatVND(sess.rate_per_hour),
          formatVND(sess.total_amount),
          sess.status === 'completed' ? '✓' : sess.status === 'cancelled' ? '✗' : '~'
        ], colWidths, startX, y, i % 2 === 0);
      });

      // Total row
      y += 5;
      doc.fillColor('#1a237e').font('Helvetica-Bold').fontSize(10)
        .text(`TỔNG CỘNG: ${formatVND(summary.total_amount)}`, 28, y, { align: 'right', width: 515 });
    }

    // Footer
    const pageHeight = doc.page.height;
    doc.fillColor('#999').font('Helvetica').fontSize(8)
      .text('TutorPay - Hệ thống quản lý lương gia sư | Tài liệu được tạo tự động', 40, pageHeight - 40, { align: 'center', width: 515 });

    doc.end();
  } catch (error) {
    console.error('PDF salary error:', error);
    res.status(500).json({ message: 'Error generating PDF' });
  }
});

// Student report PDF
router.get('/student-report/:studentId', async (req, res) => {
  try {
    const [studentResult, sessionsResult, paymentsResult] = await Promise.all([
      pool.query('SELECT * FROM students WHERE id=$1 AND user_id=$2', [req.params.studentId, req.user.id]),
      pool.query(
        `SELECT sess.*, sub.name as subject_name
         FROM sessions sess
         LEFT JOIN subjects sub ON sub.id = sess.subject_id
         WHERE sess.student_id=$1 AND sess.user_id=$2
         ORDER BY sess.session_date DESC`,
        [req.params.studentId, req.user.id]
      ),
      pool.query(
        'SELECT * FROM payments WHERE student_id=$1 AND user_id=$2 ORDER BY payment_date DESC',
        [req.params.studentId, req.user.id]
      )
    ]);

    if (studentResult.rows.length === 0) {
      return res.status(404).json({ message: 'Student not found' });
    }

    const student = studentResult.rows[0];
    const sessions = sessionsResult.rows;
    const payments = paymentsResult.rows;

    const totalOwe = sessions.filter(s => s.status === 'completed').reduce((a, s) => a + parseFloat(s.total_amount), 0);
    const totalPaid = payments.reduce((a, p) => a + parseFloat(p.amount), 0);
    const balance = totalOwe - totalPaid;

    const userResult = await pool.query('SELECT * FROM users WHERE id=$1', [req.user.id]);
    const user = userResult.rows[0];

    const doc = createPDFBase(res, `hoc-sinh-${student.full_name.replace(/\s+/g, '-')}.pdf`);
    let y = drawPDFHeader(doc, 'BÁO CÁO HỌC SINH', student.full_name, user);

    // Student info
    y += 10;
    doc.fillColor('#e8eaf6').roundedRect(40, y, 515, 80, 8).fill();
    doc.fillColor('#1a237e').font('Helvetica-Bold').fontSize(10).text('THÔNG TIN HỌC SINH', 50, y + 8);
    doc.fillColor('#333').font('Helvetica').fontSize(9)
      .text(`Họ và tên: ${student.full_name}`, 50, y + 25)
      .text(`Lớp: ${student.grade || 'N/A'}`, 250, y + 25)
      .text(`Phụ huynh: ${student.parent_name || 'N/A'}`, 50, y + 42)
      .text(`SĐT: ${student.parent_phone || 'N/A'}`, 250, y + 42)
      .text(`Tổng học phí: ${formatVND(totalOwe)}`, 50, y + 59)
      .text(`Đã thanh toán: ${formatVND(totalPaid)}`, 220, y + 59)
      .text(`Còn nợ: ${formatVND(balance)}`, 400, y + 59);
    y += 100;

    // Sessions table
    doc.fillColor('#1a237e').font('Helvetica-Bold').fontSize(11).text('LỊCH SỬ BUỔI DẠY', 40, y);
    y += 15;

    if (sessions.length > 0) {
      const headers = ['Ngày', 'Môn học', 'Giờ bắt đầu', 'Giờ kết thúc', 'Số giờ', 'Đơn giá', 'Thành tiền', 'Trạng thái'];
      const colWidths = [65, 75, 70, 70, 50, 75, 80, 60];
      y = drawTableHeader(doc, headers, colWidths, 28, y);
      sessions.forEach((sess, i) => {
        if (y > 750) { doc.addPage(); y = 30; y = drawTableHeader(doc, headers, colWidths, 28, y); }
        y = drawTableRow(doc, [
          formatDate(sess.session_date),
          sess.subject_name || 'N/A',
          formatTime(sess.start_time),
          formatTime(sess.end_time),
          parseFloat(sess.duration_hours).toFixed(1),
          formatVND(sess.rate_per_hour),
          formatVND(sess.total_amount),
          sess.status === 'completed' ? 'Hoàn thành' : sess.status === 'cancelled' ? 'Hủy' : 'Chờ'
        ], colWidths, 28, y, i % 2 === 0);
      });
    }

    y += 20;
    // Payments table
    if (payments.length > 0) {
      if (y > 650) { doc.addPage(); y = 30; }
      doc.fillColor('#1a237e').font('Helvetica-Bold').fontSize(11).text('LỊCH SỬ THANH TOÁN', 40, y);
      y += 15;
      const pHeaders = ['Ngày', 'Số tiền', 'Phương thức', 'Mã tham chiếu', 'Ghi chú'];
      const pWidths = [80, 110, 100, 110, 145];
      y = drawTableHeader(doc, pHeaders, pWidths, 28, y);
      payments.forEach((p, i) => {
        y = drawTableRow(doc, [
          formatDate(p.payment_date),
          formatVND(p.amount),
          p.payment_method,
          p.reference_code || '-',
          p.notes || '-'
        ], pWidths, 28, y, i % 2 === 0);
      });
    }

    const pageHeight = doc.page.height;
    doc.fillColor('#999').font('Helvetica').fontSize(8)
      .text('TutorPay - Hệ thống quản lý lương gia sư', 40, pageHeight - 40, { align: 'center', width: 515 });

    doc.end();
  } catch (error) {
    console.error('PDF student error:', error);
    res.status(500).json({ message: 'Error generating PDF' });
  }
});

// Yearly report PDF
router.get('/yearly-report/:year', async (req, res) => {
  try {
    const year = req.params.year;
    const userResult = await pool.query('SELECT * FROM users WHERE id=$1', [req.user.id]);
    const user = userResult.rows[0];

    const monthly = await pool.query(
      `SELECT EXTRACT(MONTH FROM session_date) as month,
              COUNT(*) as sessions,
              COALESCE(SUM(duration_hours), 0) as hours,
              COALESCE(SUM(total_amount) FILTER (WHERE status='completed'), 0) as amount
       FROM sessions
       WHERE user_id=$1 AND EXTRACT(YEAR FROM session_date)=$2
       GROUP BY month ORDER BY month`,
      [req.user.id, year]
    );

    const totalResult = await pool.query(
      `SELECT COUNT(*) as sessions, SUM(duration_hours) as hours, SUM(total_amount) FILTER (WHERE status='completed') as amount
       FROM sessions WHERE user_id=$1 AND EXTRACT(YEAR FROM session_date)=$2`,
      [req.user.id, year]
    );

    const topStudents = await pool.query(
      `SELECT st.full_name, COUNT(sess.id) as sessions, SUM(sess.total_amount) FILTER (WHERE sess.status='completed') as amount
       FROM sessions sess JOIN students st ON st.id=sess.student_id
       WHERE sess.user_id=$1 AND EXTRACT(YEAR FROM sess.session_date)=$2
       GROUP BY st.id, st.full_name ORDER BY amount DESC LIMIT 10`,
      [req.user.id, year]
    );

    const monthNames = ['', 'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
      'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'];

    const doc = createPDFBase(res, `bao-cao-nam-${year}.pdf`);
    let y = drawPDFHeader(doc, `BÁO CÁO NĂM ${year}`, 'Thống kê toàn năm', user);

    // Summary
    y += 10;
    const total = totalResult.rows[0];
    doc.fillColor('#e8eaf6').roundedRect(40, y, 515, 65, 8).fill();
    doc.fillColor('#1a237e').font('Helvetica-Bold').fontSize(12).text(`TỔNG KẾT NĂM ${year}`, 50, y + 8);
    doc.fillColor('#333').font('Helvetica').fontSize(10)
      .text(`Tổng số buổi: ${total.sessions || 0}`, 50, y + 28)
      .text(`Tổng số giờ: ${parseFloat(total.hours || 0).toFixed(2)}h`, 200, y + 28)
      .text(`Tổng thu nhập: ${formatVND(total.amount || 0)}`, 360, y + 28);
    y += 80;

    // Monthly breakdown
    doc.fillColor('#1a237e').font('Helvetica-Bold').fontSize(11).text('THỐNG KÊ THEO THÁNG', 40, y);
    y += 15;

    const mHeaders = ['Tháng', 'Số buổi dạy', 'Số giờ', 'Doanh thu'];
    const mWidths = [100, 130, 120, 165];
    y = drawTableHeader(doc, mHeaders, mWidths, 55, y);

    const monthData = {};
    monthly.rows.forEach(r => { monthData[r.month] = r; });

    for (let m = 1; m <= 12; m++) {
      const d = monthData[m];
      y = drawTableRow(doc, [
        monthNames[m],
        d ? d.sessions : '-',
        d ? parseFloat(d.hours).toFixed(2) : '-',
        d ? formatVND(d.amount) : '-'
      ], mWidths, 55, y, m % 2 === 0);
    }

    y += 25;
    if (topStudents.rows.length > 0) {
      doc.fillColor('#1a237e').font('Helvetica-Bold').fontSize(11).text('TOP HỌC SINH', 40, y);
      y += 15;
      const sHeaders = ['Học sinh', 'Số buổi', 'Doanh thu'];
      const sWidths = [250, 110, 155];
      y = drawTableHeader(doc, sHeaders, sWidths, 55, y);
      topStudents.rows.forEach((s, i) => {
        y = drawTableRow(doc, [s.full_name, s.sessions, formatVND(s.amount)], sWidths, 55, y, i % 2 === 0);
      });
    }

    const pageHeight = doc.page.height;
    doc.fillColor('#999').font('Helvetica').fontSize(8)
      .text('TutorPay - Hệ thống quản lý lương gia sư', 40, pageHeight - 40, { align: 'center', width: 515 });

    doc.end();
  } catch (error) {
    console.error('PDF yearly error:', error);
    res.status(500).json({ message: 'Error generating PDF' });
  }
});

module.exports = router;
