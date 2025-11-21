// src/utils/axios.js
import axios from 'axios';

// 🔥 AUTO-DETECT ENVIRONMENT
// If running on localhost → use local backend
// If running on live site → use Render backend
const isLocalhost = window.location.hostname === 'localhost' || 
                    window.location.hostname === '127.0.0.1' ||
                    window.location.hostname.includes('192.168');

const baseURL = isLocalhost 
  ? (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001/api')
  : 'https://laxmipowertech-backend.onrender.com/api';

console.log('🌐 Environment:', isLocalhost ? 'LOCAL' : 'PRODUCTION');
console.log('🌐 Axios configured with baseURL:', baseURL);
console.log('🌐 Current origin:', window.location.origin);

const instance = axios.create({
  baseURL,
  timeout: 60000, // 60 seconds for production
  withCredentials: true, // Enable CORS credentials
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
    
    // Log outgoing requests
    console.log(`📡 ${config.method?.toUpperCase()} ${config.url}`);
    
    return config;
  },
  (error) => {
    console.error('❌ Request error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor - IMPROVED ERROR HANDLING
let isRedirecting = false;

instance.interceptors.response.use(
  (response) => {
    // Log successful responses
    console.log(`✅ ${response.config.method?.toUpperCase()} ${response.config.url} - ${response.status}`);
    return response;
  },
  (error) => {
    const status = error.response?.status;
    const url = error.config?.url;
    
    // Log all errors with details
    console.error(`❌ ${error.config?.method?.toUpperCase()} ${url} - ${status || 'Network Error'}`);
    
    if (error.code === 'ERR_NETWORK' || !error.response) {
      console.error('❌ Network Error Details:', {
        message: error.message,
        code: error.code,
        baseURL: error.config?.baseURL,
        url: error.config?.url,
        fullURL: error.config?.baseURL + error.config?.url
      });
    }
    
    // ONLY handle 401 Unauthorized for authentication endpoints
    // DO NOT logout on network errors or 500 errors
    if (status === 401 && 
        !isRedirecting &&
        !url?.includes('/auth/login') &&
        !url?.includes('/upload') &&
        !url?.includes('/catalog')) {
      
      console.warn('⚠️ Unauthorized (401) - Token expired or invalid');
      isRedirecting = true;
      
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('loginTime');
      
      setTimeout(() => {
        if (!window.location.pathname.includes('/login')) {
          console.log('🔄 Redirecting to login...');
          window.location.href = '/login';
        }
        isRedirecting = false;
      }, 100);
    }
    
    return Promise.reject(error);
  }
);

export default instance;
