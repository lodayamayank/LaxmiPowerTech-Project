import React, { useEffect, useState } from 'react';
import { FaDownload, FaTimes, FaApple, FaShareAlt } from 'react-icons/fa';

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

    // Chrome/Android install prompt
    const handler = (e) => {
      e.preventDefault();
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
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      console.log('User accepted the install prompt');
    }
    
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
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl shadow-2xl p-4">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
              <FaApple className="text-white" size={28} />
            </div>
            <div className="flex-1">
              <h3 className="text-white font-bold text-sm mb-2">Install App</h3>
              <p className="text-white/90 text-xs mb-3">
                Install this app on your iPhone for quick access
              </p>
              <div className="bg-white/10 rounded-xl p-3 backdrop-blur-sm">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-white text-xs">1.</span>
                  <p className="text-white/90 text-xs">
                    Tap the <FaShareAlt className="inline mx-1" size={12} /> Share button below
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-white text-xs">2.</span>
                  <p className="text-white/90 text-xs">
                    Select "Add to Home Screen"
                  </p>
                </div>
              </div>
            </div>
            <button
              onClick={handleDismiss}
              className="text-white/80 hover:text-white transition-colors"
            >
              <FaTimes size={18} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Android/Chrome install prompt
  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 max-w-md mx-auto">
      <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-2xl shadow-2xl p-4 flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
          <FaDownload className="text-white" size={24} />
        </div>
        <div className="flex-1">
          <h3 className="text-white font-bold text-sm mb-1">Install App</h3>
          <p className="text-white/80 text-xs">
            Install for faster access and offline use
          </p>
        </div>
        <button
          onClick={handleInstallClick}
          className="px-4 py-2 bg-white text-orange-600 rounded-xl font-semibold text-sm hover:bg-gray-100 transition-all"
        >
          Install
        </button>
        <button
          onClick={handleDismiss}
          className="text-white/80 hover:text-white transition-colors"
        >
          <FaTimes size={18} />
        </button>
      </div>
    </div>
  );
};

export default InstallPWA;