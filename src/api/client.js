// src/utils/axios.js
import axios from 'axios';
import { toast } from 'sonner';
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

// Response interceptor: central handling of authentication and authorization failures.
// The API is the security boundary; the UI only reacts to what the server says.
//  - 401 = not authenticated (missing, expired or invalid token): clear the session and go back to /login.
//  - 403 = authenticated but not allowed: keep the session, show one shared notice (de-duplicated by id).
// In both cases the rejection still reaches the caller, so each page keeps its own error handling.
instance.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    if (status === 401) {
      clearSession({ all: true });
      window.location.href = ROUTES.login;
    } else if (status === 403) {
      toast.error("You don't have permission to do this.", { id: 'api-forbidden' });
    }
    return Promise.reject(error);
  }
);

export default instance;
