// src/extension/background.ts
import { authApi, tabLockApi } from '../services/api';
import { readAuthFromChromeStorage, syncLocksToChromeStorage, readLocksFromChromeStorage } from '../utils/chromeStorage';

// --- SETUP ---
chrome.runtime.onInstalled.addListener(async () => {
  await runLockSync();
  // Create a backup alarm every 5 min
  chrome.alarms.create('syncLocks', { periodInMinutes: 5 });
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'syncLocks') runLockSync();
});

// Also sync when user switches tabs to ensure fresh state
chrome.tabs.onActivated.addListener(() => {
  runLockSync();
});

// --- MESSAGE HANDLER ---
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'PING') {
    sendResponse({ pong: true });
    return false;
  }

  if (message.type === 'UNLOCK_SITE') {
    handleUnlockSite(message.lockId, message.pin)
      .then(() => sendResponse({ success: true }))
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true; // Indicates async response
  }

  return false;
});

// --- CORE LOGIC ---

async function runLockSync() {
  try {
    const auth = await readAuthFromChromeStorage();
    if (!auth || !auth.token) return;
    
    // Fetch fresh locks from Server
    const response = await tabLockApi.list(auth.token);
    
    // Update Chrome Local Storage
    await syncLocksToChromeStorage(response.locks);
    console.log(`[Background] Synced ${response.locks.length} locks`);
  } catch (error) {
    console.error('[Background] Sync failed:', error);
  }
}

async function handleUnlockSite(lockId: number, pin: string) {
  const auth = await readAuthFromChromeStorage();
  if (!auth?.token) throw new Error('Not authenticated');

  // 1. Call API to update Database (Server-side)
  // This changes status to 'unlocked' in MySQL
  await tabLockApi.unlock(auth.token, lockId, pin);
  
  // 2. IMMEDIATE SYNC (Critical)
  // Fetch the new list (which will exclude the newly unlocked site)
  // and update chrome.storage immediately.
  await runLockSync();
}