/// <reference types="chrome" />
/**
 * SecureShield background service worker
 * Handles tab locking/unlocking with PIN protection
 */

interface TabInfo {
  title: string;
  url: string;
}

type TabLockAction =
  | 'GET_CURRENT_TABS'
  | 'GET_ACTIVE_TAB'
  | 'LOCK_TABS'
  | 'UNLOCK_TABS'
  | 'GET_LOCKED_URLS'
  | 'VERIFY_PIN'
  | 'CHECK_IF_LOCKED'
  | 'CREATE_LOCK'
  | 'SYNC_NOW';

interface TabLockMessage {
  action: TabLockAction;
  payload?: {
    lockId?: number;
    tabs?: TabInfo[];
    pin?: string;
    url?: string;
    keepTabsOpen?: boolean;
    token?: string;
    data?: {
      name: string;
      isGroup: boolean;
      tabs: TabInfo[];
      pin: string;
    };
  };
}

interface StoredTabState {
  lockId: number;
  tabs: TabInfo[];
  tabIds: number[];
  timestamp: number;
  pin?: string;
}

interface MessageResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  locked?: boolean;
  lockId?: number;
  hasPin?: boolean;
  valid?: boolean;
}

const STORAGE_KEY_PREFIX = 'tab_lock_';
const LOCKED_URLS_KEY = 'locked_urls';
const PIN_MAP_KEY = 'lock_pin_map';

const log = (...args: unknown[]) => console.log('[SecureShield]', ...args);

// Track currently locked URLs and their lock IDs (hostname -> lockId)
let lockedUrls = new Map<string, number>();
let pinMap = new Map<number, string>(); // lockId -> pin

function normalizeUrl(url: string | undefined | null): string | null {
  if (!url) return null;
  try {
    const { hostname } = new URL(url);
    if (!hostname) return null;
    return hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return url.toLowerCase();
  }
}

// Initialize from storage on startup
chrome.storage.local.get([LOCKED_URLS_KEY, PIN_MAP_KEY], (result) => {
  log('Loading from storage:', result);
  
  if (result[LOCKED_URLS_KEY]) {
    lockedUrls = new Map();
    Object.entries(result[LOCKED_URLS_KEY] as Record<string, number | string>).forEach(([key, value]) => {
      const normalized = normalizeUrl(key);
      if (!normalized) return;
      lockedUrls.set(normalized, Number(value));
    });
    log(`Loaded ${lockedUrls.size} locked hostnames from storage`);
  } else {
    log('No locked URLs found in storage');
  }
  
  if (result[PIN_MAP_KEY]) {
    pinMap = new Map(Object.entries(result[PIN_MAP_KEY]).map(([k, v]) => [Number(k), v as string]));
    log(`Loaded ${pinMap.size} PIN mappings from storage`);
  } else {
    log('No PIN mappings found in storage');
  }
});

self.addEventListener('install', () => {
  log('Service worker installed');
});

self.addEventListener('activate', () => {
  log('Service worker activated');
});

// Proactively check new tabs BEFORE they load any content
chrome.tabs.onCreated.addListener((tab) => {
  log('New tab created:', tab.id, tab.url);
  if (tab.url && tab.id) {
    const lockId = getLockIdForUrl(tab.url);
    if (lockId !== null) {
      log('🚫 New tab created for locked URL, will inject overlay when loaded:', tab.url);
      // Don't redirect, let the content script handle it when page loads
    }
  }
});

// Monitor tab updates for URL changes
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  // Track website visit frequency (only for unlocked sites)
  if (changeInfo.status === 'complete' && tab.url) {
    const lockId = getLockIdForUrl(tab.url);
    // Only track if site is NOT locked
    if (lockId === null) {
      try {
        const url = new URL(tab.url);
        const hostname = url.hostname;
        
        // Get current frequency data
        const result = await chrome.storage.local.get(['websiteFrequency']);
        const frequencyData = result.websiteFrequency || {};
        
        // Increment visit count
        frequencyData[hostname] = (frequencyData[hostname] || 0) + 1;
        
        // Save back to storage
        await chrome.storage.local.set({ websiteFrequency: frequencyData });
        log(`Visit count for ${hostname}: ${frequencyData[hostname]}`);
      } catch (error) {
        // Ignore invalid URLs
      }
    }
  }
  
  // Check as soon as the URL changes, before the page loads
  if (changeInfo.url) {
    // First check local cache
    let lockId = getLockIdForUrl(changeInfo.url);
    
    // If not found locally, sync from database and check again
    if (lockId === null) {
      await syncLocksFromDatabase();
      lockId = getLockIdForUrl(changeInfo.url);
    }
    
    if (lockId !== null) {
      log('🚫 URL changed to locked site, will inject overlay:', changeInfo.url);
      // Content script will handle showing the overlay
    }
  }
  
  // Content script will handle overlay injection at document_start
  // No need to inject here to avoid double overlay (FLAW #3)
});

