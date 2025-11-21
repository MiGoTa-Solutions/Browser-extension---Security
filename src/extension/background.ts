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

chrome.tabs.onActivated.addListener(() => {
  runLockSync();
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // 1. PING
  if (message.type === 'PING') {
    sendResponse({ pong: true });
    return false;
  }

  // 2. UNLOCK
  if (message.type === 'UNLOCK_SITE') {
    handleUnlockSite(message.lockId, message.pin)
      .then(() => sendResponse({ success: true }))
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true; 
  }

  // 3. CREATE LOCK (Quick Lock from Floating Button)
  if (message.type === 'CREATE_LOCK') {
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

  // Use first tab title for lock name
  const name = `Quick Lock: ${new URL(tabs[0].url).hostname}`;
  
  await tabLockApi.create(auth.token, {
    name,
    isGroup: false,
    tabs,
    pin
  });
  
  await runLockSync();
}