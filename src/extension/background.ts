import { authApi, tabLockApi } from '../services/api';
import { readAuthFromChromeStorage, syncLocksToChromeStorage } from '../utils/chromeStorage';

// ==================== LOGGING UTILITY ====================

function log(category: string, message: string, ...args: unknown[]) {
  const timestamp = new Date().toLocaleTimeString();
  console.log(`[${timestamp}] [${category}] ${message}`, ...args);
}

function logError(category: string, message: string, error: unknown) {
  const timestamp = new Date().toLocaleTimeString();
  console.error(`[${timestamp}] [${category}] ❌ ${message}`);
  
  if (error instanceof Error) {
    console.error(`  → Error: ${error.message}`);
    if (error.stack) {
      console.error(`  → Stack:`, error.stack);
    }
  } else {
    console.error(`  → Details:`, error);
  }
}

// ==================== EVENT LISTENERS ====================

// Basic install listener
chrome.runtime.onInstalled.addListener(() => {
  log('Background', 'SecureShield extension installed/updated');
});

// Listen for messages from Content Script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  log('Message', `Received message type: ${message.type}`, { from: sender.tab?.url || 'popup' });
  
  if (message.type === 'VERIFY_PIN') {
    handleVerifyPin(message.pin)
      .then((isValid) => {
        log('VERIFY_PIN', `PIN verification result: ${isValid ? 'VALID' : 'INVALID'}`);
        sendResponse({ success: isValid });
      })
      .catch((err) => {
        logError('VERIFY_PIN', 'PIN verification failed', err);
        sendResponse({ success: false, error: err.message });
      });
    
    // Keep the channel open for the asynchronous response
    return true; 
  }
  
  if (message.type === 'UNLOCK_SITE') {
    log('UNLOCK_SITE', `Unlock requested for Lock ID: ${message.lockId}`);
    handleUnlockSite(message.lockId, message.pin)
      .then(() => {
        log('UNLOCK_SITE', `Successfully unlocked Lock ID: ${message.lockId}`);
        sendResponse({ success: true });
      })
      .catch((err) => {
        logError('UNLOCK_SITE', `Failed to unlock Lock ID: ${message.lockId}`, err);
        sendResponse({ success: false, error: err.message });
      });
    
    return true;
  }
  
  log('Message', `Unknown message type: ${message.type}`);
  sendResponse({ success: false, error: 'Unknown message type' });
  return false;
});

// ==================== MESSAGE HANDLERS ====================

async function handleVerifyPin(pin: string): Promise<boolean> {
  const auth = await readAuthFromChromeStorage();
  
  if (!auth || !auth.token) {
    log('VERIFY_PIN', 'Failed: User not authenticated');
    return false;
  }

  log('VERIFY_PIN', 'Verifying PIN with server...');
  
  try {
    await authApi.verifyPin(auth.token, { pin });
    log('VERIFY_PIN', 'PIN verified successfully');
    return true;
  } catch (error) {
    logError('VERIFY_PIN', 'Verification request failed', error);
    return false;
  }
}

async function handleUnlockSite(lockId: number, pin: string): Promise<void> {
  const auth = await readAuthFromChromeStorage();
  
  if (!auth || !auth.token) {
    const error = 'User not authenticated - please sign in';
    log('UNLOCK_SITE', error);
    throw new Error(error);
  }

  log('UNLOCK_SITE', `Starting unlock process for Lock ID: ${lockId}`);
  
  try {
    // Step 1: Call API to update database status to 'unlocked'
    log('UNLOCK_SITE', 'Step 1/3: Calling unlock API endpoint...');
    const response = await tabLockApi.unlock(auth.token, lockId, pin);
    log('UNLOCK_SITE', 'Step 1/3: API unlock successful', {
      lockId: response.lock.id,
      name: response.lock.name,
      status: response.lock.status,
    });
    
    // Step 2: Fetch all locks from server
    log('UNLOCK_SITE', 'Step 2/3: Fetching updated locks list...');
    const allLocks = await tabLockApi.list(auth.token);
    log('UNLOCK_SITE', `Step 2/3: Retrieved ${allLocks.locks.length} locks from server`);
    
    // Step 3: Sync to chrome.storage (removes unlocked domains from cache)
    log('UNLOCK_SITE', 'Step 3/3: Syncing to chrome.storage...');
    await syncLocksToChromeStorage(allLocks.locks);
    log('UNLOCK_SITE', '✅ Chrome storage synced - unlocked site removed from cache');
    
    log('UNLOCK_SITE', `✅ Unlock completed successfully for Lock ID: ${lockId}`);
  } catch (error) {
    // Provide context-specific error messages
    if (error instanceof Error) {
      if (error.message.includes('Incorrect PIN')) {
        logError('UNLOCK_SITE', 'Incorrect PIN provided', error);
        throw new Error('Incorrect PIN - please try again');
      } else if (error.message.includes('fetch')) {
        logError('UNLOCK_SITE', 'Network error - server may be down', error);
        throw new Error('Cannot reach server - ensure the backend is running on http://localhost:4000');
      } else if (error.message.includes('401')) {
        logError('UNLOCK_SITE', 'Authentication failed - token expired', error);
        throw new Error('Session expired - please sign in again');
      } else {
        logError('UNLOCK_SITE', 'Unexpected error during unlock', error);
        throw error;
      }
    } else {
      logError('UNLOCK_SITE', 'Unknown error type', error);
      throw new Error('Unlock failed - check console for details');
    }
  }
}

export {};