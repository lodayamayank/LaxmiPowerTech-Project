export function register() {
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
                      if (window.confirm('New version available! Reload to update?')) {
                        window.location.reload();
                      }
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