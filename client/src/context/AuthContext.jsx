import { createContext, useContext, useState, useEffect } from 'react';
import api from '../utils/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('tutorpay_token');
    const savedUser = localStorage.getItem('tutorpay_user');
    if (token && savedUser) {
      setUser(JSON.parse(savedUser));
      // Verify with server
      api.get('/auth/me').then(res => {
        setUser(res.data.user);
        localStorage.setItem('tutorpay_user', JSON.stringify(res.data.user));
      }).catch(() => {
        localStorage.removeItem('tutorpay_token');
        localStorage.removeItem('tutorpay_user');
        setUser(null);
      }).finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (username, password) => {
    const res = await api.post('/auth/login', { username, password });
    localStorage.setItem('tutorpay_token', res.data.token);
    localStorage.setItem('tutorpay_user', JSON.stringify(res.data.user));
    setUser(res.data.user);
    return res.data;
  };

  const register = async (data) => {
    const res = await api.post('/auth/register', data);
    localStorage.setItem('tutorpay_token', res.data.token);
    localStorage.setItem('tutorpay_user', JSON.stringify(res.data.user));
    setUser(res.data.user);
    return res.data;
  };

  const logout = () => {
    localStorage.removeItem('tutorpay_token');
    localStorage.removeItem('tutorpay_user');
    setUser(null);
  };

  const updateUser = (updatedUser) => {
    setUser(updatedUser);
    localStorage.setItem('tutorpay_user', JSON.stringify(updatedUser));
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
