import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'https://laxmipowertech-backend.onrender.com', // 👈 proxies /api to backend
    },
  },
  resolve: {
    alias: {
      "@": "/src",
    },
  },
});