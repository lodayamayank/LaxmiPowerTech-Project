import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
    hmr: {
      overlay: true,
      clientPort: 5173,
    },
    // Remove proxy - we're using axios baseURL instead
  },
  resolve: {
    alias: {
      "@": "/src",
    },
  },
});