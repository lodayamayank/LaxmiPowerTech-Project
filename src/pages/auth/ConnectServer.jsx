// Connect to Server page: manual sync trigger + sync status overview (mobile: "Offline & sync")
// Laid out like the Offline queue design. The queue, retry, discard, clear and sync calls are unchanged; the discard
// confirmation is a ConfirmDialog instead of window.confirm.
import React, { useState, useEffect } from 'react';
import { ROLES } from '@/lib/constants';
import { isFieldRole } from '@/lib/roles';
import { getUser } from '@/lib/session';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { CloudUpload, FileCheck, RefreshCw, Trash2, TriangleAlert, WifiOff } from 'lucide-react';
import useNetworkStatus from '@/pwa/useNetworkStatus';
import offlineStorage from '@/pwa/offlineStorage';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { IconTile } from '@/components/common/IconTile';
import { Notice } from '@/components/common/Notice';
import MobileCard from '@/layouts/mobile/MobileCard';
import MobilePage from '@/layouts/mobile/MobilePage';

export default function ConnectServer() {
  const navigate = useNavigate();
  const {
    isOnline, pendingCount, failedCount, syncing, triggerSync, retryFailed, refreshPendingCount
  } = useNetworkStatus();
  const [pendingActions, setPendingActions] = useState([]);
  const [failedActions, setFailedActions] = useState([]);
  const [manualSyncResult, setManualSyncResult] = useState(null);
  const [clearing, setClearing] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  const user = (getUser() || {});

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
    if (result?.failed > 0) {
      toast.error(`${result.failed} ${result.failed === 1 ? 'item' : 'items'} couldn\u2019t send`, { description: 'See Needs attention below' });
    } else if (result?.synced > 0) {
      toast.success(`${result.synced} ${result.synced === 1 ? 'item' : 'items'} sent`);
    }
    loadActions();
  };

  const handleRetryFailed = async () => {
    setRetrying(true);
    try {
      await retryFailed();
      await loadActions();
    } catch (err) {
      console.error('Failed to retry actions:', err);
      toast.error('1 item couldn\u2019t send', { description: 'Tap Try again to fix', action: { label: 'Retry', onClick: () => handleRetryFailed() } });
    } finally {
      setRetrying(false);
    }
  };

  // Deliberately destructive and behind a confirm: these entries hold the only
  // copy of work the user did offline, so discarding them loses that data.
  const handleDiscardFailed = async () => {
    setConfirmDiscard(false);
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
      await offlineStorage.clearSyncedActions();
      refreshPendingCount();
      loadActions();
    } catch (err) {
      console.error('Failed to clear synced:', err);
    } finally {
      setClearing(false);
    }
  };

  const getBackRoute = () => {
    if (isFieldRole(user?.role)) return '/dashboard';
    if (user?.role === ROLES.labour) return '/dashboard';
    return '/dashboard';
  };

  const timeOf = (t) => new Date(t).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase();

  return (
    <MobilePage title="Offline & sync" back onBack={() => navigate(getBackRoute())}>
      {!isOnline ? (
        <Notice tone="warn" icon={WifiOff}>
          <b>You&apos;re offline.</b> Keep working, everything is saved on this phone and sends when you&apos;re back online.
        </Notice>
      ) : (
        <Notice tone="ok" icon={CloudUpload}>
          <b>Connected.</b> Anything waiting below sends automatically.
        </Notice>
      )}

      <MobileCard title={`Waiting to send \u00b7 ${pendingCount}`}>
        {pendingActions.length === 0 ? (
          <p className="text-small text-ink-3">{pendingCount > 0 ? `${pendingCount} action(s) waiting to sync.` : 'All synced. Nothing is waiting.'}</p>
        ) : (
          <ul>
            {pendingActions.map((action) => (
              <li key={action.id} className="flex items-center gap-3 border-b border-line py-3 last:border-b-0">
                <IconTile icon={FileCheck} tone="neutral" />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[14.5px] font-semibold capitalize text-ink-1">{action.label || `${action.actionType} ${action.module}`}</div>
                  <div className="text-small text-ink-3">
                    Saved {timeOf(action.timestamp)}
                    {action.retries > 0 ? ` \u00b7 attempt ${action.retries}: ${action.lastError}` : ''}
                  </div>
                </div>
                <Badge variant="neutral">Queued</Badge>
              </li>
            ))}
          </ul>
        )}
      </MobileCard>

      {/* Actions that gave up: shown so offline work is never lost silently */}
      {failedCount > 0 && (
        <MobileCard title="Needs attention" className="border-tone-bad-border">
          <p className="mb-2 text-small text-ink-3">{failedCount} action(s) could not be synced automatically</p>
          <ul className="mb-3">
            {failedActions.map((action) => (
              <li key={action.id} className="border-b border-line py-2.5 last:border-b-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-[14px] font-semibold capitalize text-ink-1">{action.label || `${action.actionType} ${action.module}`}</span>
                  <span className="shrink-0 text-caption text-ink-3">{new Date(action.timestamp).toLocaleString()}</span>
                </div>
                <p className="mt-0.5 flex items-start gap-1.5 text-small text-tone-bad-fg">
                  <TriangleAlert className="mt-0.5 size-3.5 shrink-0" /> Gave up after {action.retries} attempt(s): {action.lastError}
                </p>
              </li>
            ))}
          </ul>
          <div className="flex gap-2">
            <Button onClick={handleRetryFailed} disabled={!isOnline || retrying} className="flex-1">
              <RefreshCw className={retrying ? 'animate-spin' : ''} /> {retrying ? 'Retrying…' : 'Try again'}
            </Button>
            <Button variant="outline" className="text-tone-bad-fg" onClick={() => setConfirmDiscard(true)}>
              <Trash2 /> Discard
            </Button>
          </div>
        </MobileCard>
      )}

      {manualSyncResult && (
        <MobileCard title="Sync complete">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-control bg-surface-subtle p-2">
              <p className="text-[18px] font-semibold tabular-nums text-ink-1">{manualSyncResult.total}</p>
              <p className="text-caption text-ink-3">Total</p>
            </div>
            <div className="rounded-control bg-surface-subtle p-2">
              <p className="text-[18px] font-semibold tabular-nums text-tone-ok-fg">{manualSyncResult.synced}</p>
              <p className="text-caption text-ink-3">Synced</p>
            </div>
            <div className="rounded-control bg-surface-subtle p-2">
              <p className="text-[18px] font-semibold tabular-nums text-tone-bad-fg">{manualSyncResult.failed}</p>
              <p className="text-caption text-ink-3">Failed</p>
            </div>
          </div>
        </MobileCard>
      )}

      <MobileCard title="How it works">
        <ul className="flex list-disc flex-col gap-1.5 pl-[18px] text-[14px] text-ink-2">
          <li>Attendance, tasks, leave, claims and indent photos save on the phone.</li>
          <li>They send automatically, in order, when internet returns.</li>
          <li>Each keeps the time you made it.</li>
          <li>A failed sync retries automatically; anything that still fails moves to &quot;Needs attention&quot;.</li>
          <li>Signing in still needs internet.</li>
        </ul>
      </MobileCard>

      <Button size="xl" variant="outline" className="w-full text-ink-2" onClick={handleManualSync} disabled={!isOnline || syncing || pendingCount === 0}>
        <RefreshCw className={syncing ? 'animate-spin' : ''} />
        {syncing ? 'Sending…' : !isOnline ? 'No internet, can\u2019t send' : pendingCount === 0 ? 'Nothing to send' : 'Try sending now'}
      </Button>

      <Button variant="ghost" className="text-ink-3" onClick={handleClearSynced} disabled={clearing}>
        <Trash2 /> {clearing ? 'Clearing…' : 'Clear synced data'}
      </Button>

      <ConfirmDialog
        open={confirmDiscard}
        onOpenChange={setConfirmDiscard}
        title="Discard unsent items?"
        description={`Permanently delete ${failedCount} action(s) that could not be synced? This data cannot be recovered.`}
        confirmLabel="Discard"
        tone="destructive"
        onConfirm={handleDiscardFailed}
      />
    </MobilePage>
  );
}
