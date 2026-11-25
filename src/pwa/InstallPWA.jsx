import React, { useEffect, useState } from 'react';
import { Download, X, Apple, Share2 } from 'lucide-react';

const InstallPWA = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstall, setShowInstall] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Detect iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    setIsIOS(iOS);

    // Check if already installed (running in standalone mode)
    const standalone = window.matchMedia('(display-mode: standalone)').matches || 
                       window.navigator.standalone === true;
    setIsStandalone(standalone);

    // Chrome/Android install prompt — capture event for custom Install button
    const handler = (e) => {
      setDeferredPrompt(e);
      setShowInstall(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    // For iOS, show banner if not installed and hasn't been dismissed
    if (iOS && !standalone) {
      const dismissed = localStorage.getItem('ios-install-dismissed');
      if (!dismissed) {
        setShowInstall(true);
      }
    }

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    
    setDeferredPrompt(null);
    setShowInstall(false);
  };

  const handleDismiss = () => {
    if (isIOS) {
      localStorage.setItem('ios-install-dismissed', 'true');
    }
    setShowInstall(false);
  };

  // Don't show if already installed
  if (isStandalone || !showInstall) return null;

  // iOS-specific install instructions
  if (isIOS) {
    return (
      <div className="fixed bottom-4 left-4 right-4 z-50 max-w-md mx-auto">
        <div className="bg-primary text-primary-foreground hover:bg-primary-strong rounded-2xl shadow-2xl p-4">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-xl bg-surface/80 flex items-center justify-center flex-shrink-0">
              <Apple className="text-primary-foreground" size={28} />
            </div>
            <div className="flex-1">
              <h3 className="text-primary-foreground font-bold text-sm mb-2">Install App</h3>
              <p className="text-primary-foreground/90 text-xs mb-3">
                Install this app on your iPhone for quick access
              </p>
              <div className="bg-surface/80 rounded-xl p-3 backdrop-blur-sm">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-primary-foreground text-xs">1.</span>
                  <p className="text-primary-foreground/90 text-xs">
                    Tap the <Share2 className="inline mx-1" size={12} /> Share button below
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-primary-foreground text-xs">2.</span>
                  <p className="text-primary-foreground/90 text-xs">
                    Select "Add to Home Screen"
                  </p>
                </div>
              </div>
            </div>
            <button
              onClick={handleDismiss}
              className="text-primary-foreground/80 hover:text-primary-foreground transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Android/Chrome install prompt
  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 max-w-md mx-auto">
      <div className="bg-primary text-primary-foreground hover:bg-primary-strong rounded-2xl shadow-2xl p-4 flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-surface/80 flex items-center justify-center flex-shrink-0">
          <Download className="text-primary-foreground" size={24} />
        </div>
        <div className="flex-1">
          <h3 className="text-primary-foreground font-bold text-sm mb-1">Install App</h3>
          <p className="text-primary-foreground/80 text-xs">
            Install for faster access and offline use
          </p>
        </div>
        <button
          onClick={handleInstallClick}
          className="px-4 py-2 bg-surface text-tone-highlight-fg rounded-xl font-semibold text-sm hover:bg-surface-muted transition-all"
        >
          Install
        </button>
        <button
          onClick={handleDismiss}
          className="text-primary-foreground/80 hover:text-primary-foreground transition-colors"
        >
          <X size={18} />
        </button>
      </div>
    </div>
  );
};

export default InstallPWA;