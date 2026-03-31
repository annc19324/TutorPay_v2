import { useState, useEffect } from 'react';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { Plus, Edit2, Trash2, Search, UserPlus, Phone, MapPin, BookOpen } from 'lucide-react';

export default function Students() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ full_name: '', grade: '', parent_name: '', parent_phone: '', address: '', notes: '' });

  const load = async () => {
    try {
      const res = await api.get(`/students?search=${search}`);
      setStudents(res.data.students);
    } catch (e) { toast.error('Lỗi tải dữ liệu'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [search]);

  const openModal = (s = null) => {
    setEditing(s);
    setForm(s ? { full_name: s.full_name, grade: s.grade || '', parent_name: s.parent_name || '', parent_phone: s.parent_phone || '', address: s.address || '', notes: s.notes || '' } : { full_name: '', grade: '', parent_name: '', parent_phone: '', address: '', notes: '' });
    setShowModal(true);
  };

  const save = async (e) => {
    e.preventDefault();
    try {
      if (editing) {
        await api.put(`/students/${editing.id}`, { ...form, is_active: editing.is_active });
        toast.success('Đã cập nhật học sinh!');
      } else {
        await api.post('/students', form);
        toast.success('Đã thêm học sinh!');
      }
      setShowModal(false);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi');
    }
  };

  const remove = async (id) => {
    if (!confirm('Xác nhận xóa học sinh này?')) return;
    try {
      await api.delete(`/students/${id}`);
      toast.success('Đã xóa!');
      load();
    } catch { toast.error('Lỗi xóa'); }
  };

  const grades = ['Lớp 1', 'Lớp 2', 'Lớp 3', 'Lớp 4', 'Lớp 5', 'Lớp 6', 'Lớp 7', 'Lớp 8', 'Lớp 9', 'Lớp 10', 'Lớp 11', 'Lớp 12', 'Đại học', 'Người đi làm'];

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">👨‍🎓 Học Sinh</h1>
          <p className="page-subtitle">Quản lý danh sách học sinh của bạn</p>
        </div>
        <button className="btn btn-primary" onClick={() => openModal()}>
          <UserPlus size={16} /> Thêm Học Sinh
        </button>
      </div>

      <div className="filter-bar">
        <div className="search-wrapper" style={{ flex: 1, maxWidth: 360 }}>
          <Search size={16} />
          <input className="form-control" placeholder="Tìm học sinh, phụ huynh..."
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <span style={{ color: 'var(--text-dim)', fontSize: 14 }}>{students.length} học sinh</span>
      </div>

      {loading ? (
        <div className="loading-overlay"><div className="spinner" /></div>
      ) : students.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-icon">👩‍🎓</div>
            <div className="empty-title">Chưa có học sinh nào</div>
            <div className="empty-sub">Thêm học sinh để bắt đầu quản lý</div>
            <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => openModal()}>
              <Plus size={16} /> Thêm Học Sinh
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
          {students.map(s => (
            <div key={s.id} className="card" style={{ position: 'relative' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: 12,
                    background: `hsl(${s.full_name.charCodeAt(0) * 15 % 360}, 60%, 40%)`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 700, fontSize: 18, color: 'white', flexShrink: 0
                  }}>
                    {s.full_name.charAt(0)}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, color: 'white', fontSize: 15 }}>{s.full_name}</div>
                    {s.grade && <span className="badge badge-primary" style={{ fontSize: 10 }}>{s.grade}</span>}
                  </div>
                </div>
                <span className={`badge ${s.is_active ? 'badge-success' : 'badge-danger'}`}>
                  {s.is_active ? '● Đang học' : '○ Nghỉ'}
                </span>
              </div>

              {s.parent_name && (
                <div style={{ fontSize: 13, color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                  <UserPlus size={13} /> PH: {s.parent_name}
                </div>
              )}
              {s.parent_phone && (
                <div style={{ fontSize: 13, color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                  <Phone size={13} /> {s.parent_phone}
                </div>
              )}
              {s.address && (
                <div style={{ fontSize: 13, color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                  <MapPin size={13} /> {s.address}
                </div>
              )}

              <div style={{ padding: '12px 0', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', display: 'flex', gap: 16, marginBottom: 12 }}>
                <div style={{ textAlign: 'center', flex: 1 }}>
                  <div style={{ fontSize: 20, fontWeight: 800, color: 'white' }}>{s.session_count || 0}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>Buổi dạy</div>
                </div>
                <div style={{ textAlign: 'center', flex: 1 }}>
                  <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--success)' }}>
                    {parseFloat(s.total_owed || 0).toLocaleString('vi-VN')}₫
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>Tổng học phí</div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-secondary btn-sm" style={{ flex: 1 }} onClick={() => openModal(s)}>
                  <Edit2 size={14} /> Sửa
                </button>
                <button className="btn btn-danger btn-sm btn-icon" onClick={() => remove(s.id)}>
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <h3 className="modal-title">{editing ? '✏️ Sửa Học Sinh' : '➕ Thêm Học Sinh'}</h3>
              <button className="btn btn-icon btn-secondary" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={save}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Họ và tên *</label>
                  <input className="form-control" value={form.full_name}
                    onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} required placeholder="Nguyễn Văn A" />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Lớp</label>
                    <select className="form-control" value={form.grade}
                      onChange={e => setForm(f => ({ ...f, grade: e.target.value }))}>
                      <option value="">Chọn lớp...</option>
                      {grades.map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Tên phụ huynh</label>
                    <input className="form-control" value={form.parent_name}
                      onChange={e => setForm(f => ({ ...f, parent_name: e.target.value }))} placeholder="Nguyễn Phụ Huynh" />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">SĐT phụ huynh</label>
                    <input className="form-control" value={form.parent_phone}
                      onChange={e => setForm(f => ({ ...f, parent_phone: e.target.value }))} placeholder="0900000000" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Địa chỉ</label>
                    <input className="form-control" value={form.address}
                      onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="123 Đường..." />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Ghi chú</label>
                  <textarea className="form-control" value={form.notes}
                    onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Ghi chú thêm..." rows={3} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Hủy</button>
                <button type="submit" className="btn btn-primary">
                  {editing ? '💾 Cập nhật' : '➕ Thêm mới'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
