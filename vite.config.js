import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'https://laxmipowertech-backend.onrender.com', // 👈 proxies /api to backend
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false, // Disable source maps for production
    chunkSizeWarningLimit: 1000, // Increase chunk size limit to 1000kb
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'ui-vendor': ['lucide-react', 'react-icons'],
          'utils': ['axios', 'xlsx'],
        },
      },
    },
  },
  resolve: {
    alias: {
      "@": "/src",
    },
  },
});