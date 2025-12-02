// Define types locally for the service worker
interface TabLock {
  id: number;
  url: string; // This stores the NORMALIZED hostname
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

// --- 1. SYNC LOCKS FROM SERVER ---
async function syncLocks() {
  try {
    const data = await chrome.storage.local.get(['auth_token', 'unlockedExceptions', 'lockedSites']);
    const token = data.auth_token;
    
    if (!token) {
        updateBadge('?', '#9ca3af'); 
        return;
    }

    const response = await fetch(`${API_BASE_URL}/locks`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (response.status === 401) {
        console.warn('[Background] Auth Token Expired');
        updateBadge('!', '#ef4444'); 
        return;
    }

    if (response.ok) {
      const result = await response.json();
      
      const normalizedLocks: TabLock[] = result.locks.map((lock: any) => ({
        ...lock,
        url: normalizeDomain(lock.url) 
      }));

      // --- SELF-CLEANING LOGIC ---
      // If a site is Unlocked on Server, remove it from the local Exception List
      let exceptions = (data.unlockedExceptions || []) as string[];
      const activeLockDomains = normalizedLocks
        .filter(l => l.is_locked)
        .map(l => l.url);
        
      const cleanedExceptions = exceptions.filter(domain => {
         // Keep exception ONLY if the domain is currently in the active lock list
         return activeLockDomains.some(lockUrl => domain.includes(lockUrl));
      });

      // --- OPTIMIZATION: ONLY SAVE IF CHANGED ---
      // This prevents the infinite loop in lock.js caused by constant storage updates
      const currentLocks = data.lockedSites || [];
      const locksChanged = JSON.stringify(normalizedLocks) !== JSON.stringify(currentLocks);
      const exceptionsChanged = JSON.stringify(cleanedExceptions) !== JSON.stringify(exceptions);

      if (locksChanged || exceptionsChanged) {
          await chrome.storage.local.set({ 
            lockedSites: normalizedLocks,
            unlockedExceptions: cleanedExceptions, 
            lastSync: Date.now() 
          });
          console.log(`[Background] Synced. Active Locks: ${normalizedLocks.length}`);
      }
      
      updateBadge('', '');
    }
  } catch (error) {
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
async function trackVisitFrequency(hostname: string) {
  try {
    if (!hostname || hostname.startsWith('chrome') || hostname === 'newtab' || hostname === 'extensions') return;

    const result = await chrome.storage.local.get(['websiteFrequency']);
    const frequencyData = (result.websiteFrequency || {}) as Record<string, number>;

    frequencyData[hostname] = (frequencyData[hostname] || 0) + 1;
    await chrome.storage.local.set({ websiteFrequency: frequencyData });
  } catch (e) {
    // Ignore storage errors
  }
}

// --- 3. MAIN NAVIGATION LISTENER (BLOCKER & TRACKER) ---
chrome.webNavigation.onBeforeNavigate.addListener(async (details) => {
  if (details.frameId !== 0) return; 

  const currentUrl = details.url;
  if (currentUrl.startsWith(chrome.runtime.getURL(''))) return;

  // OPTIMIZATION: Parse URL exactly once
  let hostname: string;
  try {
     const urlObj = new URL(currentUrl);
     hostname = urlObj.hostname.toLowerCase();
  } catch {
     return; // Invalid URL, ignore
  }

  // A. Track Frequency (Pass pre-parsed hostname)
  trackVisitFrequency(hostname);

  // B. Check Locks
  const data = await chrome.storage.local.get(['lockedSites', 'unlockedExceptions']) as LocalData;
  const lockedSites = data.lockedSites || [];
  const unlockedExceptions = data.unlockedExceptions || [];

  if (!Array.isArray(lockedSites) || lockedSites.length === 0) return;

  try {
    // 1. CHECK EXCEPTIONS (Strict Matching)
    if (unlockedExceptions.some((u) => hostname === u || hostname.endsWith('.' + u))) {
      // console.log(`[Background] Allowing exception: ${hostname}`); // Commented out to reduce noise
      return; 
    }

    // 2. CHECK SERVER LOCKS (Optimized)
    const matchedLock = lockedSites.find((lock: TabLock) => {
      if (!lock?.is_locked || !lock.url) return false;
      
      // lock.url is ALREADY normalized from syncLocks()
      return hostname === lock.url || hostname.endsWith('.' + lock.url);
    });

    if (matchedLock) {
      console.log(`[Background] Blocking ${hostname}`);
      const lockPageUrl = chrome.runtime.getURL('popup/lock.html') + 
        `?url=${encodeURIComponent(currentUrl)}&id=${matchedLock.id}`;
      
      chrome.tabs.update(details.tabId, { url: lockPageUrl });
    }
  } catch (e) { }
});

// --- 4. EVENTS & TIMERS ---

chrome.runtime.onInstalled.addListener(() => {
  console.log('[Background] Installed.');
  syncLocks();
  setInterval(syncLocks, 5000);
});

setInterval(syncLocks, 5000);

// HANDLE MESSAGES FROM EXTENSION
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
                    await chrome.storage.local.set({ unlockedExceptions: list });
                }
                sendResponse({ success: true });
            } catch (err) {
                sendResponse({ success: false });
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
        let list: string[] = (data as LocalData).unlockedExceptions || [];
        list = list.filter(domain => domain !== hostname);
        await chrome.storage.local.set({ unlockedExceptions: list });
        sendResponse({ success: true });
      });
      return true;
    }
  }
});

// HANDLE MESSAGES FROM WEB APP
chrome.runtime.onMessageExternal.addListener((msg, _sender, sendResponse) => {
    if (msg.type === 'SYNC_LOCKS') {
        console.log('[Background] External Sync Request Received');
        syncLocks().then(() => sendResponse({ success: true }));
        return true;
    }
});