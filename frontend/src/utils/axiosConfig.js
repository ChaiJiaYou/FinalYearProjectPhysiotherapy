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
  const userId = localStorage.getItem('userId');
  if (userId && !config.url.includes('/login/')) {
    config.headers['X-User-ID'] = userId;
    console.log('Adding X-User-ID header:', userId, 'for URL:', config.url);
  } else {
    console.log('No userId found or login request:', { userId, url: config.url });
  }
  return config;
}, function (error) {
  return Promise.reject(error);
});

// Add a response interceptor
api.interceptors.response.use(
  function (response) {
    return response;
  },
  function (error) {
    if (error.response?.status === 401) {
      console.log('401 Unauthorized error:', error.response.data);
      // Optionally redirect to login page
      // window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api; 