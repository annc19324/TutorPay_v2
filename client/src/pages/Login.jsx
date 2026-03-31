import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { Eye, EyeOff, Lock, User, ArrowRight, GraduationCap } from 'lucide-react';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(form.username, form.password);
      toast.success('Đăng nhập thành công! 🎉');
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Đăng nhập thất bại');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-bg-orb" style={{ width: 400, height: 400, background: '#4f46e5', top: -100, right: -100 }} />
      <div className="auth-bg-orb" style={{ width: 300, height: 300, background: '#7c3aed', bottom: -50, left: -50 }} />
      <div className="auth-bg-orb" style={{ width: 200, height: 200, background: '#06b6d4', top: '50%', right: '20%' }} />

      <div className="auth-card">
        <div className="auth-logo">
          <div className="auth-logo-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <GraduationCap size={32} color="white" />
          </div>
          <div className="auth-title">TutorPay</div>
          <div className="auth-sub">Chào mừng trở lại! Đăng nhập để tiếp tục</div>
        </div>

        {error && (
          <div className="alert alert-error">{error}</div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Tên đăng nhập hoặc Email</label>
            <div style={{ position: 'relative' }}>
              <User size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                className="form-control"
                style={{ paddingLeft: 42 }}
                type="text"
                placeholder="username hoặc email"
                value={form.username}
                onChange={e => setForm({ ...form, username: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Mật khẩu</label>
            <div style={{ position: 'relative' }}>
              <Lock size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                className="form-control"
                style={{ paddingLeft: 42, paddingRight: 42 }}
                type={showPass ? 'text' : 'password'}
                placeholder="Nhập mật khẩu..."
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                required
              />
              <button type="button" onClick={() => setShowPass(!showPass)}
                style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={loading}>
            {loading ? <span className="spinner" style={{ width: 20, height: 20, borderWidth: 2 }} /> : <>Đăng Nhập <ArrowRight size={18} /></>}
          </button>
        </form>

        <div className="divider"/>
        <p style={{ textAlign: 'center', fontSize: 14, color: 'var(--text-dim)' }}>
          Chưa có tài khoản?{' '}
          <Link to="/register" style={{ color: 'var(--primary-light)', fontWeight: 600, textDecoration: 'none' }}>
            Đăng ký ngay
          </Link>
        </p>
      </div>
    </div>
  );
}
