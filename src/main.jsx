// src/main.jsx
import React from 'react';
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

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>
);

// Register service worker for PWA
register();