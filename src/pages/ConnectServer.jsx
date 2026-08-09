// Connect to Server page – manual sync trigger + sync status overview
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaArrowLeft, FaSync, FaWifi, FaCloudUploadAlt, FaCheckCircle, FaExclamationTriangle, FaTrash, FaDatabase } from 'react-icons/fa';
import useNetworkStatus from '../hooks/useNetworkStatus';
import offlineStorage from '../utils/offlineStorage';

export default function ConnectServer() {
  const navigate = useNavigate();
  const {
    isOnline, pendingCount, failedCount, syncing, triggerSync, retryFailed, refreshPendingCount
  } = useNetworkStatus();
  const [pendingActions, setPendingActions] = useState([]);
  const [failedActions, setFailedActions] = useState([]);
  const [showDetails, setShowDetails] = useState(false);
  const [manualSyncResult, setManualSyncResult] = useState(null);
  const [clearing, setClearing] = useState(false);
  const [retrying, setRetrying] = useState(false);

  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    loadActions();
  }, [pendingCount, failedCount]);

  const loadActions = async () => {
    try {
      await offlineStorage.init();
      const [pending, failed] = await Promise.all([
        offlineStorage.getPendingActions(),
        offlineStorage.getFailedActions(),
      ]);
      setPendingActions(pending);
      setFailedActions(failed);
    } catch (err) {
      console.error('Failed to load queued actions:', err);
    }
  };

  const handleManualSync = async () => {
    setManualSyncResult(null);
    const result = await triggerSync();
    setManualSyncResult(result);
    loadActions();
  };

  const handleRetryFailed = async () => {
    setRetrying(true);
    try {
      await retryFailed();
      await loadActions();
    } catch (err) {
      console.error('Failed to retry actions:', err);
    } finally {
      setRetrying(false);
    }
  };

  // Deliberately destructive and behind a confirm: these entries hold the only
  // copy of work the user did offline, so discarding them loses that data.
  const handleDiscardFailed = async () => {
    const confirmed = window.confirm(
      `Permanently delete ${failedCount} action(s) that could not be synced? This data cannot be recovered.`
    );
    if (!confirmed) return;
    try {
      await offlineStorage.clearFailedActions();
      refreshPendingCount();
      loadActions();
    } catch (err) {
      console.error('Failed to discard actions:', err);
    }
  };

  const handleClearSynced = async () => {
    setClearing(true);
    try {
      const count = await offlineStorage.clearSyncedActions();
      console.log(`Cleared ${count} synced actions`);
      refreshPendingCount();
      loadActions();
    } catch (err) {
      console.error('Failed to clear synced:', err);
    } finally {
      setClearing(false);
    }
  };

  const getBackRoute = () => {
    if (user?.role === 'supervisor' || user?.role === 'subcontractor') return '/dashboard';
    if (user?.role === 'labour') return '/dashboard';
    return '/dashboard';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-blue-50">
      <div className="max-w-md mx-auto min-h-screen bg-white shadow-xl">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-500 to-purple-600 px-6 pt-6 pb-8 rounded-b-3xl shadow-lg relative">
          <button
            className="absolute top-6 left-6 text-white flex items-center gap-2 hover:bg-white/20 px-3 py-1.5 rounded-full transition-all"
            onClick={() => navigate(getBackRoute())}
          >
            <FaArrowLeft size={16} />
            <span className="text-sm font-medium">Back</span>
          </button>

          <div className="text-center pt-8">
            <h1 className="text-white text-2xl font-bold mb-2">Connect to Server</h1>
            <p className="text-white/80 text-sm">Manage offline data & sync</p>
          </div>
        </div>

        <div className="px-6 py-6 -mt-4 space-y-5">
          {/* Connection Status Card */}
          <div className={`rounded-2xl p-5 border shadow-sm ${isOnline ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${isOnline ? 'bg-green-500' : 'bg-red-500'}`}>
                <FaWifi size={20} className="text-white" />
              </div>
              <div className="flex-1">
                <h3 className={`font-bold text-sm ${isOnline ? 'text-green-800' : 'text-red-800'}`}>
                  {isOnline ? 'Connected to Internet' : 'No Internet Connection'}
                </h3>
                <p className={`text-xs ${isOnline ? 'text-green-600' : 'text-red-600'}`}>
                  {isOnline ? 'Ready to sync data' : 'Working in offline mode'}
                </p>
              </div>
              <div className={`w-3 h-3 rounded-full ${isOnline ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
            </div>
          </div>

          {/* Pending Actions Card */}
          <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-2xl p-5 border border-yellow-200 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-yellow-500 flex items-center justify-center">
                <FaDatabase size={16} className="text-white" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-sm text-gray-800">Offline Queue</h3>
                <p className="text-xs text-gray-600">{pendingCount} action(s) waiting to sync</p>
              </div>
              {pendingCount > 0 && (
                <button
                  onClick={() => setShowDetails(!showDetails)}
                  className="text-xs text-orange-600 font-semibold hover:underline"
                >
                  {showDetails ? 'Hide' : 'Details'}
                </button>
              )}
            </div>

            {/* Pending Actions Details */}
            {showDetails && pendingActions.length > 0 && (
              <div className="mt-3 space-y-2 max-h-48 overflow-y-auto">
                {pendingActions.map((action) => (
                  <div key={action.id} className="bg-white rounded-lg p-3 border border-gray-200 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-gray-800 capitalize">
                        {action.label || `${action.actionType} ${action.module}`}
                      </span>
                      <span className="text-gray-400">
                        {new Date(action.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="text-gray-500 mt-1 truncate">{action.endpoint}</p>
                    {action.retries > 0 && (
                      <p className="text-orange-500 mt-1">
                        Attempt {action.retries} · {action.lastError}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Actions that gave up – shown so offline work is never lost silently */}
          {failedCount > 0 && (
            <div className="bg-red-50 rounded-2xl p-5 border border-red-200 shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-red-500 flex items-center justify-center">
                  <FaExclamationTriangle size={16} className="text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-sm text-red-800">Needs Attention</h3>
                  <p className="text-xs text-red-600">
                    {failedCount} action(s) could not be synced automatically
                  </p>
                </div>
              </div>

              <div className="space-y-2 max-h-48 overflow-y-auto mb-3">
                {failedActions.map((action) => (
                  <div key={action.id} className="bg-white rounded-lg p-3 border border-red-200 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-gray-800 capitalize">
                        {action.label || `${action.actionType} ${action.module}`}
                      </span>
                      <span className="text-gray-400">
                        {new Date(action.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-red-500 mt-1">
                      Gave up after {action.retries} attempt(s): {action.lastError}
                    </p>
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleRetryFailed}
                  disabled={!isOnline || retrying}
                  className="flex-1 bg-red-500 text-white py-2.5 rounded-xl font-semibold text-sm hover:bg-red-600 transition-all disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <FaSync size={12} className={retrying ? 'animate-spin' : ''} />
                  <span>{retrying ? 'Retrying...' : 'Try Again'}</span>
                </button>
                <button
                  onClick={handleDiscardFailed}
                  className="px-4 bg-white border-2 border-red-200 text-red-600 py-2.5 rounded-xl font-semibold text-sm hover:bg-red-50 transition-all flex items-center justify-center gap-2"
                >
                  <FaTrash size={12} />
                  <span>Discard</span>
                </button>
              </div>
            </div>
          )}

          {/* Sync Button */}
          <button
            onClick={handleManualSync}
            disabled={!isOnline || syncing || pendingCount === 0}
            className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white py-4 rounded-xl font-bold text-base shadow-lg hover:shadow-xl transition-all duration-300 disabled:from-gray-400 disabled:to-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-3"
          >
            {syncing ? (
              <>
                <FaSync size={18} className="animate-spin" />
                <span>Syncing...</span>
              </>
            ) : (
              <>
                <FaCloudUploadAlt size={18} />
                <span>
                  {!isOnline ? 'No Internet – Cannot Sync' : pendingCount === 0 ? 'Nothing to Sync' : `Sync ${pendingCount} Action(s) Now`}
                </span>
              </>
            )}
          </button>

          {/* Sync Result */}
          {manualSyncResult && (
            <div className={`rounded-2xl p-4 border shadow-sm ${manualSyncResult.failed > 0 ? 'bg-orange-50 border-orange-200' : 'bg-green-50 border-green-200'}`}>
              <div className="flex items-center gap-2 mb-2">
                {manualSyncResult.failed > 0 ? (
                  <FaExclamationTriangle className="text-orange-500" size={16} />
                ) : (
                  <FaCheckCircle className="text-green-500" size={16} />
                )}
                <h4 className="font-bold text-sm text-gray-800">Sync Complete</h4>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-white rounded-lg p-2">
                  <p className="text-lg font-bold text-gray-800">{manualSyncResult.total}</p>
                  <p className="text-xs text-gray-500">Total</p>
                </div>
                <div className="bg-white rounded-lg p-2">
                  <p className="text-lg font-bold text-green-600">{manualSyncResult.synced}</p>
                  <p className="text-xs text-gray-500">Synced</p>
                </div>
                <div className="bg-white rounded-lg p-2">
                  <p className="text-lg font-bold text-red-600">{manualSyncResult.failed}</p>
                  <p className="text-xs text-gray-500">Failed</p>
                </div>
              </div>
            </div>
          )}

          {/* Clear Storage */}
          <button
            onClick={handleClearSynced}
            disabled={clearing}
            className="w-full bg-white border-2 border-gray-200 text-gray-700 py-3 rounded-xl font-semibold text-sm hover:bg-gray-50 transition-all flex items-center justify-center gap-2"
          >
            <FaTrash size={14} />
            <span>{clearing ? 'Clearing...' : 'Clear Synced Data'}</span>
          </button>

          {/* Info */}
          <div className="bg-blue-50 rounded-2xl p-4 border border-blue-100">
            <h4 className="text-sm font-semibold text-gray-800 mb-2">How it works</h4>
            <ul className="text-xs text-gray-600 space-y-1.5">
              <li>• Attendance, tasks, leaves, reimbursements and indent photos are saved on your device when offline</li>
              <li>• They sync automatically when internet returns, in the order you made them</li>
              <li>• Each is recorded at the time you made it, not the time it synced</li>
              <li>• A failed sync retries automatically; anything that still fails moves to "Needs Attention"</li>
              <li>• Synced data is cleaned up automatically</li>
              <li>• Login requires an internet connection</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 pt-2">
          <div className="text-center">
            <p className="text-xs text-gray-400">Powered by Laxmi Power Tech</p>
          </div>
        </div>
      </div>
    </div>
  );
}
