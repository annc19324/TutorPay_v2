import { useState, useEffect } from 'react';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { Users, Shield, Search, ToggleLeft, ToggleRight, Key, Trash2, TrendingUp, Activity } from 'lucide-react';

const formatDate = d => { if (!d) return ''; const dt = new Date(d); return `${dt.getDate().toString().padStart(2,'0')}/${(dt.getMonth()+1).toString().padStart(2,'0')}/${dt.getFullYear()}`; };
const formatVND = n => n ? parseFloat(n).toLocaleString('vi-VN') : '0';

export default function AdminPanel() {
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [activeTab, setActiveTab] = useState('users');
  const [showResetModal, setShowResetModal] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/admin/users?search=${search}&role=${roleFilter}&page=${page}&limit=20`);
      setUsers(res.data.users);
      setTotal(res.data.total);
    } catch { toast.error('Lỗi tải dữ liệu'); }
    finally { setLoading(false); }
  };

  const loadStats = async () => {
    try {
      const res = await api.get('/admin/stats');
      setStats(res.data);
    } catch {}
  };

  const loadLogs = async () => {
    try {
      const res = await api.get('/admin/logs');
      setLogs(res.data.logs);
    } catch {}
  };

  useEffect(() => { loadStats(); }, []);
  useEffect(() => { if (activeTab === 'users') loadUsers(); }, [search, roleFilter, page, activeTab]);
  useEffect(() => { if (activeTab === 'logs') loadLogs(); }, [activeTab]);

  const toggleStatus = async (id) => {
    try {
      const res = await api.patch(`/admin/users/${id}/toggle-status`);
      toast.success(`Tài khoản đã ${res.data.user.is_active ? 'kích hoạt' : 'vô hiệu hóa'}`);
      loadUsers();
    } catch { toast.error('Lỗi cập nhật'); }
  };

  const changeRole = async (id, role) => {
    try {
      await api.patch(`/admin/users/${id}/role`, { role });
      toast.success('Đã cập nhật vai trò!');
      loadUsers();
    } catch { toast.error('Lỗi'); }
  };

  const resetPassword = async () => {
    if (!newPassword || newPassword.length < 6) { toast.error('Mật khẩu phải có ít nhất 6 ký tự'); return; }
    try {
      await api.post(`/admin/users/${showResetModal.id}/reset-password`, { new_password: newPassword });
      toast.success(`Đã đặt lại mật khẩu cho ${showResetModal.username}!`);
      setShowResetModal(null);
      setNewPassword('');
    } catch { toast.error('Lỗi'); }
  };

  const deleteUser = async (id, username) => {
    if (!confirm(`Xóa tài khoản ${username}? Hành động này không thể hoàn tác!`)) return;
    try {
      await api.delete(`/admin/users/${id}`);
      toast.success('Đã xóa tài khoản!');
      loadUsers();
    } catch (err) { toast.error(err.response?.data?.message || 'Lỗi xóa'); }
  };

  const totalPages = Math.ceil(total / 20);

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">🛡️ Quản Trị Viên</h1>
          <p className="page-subtitle">Quản lý toàn bộ người dùng và hoạt động hệ thống</p>
        </div>
        <span className="badge badge-warning" style={{ padding: '8px 16px', fontSize: 13 }}>👑 Admin Panel</span>
      </div>

      {/* Stats */}
      {stats && (
        <div className="stats-grid" style={{ marginBottom: 24 }}>
          <div className="stat-card">
            <div className="stat-icon" style={{ background: 'rgba(79,70,229,0.15)' }}><Users size={22} color="var(--primary-light)" /></div>
            <div>
              <div className="stat-value">{stats.users?.count || 0}</div>
              <div className="stat-label">Tổng tài khoản</div>
              <span className="stat-change up">✅ {stats.users?.active} hoạt động</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon" style={{ background: 'rgba(16,185,129,0.15)' }}><Activity size={22} color="var(--success)" /></div>
            <div>
              <div className="stat-value">{stats.sessions?.total || 0}</div>
              <div className="stat-label">Tổng buổi dạy</div>
              <span className="stat-change up">✅ {stats.sessions?.completed} hoàn thành</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon" style={{ background: 'rgba(245,158,11,0.15)' }}><TrendingUp size={22} color="var(--warning)" /></div>
            <div>
              <div className="stat-value">{formatVND(stats.revenue)}₫</div>
              <div className="stat-label">Tổng doanh thu hệ thống</div>
            </div>
          </div>
        </div>
      )}

      {/* Recently joined users */}
      {stats?.recentUsers?.length > 0 && (
        <div className="card" style={{ marginBottom: 24 }}>
          <h3 style={{ fontWeight: 700, color: 'white', marginBottom: 16 }}>🆕 Người dùng mới nhất</h3>
          <div style={{ display: 'flex', gap: 12, flex‌Wrap: 'wrap' }}>
            {stats.recentUsers.map(u => (
              <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: 'rgba(79,70,229,0.05)', borderRadius: 10, border: '1px solid var(--border)' }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: 'white' }}>
                  {(u.full_name || u.username).charAt(0)}
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{u.full_name || u.username}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{formatDate(u.created_at)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="tabs">
        <button className={`tab-btn ${activeTab === 'users' ? 'active' : ''}`} onClick={() => setActiveTab('users')}>👤 Quản lý tài khoản ({total})</button>
        <button className={`tab-btn ${activeTab === 'logs' ? 'active' : ''}`} onClick={() => setActiveTab('logs')}>📋 Nhật ký hoạt động</button>
      </div>

      {activeTab === 'users' && (
        <>
          <div className="filter-bar">
            <div className="search-wrapper" style={{ flex: 1, maxWidth: 360 }}>
              <Search size={16} />
              <input className="form-control" placeholder="Tìm username, tên, email..."
                value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
            </div>
            <select className="form-control" style={{ width: 'auto' }} value={roleFilter} onChange={e => { setRoleFilter(e.target.value); setPage(1); }}>
              <option value="">Tất cả vai trò</option>
              <option value="admin">Admin</option>
              <option value="user">User</option>
            </select>
          </div>

          {loading ? <div className="loading-overlay"><div className="spinner" /></div> : (
            <div className="card" style={{ padding: 0 }}>
              <div className="table-container">
                <table>
                  <thead><tr>
                    <th>Tài khoản</th><th>Email</th><th>Vai trò</th>
                    <th>Buổi dạy</th><th>Doanh thu</th><th>Ngày tạo</th><th>Trạng thái</th><th>Thao tác</th>
                  </tr></thead>
                  <tbody>
                    {users.map(u => (
                      <tr key={u.id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{ width: 34, height: 34, borderRadius: 8, background: 'var(--gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14, color: 'white', flexShrink: 0 }}>
                              {(u.full_name || u.username).charAt(0)}
                            </div>
                            <div>
                              <div style={{ fontWeight: 600 }}>{u.full_name}</div>
                              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>@{u.username}</div>
                            </div>
                          </div>
                        </td>
                        <td style={{ fontSize: 13, color: 'var(--text-dim)' }}>{u.email}</td>
                        <td>
                          <select
                            value={u.role}
                            onChange={e => changeRole(u.id, e.target.value)}
                            style={{ background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', padding: '4px 8px', fontSize: 12, cursor: 'pointer' }}
                          >
                            <option value="user">👤 User</option>
                            <option value="admin">👑 Admin</option>
                          </select>
                        </td>
                        <td style={{ textAlign: 'center' }}>{u.session_count || 0}</td>
                        <td style={{ color: 'var(--success)', fontWeight: 600 }}>{formatVND(u.total_earned)}₫</td>
                        <td style={{ fontSize: 12, color: 'var(--text-dim)' }}>{formatDate(u.created_at)}</td>
                        <td>
                          <span className={`badge ${u.is_active ? 'badge-success' : 'badge-danger'}`}>
                            {u.is_active ? '● Hoạt động' : '○ Khóa'}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button className="btn btn-secondary btn-sm btn-icon" title="Bật/tắt tài khoản" onClick={() => toggleStatus(u.id)}>
                              {u.is_active ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
                            </button>
                            <button className="btn btn-primary btn-sm btn-icon" title="Đặt lại mật khẩu" onClick={() => setShowResetModal(u)}>
                              <Key size={14} />
                            </button>
                            <button className="btn btn-danger btn-sm btn-icon" title="Xóa tài khoản" onClick={() => deleteUser(u.id, u.username)}>
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {totalPages > 1 && (
                <div className="pagination">
                  <button className="page-btn" disabled={page === 1} onClick={() => setPage(p => p - 1)}>‹</button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                    <button key={p} className={`page-btn ${p === page ? 'active' : ''}`} onClick={() => setPage(p)}>{p}</button>
                  ))}
                  <button className="page-btn" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>›</button>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {activeTab === 'logs' && (
        <div className="card" style={{ padding: 0 }}>
          <div className="table-container">
            <table>
              <thead><tr>
                <th>Thời gian</th><th>Người dùng</th><th>Hành động</th><th>IP</th>
              </tr></thead>
              <tbody>
                {logs.map(l => (
                  <tr key={l.id}>
                    <td style={{ fontSize: 12, color: 'var(--text-dim)' }}>{new Date(l.created_at).toLocaleString('vi-VN')}</td>
                    <td>{l.username ? `@${l.username}` : '—'}</td>
                    <td><span className="badge badge-primary">{l.action}</span></td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{l.ip_address || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {showResetModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowResetModal(null)}>
          <div className="modal">
            <div className="modal-header">
              <h3 className="modal-title">🔑 Đặt lại mật khẩu</h3>
              <button className="btn btn-icon btn-secondary" onClick={() => setShowResetModal(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="alert alert-info">
                Đặt lại mật khẩu cho tài khoản: <strong>@{showResetModal.username}</strong>
              </div>
              <div className="form-group">
                <label className="form-label">Mật khẩu mới *</label>
                <input type="password" className="form-control" value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="Ít nhất 6 ký tự..." />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowResetModal(null)}>Hủy</button>
              <button className="btn btn-primary" onClick={resetPassword}>🔑 Đặt lại mật khẩu</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
