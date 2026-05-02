// Sync Engine – processes offline action queue when connectivity is restored
// Handles: auto-sync on reconnect, manual trigger, retry logic, ordered execution

import offlineStorage from './offlineStorage';
import axios from './axios';

const MAX_RETRIES = 3;
const SYNC_LOCK_KEY = 'lpt_sync_in_progress';

class SyncEngine {
  constructor() {
    this._listeners = [];
    this._syncing = false;
    this._initialized = false;
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
   * Process all pending offline actions sequentially (FIFO order).
   * @returns {{ synced: number, failed: number, total: number }}
   */
  async syncAll() {
    if (this._syncing) {
      console.log('⏳ SyncEngine: Sync already in progress, skipping');
      return { synced: 0, failed: 0, total: 0 };
    }

    if (!navigator.onLine) {
      console.log('📴 SyncEngine: Offline – cannot sync');
      return { synced: 0, failed: 0, total: 0 };
    }

    this._syncing = true;
    localStorage.setItem(SYNC_LOCK_KEY, 'true');
    this._emit('syncStart');

    let synced = 0;
    let failed = 0;

    try {
      await offlineStorage.init();
      const pending = await offlineStorage.getPendingActions();
      const total = pending.length;

      if (total === 0) {
        console.log('✅ SyncEngine: No pending actions to sync');
        this._emit('syncEnd', { synced: 0, failed: 0, total: 0 });
        return { synced: 0, failed: 0, total: 0 };
      }

      console.log(`🔄 SyncEngine: Processing ${total} pending action(s)...`);

      for (const action of pending) {
        // Stop if we lose connectivity mid-sync
        if (!navigator.onLine) {
          console.log('📴 SyncEngine: Lost connection mid-sync, pausing');
          break;
        }

        try {
          await this._processAction(action);
          await offlineStorage.markActionSynced(action.id);
          synced++;
          this._emit('syncProgress', { synced, failed, total, current: action });
          console.log(`✅ Synced action #${action.id} [${action.module}/${action.actionType}]`);
        } catch (err) {
          failed++;
          await offlineStorage.markActionFailed(action.id, err);
          console.error(`❌ Failed action #${action.id}:`, err.message);
          this._emit('syncError', { action, error: err.message });

          // If max retries exceeded, skip this action
          if ((action.retries || 0) + 1 >= MAX_RETRIES) {
            console.warn(`⚠️ Action #${action.id} exceeded max retries, skipping`);
          }
        }
      }

      // Cleanup synced entries
      const cleaned = await offlineStorage.clearSyncedActions();
      if (cleaned > 0) {
        console.log(`🧹 SyncEngine: Cleaned ${cleaned} synced action(s) from queue`);
      }

      this._emit('syncEnd', { synced, failed, total });
      return { synced, failed, total };

    } catch (err) {
      console.error('❌ SyncEngine: Fatal sync error:', err);
      this._emit('syncError', { error: err.message });
      return { synced, failed, total: synced + failed };
    } finally {
      this._syncing = false;
      localStorage.removeItem(SYNC_LOCK_KEY);
    }
  }

  /**
   * Execute a single queued action against the backend.
   */
  async _processAction(action) {
    const { method, endpoint, payload } = action;
    const httpMethod = (method || 'POST').toLowerCase();

    const config = {};

    // Handle FormData payloads (e.g. photo uploads stored as plain objects)
    // For now all offline payloads are JSON; file uploads need special handling
    if (payload && payload._isFormData) {
      const fd = new FormData();
      for (const [key, value] of Object.entries(payload.fields || {})) {
        fd.append(key, value);
      }
      config.headers = { 'Content-Type': 'multipart/form-data' };
      return axios[httpMethod](endpoint, fd, config);
    }

    switch (httpMethod) {
      case 'post':
        return axios.post(endpoint, payload, config);
      case 'put':
        return axios.put(endpoint, payload, config);
      case 'patch':
        return axios.patch(endpoint, payload, config);
      case 'delete':
        return axios.delete(endpoint, config);
      default:
        throw new Error(`Unsupported HTTP method: ${method}`);
    }
  }

  // ─── convenience: enqueue + immediate-try ───

  /**
   * Smart request: if online, send immediately. If offline, queue it.
   * @returns {{ offline: boolean, queueId?: number, response?: any }}
   */
  async smartRequest(action) {
    if (navigator.onLine) {
      try {
        const response = await this._processAction(action);
        return { offline: false, response };
      } catch (err) {
        // Network error → queue it
        if (!err.response) {
          const queueId = await offlineStorage.enqueueAction(action);
          return { offline: true, queueId };
        }
        throw err; // Real server error (4xx/5xx) – don't queue
      }
    } else {
      const queueId = await offlineStorage.enqueueAction(action);
      return { offline: true, queueId };
    }
  }
}

// Singleton
const syncEngine = new SyncEngine();

export default syncEngine;
