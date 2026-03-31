import { useState, useEffect } from 'react';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { Plus, Edit2, Trash2, Filter, Clock, DollarSign } from 'lucide-react';

const now = new Date();
const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);
const YEARS = [2023, 2024, 2025, 2026];

const formatVND = n => n ? parseFloat(n).toLocaleString('vi-VN') : '0';
const formatTime = t => t ? t.substring(0, 5) : '';
const formatDate = d => {
  if (!d) return '';
  const dt = new Date(d);
  return `${dt.getDate().toString().padStart(2, '0')}/${(dt.getMonth() + 1).toString().padStart(2, '0')}/${dt.getFullYear()}`;
};

export default function Sessions() {
  const [sessions, setSessions] = useState([]);
  const [students, setStudents] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [studentFilter, setStudentFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [stats, setStats] = useState(null);
  const emptyForm = {
    student_id: '', subject_id: '', session_date: new Date().toISOString().split('T')[0],
    start_time: '08:00', end_time: '10:00', rate_per_hour: '', status: 'completed', notes: ''
  };
  const [form, setForm] = useState(emptyForm);

  const load = async () => {
    setLoading(true);
    try {
      const [sessRes, statsRes, studRes, subRes] = await Promise.all([
        api.get(`/sessions?month=${month}&year=${year}${studentFilter ? `&student_id=${studentFilter}` : ''}&limit=200`),
        api.get(`/sessions/stats?month=${month}&year=${year}`),
        api.get('/students'),
        api.get('/settings')
      ]);
      setSessions(sessRes.data.sessions);
      setStats(statsRes.data.summary);
      setStudents(studRes.data.students);
      setSubjects(subRes.data.subjects);
    } catch (e) { toast.error('Lỗi tải dữ liệu'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [month, year, studentFilter]);

  const openModal = (s = null) => {
    setEditing(s);
    setForm(s ? {
      student_id: s.student_id || '', subject_id: s.subject_id || '',
      session_date: s.session_date?.split('T')[0] || '', start_time: s.start_time?.substring(0, 5) || '',
      end_time: s.end_time?.substring(0, 5) || '', rate_per_hour: s.rate_per_hour || '', status: s.status, notes: s.notes || ''
    } : emptyForm);
    setShowModal(true);
  };

  const save = async (e) => {
    e.preventDefault();
    if (form.end_time <= form.start_time) { toast.error('Giờ kết thúc phải sau giờ bắt đầu'); return; }
    try {
      if (editing) {
        await api.put(`/sessions/${editing.id}`, form);
        toast.success('Đã cập nhật buổi dạy!');
      } else {
        await api.post('/sessions', form);
        toast.success('Đã thêm buổi dạy!');
      }
      setShowModal(false);
      load();
    } catch (err) { toast.error(err.response?.data?.message || 'Lỗi lưu'); }
  };

  const remove = async (id) => {
    if (!confirm('Xóa buổi dạy này?')) return;
    try { await api.delete(`/sessions/${id}`); toast.success('Đã xóa!'); load(); }
    catch { toast.error('Lỗi xóa'); }
  };

  const calcHours = (start, end) => {
    if (!start || !end) return 0;
    const [sh, sm] = start.split(':').map(Number);
    const [eh, em] = end.split(':').map(Number);
    return Math.max(0, (eh * 60 + em - sh * 60 - sm) / 60);
  };

  const previewAmount = calcHours(form.start_time, form.end_time) * (parseFloat(form.rate_per_hour) || 0);

  const statusColor = { completed: 'success', cancelled: 'danger', pending: 'warning' };
  const statusLabel = { completed: 'Hoàn thành', cancelled: 'Đã hủy', pending: 'Chờ xử lý' };

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">📚 Buổi Dạy</h1>
          <p className="page-subtitle">Quản lý lịch dạy và tính lương tự động</p>
        </div>
        <button className="btn btn-primary" onClick={() => openModal()}>
          <Plus size={16} /> Thêm Buổi Dạy
        </button>
      </div>

      {/* Summary stats */}
      {stats && (
        <div className="stats-grid" style={{ marginBottom: 20 }}>
          <div className="stat-card">
            <div className="stat-icon" style={{ background: 'rgba(79,70,229,0.15)' }}><DollarSign size={22} color="var(--primary-light)" /></div>
            <div><div className="stat-value">{formatVND(stats.total_amount)}₫</div><div className="stat-label">Tổng thu nhập</div></div>
          </div>
          <div className="stat-card">
            <div className="stat-icon" style={{ background: 'rgba(16,185,129,0.15)' }}><Plus size={22} color="var(--success)" /></div>
            <div><div className="stat-value">{stats.total_sessions}</div><div className="stat-label">Số buổi dạy</div></div>
          </div>
          <div className="stat-card">
            <div className="stat-icon" style={{ background: 'rgba(6,182,212,0.15)' }}><Clock size={22} color="var(--accent)" /></div>
            <div><div className="stat-value">{parseFloat(stats.total_hours || 0).toFixed(1)}h</div><div className="stat-label">Tổng giờ dạy</div></div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="filter-bar">
        <select className="form-control" value={month} onChange={e => setMonth(e.target.value)}>
          {MONTHS.map(m => <option key={m} value={m}>Tháng {m}</option>)}
        </select>
        <select className="form-control" value={year} onChange={e => setYear(e.target.value)}>
          {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <select className="form-control" value={studentFilter} onChange={e => setStudentFilter(e.target.value)}>
          <option value="">Tất cả học sinh</option>
          {students.map(s => <option key={s.id} value={s.id}>{s.full_name}</option>)}
        </select>
        <span style={{ color: 'var(--text-dim)', fontSize: 13 }}>{sessions.length} buổi</span>
      </div>

      {/* Table */}
      {loading ? (
        <div className="loading-overlay"><div className="spinner" /></div>
      ) : sessions.length === 0 ? (
        <div className="card"><div className="empty-state">
          <div className="empty-icon">📖</div>
          <div className="empty-title">Không có buổi dạy nào</div>
          <div className="empty-sub">Tháng {month}/{year}</div>
          <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => openModal()}>
            <Plus size={16} /> Thêm buổi dạy
          </button>
        </div></div>
      ) : (
        <div className="card" style={{ padding: 0 }}>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Ngày</th>
                  <th>Học sinh</th>
                  <th>Môn</th>
                  <th>Giờ</th>
                  <th>Số giờ</th>
                  <th>Đơn giá/h</th>
                  <th>Thành tiền</th>
                  <th>Trạng thái</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map(s => (
                  <tr key={s.id}>
                    <td style={{ fontWeight: 600 }}>{formatDate(s.session_date)}</td>
                    <td>{s.student_name || <span style={{ color: 'var(--text-muted)' }}>—</span>}</td>
                    <td>{s.subject_name || <span style={{ color: 'var(--text-muted)' }}>—</span>}</td>
                    <td style={{ color: 'var(--text-dim)' }}>{formatTime(s.start_time)} – {formatTime(s.end_time)}</td>
                    <td style={{ fontWeight: 600 }}>{parseFloat(s.duration_hours).toFixed(1)}h</td>
                    <td>{formatVND(s.rate_per_hour)}₫</td>
                    <td style={{ fontWeight: 700, color: 'var(--success)' }}>{formatVND(s.total_amount)}₫</td>
                    <td><span className={`badge badge-${statusColor[s.status]}`}>{statusLabel[s.status]}</span></td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-secondary btn-sm btn-icon" onClick={() => openModal(s)} title="Sửa"><Edit2 size={13} /></button>
                        <button className="btn btn-danger btn-sm btn-icon" onClick={() => remove(s.id)} title="Xóa"><Trash2 size={13} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal modal-lg">
            <div className="modal-header">
              <h3 className="modal-title">{editing ? '✏️ Sửa Buổi Dạy' : '➕ Thêm Buổi Dạy'}</h3>
              <button className="btn btn-icon btn-secondary" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={save}>
              <div className="modal-body">
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Học sinh</label>
                    <select className="form-control" value={form.student_id} onChange={e => setForm(f => ({ ...f, student_id: e.target.value }))}>
                      <option value="">Chọn học sinh...</option>
                      {students.map(s => <option key={s.id} value={s.id}>{s.full_name}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Môn học</label>
                    <select className="form-control" value={form.subject_id} onChange={e => setForm(f => ({ ...f, subject_id: e.target.value }))}>
                      <option value="">Chọn môn...</option>
                      {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Ngày dạy *</label>
                  <input type="date" className="form-control" value={form.session_date}
                    onChange={e => setForm(f => ({ ...f, session_date: e.target.value }))} required />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Giờ bắt đầu *</label>
                    <input type="time" className="form-control" value={form.start_time}
                      onChange={e => setForm(f => ({ ...f, start_time: e.target.value }))} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Giờ kết thúc *</label>
                    <input type="time" className="form-control" value={form.end_time}
                      onChange={e => setForm(f => ({ ...f, end_time: e.target.value }))} required />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Đơn giá / giờ (VNĐ) *</label>
                    <input type="number" className="form-control" value={form.rate_per_hour} min="0" step="1000"
                      onChange={e => setForm(f => ({ ...f, rate_per_hour: e.target.value }))} required placeholder="200000" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Trạng thái</label>
                    <select className="form-control" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                      <option value="completed">Hoàn thành</option>
                      <option value="pending">Chờ xử lý</option>
                      <option value="cancelled">Đã hủy</option>
                    </select>
                  </div>
                </div>

                {/* Preview */}
                {form.start_time && form.end_time && form.rate_per_hour && (
                  <div className="alert alert-info" style={{ justifyContent: 'space-between' }}>
                    <span>⏱ {calcHours(form.start_time, form.end_time).toFixed(1)} giờ</span>
                    <span style={{ fontWeight: 700 }}>💵 {previewAmount.toLocaleString('vi-VN')}₫</span>
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">Ghi chú</label>
                  <textarea className="form-control" value={form.notes} rows={2}
                    onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Ghi chú nội dung buổi học..." />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Hủy</button>
                <button type="submit" className="btn btn-primary">{editing ? '💾 Cập nhật' : '➕ Thêm mới'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
