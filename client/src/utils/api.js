import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' }
});

// Attach token
api.interceptors.request.use(config => {
  const token = localStorage.getItem('tutorpay_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Handle 401
api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('tutorpay_token');
      localStorage.removeItem('tutorpay_user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;
