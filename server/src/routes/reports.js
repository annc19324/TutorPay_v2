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

// Helper: getting day of week
const getDayOfWeek = (dateString) => {
  if (!dateString) return '';
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return '-';
  const days = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
  return days[d.getDay()];
};

// Helper: format time
const formatTime = (time) => {
  if (!time) return '';
  return time.substring(0, 5);
};

// Generic PDF setup
const createPDFBase = (res, filename) => {
  const doc = new PDFDocument({ margin: 40, size: 'A4' });
  const regularFontPath = path.join(__dirname, '../assets/fonts/Roboto-Regular.ttf');
  const boldFontPath = path.join(__dirname, '../assets/fonts/Roboto-Bold.ttf');
  
  if (fs.existsSync(regularFontPath) && fs.existsSync(boldFontPath)) {
    doc.registerFont('Roboto', regularFontPath);
    doc.registerFont('Roboto-Bold', boldFontPath);
  } else {
    // Fallback if fonts somehow missing
    doc.registerFont('Roboto', 'Helvetica');
    doc.registerFont('Roboto-Bold', 'Helvetica-Bold');
  }

  res.setHeader('Content-Type', 'application/pdf');
  const safeFilename = encodeURIComponent(filename);
  res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}"; filename*=UTF-8''${safeFilename}`);
  doc.pipe(res);
  return doc;
};

