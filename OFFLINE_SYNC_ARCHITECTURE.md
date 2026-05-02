# Offline-First Architecture – LaxmiPowerTech

## Overview
Complete offline-first system for Supervisor and Labour dashboards. Users can work without internet (except login) and all data syncs automatically when connectivity is restored.

---

## Files Added / Modified

### New Files
| File | Purpose |
|------|---------|
| `src/utils/syncEngine.js` | Core sync engine – auto-sync on reconnect, manual trigger, retry logic, event system |
| `src/hooks/useNetworkStatus.js` | React hook – real-time online/offline status, pending count, sync trigger |
| `src/components/OfflineBanner.jsx` | Floating UI – offline warning, pending count badge, syncing animation, success/fail toast |
| `src/pages/ConnectServer.jsx` | Full page – manual sync trigger, queue inspector, connection status, cleanup tools |

### Modified Files
| File | What Changed |
|------|-------------|
| `src/utils/offlineStorage.js` | **Complete rewrite** – IndexedDB v2 with generic `actionQueue` store, `cachedData` store, helpers for enqueue/dequeue/mark-synced/mark-failed/cleanup |
| `public/service-worker.js` | **Upgraded** – separate static + API caches, network-first for API GET with cache fallback, cacheable API pattern list |
| `src/App.jsx` | Added: `syncEngine.init()`, `<OfflineBanner />`, lazy import + `/connect-server` route |
| `src/pages/LabourDashboard.jsx` | Added "Connect to Server" card (purple, full-width) for Labour users |
| `src/pages/SupervisorDashboard.jsx` | Already had "Connect to Server" card → now routes to the new `ConnectServer` page |

---

## Architecture

### Layer 1: IndexedDB Storage (`offlineStorage.js`)
- **`actionQueue` store** – generic FIFO queue for any offline action (create/update/delete)
  - Fields: `actionType`, `module`, `endpoint`, `method`, `payload`, `meta`, `timestamp`, `synced`, `retries`, `lastError`
  - Indexed by: `timestamp`, `synced`, `module`
- **`cachedData` store** – caches API GET responses for offline reads
  - Fields: `cacheKey`, `module`, `data`, `cachedAt`
- **`taskTemplates` store** – preserved from v1

### Layer 2: Sync Engine (`syncEngine.js`)
- Singleton, initialized once in `App.jsx`
- **Auto-sync**: listens for browser `online` event → processes queue
- **Manual sync**: `syncEngine.syncAll()` – callable from ConnectServer page
- **Smart request**: `syncEngine.smartRequest(action)` – sends immediately if online, queues if offline
- **Sequential processing**: actions processed in FIFO order (by timestamp)
- **Retry logic**: max 3 retries per action, tracks failure reason
- **Post-sync cleanup**: automatically removes synced entries from IndexedDB
- **Event system**: `subscribe()` → emits `syncStart`, `syncEnd`, `syncProgress`, `syncError`, `online`, `offline`

### Layer 3: Service Worker (`service-worker.js`)
- **Static cache** (`lpt-static-v2`): app shell, JS, CSS, images → cache-first
- **API cache** (`lpt-api-v2`): GET responses for `/projects`, `/branches`, `/tasks`, `/material/catalog`, `/attendance` → network-first with cache fallback
- **Navigation**: network-first, falls back to cached app shell
- Non-GET requests (POST/PUT/DELETE) are never cached → handled by action queue

### Layer 4: React Integration
- **`useNetworkStatus` hook**: provides `isOnline`, `pendingCount`, `syncing`, `lastSyncResult`, `triggerSync()`
- **`<OfflineBanner />`**: floating indicators at top of screen (auto-hides when online + no pending)
- **`<ConnectServer />`**: full-page manual sync dashboard

---

## Data Flow

```
User Action (offline)
    ↓
offlineStorage.enqueueAction({
  actionType: 'create',
  module: 'task',
  endpoint: '/tasks/admin',
  method: 'POST',
  payload: { ... }
})
    ↓
Stored in IndexedDB actionQueue
    ↓
[Device comes online / User clicks Sync]
    ↓
syncEngine.syncAll()
    ↓
Process each action sequentially (axios POST/PUT/DELETE)
    ↓
On success: markActionSynced() → clearSyncedActions()
On failure: markActionFailed() (retry up to 3x)
    ↓
Events emitted → useNetworkStatus updates UI
```

---

## How to Use in Components

### Queue an offline action:
```js
import offlineStorage from '../utils/offlineStorage';

// When user submits a form offline
await offlineStorage.enqueueAction({
  actionType: 'create',
  module: 'task',
  endpoint: '/tasks/admin',
  method: 'POST',
  payload: { project: '...', building: '...', notes: '...' }
});
```

### Smart request (auto-decides online vs offline):
```js
import syncEngine from '../utils/syncEngine';

const result = await syncEngine.smartRequest({
  actionType: 'create',
  module: 'attendance',
  endpoint: '/attendance/punch',
  method: 'POST',
  payload: { punchType: 'in', lat: 19.07, lng: 72.87 }
});

if (result.offline) {
  toast.info('Saved offline – will sync when connected');
} else {
  toast.success('Attendance marked!');
}
```

### Check network status in any component:
```js
import useNetworkStatus from '../hooks/useNetworkStatus';

function MyComponent() {
  const { isOnline, pendingCount, syncing, triggerSync } = useNetworkStatus();
  // ...
}
```

---

## Constraints
- **Login REQUIRES internet** – auth token validation cannot be done offline
- **After login → full offline support** – token stored in localStorage
- **No duplicate uploads** – actions are dequeued only after successful sync
- **Order preserved** – FIFO queue ensures correct operation sequence
- **Role-based logic intact** – offline actions include user role in meta; backend validates on sync
- **Existing workflows unchanged** – all current features continue to work; offline is additive

---

## Testing Checklist
- [ ] Login works only with internet
- [ ] Supervisor dashboard loads offline (after initial load)
- [ ] Labour dashboard loads offline (after initial load)
- [ ] Offline banner appears when disconnected
- [ ] Actions queued show pending count in banner
- [ ] Auto-sync triggers when connectivity returns
- [ ] Manual sync works from Connect to Server page
- [ ] Synced actions removed from IndexedDB
- [ ] Failed actions show retry count
- [ ] No duplicate API calls after sync
- [ ] Service worker caches API GET responses
- [ ] Cached API data served when offline
