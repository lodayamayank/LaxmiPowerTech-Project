// Sync Engine – processes offline action queue when connectivity is restored
// Handles: auto-sync on reconnect, manual trigger, retry logic, ordered execution

import offlineStorage from './offlineStorage';
import axios from './axios';

// Attempts before an action is parked as failed for the user to deal with.
const MAX_RETRIES = 5;
// Backoff between attempts: 30s, 1m, 2m, 4m … capped at 30m.
const BASE_BACKOFF_MS = 30 * 1000;
const MAX_BACKOFF_MS = 30 * 60 * 1000;
// Name of the cross-tab Web Lock; only one tab syncs the shared queue at a time.
const SYNC_LOCK_NAME = 'lpt-offline-sync';

/**
 * Decide what a failed attempt means.
 *
 * The distinction that matters: a request that never reached the server (no
 * response) or that the server could not handle yet (5xx/429) is worth
 * retrying, while a request the server actively rejected (validation 4xx) will
 * be rejected identically forever — retrying it is a busy-loop that also keeps
 * everything behind it in the queue waiting.
 */
function classifyError(err) {
  if (!err.response) {
    // Timeout, DNS failure, connection dropped mid-flight.
    return { retryable: true, abortRun: false, reason: 'network' };
  }
  const status = err.response.status;
  if (status === 401 || status === 403) {
    // The token is stale or the session ended. Every other queued action will
    // fail the same way, so stop the run and keep them all pending until the
    // user logs in again.
    return { retryable: true, abortRun: true, reason: 'auth' };
  }
  if (status === 408 || status === 429 || status >= 500) {
    return { retryable: true, abortRun: false, reason: 'server' };
  }
  return { retryable: false, abortRun: false, reason: 'rejected' };
}

function backoffFor(retries) {
  return Math.min(BASE_BACKOFF_MS * 2 ** retries, MAX_BACKOFF_MS);
}

class SyncEngine {
  constructor() {
    this._listeners = [];
    this._syncing = false;
    this._initialized = false;
    this._retryTimer = null;
  }

  // ─── lifecycle ───

