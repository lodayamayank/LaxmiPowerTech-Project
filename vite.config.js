import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { readFileSync } from 'node:fs';

// The MediaPipe WASM runtime must be the same version as the installed @mediapipe/tasks-vision JS package, so the
// version is read from node_modules instead of being typed in twice.
const mediapipeVersion = JSON.parse(readFileSync('./node_modules/@mediapipe/tasks-vision/package.json', 'utf8')).version;

export default defineConfig({
  plugins: [react()],
  define: { __MEDIAPIPE_VERSION__: JSON.stringify(mediapipeVersion) },
  server: {
    proxy: {
      '/api': 'https://laxmipowertech-backend-1.onrender.com',
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    minify: 'esbuild', // Use esbuild (built into Vite, faster than terser)
    chunkSizeWarningLimit: 2000, // Increase limit to 2MB
    rollupOptions: {
      output: {
        manualChunks: {
          // Split vendor libraries
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'ui-vendor': ['lucide-react', 'react-icons'],
          'utils-vendor': ['axios', 'dayjs'],
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
    // esbuild minification options
    target: 'es2015',
    cssMinify: true,
  },
  // Optimize asset handling
  assetsInlineLimit: 4096, // Only inline assets < 4KB
  resolve: {
    alias: {
      "@": "/src",
    },
  },
});