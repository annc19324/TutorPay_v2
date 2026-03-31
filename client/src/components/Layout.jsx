import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard, BookOpen, Users, CreditCard, BarChart3,
  Settings, LogOut, Shield, GraduationCap, ChevronRight
} from 'lucide-react';
import toast from 'react-hot-toast';

const navItems = [
  { label: 'Dashboard', to: '/', icon: LayoutDashboard, end: true },
  { label: 'Buổi Dạy', to: '/sessions', icon: BookOpen },
  { label: 'Học Sinh', to: '/students', icon: Users },
  { label: 'Thanh Toán', to: '/payments', icon: CreditCard },
  { label: 'Báo Cáo', to: '/reports', icon: BarChart3 },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    toast.success('Đã đăng xuất!');
    navigate('/login');
  };

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="logo-icon">💰</div>
          <div>
            <div className="logo-text">TutorPay</div>
            <div className="logo-sub">SALARY MANAGER</div>
          </div>
        </div>

        <div className="sidebar-user">
          <div className="user-avatar">
            {user?.full_name?.charAt(0) || user?.username?.charAt(0) || 'U'}
          </div>
          <div className="user-info">
            <div className="user-name">{user?.full_name || user?.username}</div>
            <div className="user-role">{user?.role === 'admin' ? '👑 Admin' : '🎓 Gia sư'}</div>
          </div>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-group">
            <div className="nav-label">Chính</div>
            {navItems.map(item => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              >
                <item.icon size={18} />
                {item.label}
              </NavLink>
            ))}
          </div>

          {user?.role === 'admin' && (
            <div className="nav-group">
              <div className="nav-label">Quản trị</div>
              <NavLink
                to="/admin"
                className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              >
                <Shield size={18} />
                Quản Trị Viên
              </NavLink>
            </div>
          )}

          <div className="nav-group">
            <div className="nav-label">Tài khoản</div>
            <NavLink
              to="/settings"
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <Settings size={18} />
              Cài Đặt
            </NavLink>
          </div>
        </nav>

        <div className="sidebar-bottom">
          <button className="nav-item" onClick={handleLogout} style={{ color: '#ef4444' }}>
            <LogOut size={18} />
            Đăng Xuất
          </button>
        </div>
      </aside>

      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