// Block navigation to locked URLs by injecting overlay
chrome.webNavigation.onBeforeNavigate.addListener(async (details) => {
  if (details.frameId !== 0) return; // Only block main frame navigation
  
  const url = details.url;
  let lockId = getLockIdForUrl(url);
  
  // If not found locally, sync from database immediately
  if (lockId === null) {
    await syncLocksFromDatabase();
    lockId = getLockIdForUrl(url);
  }
  
  log(`Navigation check: ${url} -> Lock ID: ${lockId}, Total locked URLs: ${lockedUrls.size}`);
  
  if (lockId !== null) {
    const hasPin = pinMap.has(lockId);
    const pin = hasPin ? pinMap.get(lockId) : null;
    log(`🔒 Navigation to locked URL: ${url} (Lock ID: ${lockId}, Has PIN: ${hasPin})`);
    // Content script will handle the overlay injection
  }
});

// Function injected into page to show password-protected lock overlay
function showPasswordProtectedOverlay(lockId: number, pin: string | null, url: string) {
  // Remove existing overlay if any
  const existingOverlay = document.getElementById('secureshield-password-lock-overlay');
  if (existingOverlay) return; // Already showing

  // Don't destroy page - just overlay it (FLAW #7 fix)

  const overlay = document.createElement('div');
  overlay.id = 'secureshield-password-lock-overlay';
  overlay.style.cssText = `
    position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    z-index: 2147483647; display: flex; align-items: center; justify-content: center;
    font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  `;

  const lockBox = document.createElement('div');
  lockBox.style.cssText = `
    background: rgba(255, 255, 255, 0.98); backdrop-filter: blur(20px);
    border-radius: 24px; padding: 48px; max-width: 450px; width: 90%;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3); text-align: center;
  `;

  lockBox.innerHTML = `
    <div style="font-size: 72px; margin-bottom: 24px; animation: pulse 2s ease-in-out infinite;">🔒</div>
    <h1 style="font-size: 32px; font-weight: 700; color: #1f2937; margin: 0 0 16px 0;">Website Locked</h1>
    <p style="font-size: 16px; color: #6b7280; margin: 0 0 32px 0; line-height: 1.6;">
      This website has been locked by SecureShield. Enter your PIN to unlock and access this site.
    </p>
    <div style="margin-bottom: 24px;">
      <input 
        type="password" 
        id="secureshield-unlock-pin"
        placeholder="Enter your PIN"
        maxlength="12"
        autocomplete="off"
        style="width: 100%; padding: 14px; font-size: 16px; border: 2px solid #d1d5db; border-radius: 12px; outline: none; transition: border-color 0.2s;"
      />
      <div id="secureshield-error-message" style="color: #ef4444; font-size: 14px; margin-top: 12px; min-height: 20px;"></div>
    </div>
    <button 
      id="secureshield-unlock-button"
      style="width: 100%; padding: 14px; font-size: 16px; font-weight: 600; background: linear-gradient(135deg, #2563eb, #7c3aed); color: white; border: none; border-radius: 12px; cursor: pointer; transition: transform 0.2s, box-shadow 0.2s; box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);"
    >
      Unlock Website
    </button>
    <div style="margin-top: 28px; padding-top: 24px; border-top: 1px solid #e5e7eb;">
      <p style="font-size: 13px; color: #9ca3af; margin: 0; word-break: break-all;">
        <strong style="color: #6b7280;">Locked URL:</strong><br/><span style="font-size: 12px;">${url}</span>
      </p>
    </div>
    <style>
      @keyframes pulse {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.05); }
      }
      #secureshield-unlock-pin:focus {
        border-color: #2563eb !important;
        box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1) !important;
      }
      #secureshield-unlock-button:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 20px rgba(79, 70, 229, 0.4);
      }
      #secureshield-unlock-button:active {
        transform: translateY(0);
      }
    </style>
  `;

  overlay.appendChild(lockBox);
  document.body.innerHTML = '';
  document.body.appendChild(overlay);
  
  // Prevent any scripts from modifying the overlay
  document.documentElement.style.overflow = 'hidden';
  document.body.style.pointerEvents = 'auto';

  // Focus on PIN input
  const pinInput = document.getElementById('secureshield-unlock-pin') as HTMLInputElement;
  const unlockButton = document.getElementById('secureshield-unlock-button') as HTMLButtonElement;
  const errorMessage = document.getElementById('secureshield-error-message') as HTMLDivElement;
  
  pinInput?.focus();

  const attemptUnlock = () => {
    const enteredPin = pinInput.value.trim();
    
    if (!enteredPin) {
      errorMessage.textContent = 'Please enter your PIN';
      return;
    }

    if (pin && enteredPin !== pin) {
      errorMessage.textContent = 'Incorrect PIN. Please try again.';
      pinInput.value = '';
      pinInput.focus();
      // Shake animation
      lockBox.style.animation = 'shake 0.5s';
      setTimeout(() => lockBox.style.animation = '', 500);
      return;
    }

    // PIN correct or no PIN required - unlock
    errorMessage.textContent = '';
    errorMessage.style.color = '#10b981';
    errorMessage.textContent = '✓ Unlocking...';
    unlockButton.textContent = 'Unlocking...';
    unlockButton.disabled = true;
    
    // Reload the page to show content
    setTimeout(() => {
      location.reload();
    }, 500);
  };

  unlockButton?.addEventListener('click', attemptUnlock);
  pinInput?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') attemptUnlock();
  });

  // Add shake animation
  const style = document.createElement('style');
  style.textContent = `
    @keyframes shake {
      0%, 100% { transform: translateX(0); }
      10%, 30%, 50%, 70%, 90% { transform: translateX(-8px); }
      20%, 40%, 60%, 80% { transform: translateX(8px); }
    }
  `;
  document.head.appendChild(style);
}

