import { authApi, tabLockApi } from '../services/api';
import { readAuthFromChromeStorage, syncLocksToChromeStorage } from '../utils/chromeStorage';

// Basic install listener
chrome.runtime.onInstalled.addListener(() => {
  console.log('SecureShield installed');
});

// Listen for messages from Content Script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'VERIFY_PIN') {
    handleVerifyPin(message.pin)
      .then((isValid) => sendResponse({ success: isValid }))
      .catch((err) => sendResponse({ success: false, error: err.message }));
    
    // Keep the channel open for the asynchronous response
    return true; 
  }
  
  if (message.type === 'UNLOCK_SITE') {
    handleUnlockSite(message.lockId, message.pin)
      .then(() => sendResponse({ success: true }))
      .catch((err) => sendResponse({ success: false, error: err.message }));
    
    return true;
  }
});

async function handleVerifyPin(pin: string): Promise<boolean> {
  const auth = await readAuthFromChromeStorage();
  
  if (!auth || !auth.token) {
    console.warn('VERIFY_PIN failed: User not authenticated');
    return false;
  }

  try {
    // Verify the PIN against the server using the stored token
    await authApi.verifyPin(auth.token, { pin });
    return true;
  } catch (error) {
    console.error('PIN Verification failed:', error);
    return false;
  }
}

async function handleUnlockSite(lockId: number, pin: string): Promise<void> {
  const auth = await readAuthFromChromeStorage();
  
  if (!auth || !auth.token) {
    throw new Error('User not authenticated');
  }

  try {
    console.log(`[SecureShield] Unlocking site - Lock ID: ${lockId}`);
    
    // 1. Call API to update database status to 'unlocked'
    const response = await tabLockApi.unlock(auth.token, lockId, pin);
    console.log('[SecureShield] API unlock successful:', response.lock);
    
    // 2. Fetch all locks and sync to chrome.storage (removes unlocked from cache)
    const allLocks = await tabLockApi.list(auth.token);
    await syncLocksToChromeStorage(allLocks.locks);
    console.log('[SecureShield] Chrome storage synced - unlocked site removed from cache');
    
    // Success - site is now unlocked
  } catch (error) {
    console.error('[SecureShield] Unlock failed:', error);
    throw error;
  }
}

export {};