  init() {
    if (this._initialized) return;
    this._initialized = true;

    window.addEventListener('online', () => {
      console.log('🟢 SyncEngine: Device came online – starting auto-sync');
      this._emit('online');
      this.syncAll();
    });

    window.addEventListener('offline', () => {
      console.log('🔴 SyncEngine: Device went offline');
      this._emit('offline');
    });

    // A tab that was backgrounded misses 'online'; re-check when it returns.
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && navigator.onLine) {
        this.syncAll();
      }
    });

    // Actions parked by backoff have no event to wake them, so poll slowly.
    this._retryTimer = setInterval(() => {
      if (navigator.onLine) this.syncAll();
    }, 60 * 1000);

    // Try initial sync if online
    if (navigator.onLine) {
      this.syncAll();
    }
  }

  // ─── event system ───

  /**
   * Subscribe to sync events.
   * Events: 'syncStart', 'syncEnd', 'syncProgress', 'syncError', 'online', 'offline'
   * @param {Function} listener – receives { type, ...data }
   * @returns {Function} unsubscribe
   */
  subscribe(listener) {
    this._listeners.push(listener);
    return () => {
      this._listeners = this._listeners.filter(l => l !== listener);
    };
  }

  _emit(type, data = {}) {
    const event = { type, timestamp: Date.now(), ...data };
    this._listeners.forEach(fn => {
      try { fn(event); } catch (e) { console.error('SyncEngine listener error:', e); }
    });
  }

  // ─── core sync ───

  get isSyncing() {
    return this._syncing;
  }

  /**
   * Hold the cross-tab sync lock for the duration of `fn`.
   *
   * Without this, two open tabs both firing on the `online` event would each
   * read the same pending rows and POST them — the server would see every
   * queued action twice. Returns null when another tab already holds the lock.
   */
  async _withLock(fn) {
    if (navigator.locks?.request) {
      return navigator.locks.request(SYNC_LOCK_NAME, { ifAvailable: true }, async (lock) => {
        if (!lock) {
          console.log('⏳ SyncEngine: Another tab is syncing, skipping');
          return null;
        }
        return fn();
      });
    }
    // No Web Locks support – the in-process guard is the best we can do.
    return fn();
  }

  /**
   * Process all pending offline actions in FIFO order.
   *
   * @param {Object} [opts]
   * @param {boolean} [opts.force] – ignore backoff and attempt every pending
   *   action now. Used for the user-initiated "Sync Now" button: a user who
   *   explicitly asks for a retry should get one immediately, not be silently
   *   told "nothing to do" because an automatic attempt happens to be sitting
   *   in a multi-minute backoff window from an earlier failure.
   * @returns {{ synced: number, failed: number, total: number, skipped: number }}
   */
  async syncAll({ force = false } = {}) {
    if (this._syncing) {
      console.log('⏳ SyncEngine: Sync already in progress, skipping');
      return { synced: 0, failed: 0, total: 0, skipped: 0 };
    }

    if (!navigator.onLine) {
      console.log('📴 SyncEngine: Offline – cannot sync');
      return { synced: 0, failed: 0, total: 0, skipped: 0 };
    }

    // Check there is something due before announcing a sync. syncAll runs on a
    // timer and on every tab focus, so emitting syncStart unconditionally would
    // flash the "Syncing data to server..." banner every minute — both on an
    // empty queue and on one where every entry is still waiting out its backoff.
    // A forced run skips this gate entirely: the user asked for it, so there is
    // no "was there anything due" question to ask first.
    if (!force) {
      try {
        await offlineStorage.init();
        const queued = await offlineStorage.getPendingActions();
        const now = Date.now();
        const anythingDue = queued.some((a) => !a.nextAttemptAt || a.nextAttemptAt <= now);
        if (!anythingDue) {
          return { synced: 0, failed: 0, total: 0, skipped: 0 };
        }
      } catch (err) {
        console.error('SyncEngine: could not read the queue:', err);
        return { synced: 0, failed: 0, total: 0, skipped: 0 };
      }
    }

    this._syncing = true;
    this._emit('syncStart');

    try {
      const result = await this._withLock(() => this._runQueue({ force }));
      // null = another tab holds the lock and is doing the work.
      const outcome = result || { synced: 0, failed: 0, total: 0, skipped: 0 };
      this._emit('syncEnd', outcome);
      return outcome;
    } catch (err) {
      console.error('❌ SyncEngine: Fatal sync error:', err);
      this._emit('syncError', { error: err.message });
      const outcome = { synced: 0, failed: 0, total: 0, skipped: 0 };
      this._emit('syncEnd', outcome);
      return outcome;
    } finally {
      this._syncing = false;
    }
  }

  async _runQueue({ force = false } = {}) {
    await offlineStorage.init();
    const pending = await offlineStorage.getPendingActions();
    const total = pending.length;

    if (total === 0) {
      console.log('✅ SyncEngine: No pending actions to sync');
      return { synced: 0, failed: 0, total: 0, skipped: 0 };
    }

    console.log(`🔄 SyncEngine: Processing ${total} pending action(s)...`);

    let synced = 0;
    let failed = 0;
    let skipped = 0;
    const now = Date.now();

    // Actions within one module must reach the server in the order they were
    // made — a punch-out must not overtake the punch-in that is sitting in
    // backoff. Once a module stalls, everything behind it in that module waits.
    const stalledModules = new Set();

    for (const action of pending) {
      if (!navigator.onLine) {
        console.log('📴 SyncEngine: Lost connection mid-sync, pausing');
        break;
      }

      const moduleKey = action.module || '_default';

      if (stalledModules.has(moduleKey)) {
        skipped++;
        continue;
      }

      if (!force && action.nextAttemptAt && action.nextAttemptAt > now) {
        // Still in backoff from a previous failure.
        stalledModules.add(moduleKey);
        skipped++;
        continue;
      }

      try {
        await this._processAction(action);
        await offlineStorage.markActionSynced(action.id);
        synced++;
        this._emit('syncProgress', { synced, failed, total, current: action });
        console.log(`✅ Synced action #${action.id} [${action.module}/${action.actionType}]`);
      } catch (err) {
        const { retryable, abortRun, reason } = classifyError(err);
        const attempts = (action.retries || 0) + 1;
        const outOfRetries = attempts >= MAX_RETRIES;
        // Park permanently when the server rejected it outright, or when it has
        // burned through its attempts. Auth failures never count as permanent —
        // they resolve when the user logs back in.
        const permanent = (!retryable || outOfRetries) && reason !== 'auth';

        await offlineStorage.markActionFailed(action.id, err, {
          permanent,
          retryAfterMs: permanent ? 0 : backoffFor(attempts)
        });

        failed++;
        stalledModules.add(moduleKey);
        this._emit('syncError', { action, error: err.message, permanent, reason });

        if (permanent) {
          console.warn(
            `⛔ Action #${action.id} parked as failed (${reason}, attempt ${attempts}): ${err.message}`
          );
        } else {
          console.error(`❌ Failed action #${action.id} (${reason}), will retry:`, err.message);
        }

        if (abortRun) {
          console.warn('🔐 SyncEngine: Auth failure – stopping this run, will resume after re-login');
          break;
        }
      }
    }

    const cleaned = await offlineStorage.clearSyncedActions();
    if (cleaned > 0) {
      console.log(`🧹 SyncEngine: Cleaned ${cleaned} synced action(s) from queue`);
    }

    return { synced, failed, total, skipped };
  }

  /**
   * Execute a single queued action against the backend.
   *
   * `clientId` and `capturedAt` ride along with every request: the first lets
   * the server recognise a replay instead of inserting a duplicate, the second
   * lets it store when the user actually did this rather than when the phone
   * finally got signal.
   */
  async _processAction(action) {
    const { method, endpoint, payload, clientId, capturedAt } = action;
    const httpMethod = (method || 'POST').toLowerCase();

    const config = {};
    if (clientId) {
      config.headers = { 'X-Client-Id': clientId };
    }

    // Multipart payload: rebuild the FormData from the stored fields. Blobs and
    // Files were preserved verbatim by IndexedDB's structured clone, so photos
    // and selfies survive an offline round-trip intact.
    if (payload && payload.__multipart) {
      const fd = new FormData();
      for (const [key, value, filename] of payload.fields || []) {
        if (filename) fd.append(key, value, filename);
        else fd.append(key, value);
      }
      if (clientId) fd.append('clientId', clientId);
      if (capturedAt) fd.append('capturedAt', capturedAt);
      return axios[httpMethod](endpoint, fd, config);
    }

    const body = payload && typeof payload === 'object' && !Array.isArray(payload)
      ? { ...payload, ...(clientId ? { clientId } : {}), ...(capturedAt ? { capturedAt } : {}) }
      : payload;

    switch (httpMethod) {
      case 'post':
        return axios.post(endpoint, body, config);
      case 'put':
        return axios.put(endpoint, body, config);
      case 'patch':
        return axios.patch(endpoint, body, config);
      case 'delete':
        return axios.delete(endpoint, config);
      default:
        throw new Error(`Unsupported HTTP method: ${method}`);
    }
  }

  // ─── convenience: enqueue + immediate-try ───

  /**
   * Send now if online, queue for later if not.
   *
   * This is the single entry point every form should use for writes. It also
   * queues on a network failure while nominally online, which is the common
   * real-world case — `navigator.onLine` reports true on a connected wifi
   * access point that has no route to the internet.
   *
   * @returns {{ offline: boolean, queueId?: number, response?: any }}
   */
  async smartRequest(action) {
    // Mint the id up front so the immediate attempt and any later queued replay
    // share it — a request that times out after the server committed it is
    // recognised as a duplicate rather than applied twice.
    const enriched = {
      ...action,
      clientId: action.clientId || makeClientIdForAction(),
      capturedAt: action.capturedAt || new Date().toISOString()
    };

    if (!navigator.onLine) {
      const queueId = await offlineStorage.enqueueAction(enriched);
      // enqueueAction writes straight to IndexedDB without going through
      // syncAll, so nothing would otherwise tell useNetworkStatus to refresh
      // its pending count — the "N pending action(s)" banner would only catch
      // up on its next 10s poll, leaving a form submission with no immediate
      // feedback beyond the one-off toast.
      this._emit('queued', { queueId });
      return { offline: true, queueId };
    }

    try {
      const response = await this._processAction(enriched);
      return { offline: false, response };
    } catch (err) {
      const { retryable } = classifyError(err);
      if (retryable) {
        const queueId = await offlineStorage.enqueueAction(enriched);
        this._emit('queued', { queueId });
        return { offline: true, queueId };
      }
      // The server rejected it (validation error) – surface it to the form so
      // the user can correct the input. Queueing would just replay the same
      // rejection forever.
      throw err;
    }
  }

  /** Re-queue everything that gave up, then sync. */
  async retryFailed() {
    const count = await offlineStorage.retryAllFailed();
    if (count > 0 && navigator.onLine) {
      await this.syncAll({ force: true });
    }
    return count;
  }
}

// Kept local so offlineStorage stays the only module that owns id generation
// for queued entries; this covers the send-immediately path that never queues.
function makeClientIdForAction() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

// Singleton
const syncEngine = new SyncEngine();

export default syncEngine;
