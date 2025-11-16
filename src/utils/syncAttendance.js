// src/utils/syncAttendance.js
import axios from 'axios';

export const OFFLINE_KEY = 'offlinePunches';

export const storeOfflinePunch = (data) => {
  const existing = JSON.parse(localStorage.getItem(OFFLINE_KEY)) || [];
  existing.push({
    ...data,
    timestamp: new Date().toISOString(),
  });
  localStorage.setItem(OFFLINE_KEY, JSON.stringify(existing));
};

export const syncOfflineAttendance = async () => {
  if (!navigator.onLine) return;

  const stored = JSON.parse(localStorage.getItem(OFFLINE_KEY)) || [];
  if (stored.length === 0) return;

  const token = localStorage.getItem('token');

  for (let entry of stored) {
    try {
      const formData = new FormData();
      formData.append('selfie', entry.selfie);
      formData.append('punchType', entry.punchType);
      formData.append('lat', entry.lat);
      formData.append('lng', entry.lng);

      await axios.post('/attendance/punch', formData, {
        headers: { Authorization: `Bearer ${token}` },
      });

      console.log(`✅ Synced punch: ${entry.punchType}`);
    } catch (err) {
      console.error('❌ Sync failed for one punch:', err);
      return; // stop syncing if one fails
    }
  }

  localStorage.removeItem(OFFLINE_KEY);
};
