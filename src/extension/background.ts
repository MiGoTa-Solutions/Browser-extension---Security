// Define types locally for the service worker
interface TabLock {
  id: number;
  url: string;
  is_locked: boolean;
}

// Assuming localhost for development. Change to your Render URL for production!
const API_BASE_URL = 'http://127.0.0.1:4000/api';

// --- 1. SYNC LOCKS FROM SERVER ---
async function syncLocks() {
  try {
    const data = await chrome.storage.local.get('auth_token');
    const token = data.auth_token;
    
    if (!token) {
      console.log('[Background] No auth token found. Skipping sync.');
      return;
    }

    const response = await fetch(`${API_BASE_URL}/locks`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (response.ok) {
      const result = await response.json();
      // Cache locks locally
      await chrome.storage.local.set({ 
        lockedSites: result.locks, 
        lastSync: Date.now() 
      });
      console.log('[Background] Locks synced:', result.locks.length);
    } else {
        console.error('[Background] Sync failed status:', response.status);
    }
  } catch (error) {
    console.error('[Background] Sync failed:', error);
  }
}

// --- 2. NAVIGATION LISTENER (THE BLOCKER) ---
chrome.webNavigation.onBeforeNavigate.addListener(async (details) => {
  if (details.frameId !== 0) return; // Only check main frame

  // Skip internal extension pages to avoid infinite loops
  if (details.url.startsWith(chrome.runtime.getURL(''))) return;

  const { lockedSites } = await chrome.storage.local.get('lockedSites');
  if (!Array.isArray(lockedSites) || lockedSites.length === 0) return;

  try {
    const targetUrl = new URL(details.url);
    const hostname = targetUrl.hostname.toLowerCase();

    // Check if current hostname contains any locked domain
    const matchedLock = lockedSites.find((lock: TabLock) => 
      lock.is_locked && hostname.includes(lock.url.toLowerCase())
    );

    if (matchedLock) {
      console.log(`[Background] Blocking ${details.url} due to lock: ${matchedLock.url}`);
      
      const lockPageUrl = chrome.runtime.getURL('lock.html') + 
        `?url=${encodeURIComponent(details.url)}&id=${matchedLock.id}`;
        
      chrome.tabs.update(details.tabId, { url: lockPageUrl });
    }
  } catch (e) {
    // Ignore invalid URLs
  }
});

// --- 3. EVENTS & ALARMS ---
chrome.runtime.onInstalled.addListener(() => {
  console.log('[Background] Installed. Starting sync alarm.');
  syncLocks();
  chrome.alarms.create('syncLocks', { periodInMinutes: 5 });
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'syncLocks') syncLocks();
});

// Listen for messages from React App (Popup) or Lock Screen
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === 'SYNC_LOCKS') {
    syncLocks().then(() => sendResponse({ success: true }));
    return true; // Keep channel open for async response
  }
  
  if (msg.type === 'UNLOCK_SITE') {
      // Logic for temporary unlocking could go here (e.g. adding to a whitelist in storage)
      // For now, we just redirect back
      console.log('Unlocking site temporarily');
      sendResponse({ success: true });
  }
});