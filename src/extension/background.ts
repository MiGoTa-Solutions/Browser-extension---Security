import { authApi, tabLockApi } from '../services/api';
import { readAuthFromChromeStorage, syncLocksToChromeStorage, readLocksFromChromeStorage } from '../utils/chromeStorage';

chrome.runtime.onInstalled.addListener(async () => {
  console.log('[Background] Installed. Syncing...');
  await runLockSync();
  chrome.alarms.create('syncLocks', { periodInMinutes: 5 });
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'syncLocks') runLockSync();
});

// Sync when user switches tabs (keeps state fresh)
chrome.tabs.onActivated.addListener(() => {
  runLockSync();
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'PING') {
    sendResponse({ pong: true });
    return false;
  }

  if (message.type === 'UNLOCK_SITE') {
    console.log(`[Background] Request to unlock: ${message.lockId}`);
    handleUnlockSite(message.lockId, message.pin)
      .then(() => sendResponse({ success: true }))
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true; // Async response
  }
  return false;
});

async function runLockSync() {
  try {
    const auth = await readAuthFromChromeStorage();
    if (!auth || !auth.token) return;
    
    // Get fresh list from server
    const response = await tabLockApi.list(auth.token);
    // Update local Chrome storage
    await syncLocksToChromeStorage(response.locks);
    console.log(`[Background] Synced ${response.locks.length} locks`);
  } catch (error) {
    console.error('[Background] Sync failed:', error);
  }
}

async function handleUnlockSite(lockId: number, pin: string) {
  const auth = await readAuthFromChromeStorage();
  if (!auth?.token) throw new Error('Not authenticated');

  // 1. Update Database (Server)
  await tabLockApi.unlock(auth.token, lockId, pin);
  
  // 2. Refresh Local Cache Immediately (Extension)
  await runLockSync();
}