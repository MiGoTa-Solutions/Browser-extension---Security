// Define types locally for the service worker
interface TabLock {
  id: number;
  url: string;
  is_locked: boolean;
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
// This function JUST updates the data. It does NOT register listeners.
async function trackVisitFrequency(urlStr: string) {
  try {
    const url = new URL(urlStr);
    const hostname = url.hostname;
    
    // Ignore internal pages, new tabs, and extension pages
    if (!hostname || hostname.startsWith('chrome') || hostname === 'newtab' || hostname === 'extensions') return;

    const result = await chrome.storage.local.get(['websiteFrequency']);
    const frequencyData = (result.websiteFrequency || {}) as Record<string, number>;

    // Increment count
    frequencyData[hostname] = (frequencyData[hostname] || 0) + 1;

    await chrome.storage.local.set({ websiteFrequency: frequencyData });
  } catch (e) {
    // Ignore invalid URLs
  }
}

// --- 3. MAIN NAVIGATION LISTENER (BLOCKER & TRACKER) ---
// This listener runs ONCE per navigation event.
chrome.webNavigation.onBeforeNavigate.addListener(async (details) => {
  if (details.frameId !== 0) return; // Only check main frame

  const currentUrl = details.url;
  if (currentUrl.startsWith(chrome.runtime.getURL(''))) return; // Ignore internal pages

  // A. Track Frequency for AI Suggestions
  trackVisitFrequency(currentUrl);

  // B. Check Locks
  const { lockedSites } = await chrome.storage.local.get('lockedSites');
  if (!Array.isArray(lockedSites) || lockedSites.length === 0) return;

  try {
    const targetUrl = new URL(currentUrl);
    const hostname = targetUrl.hostname.toLowerCase();

    // Find if the current site matches any locked site
    const matchedLock = lockedSites.find((lock: TabLock) => {
      if (!lock?.is_locked) return false;
      const normalizedLockUrl = normalizeDomain(lock.url);
      if (!normalizedLockUrl) return false;
      return hostname.includes(normalizedLockUrl);
    });

    if (matchedLock) {
      console.log(`[Background] Blocking ${hostname}`);
      const lockPageUrl = chrome.runtime.getURL('lock.html') + 
        `?url=${encodeURIComponent(currentUrl)}&id=${matchedLock.id}`;
      
      chrome.tabs.update(details.tabId, { url: lockPageUrl });
    }
  } catch (e) {
    // Ignore URL parsing errors
  }
});

// --- 4. ALARMS & EVENTS ---
// These listeners are defined ONCE at the top level.

chrome.runtime.onInstalled.addListener(() => {
  console.log('[Background] Installed. Starting sync alarm.');
  syncLocks();
  chrome.alarms.create('syncLocks', { periodInMinutes: 5 });
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'syncLocks') syncLocks();
});

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === 'SYNC_LOCKS') {
    syncLocks().then(() => sendResponse({ success: true }));
    return true; // Keep channel open for async response
  }
  
  if (msg.type === 'UNLOCK_SITE') {
    console.log('[Background] Unlocking site temporarily (User PIN verified)');
    sendResponse({ success: true });
  }
});