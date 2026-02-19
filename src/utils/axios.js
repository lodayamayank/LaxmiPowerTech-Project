// src/utils/axios.js
import axios from 'axios';

// Use environment variable for API base URL
// Always points to Render backend (no localhost fallback)
const baseURL = import.meta.env.VITE_API_BASE_URL || 'https://laxmipowertech-backend-1.onrender.com/api';

console.log('🌐 Axios configured with baseURL:', baseURL);

const instance = axios.create({
  baseURL,
  timeout: 30000, // 30 seconds
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
instance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    console.error('❌ Request error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor
instance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      console.warn('⚠️ Unauthorized - clearing localStorage');
      localStorage.clear();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default instance;
