import { getAuthToken, updateLockCache } from '../utils/chromeStorage';

const API_URL = 'http://localhost:4000/api';

// --- ALARM SETUP ---
chrome.runtime.onInstalled.addListener(() => {
  console.log('[Background] Installed. Scheduling sync.');
  chrome.alarms.create('sync_pulse', { periodInMinutes: 1 });
  syncLocks();
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'sync_pulse') syncLocks();
});

// --- MESSAGE HANDLER ---
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'UNLOCK_REQUEST') {
    handleUnlock(msg.lockId, msg.pin)
      .then(res => sendResponse(res));
    return true; // Async response
  }
  
  if (msg.type === 'FORCE_SYNC') {
    syncLocks().then(() => sendResponse({ success: true }));
    return true;
  }
});

// --- CORE FUNCTIONS ---

async function syncLocks() {
  try {
    const token = await getAuthToken();
    if (!token) {
      console.log('[Background] No auth token. Skipping sync.');
      return;
    }

    const res = await fetch(`${API_URL}/locks`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const data = await res.json();
    if (data.success && Array.isArray(data.locks)) {
      const result = await updateLockCache(data.locks);
      console.log(`[Background] Synced successfully. Active rules: ${result.domainCount}`);
    }
  } catch (err) {
    console.error('[Background] Sync failed:', err);
  }
}

async function handleUnlock(lockId: number, pin: string) {
  try {
    const token = await getAuthToken();
    if (!token) return { success: false, error: 'Not authenticated' };

    const res = await fetch(`${API_URL}/locks/${lockId}/unlock`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ pin })
    });

    const data = await res.json();
    
    if (data.success) {
      // Immediately sync to remove the lock from cache
      await syncLocks(); 
      return { success: true };
    } else {
      return { success: false, error: data.error || 'Unlock failed' };
    }
  } catch (err) {
    return { success: false, error: 'Connection error' };
  }
}