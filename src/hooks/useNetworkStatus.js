// Hook: tracks online/offline status and pending sync count in real-time
import { useState, useEffect, useCallback } from 'react';
import offlineStorage from '../utils/offlineStorage';
import syncEngine from '../utils/syncEngine';

export default function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [lastSyncResult, setLastSyncResult] = useState(null);

  // Refresh pending count from IndexedDB
  const refreshPendingCount = useCallback(async () => {
    try {
      await offlineStorage.init();
      const count = await offlineStorage.getPendingCount();
      setPendingCount(count);
    } catch {
      // IndexedDB may not be ready yet
    }
  }, []);

  useEffect(() => {
    // Browser online/offline events
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // SyncEngine events
    const unsub = syncEngine.subscribe((event) => {
      switch (event.type) {
        case 'online':
          setIsOnline(true);
          break;
        case 'offline':
          setIsOnline(false);
          break;
        case 'syncStart':
          setSyncing(true);
          break;
        case 'syncEnd':
          setSyncing(false);
          setLastSyncResult({ synced: event.synced, failed: event.failed, total: event.total, at: event.timestamp });
          refreshPendingCount();
          break;
        case 'syncProgress':
          refreshPendingCount();
          break;
        case 'syncError':
          setSyncing(false);
          break;
        default:
          break;
      }
    });

    // Initial count
    refreshPendingCount();

    // Periodic refresh every 10s
    const interval = setInterval(refreshPendingCount, 10000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      unsub();
      clearInterval(interval);
    };
  }, [refreshPendingCount]);

  // Manual sync trigger
  const triggerSync = useCallback(async () => {
    if (!navigator.onLine) return { synced: 0, failed: 0, total: 0 };
    const result = await syncEngine.syncAll();
    return result;
  }, []);

  return {
    isOnline,
    pendingCount,
    syncing,
    lastSyncResult,
    triggerSync,
    refreshPendingCount
  };
}