// Old function removed - replaced with showPasswordProtectedOverlay
function showLockOverlay(lockId: number, hasPin: boolean, url: string) {
  // Remove existing overlay if any
  const existingOverlay = document.getElementById('secureshield-lock-overlay');
  if (existingOverlay) existingOverlay.remove();

  // Clear the entire page content to prevent access
  document.body.innerHTML = '';
  document.head.innerHTML = '';

  const overlay = document.createElement('div');
  overlay.id = 'secureshield-lock-overlay';
  overlay.style.cssText = `
    position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    z-index: 2147483647; display: flex; align-items: center; justify-content: center;
    font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  `;

  const lockBox = document.createElement('div');
  lockBox.style.cssText = `
    background: rgba(255, 255, 255, 0.95); backdrop-filter: blur(20px);
    border-radius: 24px; padding: 48px; max-width: 450px; width: 90%;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3); text-align: center;
  `;

  lockBox.innerHTML = `
    <div style="font-size: 64px; margin-bottom: 24px;">🔒</div>
    <h1 style="font-size: 32px; font-weight: 700; color: #1f2937; margin: 0 0 16px 0;">Website Locked</h1>
    <p style="font-size: 16px; color: #6b7280; margin: 0 0 32px 0; line-height: 1.6;">
      This website has been locked by SecureShield Web Access Lock.
      Open the SecureShield extension and navigate to the Web Access Lock page to unlock this site with your PIN.
    </p>
    <p style="font-size: 14px; color: #9ca3af; margin: 0;">
      Click the <strong style="color: #6b7280;">SecureShield extension icon</strong> → <strong style="color: #6b7280;">Web Access Lock</strong> → Enter your PIN to unlock.
    </p>
    <div style="margin-top: 24px; padding-top: 24px; border-top: 1px solid #e5e7eb;">
      <p style="font-size: 13px; color: #9ca3af; margin: 0; word-break: break-all;">
        <strong style="color: #6b7280;">Blocked URL:</strong><br/>${url}
      </p>
    </div>
  `;

  overlay.appendChild(lockBox);
  document.body.innerHTML = '';
  document.body.appendChild(overlay);
  
  // Prevent any scripts from modifying the overlay
  document.documentElement.style.overflow = 'hidden';

  const style = document.createElement('style');
  style.textContent = `
    @keyframes shake {
      0%, 100% { transform: translateX(0); }
      10%, 30%, 50%, 70%, 90% { transform: translateX(-10px); }
      20%, 40%, 60%, 80% { transform: translateX(10px); }
    }
    * { pointer-events: none !important; }
    #secureshield-lock-overlay, #secureshield-lock-overlay * { pointer-events: auto !important; }
  `;
  document.head.appendChild(style);
}

