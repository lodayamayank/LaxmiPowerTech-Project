// Floating offline status banner + sync indicator
// Shows: offline warning, pending action count, syncing animation
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FaWifi, FaCloudUploadAlt, FaSync, FaCheckCircle, FaExclamationTriangle } from 'react-icons/fa';
import useNetworkStatus from '../hooks/useNetworkStatus';

export default function OfflineBanner() {
  const { isOnline, pendingCount, failedCount, syncing, lastSyncResult } = useNetworkStatus();
  const [now, setNow] = useState(Date.now());
  const [pendingVisibleUntil, setPendingVisibleUntil] = useState(0);

  useEffect(() => {
    if (pendingCount > 0 && isOnline && !syncing) {
      setPendingVisibleUntil(Date.now() + 3000);
    }
  }, [pendingCount, isOnline, syncing]);

  useEffect(() => {
    const hasTransientSyncResult = lastSyncResult && (lastSyncResult.synced > 0 || lastSyncResult.failed > 0);
    if (!hasTransientSyncResult && pendingVisibleUntil <= Date.now()) return;

    setNow(Date.now());
    const timer = setTimeout(() => setNow(Date.now()), 3200);
    return () => clearTimeout(timer);
  }, [lastSyncResult, pendingVisibleUntil]);

  const showPending = pendingCount > 0 && !syncing && (!isOnline || now < pendingVisibleUntil);
  const showSyncSuccess = isOnline && pendingCount === 0 && failedCount === 0 && !syncing
    && lastSyncResult && lastSyncResult.synced > 0 && now - lastSyncResult.at < 3000;
  const showRetryWarning = failedCount === 0 && lastSyncResult && lastSyncResult.failed > 0
    && now - lastSyncResult.at < 3000;
  const showOffline = !isOnline;
  const showFailedAttention = failedCount > 0;

  // Nothing to show when online, the queue is empty and nothing needs attention
  if (isOnline && pendingCount === 0 && failedCount === 0 && !syncing) {
    // Show brief success toast after sync
    if (showSyncSuccess) {
      return (
        <div className="fixed top-0 left-0 right-0 z-[9999] flex justify-center pointer-events-none">
          <div className="max-w-md w-full mx-auto px-4 pt-2 pointer-events-auto">
            <div className="bg-green-500 text-white px-4 py-2.5 rounded-xl shadow-lg flex items-center gap-2 text-sm font-medium animate-pulse">
              <FaCheckCircle size={14} />
              <span>{lastSyncResult.synced} action(s) synced successfully!</span>
            </div>
          </div>
        </div>
      );
    }
    if (showRetryWarning) {
      return (
        <div className="fixed top-0 left-0 right-0 z-[9999] flex justify-center pointer-events-none">
          <div className="max-w-md w-full mx-auto px-4 pt-2 pointer-events-auto">
            <div className="bg-orange-500 text-white px-4 py-2.5 rounded-xl shadow-lg flex items-center gap-2 text-sm font-medium">
              <FaExclamationTriangle size={14} />
              <span>{lastSyncResult.failed} action(s) failed to sync. Will retry.</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  }

  if (!showOffline && !showPending && !syncing && !showFailedAttention && !showRetryWarning) {
    return null;
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] flex justify-center pointer-events-none">
      <div className="max-w-md w-full mx-auto px-4 pt-2 pointer-events-auto space-y-2">
        {/* Offline Banner */}
        {showOffline && (
          <div className="bg-red-500 text-white px-4 py-2.5 rounded-xl shadow-lg flex items-center gap-2 text-sm font-medium">
            <FaWifi size={14} className="opacity-70" />
            <span className="flex-1">You are offline</span>
            <span className="text-white/70 text-xs">Actions saved locally</span>
          </div>
        )}

        {/* Pending Actions Indicator */}
        {showPending && (
          <div className="bg-yellow-500 text-white px-4 py-2.5 rounded-xl shadow-lg flex items-center gap-2 text-sm font-medium">
            <FaCloudUploadAlt size={14} />
            <span className="flex-1">{pendingCount} pending action(s)</span>
            <span className="text-white/80 text-xs">{isOnline ? 'Syncing soon...' : 'Will sync when online'}</span>
          </div>
        )}

        {/* Syncing Animation */}
        {syncing && (
          <div className="bg-blue-500 text-white px-4 py-2.5 rounded-xl shadow-lg flex items-center gap-2 text-sm font-medium">
            <FaSync size={14} className="animate-spin" />
            <span>Syncing data to server...</span>
          </div>
        )}

        {/* Actions that gave up – persistent, because this needs a decision
            from the user rather than another automatic retry */}
        {showFailedAttention && (
          <Link
            to="/connect-server"
            className="bg-red-600 text-white px-4 py-2.5 rounded-xl shadow-lg flex items-center gap-2 text-sm font-medium hover:bg-red-700 transition-colors"
          >
            <FaExclamationTriangle size={14} />
            <span className="flex-1">{failedCount} action(s) need attention</span>
            <span className="text-white/80 text-xs underline">Review</span>
          </Link>
        )}

        {/* Transient warning for failures that will be retried automatically */}
        {showRetryWarning && (
          <div className="bg-orange-500 text-white px-4 py-2.5 rounded-xl shadow-lg flex items-center gap-2 text-sm font-medium">
            <FaExclamationTriangle size={14} />
            <span>{lastSyncResult.failed} action(s) failed to sync. Will retry.</span>
          </div>
        )}
      </div>
    </div>
  );
}
