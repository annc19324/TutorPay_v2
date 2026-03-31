import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Area, AreaChart } from 'recharts';
import { TrendingUp, Clock, DollarSign, Users, BookOpen, Calendar, ArrowUpRight } from 'lucide-react';

const MONTH_NAMES = ['', 'T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9', 'T10', 'T11', 'T12'];

const formatVND = (n) => {
  if (n >= 1e9) return (n / 1e9).toFixed(1) + ' tỷ';
  if (n >= 1e6) return (n / 1e6).toFixed(1) + ' tr';
  if (n >= 1e3) return (n / 1e3).toFixed(0) + 'k';
  return n?.toLocaleString('vi-VN') || '0';
};

export default function Dashboard() {
  const { user } = useAuth();
  const now = new Date();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [year] = useState(now.getFullYear());
  const [month] = useState(now.getMonth() + 1);

  useEffect(() => {
    const load = async () => {
      try {
        const [sessRes, summaryRes] = await Promise.all([
          api.get(`/sessions/stats?month=${month}&year=${year}`),
          api.get(`/sessions/stats?year=${year}`)
        ]);
        setStats({ current: sessRes.data, yearly: summaryRes.data });
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    load();
  }, []);

  if (loading) return <div className="loading-overlay"><div className="spinner" /></div>;

  const summary = stats?.current?.summary || {};
  const monthly = (stats?.yearly?.monthly || []).map(m => ({
    name: MONTH_NAMES[m.month],
    buổi: parseInt(m.sessions),
    doanhthu: parseFloat(m.amount),
    giờ: parseFloat(m.hours)
  }));

  const byStudent = stats?.current?.byStudent?.slice(0, 5) || [];

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload?.length) {
      return (
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 14px' }}>
          <p style={{ color: 'var(--text-dim)', marginBottom: 6 }}>{label}</p>
          {payload.map(p => (
            <p key={p.name} style={{ color: p.color, fontWeight: 600 }}>
              {p.name}: {p.name === 'doanhthu' ? formatVND(p.value) + ' VNĐ' : p.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header" style={{ marginTop: 8 }}>
        <div>
          <h1 className="page-title">
            Xin chào, <span className="gradient-text">{user?.full_name?.split(' ').pop() || user?.username}!</span> 👋
          </h1>
          <p className="page-subtitle">
            {new Date().toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <span className="badge badge-primary">Tháng {month}/{year}</span>
        </div>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(79,70,229,0.15)' }}>
            <DollarSign size={24} color="var(--primary-light)" />
          </div>
          <div>
            <div className="stat-value">{formatVND(parseFloat(summary.total_amount || 0))}</div>
            <div className="stat-label">Thu nhập tháng {month}</div>
            <span className="stat-change up">▲ VNĐ</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(16,185,129,0.15)' }}>
            <BookOpen size={24} color="var(--success)" />
          </div>
          <div>
            <div className="stat-value">{summary.total_sessions || 0}</div>
            <div className="stat-label">Buổi dạy tháng {month}</div>
            <span className="stat-change up">▲ buổi</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(6,182,212,0.15)' }}>
            <Clock size={24} color="var(--accent)" />
          </div>
          <div>
            <div className="stat-value">{parseFloat(summary.total_hours || 0).toFixed(1)}</div>
            <div className="stat-label">Giờ dạy tháng {month}</div>
            <span className="stat-change up">▲ giờ</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(245,158,11,0.15)' }}>
            <TrendingUp size={24} color="var(--warning)" />
          </div>
          <div>
            <div className="stat-value">{formatVND(parseFloat(summary.avg_rate || 0))}</div>
            <div className="stat-label">Đơn giá trung bình</div>
            <span className="stat-change up">▲ /giờ</span>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid-2" style={{ marginBottom: 24 }}>
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: 'white' }}>📈 Doanh thu theo tháng</h3>
            <span className="badge badge-primary">{year}</span>
          </div>
          {monthly.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={monthly}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(99,102,241,0.1)" />
                <XAxis dataKey="name" tick={{ fill: 'var(--text-dim)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'var(--text-dim)', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => formatVND(v)} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="doanhthu" stroke="#4f46e5" strokeWidth={2} fill="url(#colorRevenue)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="empty-state" style={{ padding: 40 }}>
              <div className="empty-icon">📊</div>
              <div className="empty-title">Chưa có dữ liệu</div>
            </div>
          )}
        </div>

        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: 'white' }}>📅 Số buổi dạy</h3>
            <span className="badge badge-primary">{year}</span>
          </div>
          {monthly.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={monthly}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(99,102,241,0.1)" />
                <XAxis dataKey="name" tick={{ fill: 'var(--text-dim)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'var(--text-dim)', fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="buổi" fill="#7c3aed" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="empty-state" style={{ padding: 40 }}>
              <div className="empty-icon">📊</div>
              <div className="empty-title">Chưa có dữ liệu</div>
            </div>
          )}
        </div>
      </div>

      {/* Top students */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: 'white' }}>🏆 Top Học Sinh Tháng {month}</h3>
          <a href="/students" style={{ color: 'var(--primary-light)', fontSize: 13, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
            Xem tất cả <ArrowUpRight size={14} />
          </a>
        </div>
        {byStudent.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {byStudent.map((s, i) => (
              <div key={s.student_id || i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: 'rgba(79,70,229,0.05)', borderRadius: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: `hsl(${(i * 60 + 240) % 360}, 70%, 50%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14, color: 'white' }}>
                  {i + 1}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, color: 'white' }}>{s.student_name || 'Không xác định'}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>{s.sessions} buổi · {parseFloat(s.hours || 0).toFixed(1)} giờ</div>
                </div>
                <div style={{ fontWeight: 700, color: 'var(--success)' }}>
                  {formatVND(parseFloat(s.amount || 0))} ₫
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state" style={{ padding: 40 }}>
            <div className="empty-icon">📚</div>
            <div className="empty-title">Chưa có buổi dạy nào tháng này</div>
            <div className="empty-sub">
              <a href="/sessions" style={{ color: 'var(--primary-light)', textDecoration: 'none' }}>Thêm buổi dạy ngay →</a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
