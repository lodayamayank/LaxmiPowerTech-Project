// Floating offline status banner + sync indicator
// Shows: offline warning, pending action count, syncing animation
import React from 'react';
import { FaWifi, FaCloudUploadAlt, FaSync, FaCheckCircle, FaExclamationTriangle } from 'react-icons/fa';
import useNetworkStatus from '../hooks/useNetworkStatus';

export default function OfflineBanner() {
  const { isOnline, pendingCount, syncing, lastSyncResult } = useNetworkStatus();

  // Nothing to show when online and no pending actions and no recent sync result
  if (isOnline && pendingCount === 0 && !syncing) {
    // Show brief success toast after sync
    if (lastSyncResult && lastSyncResult.synced > 0 && Date.now() - lastSyncResult.at < 5000) {
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
    return null;
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] flex justify-center pointer-events-none">
      <div className="max-w-md w-full mx-auto px-4 pt-2 pointer-events-auto space-y-2">
        {/* Offline Banner */}
        {!isOnline && (
          <div className="bg-red-500 text-white px-4 py-2.5 rounded-xl shadow-lg flex items-center gap-2 text-sm font-medium">
            <FaWifi size={14} className="opacity-70" />
            <span className="flex-1">You are offline</span>
            <span className="text-white/70 text-xs">Actions saved locally</span>
          </div>
        )}

        {/* Pending Actions Indicator */}
        {pendingCount > 0 && !syncing && (
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

        {/* Sync failed warning */}
        {lastSyncResult && lastSyncResult.failed > 0 && Date.now() - lastSyncResult.at < 10000 && (
          <div className="bg-orange-500 text-white px-4 py-2.5 rounded-xl shadow-lg flex items-center gap-2 text-sm font-medium">
            <FaExclamationTriangle size={14} />
            <span>{lastSyncResult.failed} action(s) failed to sync. Will retry.</span>
          </div>
        )}
      </div>
    </div>
  );
}
