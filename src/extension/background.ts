// Define types locally for the service worker
interface TabLock {
  id: number;
  url: string;
  is_locked: boolean;
}

// FIX: Define interface for Session Storage to satisfy TypeScript
interface SessionData {
  tempUnlocked?: string[];
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
    const data = await chrome.storage.local.get('auth_token');
    const token = data.auth_token;
    
    if (!token) return;

    const response = await fetch(`${API_BASE_URL}/locks`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (response.ok) {
      const result = await response.json();
      await chrome.storage.local.set({ 
        lockedSites: result.locks, 
        lastSync: Date.now() 
      });
      console.log('[Background] Locks synced:', result.locks.length);
    }
  } catch (error) {
    console.error('[Background] Sync failed:', error);
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
  const { lockedSites } = await chrome.storage.local.get('lockedSites');
  if (!Array.isArray(lockedSites) || lockedSites.length === 0) return;

  try {
    const targetUrl = new URL(currentUrl);
    const hostname = targetUrl.hostname.toLowerCase();

    // 1. CHECK IF TEMPORARILY UNLOCKED (The Fix)
    // We use session storage which clears when the browser is closed
    
    // FIX: Cast result to SessionData interface
    const sessionResult = await chrome.storage.session.get('tempUnlocked');
    const sessionData = sessionResult as SessionData;
    const tempUnlocked: string[] = sessionData.tempUnlocked || [];
    
    // If this hostname is in the unlocked list, allow access
    // FIX: TypeScript now knows tempUnlocked is string[] and has .some()
    if (tempUnlocked.some((u) => hostname.includes(u))) {
      console.log(`[Background] Allowing temporarily unlocked site: ${hostname}`);
      return; 
    }

    // 2. CHECK IF LOCKED
    const matchedLock = lockedSites.find((lock: TabLock) => {
      if (!lock?.is_locked) return false;
      const normalizedLockUrl = normalizeDomain(lock.url);
      if (!normalizedLockUrl) return false;
      return hostname.includes(normalizedLockUrl);
    });

    if (matchedLock) {
      console.log(`[Background] Blocking ${hostname}`);
      // Point to popup/lock.html correctly
      const lockPageUrl = chrome.runtime.getURL('popup/lock.html') + 
        `?url=${encodeURIComponent(currentUrl)}&id=${matchedLock.id}`;
      
      chrome.tabs.update(details.tabId, { url: lockPageUrl });
    }
  } catch (e) {
    // Ignore URL parsing errors
  }
});

// --- 4. ALARMS & EVENTS ---
chrome.runtime.onInstalled.addListener(() => {
  console.log('[Background] Installed. Starting sync alarm.');
  syncLocks();
  chrome.alarms.create('syncLocks', { periodInMinutes: 5 });
  // Initialize session storage
  chrome.storage.session.set({ tempUnlocked: [] });
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'syncLocks') syncLocks();
});

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === 'SYNC_LOCKS') {
    syncLocks().then(() => sendResponse({ success: true }));
    return true; 
  }
  
  if (msg.type === 'UNLOCK_SITE') {
    const urlToUnlock = msg.url;
    const hostname = normalizeDomain(urlToUnlock);
    
    if (hostname) {
        console.log(`[Background] Unlocking ${hostname} temporarily`);
        
        // Add to Session Storage
        chrome.storage.session.get('tempUnlocked').then((data) => {
            // FIX: Explicitly cast and type the list
            const sessionData = data as SessionData;
            const list: string[] = sessionData.tempUnlocked || [];
            
            // FIX: TypeScript now knows list is string[]
            if (!list.includes(hostname)) {
                list.push(hostname);
                chrome.storage.session.set({ tempUnlocked: list });
            }
            sendResponse({ success: true });
        });
        return true; // Async response
    }
  }
});