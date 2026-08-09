// src/utils/syncAttendance.js
//
// DEPRECATED — this module used to be a second, parallel offline queue for
// attendance punches, kept in localStorage. It has been replaced by the
// IndexedDB queue in offlineStorage.js + syncEngine.js, which every write now
// goes through. All that remains here is the one-time migration that clears out
// data left behind by the old implementation.
//
// Why the old data cannot simply be replayed:
//
//   'offlinePunches'    — written by SelfieCaptureScreen. The entry held the
//                         selfie as a File inside a JSON.stringify'd array, and
//                         File does not survive JSON serialisation; every stored
//                         selfie is an empty object. The backend rejects a punch
//                         with no selfie, so replaying these would only produce
//                         failures.
//   'offlinePunchQueue' — written by PunchInScreen when the user tapped Punch
//                         while already offline, before the selfie step. Nothing
//                         ever read this key back, and the entries never had a
//                         selfie to begin with.
//
// So instead of pretending these can sync, the migration preserves them in
// IndexedDB for reference, clears the localStorage keys, and reports how many
// were found so the user can be told to re-punch.

import offlineStorage from './offlineStorage';

const LEGACY_SELFIE_KEY = 'offlinePunches';
const LEGACY_PUNCH_KEY = 'offlinePunchQueue';
const ARCHIVE_CACHE_KEY = 'legacy_offline_punches';
const MIGRATION_DONE_KEY = 'lpt_legacy_punch_migration_done';

const readLegacy = (key) => {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

/**
 * Drain the two legacy localStorage punch queues. Safe to call on every start —
 * it does its work once and then short-circuits.
 *
 * @returns {Promise<{ unrecoverable: number }>} how many old punches were found
 *          that cannot be synced, so the caller can warn the user.
 */
export async function migrateLegacyOfflinePunches() {
  if (localStorage.getItem(MIGRATION_DONE_KEY) === 'true') {
    return { unrecoverable: 0 };
  }

  const fromSelfieScreen = readLegacy(LEGACY_SELFIE_KEY);
  const fromPunchScreen = readLegacy(LEGACY_PUNCH_KEY);
  const total = fromSelfieScreen.length + fromPunchScreen.length;

  if (total > 0) {
    // Keep a copy rather than deleting outright – if anyone needs to reconcile
    // attendance by hand later, the timestamps and locations are still here.
    try {
      await offlineStorage.init();
      await offlineStorage.cacheData(ARCHIVE_CACHE_KEY, 'attendance', {
        archivedAt: new Date().toISOString(),
        reason: 'Legacy offline punches – no usable selfie, cannot be replayed',
        fromSelfieScreen,
        fromPunchScreen,
      });
    } catch (err) {
      // Archiving is best-effort; failing it must not block the cleanup.
      console.warn('Could not archive legacy offline punches:', err);
    }
  }

  localStorage.removeItem(LEGACY_SELFIE_KEY);
  localStorage.removeItem(LEGACY_PUNCH_KEY);
  localStorage.setItem(MIGRATION_DONE_KEY, 'true');

  if (total > 0) {
    console.warn(`⚠️ Discarded ${total} legacy offline punch(es) that had no recoverable selfie`);
  }

  return { unrecoverable: total };
}

/**
 * @deprecated Attendance now syncs through syncEngine like everything else.
 * Retained only so older screens that still import it keep working; it just
 * runs the one-time migration.
 */
export const syncOfflineAttendance = migrateLegacyOfflinePunches;
