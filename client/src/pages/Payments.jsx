import { useState, useEffect } from 'react';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { Plus, Trash2, CreditCard, TrendingUp } from 'lucide-react';

const now = new Date();
const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);
const YEARS = [2023, 2024, 2025, 2026];
const formatVND = n => n ? parseFloat(n).toLocaleString('vi-VN') : '0';
const formatDate = d => { if (!d) return ''; const dt = new Date(d); return `${dt.getDate().toString().padStart(2,'0')}/${(dt.getMonth()+1).toString().padStart(2,'0')}/${dt.getFullYear()}`; };

const PAYMENT_METHODS = ['cash', 'bank_transfer', 'momo', 'zalopay', 'other'];
const METHOD_LABELS = { cash: '💵 Tiền mặt', bank_transfer: '🏦 Chuyển khoản', momo: '📱 MoMo', zalopay: '💙 ZaloPay', other: '🔄 Khác' };

export default function Payments() {
  const [payments, setPayments] = useState([]);
  const [balance, setBalance] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [studentFilter, setStudentFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [activeTab, setActiveTab] = useState('payments');
  const emptyForm = { student_id: '', amount: '', payment_date: new Date().toISOString().split('T')[0], payment_method: 'cash', reference_code: '', notes: '' };
  const [form, setForm] = useState(emptyForm);

  const load = async () => {
    setLoading(true);
    try {
      const [pRes, bRes, sRes] = await Promise.all([
        api.get(`/payments?month=${month}&year=${year}${studentFilter ? `&student_id=${studentFilter}` : ''}`),
        api.get('/payments/balance'),
        api.get('/students')
      ]);
      setPayments(pRes.data.payments);
      setBalance(bRes.data.balance);
      setStudents(sRes.data.students);
    } catch { toast.error('Lỗi tải dữ liệu'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [month, year, studentFilter]);

  const save = async (e) => {
    e.preventDefault();
    try {
      await api.post('/payments', form);
      toast.success('Đã ghi nhận thanh toán!');
      setShowModal(false);
      setForm(emptyForm);
      load();
    } catch (err) { toast.error(err.response?.data?.message || 'Lỗi lưu'); }
  };

  const remove = async (id) => {
    if (!confirm('Xóa khoản thanh toán này?')) return;
    try { await api.delete(`/payments/${id}`); toast.success('Đã xóa!'); load(); }
    catch { toast.error('Lỗi xóa'); }
  };

  const totalPaid = payments.reduce((s, p) => s + parseFloat(p.amount || 0), 0);
  const totalDebt = balance.reduce((s, b) => s + Math.max(0, parseFloat(b.balance || 0)), 0);

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">💳 Thanh Toán</h1>
          <p className="page-subtitle">Quản lý thu học phí và công nợ học sinh</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={16} /> Ghi Nhận Thanh Toán
        </button>
      </div>

      {/* Summary */}
      <div className="stats-grid" style={{ marginBottom: 20 }}>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(16,185,129,0.15)' }}><CreditCard size={22} color="var(--success)" /></div>
          <div>
            <div className="stat-value">{formatVND(totalPaid)}₫</div>
            <div className="stat-label">Đã thu tháng {month}</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(239,68,68,0.15)' }}><TrendingUp size={22} color="var(--danger)" /></div>
          <div>
            <div className="stat-value">{formatVND(totalDebt)}₫</div>
            <div className="stat-label">Tổng còn nợ</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(79,70,229,0.15)' }}><Plus size={22} color="var(--primary-light)" /></div>
          <div>
            <div className="stat-value">{payments.length}</div>
            <div className="stat-label">Giao dịch tháng {month}</div>
          </div>
        </div>
      </div>

      <div className="tabs">
        <button className={`tab-btn ${activeTab === 'payments' ? 'active' : ''}`} onClick={() => setActiveTab('payments')}>💳 Lịch sử giao dịch</button>
        <button className={`tab-btn ${activeTab === 'balance' ? 'active' : ''}`} onClick={() => setActiveTab('balance')}>📊 Công nợ học sinh</button>
      </div>

      {activeTab === 'payments' && (
        <>
          <div className="filter-bar">
            <select className="form-control" value={month} onChange={e => setMonth(e.target.value)}>
              {MONTHS.map(m => <option key={m} value={m}>Tháng {m}</option>)}
            </select>
            <select className="form-control" value={year} onChange={e => setYear(e.target.value)}>
              {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <select className="form-control" value={studentFilter} onChange={e => setStudentFilter(e.target.value)}>
              <option value="">Tất cả</option>
              {students.map(s => <option key={s.id} value={s.id}>{s.full_name}</option>)}
            </select>
          </div>

          {loading ? <div className="loading-overlay"><div className="spinner" /></div> :
            payments.length === 0 ? (
              <div className="card"><div className="empty-state">
                <div className="empty-icon">💰</div>
                <div className="empty-title">Không có giao dịch nào</div>
                <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => setShowModal(true)}><Plus size={16} /> Ghi nhận</button>
              </div></div>
            ) : (
              <div className="card" style={{ padding: 0 }}>
                <div className="table-container">
                  <table>
                    <thead><tr>
                      <th>Ngày</th><th>Học sinh</th><th>Số tiền</th>
                      <th>Phương thức</th><th>Mã GD</th><th>Ghi chú</th><th></th>
                    </tr></thead>
                    <tbody>
                      {payments.map(p => (
                        <tr key={p.id}>
                          <td style={{ fontWeight: 600 }}>{formatDate(p.payment_date)}</td>
                          <td>{p.student_name || '—'}</td>
                          <td style={{ fontWeight: 700, color: 'var(--success)' }}>{formatVND(p.amount)}₫</td>
                          <td><span className="badge badge-primary">{METHOD_LABELS[p.payment_method] || p.payment_method}</span></td>
                          <td style={{ color: 'var(--text-dim)', fontSize: 12 }}>{p.reference_code || '—'}</td>
                          <td style={{ color: 'var(--text-dim)', fontSize: 13 }}>{p.notes || '—'}</td>
                          <td>
                            <button className="btn btn-danger btn-sm btn-icon" onClick={() => remove(p.id)}><Trash2 size={13} /></button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
        </>
      )}

      {activeTab === 'balance' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {balance.length === 0 ? (
            <div className="card"><div className="empty-state">
              <div className="empty-icon">✅</div>
              <div className="empty-title">Chưa có học sinh nào</div>
            </div></div>
          ) : balance.map(b => {
            const debt = parseFloat(b.balance || 0);
            const owed = parseFloat(b.total_owed || 0);
            const paid = parseFloat(b.total_paid || 0);
            const pct = owed > 0 ? Math.min(100, (paid / owed) * 100) : 100;
            return (
              <div key={b.id} className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <div style={{ fontWeight: 700, color: 'white', fontSize: 16 }}>{b.full_name}</div>
                  <span className={`badge ${debt > 0 ? 'badge-danger' : 'badge-success'}`}>
                    {debt > 0 ? `⚠ Nợ ${formatVND(debt)}₫` : '✅ Đã thanh toán'}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 24, marginBottom: 12, flexWrap: 'wrap' }}>
                  <div><div style={{ fontSize: 12, color: 'var(--text-dim)' }}>Học phí</div><div style={{ fontWeight: 700 }}>{formatVND(owed)}₫</div></div>
                  <div><div style={{ fontSize: 12, color: 'var(--text-dim)' }}>Đã trả</div><div style={{ fontWeight: 700, color: 'var(--success)' }}>{formatVND(paid)}₫</div></div>
                  <div><div style={{ fontSize: 12, color: 'var(--text-dim)' }}>Còn nợ</div><div style={{ fontWeight: 700, color: debt > 0 ? 'var(--danger)' : 'var(--success)' }}>{formatVND(Math.max(0, debt))}₫</div></div>
                </div>
                <div style={{ background: 'var(--bg-input)', borderRadius: 4, height: 6, overflow: 'hidden' }}>
                  <div style={{ width: `${pct}%`, height: '100%', background: pct >= 100 ? 'var(--success)' : 'var(--primary)', borderRadius: 4, transition: 'width 0.5s' }} />
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 4 }}>{pct.toFixed(0)}% đã thanh toán</div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <h3 className="modal-title">💳 Ghi Nhận Thanh Toán</h3>
              <button className="btn btn-icon btn-secondary" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={save}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Học sinh</label>
                  <select className="form-control" value={form.student_id} onChange={e => setForm(f => ({ ...f, student_id: e.target.value }))}>
                    <option value="">Chọn học sinh...</option>
                    {students.map(s => <option key={s.id} value={s.id}>{s.full_name}</option>)}
                  </select>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Số tiền (VNĐ) *</label>
                    <input type="number" className="form-control" value={form.amount} min="0" step="1000"
                      onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} required placeholder="500000" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Ngày nhận *</label>
                    <input type="date" className="form-control" value={form.payment_date}
                      onChange={e => setForm(f => ({ ...f, payment_date: e.target.value }))} required />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Phương thức TT</label>
                    <select className="form-control" value={form.payment_method} onChange={e => setForm(f => ({ ...f, payment_method: e.target.value }))}>
                      {PAYMENT_METHODS.map(m => <option key={m} value={m}>{METHOD_LABELS[m]}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Mã giao dịch</label>
                    <input className="form-control" value={form.reference_code}
                      onChange={e => setForm(f => ({ ...f, reference_code: e.target.value }))} placeholder="TXN001..." />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Ghi chú</label>
                  <textarea className="form-control" value={form.notes} rows={2}
                    onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Học phí tháng..." />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Hủy</button>
                <button type="submit" className="btn btn-primary">💾 Lưu</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
