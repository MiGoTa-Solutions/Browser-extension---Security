import { authApi, tabLockApi } from '../services/api';
import { readAuthFromChromeStorage, syncLocksToChromeStorage, readLocksFromChromeStorage } from '../utils/chromeStorage';

// --- Setup & Install ---

chrome.runtime.onInstalled.addListener(async () => {
  console.log('[Background] SecureShield Installed');
  await runLockSync();
  // Setup periodic sync every 5 minutes
  chrome.alarms.create('syncLocks', { periodInMinutes: 5 });
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'syncLocks') {
    runLockSync();
  }
});

// --- Message Handling ---

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Log every message for debugging
  console.log('[Background] Message received:', message.type);

  if (message.type === 'PING') {
    sendResponse({ pong: true });
    return false;
  }

  if (message.type === 'VERIFY_PIN') {
    handleVerifyPin(message.pin)
      .then((res) => sendResponse(res))
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true; // Async response required
  }

  if (message.type === 'UNLOCK_SITE') {
    console.log(`[Background] Processing UNLOCK_SITE for Lock ID: ${message.lockId}`);
    handleUnlockSite(message.lockId, message.pin)
      .then(() => {
        console.log('[Background] Unlock successful, sending response');
        sendResponse({ success: true });
      })
      .catch((err) => {
        console.error('[Background] Unlock failed:', err);
        sendResponse({ success: false, error: err.message });
      });
    return true; // Async response required
  }
  
  return false;
});

// --- Navigation Listener (The "Locking" Logic) ---

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    const locks = await readLocksFromChromeStorage();
    const hostname = new URL(tab.url).hostname.replace(/^www\./, '');
    
    if (locks[hostname]) {
      console.log(`[Background] 🔒 Navigation check: Locked site detected (${hostname})`);
    }
  }
});

// --- Action Handlers ---

async function runLockSync() {
  try {
    const auth = await readAuthFromChromeStorage();
    if (!auth || !auth.token) return;
    
    const response = await tabLockApi.list(auth.token);
    await syncLocksToChromeStorage(response.locks);
    console.log(`[Background] ✅ Synced ${response.locks.length} locks from database`);
  } catch (error) {
    console.error('[Background] Sync failed:', error);
  }
}

async function handleVerifyPin(pin: string) {
  const auth = await readAuthFromChromeStorage();
  if (!auth?.token) throw new Error('Not authenticated');
  
  await authApi.verifyPin(auth.token, { pin });
  return { success: true };
}

async function handleUnlockSite(lockId: number, pin: string) {
  const auth = await readAuthFromChromeStorage();
  if (!auth?.token) throw new Error('Not authenticated');

  // 1. Call API to unlock
  await tabLockApi.unlock(auth.token, lockId, pin);
  
  // 2. Fetch updated list immediately
  const listResponse = await tabLockApi.list(auth.token);
  
  // 3. Update Chrome Storage (This removes the lock from the local cache)
  await syncLocksToChromeStorage(listResponse.locks);
}

export {};