// Draw table header
const drawTableHeader = (doc, headers, colWidths, startX, y) => {
  doc.fillColor('#1a237e').rect(startX, y, colWidths.reduce((a, b) => a + b, 0), 22).fill();
  doc.fillColor('white').font('Roboto-Bold').fontSize(9);
  let x = startX;
  headers.forEach((h, i) => {
    doc.text(h, x + 4, y + 7, { width: colWidths[i] - 8, align: 'left' });
    x += colWidths[i];
  });
  doc.fillColor('black').font('Roboto').fontSize(8);
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
    doc.font('Roboto').fontSize(8).text(String(cell), x + 4, y + 6, { width: colWidths[i] - 8, align: 'left' });
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
const drawPDFHeader = (doc, title, subtitle) => {
  // Header bar
  doc.fillColor('#1a237e').rect(0, 0, 595, 80).fill();
  
  doc.fillColor('white')
    .font('Roboto-Bold').fontSize(22)
    .text('TUTORPAY', 40, 15);
  
  if (title) {
    doc.font('Roboto-Bold').fontSize(16)
      .text(title, 200, 15, { align: 'right', width: 355 });
  }
  if (subtitle) {
    doc.font('Roboto').fontSize(10)
      .text(subtitle, 200, 42, { align: 'right', width: 355 });
  }

  doc.fillColor('#333').font('Roboto').fontSize(9)
    .text(`Ngày xuất: ${formatDate(new Date())}`, 40, 90);

  doc.moveTo(40, 110).lineTo(555, 110).strokeColor('#1a237e').lineWidth(2).stroke();
  
  return 120;
};

// Date range salary report PDF
router.get('/salary-report', async (req, res) => {
  try {
    const { startDate, endDate, hideSummary, hideSubject, hideTime, hideDuration, hideStatus, hidePrice, hideAmount, studentId } = req.query;
    
    // Default to current month if not provided
    const now = new Date();
    const stDate = startDate || new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const edDate = endDate || new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

    const studentFilter = studentId && studentId !== '' ? studentId : null;

    const [userResult, sessionsResult, summaryResult] = await Promise.all([
      pool.query('SELECT * FROM users WHERE id=$1', [req.user.id]),
      pool.query(
        `SELECT sess.*, st.full_name as student_name, sub.name as subject_name
         FROM sessions sess
         LEFT JOIN students st ON st.id = sess.student_id
         LEFT JOIN subjects sub ON sub.id = sess.subject_id
         WHERE sess.user_id = $1
           AND sess.session_date >= $2
           AND sess.session_date <= $3
           AND ($4::uuid IS NULL OR sess.student_id = $4)
         ORDER BY sess.session_date ASC, sess.start_time ASC`,
        [req.user.id, stDate, edDate, studentFilter]
      ),
      pool.query(
        `SELECT 
          COUNT(*) as total_sessions,
          COALESCE(SUM(duration_hours), 0) as total_hours,
          COALESCE(SUM(total_amount) FILTER (WHERE status='completed'), 0) as total_amount
         FROM sessions
         WHERE user_id=$1 
           AND session_date >= $2 
           AND session_date <= $3
           AND ($4::uuid IS NULL OR student_id = $4)`,
        [req.user.id, stDate, edDate, studentFilter]
      )
    ]);

    const user = userResult.rows[0];
    const sessions = sessionsResult.rows;
    const summary = summaryResult.rows[0];

    const displayStart = formatDate(stDate);
    const displayEnd = formatDate(edDate);

    const student = studentFilter ? sessions[0]?.student_name : null;
    const titleText = student ? `BẢNG LƯƠNG HS: ${student.toUpperCase()}` : '';

    const doc = createPDFBase(res, `bang-luong${student ? '-' + student.replace(/\s+/g, '-') : ''}-${stDate}-to-${edDate}.pdf`);
    let y = drawPDFHeader(doc, titleText, `Ngày bắt đầu: ${displayStart} - Ngày kết thúc: ${displayEnd}`);

    // Summary box
    if (hideSummary !== 'true') {
      y += 10;
      doc.fillColor('#e8eaf6').roundedRect(40, y, 515, 65, 8).fill();
      doc.fillColor('#1a237e').font('Roboto-Bold').fontSize(10).text('TỔNG KẾT', 50, y + 10);
      doc.fillColor('#333').font('Roboto').fontSize(9)
        .text(`Tổng số buổi dạy: ${summary?.total_sessions || 0}`, 50, y + 28)
        .text(`Tổng giờ dạy: ${parseFloat(summary?.total_hours || 0).toFixed(2)} giờ`, 200, y + 28)
        .text(`Tổng thu nhập: ${formatVND(summary?.total_amount || 0)}`, 380, y + 28);
      y += 80;
    } else {
      y += 20;
    }

    // Table
    if (sessions.length === 0) {
      doc.fillColor('#999').fontSize(12).text('Không có buổi dạy nào.', 40, y + 20, { align: 'center' });
    } else {
      const headers = ['Thứ', 'Ngày', 'HS'];
      const colWidths = [45, 65, 85];
      
      if (hideSubject !== 'true') { headers.push('Môn'); colWidths.push(55); }
      if (hideTime !== 'true') { headers.push('Bắt đầu', 'Kết thúc'); colWidths.push(45, 45); }
      if (hideDuration !== 'true') { headers.push('Giờ'); colWidths.push(35); }
      if (hidePrice !== 'true') { headers.push('Đơn giá'); colWidths.push(70); }
      if (hideAmount !== 'true') { headers.push('Học phí'); colWidths.push(80); }
      
      if (hideStatus !== 'true') { headers.push('TT'); colWidths.push(35); }

      const totalWidth = colWidths.reduce((a, b) => a + b, 0);
      const startX = (595 - totalWidth) / 2;

      y = drawTableHeader(doc, headers, colWidths, startX, y);
      sessions.forEach((sess, i) => {
        if (y > 750) {
          doc.addPage();
          y = 30;
          y = drawTableHeader(doc, headers, colWidths, startX, y);
        }
        
        const rateDisplay = sess.rate_type === 'hourly' 
          ? `${formatVND(sess.rate_per_hour)}/h` 
          : `${formatVND(sess.rate_per_session)}/buổi`;

        let rowData = [
          getDayOfWeek(sess.session_date),
          formatDate(sess.session_date),
          sess.student_name || 'N/A'
        ];
        
        if (hideSubject !== 'true') rowData.push(sess.subject_name || 'N/A');
        if (hideTime !== 'true') rowData.push(formatTime(sess.start_time), formatTime(sess.end_time));
        if (hideDuration !== 'true') rowData.push(parseFloat(sess.duration_hours || 0).toFixed(1));
        if (hidePrice !== 'true') rowData.push(rateDisplay);
        if (hideAmount !== 'true') rowData.push(formatVND(sess.total_amount));
        
        if (hideStatus !== 'true') {
          rowData.push(sess.status === 'completed' ? '✓' : sess.status === 'cancelled' ? '✗' : '~');
        }

        y = drawTableRow(doc, rowData, colWidths, startX, y, i % 2 === 0);
      });

      // Total row
      y += 5;
      doc.fillColor('#1a237e').font('Roboto-Bold').fontSize(10)
        .text(`TỔNG: ${formatVND(summary?.total_amount || 0)}`, 28, y, { align: 'right', width: 515 });
    }

    // Footer
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
         ORDER BY sess.session_date ASC`,
        [req.params.studentId, req.user.id]
      ),
      pool.query(
        'SELECT * FROM payments WHERE student_id=$1 AND user_id=$2 ORDER BY payment_date ASC',
        [req.params.studentId, req.user.id]
      )
    ]);
    
    const { hideSummary, hideSubject, hideTime, hideDuration, hideStatus, hidePrice, hideAmount } = req.query;

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
    let y = drawPDFHeader(doc, '', `Báo cáo học sinh: ${student.full_name}`);

    // Student info
    if (hideSummary !== 'true') {
      y += 10;
      doc.fillColor('#e8eaf6').roundedRect(40, y, 515, 80, 8).fill();
      doc.fillColor('#1a237e').font('Roboto-Bold').fontSize(10).text('THÔNG TIN HỌC SINH', 50, y + 8);
      doc.fillColor('#333').font('Roboto').fontSize(9)
        .text(`Họ và tên: ${student.full_name}`, 50, y + 25)
        .text(`Lớp: ${student.grade || 'N/A'}`, 250, y + 25)
        .text(`Phụ huynh: ${student.parent_name || 'N/A'}`, 50, y + 42)
        .text(`SĐT: ${student.parent_phone || 'N/A'}`, 250, y + 42)
        .text(`Tổng học phí: ${formatVND(totalOwe)}`, 50, y + 59)
        .text(`Đã thanh toán: ${formatVND(totalPaid)}`, 220, y + 59)
        .text(`CÒN NỢ: ${formatVND(balance)}`, 390, y + 59);
      y += 100;
    } else {
      y += 20;
    }

    doc.fillColor('#1a237e').font('Roboto-Bold').fontSize(12).text('CHI TIẾT BUỔI HỌC', 40, y);
    y += 20;

    if (sessions.length > 0) {
      const headers = ['Thứ', 'Ngày'];
      const colWidths = [45, 65];
      
      if (hideSubject !== 'true') { headers.push('Môn học'); colWidths.push(85); }
      if (hideTime !== 'true') { headers.push('Bắt đầu', 'Kết thúc'); colWidths.push(50, 50); }
      if (hideDuration !== 'true') { headers.push('Giờ'); colWidths.push(40); }
      if (hidePrice !== 'true') { headers.push('Đơn giá'); colWidths.push(75); }
      if (hideAmount !== 'true') { headers.push('Học phí'); colWidths.push(80); }
      if (hideStatus !== 'true') { headers.push('Trạng thái'); colWidths.push(65); }

      const totalWidth = colWidths.reduce((a, b) => a + b, 0);
      const startX = (595 - totalWidth) / 2;

      y = drawTableHeader(doc, headers, colWidths, startX, y);
      sessions.forEach((sess, i) => {
        if (y > 750) { doc.addPage(); y = 30; y = drawTableHeader(doc, headers, colWidths, startX, y); }
        
        const rateDisplay = sess.rate_type === 'hourly' 
          ? formatVND(sess.rate_per_hour)
          : formatVND(sess.rate_per_session);

        let rowData = [
          getDayOfWeek(sess.session_date),
          formatDate(sess.session_date)
        ];
        
        if (hideSubject !== 'true') rowData.push(sess.subject_name || 'N/A');
        if (hideTime !== 'true') rowData.push(formatTime(sess.start_time), formatTime(sess.end_time));
        if (hideDuration !== 'true') rowData.push(parseFloat(sess.duration_hours || 0).toFixed(1));
        if (hidePrice !== 'true') rowData.push(rateDisplay);
        if (hideAmount !== 'true') rowData.push(formatVND(sess.total_amount));
        if (hideStatus !== 'true') {
          rowData.push(sess.status === 'completed' ? 'Hoàn thành' : sess.status === 'cancelled' ? 'Hủy' : 'Chờ');
        }

        y = drawTableRow(doc, rowData, colWidths, startX, y, i % 2 === 0);
      });
    }

    y += 20;
    // Payments table
    if (payments.length > 0) {
      if (y > 650) { doc.addPage(); y = 30; }
      doc.fillColor('#1a237e').font('Roboto-Bold').fontSize(11).text('LỊCH SỬ THANH TOÁN', 40, y);
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
    doc.fillColor('#1a237e').font('Roboto-Bold').fontSize(12).text(`TỔNG KẾT NĂM ${year}`, 50, y + 8);
    doc.fillColor('#222').font('Roboto');
    if (stats.most_active_student) doc.text(`- Học sinh tích cực nhất: ${stats.most_active_student} (${stats.most_active_student_sessions} buổi)`, 40, y + 15);
    if (stats.best_subject) doc.text(`- Môn học phổ biến nhất: ${stats.best_subject} (${stats.best_subject_sessions} buổi)`, 40, y + 30);
    doc.text(`- Tỉ lệ hoàn thành lớp học: ${Math.round(totalSessions ? (completedCount / totalSessions * 100) : 0)}%`, 40, y + 45);
    y += 75;

    doc.fillColor('#1a237e').font('Roboto-Bold').fontSize(12).text('QUY CHUẨN THÁNG', 40, y);
    y += 20;

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
        d ? parseFloat(d.hours || 0).toFixed(2) : '-',
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