chrome.runtime.onMessage.addListener((message: TabLockMessage, _sender, sendResponse) => {
  const { action, payload } = message;

  const respond = <T,>(promise: Promise<T>) => {
    promise
      .then((data) => sendResponse({ success: true, data } satisfies MessageResponse<T>))
      .catch((error: Error) => {
        log(`Action ${action} failed`, error.message);
        sendResponse({ success: false, error: error.message} satisfies MessageResponse);
      });
  };

  switch (action) {
    case 'GET_CURRENT_TABS':
      respond(getCurrentTabs());
      break;
    case 'GET_ACTIVE_TAB':
      respond(getActiveTab());
      break;
    case 'GET_LOCKED_URLS':
      respond(Promise.resolve(Array.from(lockedUrls.keys())));
      break;
    case 'CHECK_IF_LOCKED': {
      const url = payload?.url;
      if (url) {
        const lockId = getLockIdForUrl(url);
        const pin = lockId !== null ? pinMap.get(lockId) : undefined;
        sendResponse({
          success: true,
          locked: lockId !== null,
          lockId: lockId || undefined,
          hasPin: lockId !== null ? pinMap.has(lockId) : false,
          pin: pin
        });
      } else {
        sendResponse({ success: false, error: 'Missing URL' });
      }
      return false;
    }
    case 'VERIFY_PIN': {
      const { lockId, pin } = payload || {};
      if (lockId === undefined || !pin) {
        sendResponse({ success: false, error: 'Missing lockId or PIN' });
        return false;
      }
      const storedPin = pinMap.get(lockId);
      sendResponse({
        success: true,
        valid: storedPin ? storedPin === pin : true // No PIN = always valid
      });
      return false;
    }
    case 'LOCK_TABS':
      if (!payload?.lockId || !payload.tabs) {
        sendResponse({ success: false, error: 'Missing lockId or tabs' });
        return false;
      }
      respond(lockTabs(payload.lockId, payload.tabs, payload.pin, { skipClosingTabs: Boolean(payload.keepTabsOpen) }));
      break;
    case 'UNLOCK_TABS':
      if (!payload?.lockId) {
        sendResponse({ success: false, error: 'Missing lockId' });
        return false;
      }
      respond(unlockTabs(payload.lockId, payload.pin).then(async () => {
        await syncLocksFromDatabase();
      }));
      break;
    case 'SYNC_NOW':
      respond(syncLocksFromDatabase());
      break;
    case 'CREATE_LOCK':
      if (!payload?.token || !payload.data) {
        sendResponse({ success: false, error: 'Missing token or data' });
        return false;
      }
      // FLAW #4 FIX: Immediately sync after creating lock to ensure real-time blocking
      respond(createLockViaAPI(payload.token, payload.data).then(async result => {
        await syncLocksFromDatabase();
        return result;
      }));
      break;
    default:
      sendResponse({ success: false, error: 'Unknown action' });
      return false;
  }

  return true;
});

async function createLockViaAPI(
  token: string,
  data: { name: string; isGroup: boolean; tabs: TabInfo[]; pin: string }
): Promise<{ lock: { id: number; name: string; isGroup: boolean; tabs: TabInfo[]; createdAt: string } }> {
  const API_BASE_URL = 'http://localhost:4000/api';
  
  log('Creating lock via API:', { name: data.name, tabCount: data.tabs.length, hasToken: !!token });
  
  const response = await fetch(`${API_BASE_URL}/locks`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });

  log('API Response:', { status: response.status, ok: response.ok });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to create lock' }));
    log('API Error:', error);
    throw new Error(error.message || 'Failed to create lock');
  }

  const result = await response.json();
  log('Lock created successfully:', result);
  return result;
}

