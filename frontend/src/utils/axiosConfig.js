import axios from 'axios';

const api = axios.create({
  baseURL: 'http://127.0.0.1:8000/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest'
  }
});

// Add a request interceptor
api.interceptors.request.use(function (config) {
  const userId = localStorage.getItem('id');
  if (userId && !config.url.includes('/login/')) {
    config.headers['X-User-ID'] = userId;
  }
  return config;
}, function (error) {
  return Promise.reject(error);
});

export default api; 