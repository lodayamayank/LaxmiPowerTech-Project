// src/utils/axios.js
import axios from 'axios';
import { ROUTES } from '@/lib/routes';
import { clearSession, getToken } from '@/lib/session';

// Use environment variable for API base URL
// Always points to Render backend (no localhost fallback)
const baseURL = import.meta.env.VITE_API_BASE_URL || 'https://laxmipowertech-backend-1.onrender.com/api';

/** API base URL (ends with /api). */
export const API_BASE_URL = baseURL;

/**
 * Server origin for uploaded files and images (the API URL without /api).
 * Kept exactly as the pages computed it: note its fallback (localhost:5002) differs from the one above.
 */
export const FILE_BASE_URL = import.meta.env.VITE_API_BASE_URL?.replace('/api', '') || 'http://localhost:5002';

const instance = axios.create({
  baseURL,
  timeout: 30000, // 30 seconds
  withCredentials: true,
});

// Request interceptor
instance.interceptors.request.use(
  (config) => {
    const token = getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // If sending FormData, let the browser set Content-Type with boundary
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
instance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      clearSession({ all: true });
      window.location.href = ROUTES.login;
    }
    return Promise.reject(error);
  }
);

export default instance;
