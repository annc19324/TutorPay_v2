import { useState, useEffect } from 'react';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { FileText, Download, Calendar, TrendingUp, Users } from 'lucide-react';

const now = new Date();
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);
const YEARS = [2023, 2024, 2025, 2026];

export default function Reports() {
  const [students, setStudents] = useState([]);
  const [startDate, setStartDate] = useState(() => {
    const d = new Date(now.getFullYear(), now.getMonth(), 1);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    const d = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return d.toISOString().split('T')[0];
  });
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [yearlyYear, setYearlyYear] = useState(now.getFullYear());
  const [downloading, setDownloading] = useState('');
  
  const [reportOptions, setReportOptions] = useState(() => {
    try {
      const saved = localStorage.getItem('tutorpay_pdf_options');
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      hideSummary: false,
      hideSubject: false,
      hideTime: false,
      hideDuration: false,
      hidePrice: false,
      hideAmount: false,
      hideStatus: false
    };
  });

  useEffect(() => {
    localStorage.setItem('tutorpay_pdf_options', JSON.stringify(reportOptions));
  }, [reportOptions]);

  useEffect(() => {
    api.get('/students').then(r => setStudents(r.data.students)).catch(() => {});
  }, []);

  const downloadPDF = async (url, filename, key) => {
    setDownloading(key);
    try {
      const token = localStorage.getItem('tutorpay_token');
      const res = await fetch(`${API_URL}${url}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed');
      const blob = await res.blob();
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = filename;
      link.click();
      toast.success('Đã tải PDF thành công!');
    } catch {
      toast.error('Lỗi tải PDF');
    } finally {
      setDownloading('');
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">📊 Báo Cáo</h1>
          <p className="page-subtitle">Xuất báo cáo lương, học sinh và thống kê dưới dạng PDF</p>
        </div>
      </div>

      <div style={{ display: 'grid', gap: 24 }}>
        {/* Global Print Settings */}
        <div className="card">
          <div style={{ fontSize: 16, fontWeight: 700, color: 'white', marginBottom: 16 }}>⚙️ Tuỳ chọn hiển thị khi xuất PDF</div>
          <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 14 }}>
              <input type="checkbox" checked={reportOptions.hideSummary} onChange={e => setReportOptions(r => ({...r, hideSummary: e.target.checked}))} />
              <span style={{ color: reportOptions.hideSummary ? 'var(--text-dim)' : 'var(--text)' }}>Ẩn Thông tin học sinh / Khối Tổng kết</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 14 }}>
              <input type="checkbox" checked={reportOptions.hideSubject} onChange={e => setReportOptions(r => ({...r, hideSubject: e.target.checked}))} />
              <span style={{ color: reportOptions.hideSubject ? 'var(--text-dim)' : 'var(--text)' }}>Ẩn cột Môn</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 14 }}>
              <input type="checkbox" checked={reportOptions.hideTime} onChange={e => setReportOptions(r => ({...r, hideTime: e.target.checked}))} />
              <span style={{ color: reportOptions.hideTime ? 'var(--text-dim)' : 'var(--text)' }}>Ẩn Giờ Bắt đầu / Kết thúc</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 14 }}>
              <input type="checkbox" checked={reportOptions.hideDuration} onChange={e => setReportOptions(r => ({...r, hideDuration: e.target.checked}))} />
              <span style={{ color: reportOptions.hideDuration ? 'var(--text-dim)' : 'var(--text)' }}>Ẩn Số giờ</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 14 }}>
              <input type="checkbox" checked={reportOptions.hidePrice} onChange={e => setReportOptions(r => ({...r, hidePrice: e.target.checked}))} />
              <span style={{ color: reportOptions.hidePrice ? 'var(--text-dim)' : 'var(--text)' }}>Ẩn Đơn giá</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 14 }}>
              <input type="checkbox" checked={reportOptions.hideAmount} onChange={e => setReportOptions(r => ({...r, hideAmount: e.target.checked}))} />
              <span style={{ color: reportOptions.hideAmount ? 'var(--text-dim)' : 'var(--text)' }}>Ẩn Học phí (Thành tiền)</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 14 }}>
              <input type="checkbox" checked={reportOptions.hideStatus} onChange={e => setReportOptions(r => ({...r, hideStatus: e.target.checked}))} />
              <span style={{ color: reportOptions.hideStatus ? 'var(--text-dim)' : 'var(--text)' }}>Ẩn Trạng thái</span>
            </label>
          </div>
        </div>

        {/* Monthly salary report */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
            <div style={{ width: 52, height: 52, borderRadius: 14, background: 'rgba(79,70,229,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FileText size={24} color="var(--primary-light)" />
            </div>
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: 'white' }}>📋 Bảng lương tháng</h2>
              <p style={{ color: 'var(--text-dim)', fontSize: 13 }}>Tổng hợp tất cả buổi dạy và thu nhập trong tháng</p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <input type="date" className="form-control" value={startDate} onChange={e => setStartDate(e.target.value)} />
            </div>
            <div style={{ color: 'var(--text-dim)' }}>đến</div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <input type="date" className="form-control" value={endDate} onChange={e => setEndDate(e.target.value)} />
            </div>
            <div className="form-group" style={{ marginBottom: 0, minWidth: 160 }}>
              <select className="form-control" value={selectedStudentId} onChange={e => setSelectedStudentId(e.target.value)}>
                <option value="">-- Tất cả học sinh --</option>
                {students.map(s => (
                  <option key={s.id} value={s.id}>{s.full_name}</option>
                ))}
              </select>
            </div>
            <button
              className="btn btn-primary"
              disabled={downloading === 'salary'}
              onClick={() => {
                const query = `startDate=${startDate}&endDate=${endDate}&studentId=${selectedStudentId}&hideSummary=${reportOptions.hideSummary}&hideSubject=${reportOptions.hideSubject}&hideTime=${reportOptions.hideTime}&hideDuration=${reportOptions.hideDuration}&hidePrice=${reportOptions.hidePrice}&hideAmount=${reportOptions.hideAmount}&hideStatus=${reportOptions.hideStatus}`;
                downloadPDF(
                  `/reports/salary-report?${query}`,
                  `bang-luong-${startDate}-den-${endDate}.pdf`,
                  'salary'
                );
              }}
            >
              {downloading === 'salary' ? <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> : <Download size={16} />}
              Xuất PDF Bảng Lương
            </button>
          </div>
        </div>
        {/* Student report */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
            <div style={{ width: 52, height: 52, borderRadius: 14, background: 'rgba(16,185,129,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Users size={24} color="var(--success)" />
            </div>
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: 'white' }}>👩‍🎓 Báo cáo học sinh</h2>
              <p style={{ color: 'var(--text-dim)', fontSize: 13 }}>Lịch sử dạy học và thanh toán của từng học sinh</p>
            </div>
          </div>

          {students.length === 0 ? (
            <div className="alert alert-info">Chưa có học sinh nào. Hãy thêm học sinh ở trang Học Sinh.</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
              {students.map(s => (
                <div key={s.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'rgba(79,70,229,0.05)', borderRadius: 10, border: '1px solid var(--border)' }}>
                  <div>
                    <div style={{ fontWeight: 600, color: 'white' }}>{s.full_name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>{s.grade && `${s.grade} · `}{s.session_count || 0} buổi</div>
                  </div>
                  <button
                    className="btn btn-success btn-sm"
                    disabled={downloading === s.id}
                    onClick={() => {
                      const query = `hideSummary=${reportOptions.hideSummary}&hideSubject=${reportOptions.hideSubject}&hideTime=${reportOptions.hideTime}&hideDuration=${reportOptions.hideDuration}&hidePrice=${reportOptions.hidePrice}&hideAmount=${reportOptions.hideAmount}&hideStatus=${reportOptions.hideStatus}`;
                      downloadPDF(
                        `/reports/student-report/${s.id}?${query}`,
                        `bao-cao-${s.full_name.replace(/\s+/g, '-')}.pdf`,
                        s.id
                      );
                    }}
                  >
                    {downloading === s.id ? <span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> : <Download size={14} />}
                    PDF
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Yearly report */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
            <div style={{ width: 52, height: 52, borderRadius: 14, background: 'rgba(245,158,11,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <TrendingUp size={24} color="var(--warning)" />
            </div>
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: 'white' }}>📅 Báo cáo năm</h2>
              <p style={{ color: 'var(--text-dim)', fontSize: 13 }}>Tổng kết toàn năm - doanh thu, số buổi theo tháng và top học sinh</p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <select className="form-control" style={{ width: 'auto' }} value={yearlyYear} onChange={e => setYearlyYear(e.target.value)}>
              {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <button
              className="btn btn-primary"
              disabled={downloading === 'yearly'}
              onClick={() => downloadPDF(
                `/reports/yearly-report/${yearlyYear}`,
                `bao-cao-nam-${yearlyYear}.pdf`,
                'yearly'
              )}
            >
              {downloading === 'yearly' ? <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> : <Download size={16} />}
              Xuất PDF Báo Cáo Năm
            </button>
          </div>

          <div style={{ marginTop: 16, padding: '12px 16px', background: 'rgba(245,158,11,0.05)', borderRadius: 10, display: 'flex', gap: 20, flexWrap: 'wrap' }}>
            <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>✅ Thống kê 12 tháng</div>
            <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>✅ Doanh thu và số buổi</div>
            <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>✅ Top 10 học sinh</div>
            <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>✅ Biểu đồ trực quan</div>
          </div>
        </div>
      </div>
    </div>
  );
}
