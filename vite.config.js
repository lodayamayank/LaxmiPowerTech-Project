import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'https://laxmipowertech-backend.onrender.com',
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    minify: 'terser',
    chunkSizeWarningLimit: 2000, // Increase limit to 2MB
    rollupOptions: {
      output: {
        manualChunks: {
          // Split vendor libraries
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'ui-vendor': ['lucide-react', 'react-icons'],
          'utils-vendor': ['axios', 'xlsx', 'dayjs'],
          'map-vendor': ['leaflet', 'react-leaflet'],
        },
        // Optimize asset file names
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name.split('.');
          const ext = info[info.length - 1];
          if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(ext)) {
            return `assets/images/[name]-[hash][extname]`;
          }
          return `assets/[name]-[hash][extname]`;
        },
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
      },
    },
    terserOptions: {
      compress: {
        drop_console: true, // Remove console.logs in production
        drop_debugger: true,
      },
    },
  },
  // Optimize asset handling
  assetsInlineLimit: 4096, // Only inline assets < 4KB
  resolve: {
    alias: {
      "@": "/src",
    },
  },
});