async function getCurrentTabs(): Promise<TabInfo[]> {
  const tabs = await chrome.tabs.query({ currentWindow: true });
  return tabs
    .filter((tab) => Boolean(tab.url) && !isInternalUrl(tab.url!))
    .map((tab) => ({
      title: tab.title || new URL(tab.url!).hostname,
      url: tab.url!,
    }));
}

async function getActiveTab(): Promise<TabInfo> {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  const tab = tabs[0];
  if (!tab?.url || isInternalUrl(tab.url)) {
    throw new Error('No active tab available for locking');
  }

  return {
    title: tab.title || new URL(tab.url).hostname,
    url: tab.url,
  };
}

interface LockOptions {
  skipClosingTabs?: boolean;
}

async function lockTabs(lockId: number, tabs: TabInfo[], pin?: string, options?: LockOptions): Promise<void> {
  log(`Locking tabs for lock ${lockId} with${pin ? '' : 'out'} PIN`);
  log(`Tabs to lock:`, tabs);
  const openTabs = await chrome.tabs.query({ currentWindow: true });
  const tabIdsToClose: number[] = [];
  const targetHosts = new Set<string>();
  const shouldCloseTabs = !options?.skipClosingTabs;

  // Store PIN if provided
  if (pin) {
    pinMap.set(lockId, pin);
  }

  // Add URLs to locked map
  for (const tabInfo of tabs) {
    const normalized = normalizeUrl(tabInfo.url);
    if (normalized) {
      lockedUrls.set(normalized, lockId);
      targetHosts.add(normalized);
      log(`Added to locked URLs: ${normalized} -> Lock ID ${lockId}`);
    }
  }

  log(`Total locked URLs after update: ${lockedUrls.size}`, Array.from(lockedUrls.entries()));

  // Persist locked URLs and PINs
  const dataToStore = {
    [LOCKED_URLS_KEY]: Object.fromEntries(lockedUrls),
    [PIN_MAP_KEY]: Object.fromEntries(pinMap)
  };
  
  log('Data being stored:', dataToStore);
  
  await chrome.storage.local.set(dataToStore);
  
  log(`Persisted to storage: locked URLs and PINs`);
  
  // Verify storage write
  const verification = await chrome.storage.local.get([LOCKED_URLS_KEY, PIN_MAP_KEY]);
  log('Storage verification after write:', verification);

  if (shouldCloseTabs) {
    for (const tab of openTabs) {
      if (!tab.url || typeof tab.id !== 'number') continue;
      const normalized = normalizeUrl(tab.url);
      if (normalized && targetHosts.has(normalized)) {
        tabIdsToClose.push(tab.id);
      }
    }
  }

  const storageKey = `${STORAGE_KEY_PREFIX}${lockId}`;
  const state: StoredTabState = {
    lockId,
    tabs,
    tabIds: tabIdsToClose,
    timestamp: Date.now(),
    pin
  };

  await chrome.storage.local.set({ [storageKey]: state });
  log(`Stored ${tabs.length} tab definitions (closing ${tabIdsToClose.length})`);

  if (shouldCloseTabs && tabIdsToClose.length) {
    await chrome.tabs.remove(tabIdsToClose);
    log(`Closed ${tabIdsToClose.length} tabs`);
  }
}

async function unlockTabs(lockId: number, pin?: string): Promise<void> {
  log(`Unlocking tabs for lock ${lockId}`);
  
  // Verify PIN if required
  const storedPin = pinMap.get(lockId);
  if (storedPin && storedPin !== pin) {
    throw new Error('Invalid PIN');
  }
  
  const storageKey = `${STORAGE_KEY_PREFIX}${lockId}`;
  const stored = await chrome.storage.local.get(storageKey);
  const state = stored[storageKey] as StoredTabState | undefined;

  if (!state) {
    log(`No stored state found for lock ${lockId}`);
    return;
  }

  // Remove URLs from locked map
  const unlockedHostnames = new Set<string>();
  for (const tab of state.tabs) {
    const normalized = normalizeUrl(tab.url);
    if (normalized) {
      lockedUrls.delete(normalized);
      unlockedHostnames.add(normalized);
    }
  }

  // Remove PIN mapping
  pinMap.delete(lockId);

  // Persist updated state
  await chrome.storage.local.set({
    [LOCKED_URLS_KEY]: Object.fromEntries(lockedUrls),
    [PIN_MAP_KEY]: Object.fromEntries(pinMap)
  });

  // FLAW #8 FIX: Reload all tabs showing locked domains
  const allTabs = await chrome.tabs.query({});
  for (const tab of allTabs) {
    if (tab.url && tab.id) {
      const normalized = normalizeUrl(tab.url);
      if (normalized && unlockedHostnames.has(normalized)) {
        chrome.tabs.reload(tab.id).catch(err => log('Failed to reload tab:', err));
      }
    }
  }

  for (const tab of state.tabs) {
    try {
      await chrome.tabs.create({ url: tab.url, active: false });
    } catch (error) {
      log(`Failed to reopen tab ${tab.url}`, error);
    }
  }

  await chrome.storage.local.remove(storageKey);
  log(`Cleared stored state for lock ${lockId}`);
}

