import { useState, useEffect } from 'react';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { Clock, Plus, Edit, Trash2, Calendar, Zap } from 'lucide-react';

const DAYS = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ nhật'];

export default function TimeSlots() {
  const [slots, setSlots] = useState([]);
  const [students, setStudents] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [showGenModal, setShowGenModal] = useState(false);
  const [editingSlot, setEditingSlot] = useState(null);

  const getSavedRate = () => {
    try {
      const saved = localStorage.getItem('tutorpay_last_rate');
      return saved ? JSON.parse(saved) : { type: 'hourly', hour: '', session: '' };
    } catch {
      return { type: 'hourly', hour: '', session: '' };
    }
  };

  const getEmptyForm = () => {
    const saved = getSavedRate();
    return {
      student_id: '', subject_id: '', day_of_week: '0',
      start_time: '', end_time: '',
      rate_type: saved.type, rate_per_hour: saved.hour, rate_per_session: saved.session,
      label: '', notes: '', is_active: true
    };
  };

  const [form, setForm] = useState(getEmptyForm());

  const [genForm, setGenForm] = useState({
    from_date: new Date().toISOString().split('T')[0],
    to_date: new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString().split('T')[0],
    selected_slots: []
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [resSlots, resSt, resSub] = await Promise.all([
        api.get('/timeslots'),
        api.get('/students'),
        api.get('/settings')
      ]);
      setSlots(resSlots.data.time_slots || []);
      setStudents(resSt.data.students || []);
      setSubjects(resSub.data.settings?.subjects || []);
    } catch (error) {
      toast.error('Lỗi tải dữ liệu khung giờ');
    } finally {
      setLoading(false);
    }
  };

  const openForm = (slot = null) => {
    if (slot) {
      setEditingSlot(slot);
      setForm({
        ...slot,
        student_id: slot.student_id || '',
        subject_id: slot.subject_id || '',
        day_of_week: slot.day_of_week !== null ? String(slot.day_of_week) : '0',
        rate_type: slot.rate_type || 'hourly',
        rate_per_hour: slot.rate_per_hour || '',
        rate_per_session: slot.rate_per_session || '',
        label: slot.label || '',
        notes: slot.notes || '',
        is_active: slot.is_active
      });
    } else {
      setEditingSlot(null);
      const saved = getSavedRate();
      setForm({
        student_id: students[0]?.id || '',
        subject_id: subjects[0]?.id || '',
        day_of_week: '0', start_time: '18:00', end_time: '20:00',
        rate_type: saved.type, rate_per_hour: saved.hour, rate_per_session: saved.session,
        label: '', notes: '', is_active: true
      });
    }
    setShowModal(true);
  };

  const saveSlot = async (e) => {
    e.preventDefault();

    localStorage.setItem('tutorpay_last_rate', JSON.stringify({
      type: form.rate_type, hour: form.rate_per_hour, session: form.rate_per_session
    }));

    try {
      const payload = {
        ...form,
        day_of_week: parseInt(form.day_of_week),
        student_id: form.student_id || null,
        subject_id: form.subject_id || null,
        rate_per_hour: form.rate_type === 'hourly' ? parseFloat(form.rate_per_hour) : null,
        rate_per_session: form.rate_type === 'per_session' ? parseFloat(form.rate_per_session) : null
      };

      if (editingSlot) {
        await api.put(`/timeslots/${editingSlot.id}`, payload);
        toast.success('Đã cập nhật!');
      } else {
        await api.post('/timeslots', payload);
        toast.success('Đã thêm thành công!');
      }
      setShowModal(false);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Có lỗi xảy ra');
    }
  };

  const deleteSlot = async (id) => {
    if (!window.confirm('Bạn có chắc muốn xóa khung giờ này?')) return;
    try {
      await api.delete(`/timeslots/${id}`);
      toast.success('Đã xóa!');
      fetchData();
    } catch {
      toast.error('Xóa thất bại');
    }
  };

  const toggleSlotSelection = (id) => {
    setGenForm(prev => {
      if (prev.selected_slots.includes(id)) {
        return { ...prev, selected_slots: prev.selected_slots.filter(s => s !== id) };
      }
      return { ...prev, selected_slots: [...prev.selected_slots, id] };
    });
  };

  const generateSessions = async (e) => {
    e.preventDefault();
    if (genForm.selected_slots.length === 0) {
      return toast.error('Vui lòng chọn ít nhất 1 khung giờ');
    }
    try {
      const res = await api.post('/timeslots/generate-sessions', {
        from_date: genForm.from_date,
        to_date: genForm.to_date,
        time_slot_ids: genForm.selected_slots
      });
      toast.success(res.data.message);
      setShowGenModal(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Có lỗi xảy ra khi tạo buổi dạy');
    }
  };

  if (loading) return <div className="page-container"><div className="spinner" /></div>;

  return (
    <div className="page-container">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="page-title">🕒 Khung Giờ Cố Định</h1>
          <p className="page-subtitle">Quản lý lịch dạy cố định và tự động tạo buổi dạy</p>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button className="btn btn-secondary" onClick={() => {
            setGenForm(prev => ({ ...prev, selected_slots: slots.map(s => s.id) }));
            setShowGenModal(true);
          }}>
            <Zap size={18} /> Tạo Nhanh Buổi Dạy
          </button>
          <button className="btn btn-primary" onClick={() => openForm()}>
            <Plus size={18} /> Thêm Khung Giờ
          </button>
        </div>
      </div>

      <div className="card table-responsive">
        <table className="table">
          <thead>
            <tr>
              <th>Học sinh</th>
              <th>Môn học</th>
              <th>Ngày trong tuần</th>
              <th>Giờ</th>
              <th>Đơn giá</th>
              <th style={{ textAlign: 'center' }}>Trạng thái</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {slots.length === 0 ? (
              <tr><td colSpan="7" style={{ textAlign: 'center', padding: 30, color: 'var(--text-dim)' }}>Chưa có khung giờ cố định nào.</td></tr>
            ) : slots.map(s => (
              <tr key={s.id}>
                <td style={{ fontWeight: 600 }}>{s.student_name || <span style={{ color: 'var(--text-dim)' }}>Không có</span>}</td>
                <td>
                  {s.subject_name ? (
                    <span className="badge" style={{ background: 'rgba(79,70,229,0.15)', color: 'var(--primary-light)' }}>
                      {s.subject_name}
                    </span>
                  ) : '-'}
                </td>
                <td>
                  <span className="badge" style={{ background: 'rgba(245,158,11,0.15)', color: 'var(--warning)' }}>
                    {DAYS[s.day_of_week]}
                  </span>
                </td>
                <td style={{ color: 'var(--text)' }}>
                  {s.start_time.substring(0, 5)} - {s.end_time.substring(0, 5)}
                </td>
                <td>
                  {s.rate_type === 'hourly' 
                    ? <span style={{ color: 'var(--success)' }}>{Number(s.rate_per_hour || 0).toLocaleString('vi')}₫ <small>/giờ</small></span>
                    : <span style={{ color: 'var(--primary-light)' }}>{Number(s.rate_per_session || 0).toLocaleString('vi')}₫ <small>/buổi</small></span>}
                </td>
                <td style={{ textAlign: 'center' }}>
                  <span className={`badge ${s.is_active ? 'badge-success' : 'badge-danger'}`}>
                    {s.is_active ? 'Hoạt động' : 'Tạm dừng'}
                  </span>
                </td>
                <td>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button className="btn btn-secondary btn-sm btn-icon" onClick={() => openForm(s)}><Edit size={14} /></button>
                    <button className="btn btn-danger btn-sm btn-icon" onClick={() => deleteSlot(s.id)}><Trash2 size={14} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="modal-backdrop">
          <div className="modal" style={{ maxWidth: 600 }}>
            <div className="modal-header">
              <h3>{editingSlot ? 'Chỉnh Sửa Khung Giờ' : 'Thêm Khung Giờ'}</h3>
              <button className="btn btn-icon" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={saveSlot}>
              <div className="modal-body" style={{ display: 'grid', gap: 16 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div className="form-group">
                    <label className="form-label">Học sinh</label>
                    <select className="form-control" value={form.student_id} onChange={e => setForm({...form, student_id: e.target.value})}>
                      <option value="">-- Chọn Học sinh --</option>
                      {students.filter(st => st.is_active).map(st => (
                        <option key={st.id} value={st.id}>{st.full_name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Môn học</label>
                    <select className="form-control" value={form.subject_id} onChange={e => setForm({...form, subject_id: e.target.value})}>
                      <option value="">-- Chọn Môn --</option>
                      {subjects.filter(s => s.is_active).map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
                  <div className="form-group">
                    <label className="form-label">Ngày trong tuần</label>
                    <select className="form-control" value={form.day_of_week} onChange={e => setForm({...form, day_of_week: e.target.value})}>
                      {DAYS.map((d, i) => <option key={i} value={i}>{d}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Giờ bắt đầu</label>
                    <input type="time" className="form-control" required
                           value={form.start_time} onChange={e => setForm({...form, start_time: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Giờ kết thúc</label>
                    <input type="time" className="form-control" required
                           value={form.end_time} onChange={e => setForm({...form, end_time: e.target.value})} />
                  </div>
                </div>

                <div className="form-group" style={{ padding: 12, border: '1px solid var(--border)', borderRadius: 8 }}>
                  <label className="form-label" style={{ marginBottom: 12 }}>Cách tính lương</label>
                  <div style={{ display: 'flex', gap: 20, marginBottom: 12 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                      <input type="radio" name="rate_type" value="hourly"
                             checked={form.rate_type === 'hourly'} onChange={e => setForm({...form, rate_type: e.target.value})} />
                      <span>Theo giờ</span>
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                      <input type="radio" name="rate_type" value="per_session"
                             checked={form.rate_type === 'per_session'} onChange={e => setForm({...form, rate_type: e.target.value})} />
                      <span>Theo buổi</span>
                    </label>
                  </div>
                  {form.rate_type === 'hourly' ? (
                    <input type="number" className="form-control" required placeholder="Ví dụ: 200000"
                           value={form.rate_per_hour} onChange={e => setForm({...form, rate_per_hour: e.target.value})} />
                  ) : (
                    <input type="number" className="form-control" required placeholder="Ví dụ: 300000"
                           value={form.rate_per_session} onChange={e => setForm({...form, rate_per_session: e.target.value})} />
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label">Ghi chú</label>
                  <textarea className="form-control" rows="2"
                            value={form.notes} onChange={e => setForm({...form, notes: e.target.value})}></textarea>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Hủy</button>
                <button type="submit" className="btn btn-primary">Lưu Khung Giờ</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showGenModal && (
        <div className="modal-backdrop">
          <div className="modal" style={{ maxWidth: 600 }}>
            <div className="modal-header">
              <h3>⚡ Tạo Nhanh Buổi Dạy Từ Khung Giờ</h3>
              <button className="btn btn-icon" onClick={() => setShowGenModal(false)}>✕</button>
            </div>
            <form onSubmit={generateSessions}>
              <div className="modal-body" style={{ display: 'grid', gap: 16 }}>
                <div style={{ background: 'rgba(56, 189, 248, 0.1)', padding: 12, borderRadius: 8, color: '#38bdf8', fontSize: 13 }}>
                  Hệ thống sẽ quét trong khoảng thời gian bên dưới và tự động tạo các buổi dạy cho những khung giờ bạn chọn.
                </div>
                
                <div style={{ display: 'flex', gap: 16 }}>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label className="form-label">Từ ngày</label>
                    <input type="date" className="form-control" required
                           value={genForm.from_date} onChange={e => setGenForm({...genForm, from_date: e.target.value})} />
                  </div>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label className="form-label">Đến ngày</label>
                    <input type="date" className="form-control" required
                           value={genForm.to_date} onChange={e => setGenForm({...genForm, to_date: e.target.value})} />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Chọn những khung giờ cần tạo ({genForm.selected_slots.length}/{slots.length}):</label>
                  <div style={{ display: 'grid', gap: 8, maxHeight: 300, overflowY: 'auto', paddingRight: 4 }}>
                    {slots.filter(s => s.is_active).map(s => (
                      <label key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 8, cursor: 'pointer' }}>
                        <input type="checkbox" checked={genForm.selected_slots.includes(s.id)} onChange={() => toggleSlotSelection(s.id)} />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 600, color: 'var(--text)', marginBottom: 2 }}>{s.student_name} <span style={{ color: 'var(--text-dim)', fontWeight: 400 }}>· {s.subject_name}</span></div>
                          <div style={{ fontSize: 13, color: 'var(--warning)' }}>{DAYS[s.day_of_week]}, {s.start_time.substring(0,5)} - {s.end_time.substring(0,5)}</div>
                        </div>
                      </label>
                    ))}
                    {slots.filter(s => s.is_active).length === 0 && (
                      <div style={{ color: 'var(--text-dim)', fontStyle: 'italic' }}>Không có khung giờ nào đang hoạt động.</div>
                    )}
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowGenModal(false)}>Hủy</button>
                <button type="submit" className="btn btn-primary" disabled={genForm.selected_slots.length === 0}>Bắt Đầu Tạo</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
