// Define types locally for the service worker
interface TabLock {
  id: number;
  url: string;
  is_locked: boolean;
}

// Interface for our Local Storage Whitelist
interface LocalData {
  // Stores domains that are locked on server but unlocked by user PIN
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
    
    // DEBUG: Check for Auth Token
    if (!token) {
        return;
    }

    const response = await fetch(`${API_BASE_URL}/locks`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (response.ok) {
      const result = await response.json();
      await chrome.storage.local.set({ 
        lockedSites: result.locks, 
        lastSync: Date.now() 
      });
      
      console.log(`[Background] Locks synced: ${result.locks.length}`);
    }
  } catch (error) {
    // Silent fail for connection errors to avoid console spam
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
    // This allows the site to remain open until manually re-locked
    if (unlockedExceptions.some((u) => hostname.includes(u))) {
      console.log(`[Background] Allowing exception: ${hostname}`);
      return; 
    }

    // 2. CHECK SERVER LOCKS
    const matchedLock = lockedSites.find((lock: TabLock) => {
      if (!lock?.is_locked) return false;
      const normalizedLockUrl = normalizeDomain(lock.url);
      if (!normalizedLockUrl) return false;
      return hostname.includes(normalizedLockUrl);
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
  // We use setInterval for high-frequency polling (5s) as requested
  setInterval(syncLocks, 5000);
});

// Also start interval on load (service worker wakeup)
setInterval(syncLocks, 5000);

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === 'SYNC_LOCKS') {
    syncLocks().then(() => sendResponse({ success: true }));
    return true; 
  }
  
  // HANDLE UNLOCK (Add to Exception List)
  if (msg.type === 'UNLOCK_SITE') {
    const urlToUnlock = msg.url;
    const hostname = normalizeDomain(urlToUnlock);
    
    if (hostname) {
        console.log(`[Background] Adding Exception: ${hostname}`);
        chrome.storage.local.get('unlockedExceptions').then(async (data) => {
            const list: string[] = (data as LocalData).unlockedExceptions || [];
            if (!list.includes(hostname)) {
                list.push(hostname);
                // FIX: await the set operation before sending response
                await chrome.storage.local.set({ unlockedExceptions: list });
            }
            sendResponse({ success: true });
        });
        return true; // Keep channel open for async response
    }
  }

  // HANDLE RE-LOCK (Remove from Exception List)
  if (msg.type === 'RELOCK_SITE') {
    const hostname = normalizeDomain(msg.url); // We expect hostname or full url
    if (hostname) {
      console.log(`[Background] Re-locking: ${hostname}`);
      chrome.storage.local.get('unlockedExceptions').then(async (data) => {
        let list: string[] = (data as LocalData).unlockedExceptions || [];
        list = list.filter(domain => !hostname.includes(domain) && !domain.includes(hostname));
        await chrome.storage.local.set({ unlockedExceptions: list });
        sendResponse({ success: true });
      });
      return true;
    }
  }
});