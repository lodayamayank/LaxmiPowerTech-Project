// src/main.jsx
import React from 'react';
import { isChunkLoadError, reloadOnceForChunkError } from '@/lib/recovery';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import { BrowserRouter } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import '@fontsource-variable/inter'; // self-hosted Inter (variable weight)
import './index.css';
import { register } from '@/pwa/registerServiceWorker';
import { applyInitialTheme } from '@/lib/theme';

// Theme class before the first render (see lib/theme.js).
applyInitialTheme();

// A deployment replaces the hashed build files. A page that is still open (or cached) then asks for files that no
// longer exist. Vite reports this as "vite:preloadError"; plain dynamic imports reject. Both are recovered by
// reloading ONCE (reloadOnceForChunkError never reloads twice within a minute, so it cannot loop); if that is not
// possible the error reaches the ErrorBoundary, which offers "Try again" and "Reload application".
window.addEventListener('vite:preloadError', (event) => {
  if (reloadOnceForChunkError()) event.preventDefault();
});
window.addEventListener('unhandledrejection', (event) => {
  if (isChunkLoadError(event.reason)) reloadOnceForChunkError();
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {/* Last line of defence: anything that escapes the route / layout boundaries shows a recovery screen. */}
    <ErrorBoundary variant="page" scope="root" autoReloadChunks>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  </React.StrictMode>
);

// Register service worker for PWA
register();