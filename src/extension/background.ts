import { authApi, tabLockApi } from '../services/api';
import { readAuthFromChromeStorage, syncLocksToChromeStorage, readLocksFromChromeStorage } from '../utils/chromeStorage';

chrome.runtime.onInstalled.addListener(async () => {
  console.log('[Background] Installed. Syncing...');
  await runLockSync();
  
  // Safety check for alarms permission
  if (chrome.alarms) {
    chrome.alarms.create('syncLocks', { periodInMinutes: 5 });
  } else {
    console.warn('[Background] "alarms" permission missing. Auto-sync disabled.');
  }
});

if (chrome.alarms) {
  chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === 'syncLocks') runLockSync();
  });
}

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
    return true; 
  }

  if (message.type === 'CREATE_LOCK') {
    console.log('[Background] Request to create lock');
    handleCreateLock(message.pin, message.tabs)
      .then(() => sendResponse({ success: true }))
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true;
  }

  return false;
});

// --- LOGIC ---

async function runLockSync() {
  try {
    const auth = await readAuthFromChromeStorage();
    if (!auth || !auth.token) return;
    
    const response = await tabLockApi.list(auth.token);
    // Log the raw response to debug "0 locks" issue
    console.log('[Background] API Response Locks:', response.locks); 
    
    await syncLocksToChromeStorage(response.locks);
    console.log(`[Background] Synced ${response.locks.length} locks`);
  } catch (error) {
    console.error('[Background] Sync failed:', error);
  }
}

async function handleUnlockSite(lockId: number, pin: string) {
  const auth = await readAuthFromChromeStorage();
  if (!auth?.token) throw new Error('Not authenticated');
  await tabLockApi.unlock(auth.token, lockId, pin);
  await runLockSync();
}

async function handleCreateLock(pin: string, tabs: any[]) {
  const auth = await readAuthFromChromeStorage();
  if (!auth?.token) throw new Error('You must be logged in');

  const name = `Quick Lock: ${new URL(tabs[0].url).hostname}`;
  
  await tabLockApi.create(auth.token, {
    name,
    isGroup: false,
    tabs,
    pin
  });
  
  await runLockSync();
}