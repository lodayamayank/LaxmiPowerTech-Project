// Offline Storage Utility using IndexedDB
// Generic action queue + cached data + task templates
// Supports: create, update, delete actions for any module (tasks, attendance, material, etc.)

const DB_NAME = 'LaxmiPowerTechDB';
const DB_VERSION = 2;
const ACTION_QUEUE_STORE = 'actionQueue';
const CACHE_STORE = 'cachedData';
const TEMPLATE_STORE = 'taskTemplates';

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

  // ═══════════════════════════════════════════════
  // ACTION QUEUE – generic offline action storage
  // ═══════════════════════════════════════════════

  /**
   * Enqueue an offline action.
   * @param {Object} action
   * @param {string} action.actionType  – 'create' | 'update' | 'delete'
   * @param {string} action.module      – 'task' | 'attendance' | 'material' | 'leave' | 'reimbursement' | …
   * @param {string} action.endpoint    – API endpoint path, e.g. '/tasks/admin'
   * @param {string} action.method      – HTTP method: 'POST' | 'PUT' | 'DELETE'
   * @param {Object|null} action.payload – JSON-serialisable request body (use null for DELETE)
   * @param {Object|null} action.meta   – optional metadata (user info, branch, etc.)
   * @returns {number} generated id of the queued action
   */
  async enqueueAction(action) {
    const store = await this._getStore(ACTION_QUEUE_STORE, 'readwrite');
    const entry = {
      ...action,
      timestamp: Date.now(),
      synced: false,
      retries: 0,
      lastError: null
    };
    return this._req(store, 'add', entry);
  }

  // Get all pending (unsynced) actions ordered by timestamp
  async getPendingActions() {
    const store = await this._getStore(ACTION_QUEUE_STORE);
    const idx = store.index('synced');
    const all = await this._req(idx, 'getAll', false);
    return all.sort((a, b) => a.timestamp - b.timestamp);
  }

  // Get pending count (fast)
  async getPendingCount() {
    const store = await this._getStore(ACTION_QUEUE_STORE);
    const idx = store.index('synced');
    return this._req(idx, 'count', false);
  }

  // Mark one action as synced
  async markActionSynced(id) {
    const store = await this._getStore(ACTION_QUEUE_STORE, 'readwrite');
    const entry = await this._req(store, 'get', id);
    if (!entry) return false;
    entry.synced = true;
    entry.syncedAt = Date.now();
    await this._req(store, 'put', entry);
    return true;
  }

  // Update retry count / last error for a failed action
  async markActionFailed(id, error) {
    const store = await this._getStore(ACTION_QUEUE_STORE, 'readwrite');
    const entry = await this._req(store, 'get', id);
    if (!entry) return false;
    entry.retries = (entry.retries || 0) + 1;
    entry.lastError = error?.message || String(error);
    await this._req(store, 'put', entry);
    return true;
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
    const synced = await this._req(idx, 'getAll', true);
    let count = 0;
    for (const entry of synced) {
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
