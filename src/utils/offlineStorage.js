// Offline Storage Utility using IndexedDB
// Generic action queue + cached data + task templates
// Supports: create, update, delete actions for any module (tasks, attendance, material, etc.)

const DB_NAME = 'LaxmiPowerTechDB';
const DB_VERSION = 4;
const ACTION_QUEUE_STORE = 'actionQueue';
const CACHE_STORE = 'cachedData';
const TEMPLATE_STORE = 'taskTemplates';

/**
 * Lifecycle of a queued action, stored in the `synced` field.
 *
 * PENDING → SYNCED  the server accepted it; the entry is cleaned up afterwards
 * PENDING → FAILED  it can never succeed (validation error) or it ran out of
 *                   retries. A FAILED entry is never retried automatically —
 *                   it waits on the Connect to Server screen for the user to
 *                   retry or discard it, so the data is visible rather than
 *                   silently dropped.
 *
 * The field is kept named `synced` (rather than `status`) because it backs an
 * existing index; only the set of values it can hold has grown.
 */
export const ACTION_STATE = {
  PENDING: 0,
  SYNCED: 1,
  FAILED: 2,
};

/** UUID for server-side de-duplication of replayed actions. */
function makeClientId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // Fallback for older WebViews without crypto.randomUUID
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

class OfflineStorage {
  constructor() {
    this.db = null;
    this._initPromise = null;
  }

  // Initialize IndexedDB (singleton promise to avoid race conditions)
  async init() {
    if (this.db) return this.db;
    if (this._initPromise) return this._initPromise;

    this._initPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        this._initPromise = null;
        reject(request.error);
      };
      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        const oldVersion = event.oldVersion;

        // Migrate: delete old v1 stores if they exist
        if (db.objectStoreNames.contains('offlineTasks')) {
          db.deleteObjectStore('offlineTasks');
        }

        // Action queue – ordered by timestamp for sequential sync
        if (!db.objectStoreNames.contains(ACTION_QUEUE_STORE)) {
          const qs = db.createObjectStore(ACTION_QUEUE_STORE, {
            keyPath: 'id',
            autoIncrement: true
          });
          qs.createIndex('timestamp', 'timestamp', { unique: false });
          qs.createIndex('synced', 'synced', { unique: false });
          qs.createIndex('module', 'module', { unique: false });
        }

        // v2→v3 migration: convert boolean synced to integer 0/1
        if (oldVersion === 2 && db.objectStoreNames.contains(ACTION_QUEUE_STORE)) {
          const tx = event.target.transaction;
          const store = tx.objectStore(ACTION_QUEUE_STORE);
          store.openCursor().onsuccess = (e) => {
            const cursor = e.target.result;
            if (cursor) {
              const entry = cursor.value;
              if (typeof entry.synced === 'boolean') {
                entry.synced = entry.synced ? 1 : 0;
                cursor.update(entry);
              }
              cursor.continue();
            }
          };
        }

        // →v4 migration: backfill the fields the retry/dedup logic depends on,
        // so actions queued by an older build still sync correctly.
        if (oldVersion > 0 && oldVersion < 4 && db.objectStoreNames.contains(ACTION_QUEUE_STORE)) {
          const tx = event.target.transaction;
          const store = tx.objectStore(ACTION_QUEUE_STORE);
          store.openCursor().onsuccess = (e) => {
            const cursor = e.target.result;
            if (cursor) {
              const entry = cursor.value;
              let changed = false;
              if (!entry.clientId) {
                entry.clientId = makeClientId();
                changed = true;
              }
              if (typeof entry.nextAttemptAt !== 'number') {
                entry.nextAttemptAt = 0;
                changed = true;
              }
              if (changed) cursor.update(entry);
              cursor.continue();
            }
          };
        }

        // Cached API responses – keyed by a string cacheKey
        if (!db.objectStoreNames.contains(CACHE_STORE)) {
          const cs = db.createObjectStore(CACHE_STORE, { keyPath: 'cacheKey' });
          cs.createIndex('module', 'module', { unique: false });
          cs.createIndex('cachedAt', 'cachedAt', { unique: false });
        }

