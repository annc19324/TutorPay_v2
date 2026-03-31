import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { User, Lock, Bell, Palette } from 'lucide-react';

export default function Settings() {
  const { user, updateUser } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [profile, setProfile] = useState({ full_name: user?.full_name || '', email: user?.email || '', phone: user?.phone || '' });
  const [passwords, setPasswords] = useState({ current_password: '', new_password: '', confirm: '' });
  const [loading, setLoading] = useState(false);

  const saveProfile = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.put('/settings/profile', profile);
      updateUser(res.data.user);
      toast.success('Đã cập nhật thông tin!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi');
    } finally { setLoading(false); }
  };

  const changePassword = async (e) => {
    e.preventDefault();
    if (passwords.new_password !== passwords.confirm) { toast.error('Mật khẩu mới không khớp'); return; }
    if (passwords.new_password.length < 6) { toast.error('Mật khẩu mới phải có ít nhất 6 ký tự'); return; }
    setLoading(true);
    try {
      await api.put('/auth/change-password', { current_password: passwords.current_password, new_password: passwords.new_password });
      toast.success('Đã đổi mật khẩu!');
      setPasswords({ current_password: '', new_password: '', confirm: '' });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Mật khẩu hiện tại không đúng');
    } finally { setLoading(false); }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">⚙️ Cài Đặt</h1>
          <p className="page-subtitle">Quản lý tài khoản và tùy chọn cá nhân</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 24, alignItems: 'start' }}>
        {/* Sidebar tabs */}
        <div className="card" style={{ padding: 12 }}>
          {[
            { key: 'profile', icon: User, label: 'Thông tin cá nhân' },
            { key: 'security', icon: Lock, label: 'Bảo mật' },
          ].map(t => (
            <button key={t.key}
              className={`nav-item ${activeTab === t.key ? 'active' : ''}`}
              style={{ marginBottom: 4 }}
              onClick={() => setActiveTab(t.key)}>
              <t.icon size={16} /> {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div>
          {activeTab === 'profile' && (
            <div className="card">
              <h2 style={{ fontSize: 18, fontWeight: 700, color: 'white', marginBottom: 24 }}>👤 Thông tin cá nhân</h2>

              {/* Avatar */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 28, padding: '20px', background: 'rgba(79,70,229,0.05)', borderRadius: 12 }}>
                <div style={{ width: 72, height: 72, borderRadius: 18, background: 'var(--gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, fontWeight: 800, color: 'white' }}>
                  {user?.full_name?.charAt(0) || user?.username?.charAt(0) || 'U'}
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 18, color: 'white' }}>{user?.full_name}</div>
                  <div style={{ color: 'var(--text-dim)', fontSize: 13 }}>@{user?.username}</div>
                  <span className={`badge ${user?.role === 'admin' ? 'badge-warning' : 'badge-primary'}`} style={{ marginTop: 6 }}>
                    {user?.role === 'admin' ? '👑 Admin' : '🎓 Gia sư'}
                  </span>
                </div>
              </div>

              <form onSubmit={saveProfile}>
                <div className="form-group">
                  <label className="form-label">Họ và tên</label>
                  <input className="form-control" value={profile.full_name}
                    onChange={e => setProfile(p => ({ ...p, full_name: e.target.value }))} />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Email</label>
                    <input type="email" className="form-control" value={profile.email}
                      onChange={e => setProfile(p => ({ ...p, email: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Số điện thoại</label>
                    <input className="form-control" value={profile.phone}
                      onChange={e => setProfile(p => ({ ...p, phone: e.target.value }))} />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Tên đăng nhập</label>
                  <input className="form-control" value={user?.username} disabled style={{ opacity: 0.6 }} />
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>Tên đăng nhập không thể thay đổi</div>
                </div>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> : '💾 Lưu thông tin'}
                </button>
              </form>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="card">
              <h2 style={{ fontSize: 18, fontWeight: 700, color: 'white', marginBottom: 24 }}>🔐 Bảo mật tài khoản</h2>
              <form onSubmit={changePassword}>
                <div className="form-group">
                  <label className="form-label">Mật khẩu hiện tại</label>
                  <input type="password" className="form-control" value={passwords.current_password}
                    onChange={e => setPasswords(p => ({ ...p, current_password: e.target.value }))} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Mật khẩu mới</label>
                  <input type="password" className="form-control" value={passwords.new_password}
                    onChange={e => setPasswords(p => ({ ...p, new_password: e.target.value }))} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Xác nhận mật khẩu mới</label>
                  <input type="password" className="form-control" value={passwords.confirm}
                    onChange={e => setPasswords(p => ({ ...p, confirm: e.target.value }))} required />
                </div>
                {passwords.new_password && passwords.confirm && passwords.new_password !== passwords.confirm && (
                  <div className="alert alert-error">Mật khẩu xác nhận không khớp</div>
                )}
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> : '🔑 Đổi mật khẩu'}
                </button>
              </form>

              <div className="divider" />
              <div style={{ padding: '16px', background: 'rgba(239,68,68,0.05)', borderRadius: 12, border: '1px solid rgba(239,68,68,0.2)' }}>
                <h4 style={{ fontWeight: 700, color: 'var(--danger)', marginBottom: 8 }}>⚠️ Lưu ý bảo mật</h4>
                <ul style={{ paddingLeft: 20, color: 'var(--text-dim)', fontSize: 13, lineHeight: 1.8 }}>
                  <li>Không chia sẻ mật khẩu với bất kỳ ai</li>
                  <li>Dùng mật khẩu mạnh (chữ hoa, thường, số, ký tự đặc biệt)</li>
                  <li>Thay đổi mật khẩu định kỳ</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
