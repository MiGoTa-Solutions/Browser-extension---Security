// Define types locally for the service worker
interface TabLock {
  id: number;
  url: string; 
  is_locked: boolean;
}

interface LocalData {
  unlockedExceptions?: string[]; 
  lockedSites?: TabLock[];
  auth_token?: string;
  websiteFrequency?: Record<string, number>;
}

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

// --- 1. FORCE CHECK ALL TABS (The Fix for "30 min delay") ---
// This function runs after every sync to catch tabs that are already open
async function enforceLocksOnActiveTabs(lockedSites: TabLock[], exceptions: string[]) {
  try {
    const tabs = await chrome.tabs.query({});
    
    for (const tab of tabs) {
      if (!tab.id || !tab.url || tab.url.startsWith('chrome')) continue;

      const hostname = normalizeDomain(tab.url);
      if (!hostname) continue;

      // Check if exception exists (whitelist)
      if (exceptions.some((u) => hostname === u || hostname.endsWith('.' + u))) continue;

      // Check if matched lock
      const matchedLock = lockedSites.find((lock) => {
        if (!lock.is_locked) return false;
        return hostname === lock.url || hostname.endsWith('.' + lock.url);
      });

      if (matchedLock) {
        console.log(`[Background] Force-locking active tab: ${hostname}`);
        const lockPageUrl = chrome.runtime.getURL('popup/lock.html') + 
          `?url=${encodeURIComponent(tab.url)}&id=${matchedLock.id}`;
        chrome.tabs.update(tab.id, { url: lockPageUrl });
      }
    }
  } catch (e) {
    // Ignore errors regarding closed tabs
  }
}

// --- 2. SYNC LOCKS FROM SERVER ---
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
        updateBadge('!', '#ef4444'); 
        return;
    }

    if (response.ok) {
      const result = await response.json();
      
      const normalizedLocks: TabLock[] = result.locks.map((lock: any) => ({
        ...lock,
        url: normalizeDomain(lock.url) 
      }));

      // CLEANUP: Remove exceptions for sites that are no longer locked on server
      let exceptions = (data.unlockedExceptions || []) as string[];
      const activeLockDomains = normalizedLocks.filter(l => l.is_locked).map(l => l.url);
      const cleanedExceptions = exceptions.filter(domain => 
         activeLockDomains.some(lockUrl => domain.includes(lockUrl))
      );

      // Deep compare to avoid useless writes (prevents loop issues)
      const currentLocks = data.lockedSites || [];
      const hasChanged = JSON.stringify(normalizedLocks) !== JSON.stringify(currentLocks) ||
                         JSON.stringify(cleanedExceptions) !== JSON.stringify(exceptions);

      if (hasChanged) {
          await chrome.storage.local.set({ 
            lockedSites: normalizedLocks,
            unlockedExceptions: cleanedExceptions, 
            lastSync: Date.now() 
          });
      }
      
      // ALWAYS check active tabs after a sync to catch open windows immediately
      enforceLocksOnActiveTabs(normalizedLocks, cleanedExceptions);
      
      updateBadge('', '');
    }
  } catch (error) {
    updateBadge('ERR', '#f59e0b');
  }
}

function updateBadge(text: string, color: string) {
    chrome.action.setBadgeText({ text });
    if (color) {
        chrome.action.setBadgeBackgroundColor({ color });
    }
}

// --- 3. NAVIGATION HANDLER (Shared Logic) ---
async function handleNavigation(details: { frameId: number; url: string; tabId: number }) {
  if (details.frameId !== 0) return; 
  if (details.url.startsWith(chrome.runtime.getURL(''))) return;

  const hostname = normalizeDomain(details.url);
  if (!hostname) return;

  // Track Frequency
  const stats = await chrome.storage.local.get(['websiteFrequency']);
  const frequencyData = (stats.websiteFrequency || {}) as Record<string, number>;
  frequencyData[hostname] = (frequencyData[hostname] || 0) + 1;
  await chrome.storage.local.set({ websiteFrequency: frequencyData });

  // Check Locks
  const data = await chrome.storage.local.get(['lockedSites', 'unlockedExceptions']) as LocalData;
  const lockedSites = data.lockedSites || [];
  const unlockedExceptions = data.unlockedExceptions || [];

  if (!Array.isArray(lockedSites) || lockedSites.length === 0) return;

  if (unlockedExceptions.some((u) => hostname === u || hostname.endsWith('.' + u))) {
    return; 
  }

  const matchedLock = lockedSites.find((lock: TabLock) => {
    if (!lock?.is_locked) return false;
    return hostname === lock.url || hostname.endsWith('.' + lock.url);
  });

  if (matchedLock) {
    console.log(`[Background] Blocking ${hostname}`);
    const lockPageUrl = chrome.runtime.getURL('popup/lock.html') + 
      `?url=${encodeURIComponent(details.url)}&id=${matchedLock.id}`;
    chrome.tabs.update(details.tabId, { url: lockPageUrl });
  }
}

// --- LISTENERS ---

// 1. Standard Navigation
chrome.webNavigation.onBeforeNavigate.addListener(handleNavigation);

// 2. History API (FIX FOR YOUTUBE/SPA Navigation)
chrome.webNavigation.onHistoryStateUpdated.addListener(handleNavigation);

chrome.runtime.onInstalled.addListener(() => {
  syncLocks();
  setInterval(syncLocks, 5000);
});

setInterval(syncLocks, 5000);

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === 'SYNC_LOCKS') {
    syncLocks().then(() => sendResponse({ success: true }));
    return true; 
  }
  
  if (msg.type === 'UNLOCK_SITE') {
    const urlToUnlock = msg.url;
    const hostname = normalizeDomain(urlToUnlock);
    if (hostname) {
        chrome.storage.local.get('unlockedExceptions').then(async (data) => {
            const list: string[] = (data as LocalData).unlockedExceptions || [];
            if (!list.includes(hostname)) {
                list.push(hostname);
                await chrome.storage.local.set({ unlockedExceptions: list });
            }
            sendResponse({ success: true });
        });
        return true; 
    }
  }

  if (msg.type === 'RELOCK_SITE') {
    const hostname = normalizeDomain(msg.url);
    if (hostname) {
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

chrome.runtime.onMessageExternal.addListener((msg, _sender, sendResponse) => {
    if (msg.type === 'SYNC_LOCKS') {
        syncLocks().then(() => sendResponse({ success: true }));
        return true;
    }
});