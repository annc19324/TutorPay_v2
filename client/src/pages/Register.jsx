import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { Eye, EyeOff, Lock, User, Mail, Phone, ArrowRight, GraduationCap } from 'lucide-react';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: '', email: '', password: '', full_name: '', phone: '' });
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password.length < 6) {
      setError('Mật khẩu phải có ít nhất 6 ký tự');
      return;
    }
    setLoading(true);
    try {
      await register(form);
      toast.success('Đăng ký thành công! 🎉');
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data?.errors?.[0]?.msg || 'Đăng ký thất bại');
    } finally {
      setLoading(false);
    }
  };

  const update = (key, val) => setForm(f => ({ ...f, [key]: val }));

  return (
    <div className="auth-page">
      <div className="auth-bg-orb" style={{ width: 500, height: 500, background: '#7c3aed', top: -150, left: -150 }} />
      <div className="auth-bg-orb" style={{ width: 300, height: 300, background: '#4f46e5', bottom: -50, right: -50 }} />

      <div className="auth-card" style={{ maxWidth: 500 }}>
        <div className="auth-logo">
          <div className="auth-logo-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <GraduationCap size={32} color="white" />
          </div>
          <div className="auth-title">Tạo Tài Khoản</div>
          <div className="auth-sub">Bắt đầu quản lý lương gia sư ngay hôm nay</div>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Họ và tên *</label>
            <input className="form-control" type="text" placeholder="Nguyễn Văn A"
              value={form.full_name} onChange={e => update('full_name', e.target.value)} required />
          </div>

          <div className="form-row">
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Tên đăng nhập *</label>
              <div style={{ position: 'relative' }}>
                <User size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input className="form-control" style={{ paddingLeft: 36 }} type="text"
                  placeholder="username" value={form.username}
                  onChange={e => update('username', e.target.value.toLowerCase())} required />
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Số điện thoại</label>
              <div style={{ position: 'relative' }}>
                <Phone size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input className="form-control" style={{ paddingLeft: 36 }} type="tel"
                  placeholder="0900000000" value={form.phone}
                  onChange={e => update('phone', e.target.value)} />
              </div>
            </div>
          </div>

          <div className="form-group" style={{ marginTop: 20 }}>
            <label className="form-label">Email *</label>
            <div style={{ position: 'relative' }}>
              <Mail size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input className="form-control" style={{ paddingLeft: 36 }} type="email"
                placeholder="email@example.com" value={form.email}
                onChange={e => update('email', e.target.value)} required />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Mật khẩu *</label>
            <div style={{ position: 'relative' }}>
              <Lock size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input className="form-control" style={{ paddingLeft: 36, paddingRight: 42 }}
                type={showPass ? 'text' : 'password'} placeholder="Ít nhất 6 ký tự"
                value={form.password} onChange={e => update('password', e.target.value)} required />
              <button type="button" onClick={() => setShowPass(!showPass)}
                style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={loading}>
            {loading ? <span className="spinner" style={{ width: 20, height: 20, borderWidth: 2 }} /> : <>Đăng Ký <ArrowRight size={18} /></>}
          </button>
        </form>

        <div className="divider" />
        <p style={{ textAlign: 'center', fontSize: 14, color: 'var(--text-dim)' }}>
          Đã có tài khoản?{' '}
          <Link to="/login" style={{ color: 'var(--primary-light)', fontWeight: 600, textDecoration: 'none' }}>Đăng nhập</Link>
        </p>
      </div>
    </div>
  );
}
