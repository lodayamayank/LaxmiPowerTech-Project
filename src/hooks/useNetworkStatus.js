// Hook: tracks online/offline status and pending sync count in real-time
import { useState, useEffect, useCallback } from 'react';
import offlineStorage from '../utils/offlineStorage';
import syncEngine from '../utils/syncEngine';

export default function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingCount, setPendingCount] = useState(0);
  const [failedCount, setFailedCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [lastSyncResult, setLastSyncResult] = useState(null);

  // Refresh queue counts from IndexedDB
  const refreshPendingCount = useCallback(async () => {
    try {
      await offlineStorage.init();
      const [pending, failed] = await Promise.all([
        offlineStorage.getPendingCount(),
        offlineStorage.getFailedCount(),
      ]);
      setPendingCount(pending);
      setFailedCount(failed);
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
          setLastSyncResult({
            synced: event.synced,
            failed: event.failed,
            total: event.total,
            skipped: event.skipped,
            at: event.timestamp,
          });
          refreshPendingCount();
          break;
        case 'syncProgress':
          refreshPendingCount();
          break;
        case 'queued':
          // A form just wrote straight to IndexedDB via smartRequest, outside
          // any sync run — reflect it immediately rather than waiting for the
          // next periodic poll.
          refreshPendingCount();
          break;
        case 'syncError':
          // A single action failing does not end the run – syncEnd does that.
          // Only refresh the counts so a newly-parked action shows up.
          refreshPendingCount();
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

  // Manual sync trigger. Forced: the user tapped "Sync Now" on purpose, so an
  // action still sitting in its automatic backoff window should be attempted
  // anyway rather than silently skipped until the backoff timer elapses.
  const triggerSync = useCallback(async () => {
    if (!navigator.onLine) return { synced: 0, failed: 0, total: 0, skipped: 0 };
    const result = await syncEngine.syncAll({ force: true });
    return result;
  }, []);

  // Put every parked action back in the queue and try again
  const retryFailed = useCallback(async () => {
    const count = await syncEngine.retryFailed();
    await refreshPendingCount();
    return count;
  }, [refreshPendingCount]);

  return {
    isOnline,
    pendingCount,
    failedCount,
    syncing,
    lastSyncResult,
    triggerSync,
    retryFailed,
    refreshPendingCount
  };
}