        // Task templates (unchanged from v1)
        if (!db.objectStoreNames.contains(TEMPLATE_STORE)) {
          const ts = db.createObjectStore(TEMPLATE_STORE, {
            keyPath: 'id',
            autoIncrement: true
          });
          ts.createIndex('name', 'name', { unique: false });
        }
      };
    });

    return this._initPromise;
  }

  // ─── helpers ───
  async _getStore(storeName, mode = 'readonly') {
    if (!this.db) await this.init();
    const tx = this.db.transaction([storeName], mode);
    return tx.objectStore(storeName);
  }

  _req(store, method, ...args) {
    return new Promise((resolve, reject) => {
      const r = store[method](...args);
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
  }

  /**
   * Read an entry, mutate it, write it back — within one transaction.
   *
   * Only IndexedDB requests may be awaited inside `mutate`: awaiting anything
   * else yields to the macrotask queue and the transaction auto-commits,
   * making the write throw TransactionInactiveError.
   */
  async _updateAction(id, mutate) {
    const store = await this._getStore(ACTION_QUEUE_STORE, 'readwrite');
    const entry = await this._req(store, 'get', id);
    if (!entry) return null;
    const updated = mutate(entry) || entry;
    await this._req(store, 'put', updated);
    return updated;
  }

  // ═══════════════════════════════════════════════
  // ACTION QUEUE – generic offline action storage
  // ═══════════════════════════════════════════════

  /**
   * Enqueue an offline action.
   *
   * The payload is written into IndexedDB by structured clone, not JSON, so a
   * File/Blob inside `payload.fields` survives intact — that is how offline
   * photo uploads keep their image.
   *
   * @param {Object} action
   * @param {string} action.actionType  – 'create' | 'update' | 'delete'
   * @param {string} action.module      – 'task' | 'attendance' | 'material' | 'leave' | 'reimbursement' | …
   * @param {string} action.endpoint    – API endpoint path, e.g. '/tasks/admin'
   * @param {string} action.method      – HTTP method: 'POST' | 'PUT' | 'DELETE'
   * @param {Object|null} action.payload – request body; either a plain object or
   *                                       { __multipart: true, fields: [[key, value], …] }
   * @param {Object|null} action.meta   – optional metadata (user info, branch, etc.)
   * @param {string} [action.label]     – human-readable description for the queue UI
   * @returns {number} generated id of the queued action
   */
  async enqueueAction(action) {
    const store = await this._getStore(ACTION_QUEUE_STORE, 'readwrite');
    const now = Date.now();
    const entry = {
      ...action,
      // Sent to the server so a replay is recognised as the same action.
      clientId: action.clientId || makeClientId(),
      // When the user actually performed this, so the record is not stamped
      // with the (possibly much later) time it managed to sync.
      capturedAt: action.capturedAt || new Date(now).toISOString(),
      timestamp: now,
      synced: ACTION_STATE.PENDING,
      retries: 0,
      lastError: null,
      nextAttemptAt: 0
    };
    return this._req(store, 'add', entry);
  }

  // Get all pending (unsynced) actions ordered by timestamp
  async getPendingActions() {
    const store = await this._getStore(ACTION_QUEUE_STORE);
    const idx = store.index('synced');
    const all = await this._req(idx, 'getAll', IDBKeyRange.only(ACTION_STATE.PENDING));
    return all.sort((a, b) => a.timestamp - b.timestamp);
  }

  // Get pending count (fast)
  async getPendingCount() {
    const store = await this._getStore(ACTION_QUEUE_STORE);
    const idx = store.index('synced');
    return this._req(idx, 'count', IDBKeyRange.only(ACTION_STATE.PENDING));
  }

  // Actions that gave up – kept for the user to retry or discard
  async getFailedActions() {
    const store = await this._getStore(ACTION_QUEUE_STORE);
    const idx = store.index('synced');
    const all = await this._req(idx, 'getAll', IDBKeyRange.only(ACTION_STATE.FAILED));
    return all.sort((a, b) => a.timestamp - b.timestamp);
  }

  async getFailedCount() {
    const store = await this._getStore(ACTION_QUEUE_STORE);
    const idx = store.index('synced');
    return this._req(idx, 'count', IDBKeyRange.only(ACTION_STATE.FAILED));
  }

  // Mark one action as synced
  async markActionSynced(id) {
    const updated = await this._updateAction(id, (entry) => {
      entry.synced = ACTION_STATE.SYNCED;
      entry.syncedAt = Date.now();
    });
    return Boolean(updated);
  }

  /**
   * Record a failed attempt.
   *
   * @param {number} id
   * @param {Error} error
   * @param {Object} opts
   * @param {boolean} opts.permanent   – give up now regardless of retries left
   * @param {number}  opts.retryAfterMs – wait this long before the next attempt
   * @returns {{ state: number, retries: number } | null}
   */
  async markActionFailed(id, error, { permanent = false, retryAfterMs = 0 } = {}) {
    const updated = await this._updateAction(id, (entry) => {
      entry.retries = (entry.retries || 0) + 1;
      entry.lastError = error?.message || String(error);
      entry.lastFailedAt = Date.now();
      if (permanent) {
        entry.synced = ACTION_STATE.FAILED;
        entry.nextAttemptAt = 0;
      } else {
        entry.nextAttemptAt = Date.now() + retryAfterMs;
      }
    });
    if (!updated) return null;
    return { state: updated.synced, retries: updated.retries };
  }

  /** Move a failed action back into the queue for another attempt. */
  async retryAction(id) {
    const updated = await this._updateAction(id, (entry) => {
      entry.synced = ACTION_STATE.PENDING;
      entry.retries = 0;
      entry.lastError = null;
      entry.nextAttemptAt = 0;
    });
    return Boolean(updated);
  }

  /** Move every failed action back into the queue. Returns how many. */
  async retryAllFailed() {
    const failed = await this.getFailedActions();
    for (const entry of failed) {
      await this.retryAction(entry.id);
    }
    return failed.length;
  }

  // Remove a single action from queue
  async removeAction(id) {
    const store = await this._getStore(ACTION_QUEUE_STORE, 'readwrite');
    return this._req(store, 'delete', id);
  }

  // Remove all synced actions (post-sync cleanup)
  async clearSyncedActions() {
    const store = await this._getStore(ACTION_QUEUE_STORE, 'readwrite');
    const idx = store.index('synced');
    const synced = await this._req(idx, 'getAll', IDBKeyRange.only(ACTION_STATE.SYNCED));
    let count = 0;
    for (const entry of synced) {
      await this._req(store, 'delete', entry.id);
      count++;
    }
    return count;
  }

  /** Discard failed actions the user has chosen to give up on. */
  async clearFailedActions() {
    const store = await this._getStore(ACTION_QUEUE_STORE, 'readwrite');
    const idx = store.index('synced');
    const failed = await this._req(idx, 'getAll', IDBKeyRange.only(ACTION_STATE.FAILED));
    let count = 0;
    for (const entry of failed) {
      await this._req(store, 'delete', entry.id);
      count++;
    }
    return count;
  }

  // ═══════════════════════════════════════════════
  // CACHE STORE – cache API responses for offline
  // ═══════════════════════════════════════════════

  /**
   * Store or update a cached API response.
   * @param {string} cacheKey  – unique key, e.g. 'tasks_list' or 'projects_hierarchy_<id>'
   * @param {string} module    – 'task' | 'attendance' | 'material' | …
   * @param {*} data           – the data to cache (must be cloneable)
   */
  async cacheData(cacheKey, module, data) {
    const store = await this._getStore(CACHE_STORE, 'readwrite');
    await this._req(store, 'put', {
      cacheKey,
      module,
      data,
      cachedAt: Date.now()
    });
  }

  // Retrieve cached data by key
  async getCachedData(cacheKey) {
    const store = await this._getStore(CACHE_STORE);
    const entry = await this._req(store, 'get', cacheKey);
    return entry || null;
  }

  // Remove a single cache entry
  async removeCachedData(cacheKey) {
    const store = await this._getStore(CACHE_STORE, 'readwrite');
    return this._req(store, 'delete', cacheKey);
  }

  // Clear all cache for a module
  async clearModuleCache(module) {
    const store = await this._getStore(CACHE_STORE, 'readwrite');
    const idx = store.index('module');
    const entries = await this._req(idx, 'getAll', module);
    for (const e of entries) {
      await this._req(store, 'delete', e.cacheKey);
    }
    return entries.length;
  }

  // Clear all cached data
  async clearAllCache() {
    const store = await this._getStore(CACHE_STORE, 'readwrite');
    return this._req(store, 'clear');
  }

  // ═══════════════════════════════════════════════
  // TASK TEMPLATES (unchanged API)
  // ═══════════════════════════════════════════════

  async saveTemplate(template) {
    const store = await this._getStore(TEMPLATE_STORE, 'readwrite');
    return this._req(store, 'add', { ...template, createdAt: Date.now() });
  }

  async getTemplates() {
    const store = await this._getStore(TEMPLATE_STORE);
    return this._req(store, 'getAll');
  }

  async deleteTemplate(templateId) {
    const store = await this._getStore(TEMPLATE_STORE, 'readwrite');
    return this._req(store, 'delete', templateId);
  }

  // ═══════════════════════════════════════════════
  // CONNECTIVITY HELPERS
  // ═══════════════════════════════════════════════

  isOnline() {
    return navigator.onLine;
  }

  getConnectionStatus() {
    return { online: navigator.onLine, timestamp: Date.now() };
  }
}

// Singleton
const offlineStorage = new OfflineStorage();

export default offlineStorage;
