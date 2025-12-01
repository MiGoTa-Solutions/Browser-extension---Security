// Define types locally for the service worker
interface TabLock {
  id: number;
  url: string;
  is_locked: boolean;
}

// Interface for our Local Storage Whitelist
interface LocalData {
  unlockedExceptions?: string[]; 
  lockedSites?: TabLock[];
  auth_token?: string;
  websiteFrequency?: Record<string, number>;
}

// Use 127.0.0.1 to avoid localhost resolution issues in extensions
const API_BASE_URL = 'http://127.0.0.1:4000/api';

// --- HELPER: Normalize Domain ---
function normalizeDomain(value?: string | null): string | null {
  if (!value) return null;
  try {
    return value.replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0].toLowerCase();
  } catch {
    return null;
  }
}

// --- 1. SYNC LOCKS FROM SERVER (High Frequency & Debug Mode) ---
async function syncLocks() {
  try {
    const data = await chrome.storage.local.get('auth_token');
    const token = data.auth_token;
    
    if (!token) {
        // Warn user via Badge if they aren't logged in
        updateBadge('?', '#9ca3af'); 
        return;
    }

    const response = await fetch(`${API_BASE_URL}/locks`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (response.status === 401) {
        // AUTH ERROR: Alert the user silently via Badge
        console.warn('[Background] Auth Token Expired');
        updateBadge('!', '#ef4444'); // Red '!'
        return;
    }

    if (response.ok) {
      const result = await response.json();
      await chrome.storage.local.set({ 
        lockedSites: result.locks, 
        lastSync: Date.now() 
      });
      
      // Success: Clear badge
      updateBadge('', '');
      console.log(`[Background] Locks synced: ${result.locks.length}`);
    }
  } catch (error) {
    // Network error? Show yellow warning
    updateBadge('ERR', '#f59e0b');
  }
}

// Helper to manage the extension icon badge
function updateBadge(text: string, color: string) {
    chrome.action.setBadgeText({ text });
    if (color) {
        chrome.action.setBadgeBackgroundColor({ color });
    }
}

// --- 2. FREQUENCY TRACKER HELPER ---
async function trackVisitFrequency(urlStr: string) {
  try {
    const url = new URL(urlStr);
    const hostname = url.hostname;
    
    if (!hostname || hostname.startsWith('chrome') || hostname === 'newtab' || hostname === 'extensions') return;

    const result = await chrome.storage.local.get(['websiteFrequency']);
    const frequencyData = (result.websiteFrequency || {}) as Record<string, number>;

    frequencyData[hostname] = (frequencyData[hostname] || 0) + 1;
    await chrome.storage.local.set({ websiteFrequency: frequencyData });
  } catch (e) {
    // Ignore invalid URLs
  }
}

// --- 3. MAIN NAVIGATION LISTENER (BLOCKER & TRACKER) ---
chrome.webNavigation.onBeforeNavigate.addListener(async (details) => {
  if (details.frameId !== 0) return; // Only check main frame

  const currentUrl = details.url;
  if (currentUrl.startsWith(chrome.runtime.getURL(''))) return; // Ignore internal pages

  // A. Track Frequency
  trackVisitFrequency(currentUrl);

  // B. Check Locks
  const data = await chrome.storage.local.get(['lockedSites', 'unlockedExceptions']) as LocalData;
  const lockedSites = data.lockedSites || [];
  const unlockedExceptions = data.unlockedExceptions || [];

  if (!Array.isArray(lockedSites) || lockedSites.length === 0) return;

  try {
    const targetUrl = new URL(currentUrl);
    const hostname = targetUrl.hostname.toLowerCase();

    // 1. CHECK EXCEPTIONS (User manually unlocked this via PIN)
    // FIX: Strict domain matching
    if (unlockedExceptions.some((u) => hostname === u || hostname.endsWith('.' + u))) {
      console.log(`[Background] Allowing exception: ${hostname}`);
      return; 
    }

    // 2. CHECK SERVER LOCKS
    const matchedLock = lockedSites.find((lock: TabLock) => {
      if (!lock?.is_locked) return false;
      const normalizedLockUrl = normalizeDomain(lock.url);
      if (!normalizedLockUrl) return false;
      
      // FIX: Strict domain matching instead of .includes()
      return hostname === normalizedLockUrl || hostname.endsWith('.' + normalizedLockUrl);
    });

    if (matchedLock) {
      console.log(`[Background] Blocking ${hostname}`);
      const lockPageUrl = chrome.runtime.getURL('popup/lock.html') + 
        `?url=${encodeURIComponent(currentUrl)}&id=${matchedLock.id}`;
      
      chrome.tabs.update(details.tabId, { url: lockPageUrl });
    }
  } catch (e) {
    // Ignore URL parsing errors
  }
});

// --- 4. EVENTS & TIMERS ---

chrome.runtime.onInstalled.addListener(() => {
  console.log('[Background] Installed.');
  syncLocks();
  setInterval(syncLocks, 5000);
});

// Start interval on load
setInterval(syncLocks, 5000);

// HANDLE MESSAGES FROM EXTENSION (Popup/Content)
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === 'SYNC_LOCKS') {
    syncLocks().then(() => sendResponse({ success: true }));
    return true; 
  }
  
  // HANDLE UNLOCK
  if (msg.type === 'UNLOCK_SITE') {
    const urlToUnlock = msg.url;
    const hostname = normalizeDomain(urlToUnlock);
    
    if (hostname) {
        console.log(`[Background] Adding Exception: ${hostname}`);
        chrome.storage.local.get('unlockedExceptions').then(async (data) => {
            try {
                const list: string[] = (data as LocalData).unlockedExceptions || [];
                if (!list.includes(hostname)) {
                    list.push(hostname);
                    // FIX: await the set operation
                    await chrome.storage.local.set({ unlockedExceptions: list });
                }
                sendResponse({ success: true });
            } catch (err) {
                console.error('[Background] Storage Write Error:', err);
                sendResponse({ success: false, error: 'Storage write failed' });
            }
        });
        return true; 
    }
  }

  // HANDLE RE-LOCK
  if (msg.type === 'RELOCK_SITE') {
    const hostname = normalizeDomain(msg.url);
    if (hostname) {
      console.log(`[Background] Re-locking: ${hostname}`);
      chrome.storage.local.get('unlockedExceptions').then(async (data) => {
        try {
            let list: string[] = (data as LocalData).unlockedExceptions || [];
            list = list.filter(domain => domain !== hostname);
            await chrome.storage.local.set({ unlockedExceptions: list });
            sendResponse({ success: true });
        } catch (err) {
            console.error('[Background] Storage Write Error:', err);
            sendResponse({ success: false });
        }
      });
      return true;
    }
  }
});

// HANDLE MESSAGES FROM WEB APP (For Immediate Sync)
chrome.runtime.onMessageExternal.addListener((msg, _sender, sendResponse) => {
    if (msg.type === 'SYNC_LOCKS') {
        console.log('[Background] External Sync Request Received');
        syncLocks().then(() => sendResponse({ success: true }));
        return true;
    }
});