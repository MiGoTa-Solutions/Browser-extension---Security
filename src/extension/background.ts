import { authApi, tabLockApi } from '../services/api';
import { readAuthFromChromeStorage, syncLocksToChromeStorage, readLocksFromChromeStorage } from '../utils/chromeStorage';

// ==================== SETUP ====================

chrome.runtime.onInstalled.addListener(async () => {
  console.log('[Background] SecureShield Installed');
  await runLockSync();
  chrome.alarms.create('syncLocks', { periodInMinutes: 5 });
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'syncLocks') {
    runLockSync();
  }
});

// ==================== MESSAGE HANDLING ====================

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // 1. PING (Heartbeat)
  if (message.type === 'PING') {
    sendResponse({ pong: true });
    return false;
  }

  // 2. VERIFY ONLY (Does not unlock DB)
  if (message.type === 'VERIFY_PIN') {
    handleVerifyPin(message.pin)
      .then((res) => sendResponse(res))
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true; 
  }

  // 3. UNLOCK (Updates DB + Storage)
  if (message.type === 'UNLOCK_SITE') {
    console.log(`[Background] 🔓 Unlocking Site ID: ${message.lockId}`);
    handleUnlockSite(message.lockId, message.pin)
      .then(() => {
        console.log('[Background] Unlock success. Sending response.');
        sendResponse({ success: true });
      })
      .catch((err) => {
        console.error('[Background] Unlock failed:', err);
        sendResponse({ success: false, error: err.message });
      });
    return true; 
  }
  
  return false;
});

// ==================== NAVIGATION GUARD ====================

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    const locks = await readLocksFromChromeStorage();
    const hostname = new URL(tab.url).hostname.replace(/^www\./, '');
    
    if (locks[hostname]) {
      console.log(`[Background] 🔒 Locked site detected: ${hostname}`);
      // Content script handles the UI, we just log here for debugging
    }
  }
});

// ==================== LOGIC HANDLERS ====================

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

async function handleVerifyPin(pin: string) {
  const auth = await readAuthFromChromeStorage();
  if (!auth?.token) throw new Error('Not authenticated');
  
  await authApi.verifyPin(auth.token, { pin });
  return { success: true };
}

async function handleUnlockSite(lockId: number, pin: string) {
  const auth = await readAuthFromChromeStorage();
  if (!auth?.token) throw new Error('Not authenticated');

  // 1. Call API (Server DB Update)
  await tabLockApi.unlock(auth.token, lockId, pin);
  
  // 2. Get fresh list (Server -> Extension)
  const listResponse = await tabLockApi.list(auth.token);
  
  // 3. Update Storage (Extension -> Cache)
  // This is CRITICAL so that new tabs don't get locked
  await syncLocksToChromeStorage(listResponse.locks);
}

export {};