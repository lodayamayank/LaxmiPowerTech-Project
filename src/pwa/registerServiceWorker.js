import { toast } from 'sonner';

export function register() {
    // In development there is no service worker. If one was installed earlier on this origin by a production build
    // (same localhost port), remove it and its caches, otherwise it keeps serving stale files to this browser profile.
    if (import.meta.env.DEV && 'serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then((regs) => {
        if (!regs.length) return;
        Promise.all(regs.map((r) => r.unregister()))
          .then(() => (window.caches ? caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k)))) : null))
          .then(() => window.location.reload());
      }).catch(() => {});
    }

    // Only register in production to avoid dev console warnings
    if (import.meta.env.PROD && 'serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        // ✅ For Vite, use '/service-worker.js' directly
        const swUrl = '/service-worker.js';
  
        navigator.serviceWorker
          .register(swUrl)
          .then((registration) => {
            console.log('✅ Service Worker registered:', registration);
  
            // Check for updates
            registration.onupdatefound = () => {
              const installingWorker = registration.installing;
              if (installingWorker) {
                installingWorker.onstatechange = () => {
                  if (installingWorker.state === 'installed') {
                    if (navigator.serviceWorker.controller) {
                      console.log('New content available, please refresh!');
                      // Show update notification
                      toast.info('A new version is available', {
                        id: 'sw-update',
                        description: 'Reload to use the latest version.',
                        duration: Infinity,
                        action: { label: 'Reload', onClick: () => window.location.reload() },
                      });
                    } else {
                      console.log('Content cached for offline use.');
                    }
                  };
                }
              }
            };
          })
          .catch((error) => {
            console.error('❌ Service Worker registration failed:', error);
          });
      });
    }
  }
  
  export function unregister() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready
        .then((registration) => {
          registration.unregister();
        })
        .catch((error) => {
          console.error(error.message);
        });
    }
  }