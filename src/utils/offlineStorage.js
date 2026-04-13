// Offline Storage Utility using IndexedDB
// Handles offline task queue and sync management

const DB_NAME = 'LaxmiPowerTechDB';
const DB_VERSION = 1;
const TASK_STORE = 'offlineTasks';
const TEMPLATE_STORE = 'taskTemplates';

class OfflineStorage {
  constructor() {
    this.db = null;
  }

  // Initialize IndexedDB
  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // Create offline tasks store
        if (!db.objectStoreNames.contains(TASK_STORE)) {
          const taskStore = db.createObjectStore(TASK_STORE, { 
            keyPath: 'id', 
            autoIncrement: true 
          });
          taskStore.createIndex('timestamp', 'timestamp', { unique: false });
          taskStore.createIndex('synced', 'synced', { unique: false });
        }

        // Create task templates store
        if (!db.objectStoreNames.contains(TEMPLATE_STORE)) {
          const templateStore = db.createObjectStore(TEMPLATE_STORE, { 
            keyPath: 'id', 
            autoIncrement: true 
          });
          templateStore.createIndex('name', 'name', { unique: false });
        }
      };
    });
  }

  // Add task to offline queue
  async addOfflineTask(taskData) {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([TASK_STORE], 'readwrite');
      const store = transaction.objectStore(TASK_STORE);

      const task = {
        ...taskData,
        timestamp: Date.now(),
        synced: false
      };

      const request = store.add(task);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // Get all unsynced tasks
  async getUnsyncedTasks() {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([TASK_STORE], 'readonly');
      const store = transaction.objectStore(TASK_STORE);
      const index = store.index('synced');
      const request = index.getAll(false);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // Mark task as synced
  async markTaskSynced(taskId) {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([TASK_STORE], 'readwrite');
      const store = transaction.objectStore(TASK_STORE);
      const request = store.get(taskId);

      request.onsuccess = () => {
        const task = request.result;
        if (task) {
          task.synced = true;
          task.syncedAt = Date.now();
          const updateRequest = store.put(task);
          updateRequest.onsuccess = () => resolve(true);
          updateRequest.onerror = () => reject(updateRequest.error);
        } else {
          resolve(false);
        }
      };

      request.onerror = () => reject(request.error);
    });
  }

  // Delete synced task
  async deleteTask(taskId) {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([TASK_STORE], 'readwrite');
      const store = transaction.objectStore(TASK_STORE);
      const request = store.delete(taskId);

      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    });
  }

  // Clear all synced tasks
  async clearSyncedTasks() {
    if (!this.db) await this.init();

    const tasks = await this.getUnsyncedTasks();
    const syncedTasks = tasks.filter(t => t.synced);

    for (const task of syncedTasks) {
      await this.deleteTask(task.id);
    }

    return syncedTasks.length;
  }

  // Get offline task count
  async getOfflineTaskCount() {
    const tasks = await this.getUnsyncedTasks();
    return tasks.length;
  }

  // Save task template
  async saveTemplate(template) {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([TEMPLATE_STORE], 'readwrite');
      const store = transaction.objectStore(TEMPLATE_STORE);

      const templateData = {
        ...template,
        createdAt: Date.now()
      };

      const request = store.add(templateData);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // Get all templates
  async getTemplates() {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([TEMPLATE_STORE], 'readonly');
      const store = transaction.objectStore(TEMPLATE_STORE);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // Delete template
  async deleteTemplate(templateId) {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([TEMPLATE_STORE], 'readwrite');
      const store = transaction.objectStore(TEMPLATE_STORE);
      const request = store.delete(templateId);

      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    });
  }

  // Check if online
  isOnline() {
    return navigator.onLine;
  }

  // Get connection status
  getConnectionStatus() {
    return {
      online: navigator.onLine,
      timestamp: Date.now()
    };
  }
}

// Create singleton instance
const offlineStorage = new OfflineStorage();

export default offlineStorage;
