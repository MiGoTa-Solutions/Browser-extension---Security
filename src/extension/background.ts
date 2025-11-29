// Define types locally for the service worker
interface TabLock {
  id: number;
  url: string;
  is_locked: boolean;
}

const API_BASE_URL = 'http://127.0.0.1:4000/api';

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
    }
  } catch (error) {
    console.error('[Background] Sync failed:', error);
  }
}

// --- 2. FREQUENCY TRACKER (FROM FRIEND'S REPO) ---
async function updateVisitCount(urlStr: string) {
  try {
    const url = new URL(urlStr);
    const hostname = url.hostname;
    
    // Ignore internal pages
    if (!hostname || hostname.startsWith('chrome') || hostname === 'newtab') return;

    const result = await chrome.storage.local.get(['websiteFrequency']);
    const frequencyData = (result.websiteFrequency ?? {}) as Record<string, number>;

    frequencyData[hostname] = (frequencyData[hostname] || 0) + 1;

    await chrome.storage.local.set({ websiteFrequency: frequencyData });
    // console.log(`[Frequency] ${hostname}: ${frequencyData[hostname]}`);
  } catch (e) {
    // Ignore invalid URLs
  }
}

// --- 3. NAVIGATION LISTENER (THE BLOCKER & TRACKER) ---
chrome.webNavigation.onBeforeNavigate.addListener(async (details) => {
  if (details.frameId !== 0) return;

  const currentUrl = details.url;
  if (currentUrl.startsWith(chrome.runtime.getURL(''))) return;

  // Track Frequency
  updateVisitCount(currentUrl);

  // Check Lock
  const { lockedSites } = await chrome.storage.local.get('lockedSites');
  if (!Array.isArray(lockedSites) || lockedSites.length === 0) return;

  try {
    const targetUrl = new URL(currentUrl);
    const hostname = targetUrl.hostname.toLowerCase();

    const matchedLock = lockedSites.find((lock: TabLock) => 
      lock.is_locked && hostname.includes(lock.url.toLowerCase())
    );

    if (matchedLock) {
      const lockPageUrl = chrome.runtime.getURL('lock.html') + 
        `?url=${encodeURIComponent(currentUrl)}&id=${matchedLock.id}`;
      chrome.tabs.update(details.tabId, { url: lockPageUrl });
    }
  } catch (e) {
    // Ignore
  }
});

// --- 4. EVENTS & ALARMS ---
chrome.runtime.onInstalled.addListener(() => {
  syncLocks();
  chrome.alarms.create('syncLocks', { periodInMinutes: 5 });
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
    sendResponse({ success: true });
  }
}); 