function isInternalUrl(url: string): boolean {
  return url.startsWith('chrome://') || url.startsWith('chrome-extension://') || url.startsWith('about:');
}

// Sync locks from database to ensure we have the latest lock state
let syncRetryCount = 0;
const MAX_SYNC_RETRIES = 3;
const SYNC_RETRY_DELAY = 2000; // 2 seconds

async function syncLocksFromDatabase(isRetry = false) {
  try {
    // Get auth token from storage
    const authData = await chrome.storage.local.get(['secureShield.auth']);
    const auth = authData['secureShield.auth'];
    
    if (!auth?.token) {
      log('No auth token found, skipping database sync');
      return;
    }
    
    log(`Syncing locks from database... ${isRetry ? `(Retry ${syncRetryCount}/${MAX_SYNC_RETRIES})` : ''}`);
    
    // Fetch all locked locks from API with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
    
    const response = await fetch('http://localhost:4000/api/locks', {
      headers: {
        'Authorization': `Bearer ${auth.token}`,
        'Content-Type': 'application/json'
      },
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`Sync failed with status: ${response.status}`);
    }
    
    const data = await response.json();
    const locks = data.locks || [];
    
    // Update lockedUrls map with current database state
    const newLockedUrls = new Map<string, number>();
    const newPinMap = new Map<number, string>();
    
    locks.forEach((lock: any) => {
      if (lock.status === 'locked' && Array.isArray(lock.tabs)) {
        lock.tabs.forEach((tab: any) => {
          const normalized = normalizeUrl(tab.url);
          if (normalized) {
            newLockedUrls.set(normalized, lock.id);
          }
        });
      }
    });
    
    // Update in-memory maps
    lockedUrls = newLockedUrls;
    
    // Persist to storage
    const urlsObj = Object.fromEntries(lockedUrls.entries());
    await chrome.storage.local.set({ [LOCKED_URLS_KEY]: urlsObj });
    
    log(`✅ Synced ${lockedUrls.size} locked URLs from database`);
    syncRetryCount = 0; // Reset retry count on success
  } catch (error) {
    log('❌ Error syncing locks from database:', error);
    
    // FLAW #5 FIX: Retry logic with exponential backoff
    if (syncRetryCount < MAX_SYNC_RETRIES) {
      syncRetryCount++;
      const delay = SYNC_RETRY_DELAY * syncRetryCount;
      log(`Retrying sync in ${delay}ms...`);
      setTimeout(() => syncLocksFromDatabase(true), delay);
    } else {
      log('⚠️ Max sync retries reached. Using cached lock data.');
      syncRetryCount = 0;
      // Show notification to user (if possible)
      chrome.notifications?.create({
        type: 'basic',
        iconUrl: 'icons/icon48.png',
        title: 'SecureShield Sync Warning',
        message: 'Unable to sync locks from server. Using cached data.'
      }).catch(() => {});
    }
  }
}

// Sync locks on startup and every 5 seconds for real-time blocking
syncLocksFromDatabase();
setInterval(syncLocksFromDatabase, 5000);

// Also sync when storage changes (e.g., from web app)
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'local' && changes[LOCKED_URLS_KEY]) {
    log('Locked URLs changed in storage, syncing...');
    syncLocksFromDatabase();
  }
});

function getLockIdForUrl(url: string): number | null {
  if (isInternalUrl(url)) return null;
  const normalized = normalizeUrl(url);
  if (!normalized) return null;
  return lockedUrls.get(normalized) || null;
}

export {};
