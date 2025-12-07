import { logError, logInfo, logWarn } from '../utils/logger';
import { GOOGLE_TOKEN_MESSAGE, GOOGLE_ERROR_MESSAGE } from '../utils/googleBridge';

// Define types locally for the service worker
interface TabLock {
  id: number;
  url: string; 
  is_locked: boolean;
}

interface LocalData {
  unlockedExceptions?: string[]; 
  // New: Stores timestamp when exception should expire
  exceptionExpiry?: Record<string, number>; 
  lockedSites?: TabLock[];
  auth_token?: string;
  websiteFrequency?: Record<string, number>;
}

const API_BASE_URL = 'http://127.0.0.1:4000/api';
const AUTO_LOCK_TIMEOUT_MS = 30 * 60 * 1000; // 30 Minutes

async function persistAuthToken(token: string) {
  return new Promise<void>((resolve) => {
    chrome.storage.local.set({ auth_token: token }, () => {
      if (chrome.runtime.lastError) {
        logError('ExtensionBackground', 'Failed to persist auth token', { error: chrome.runtime.lastError.message });
      } else {
        logInfo('ExtensionBackground', 'Stored auth token from Google login');
      }
      resolve();
    });
  });
}

function relayGoogleMessage(type: string, payload: Record<string, unknown> = {}) {
  try {
    chrome.runtime.sendMessage({ type, ...payload }, () => {
      if (chrome.runtime.lastError) {
        logWarn('ExtensionBackground', 'No active listener for Google relay', {
          type,
          error: chrome.runtime.lastError.message,
        });
      }
    });
  } catch (error) {
    logError('ExtensionBackground', 'Failed to relay Google message', {
      type,
      error: error instanceof Error ? error.message : 'unknown_error',
    });
  }
}

// --- HELPER: Normalize Domain ---
function normalizeDomain(value?: string | null): string | null {
  if (!value) return null;
  try {
    return value.replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0].toLowerCase();
  } catch {
    return null;
  }
}

// --- 1. FORCE CHECK ALL TABS ---
async function enforceLocksOnActiveTabs(lockedSites: TabLock[], exceptions: string[]) {
  try {
    const tabs = await chrome.tabs.query({});
    for (const tab of tabs) {
      if (!tab.id || !tab.url || tab.url.startsWith('chrome')) continue;

      const hostname = normalizeDomain(tab.url);
      if (!hostname) continue;

      // Check if exception exists
      if (exceptions && exceptions.some((u) => hostname === u || hostname.endsWith('.' + u))) continue;

      // Check if matched lock
      const matchedLock = lockedSites.find((lock) => {
        if (!lock.is_locked) return false;
        return hostname === lock.url || hostname.endsWith('.' + lock.url);
      });

      if (matchedLock) {
        logInfo('ExtensionBackground', 'Force-locking active tab', { hostname, lockId: matchedLock.id });
        const lockPageUrl = chrome.runtime.getURL('popup/lock.html') + 
          `?url=${encodeURIComponent(tab.url)}&id=${matchedLock.id}`;
        chrome.tabs.update(tab.id, { url: lockPageUrl });
      }
    }
  } catch (e) {
    // Ignore errors
  }
}

// --- 2. SYNC LOCKS FROM SERVER ---
async function syncLocks() {
  try {
    logInfo('ExtensionBackground', 'Starting lock sync');
    const data = await chrome.storage.local.get(['auth_token', 'unlockedExceptions', 'lockedSites', 'exceptionExpiry']);
    const token = data.auth_token;
    
    if (!token) {
        logWarn('ExtensionBackground', 'Skipping sync, no auth token found');
        updateBadge('?', '#9ca3af'); 
        return;
    }

    const response = await fetch(`${API_BASE_URL}/locks`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (response.status === 401) {
      logWarn('ExtensionBackground', 'Sync failed due to unauthorized token');
      updateBadge('!', '#ef4444'); 
        return;
    }

    if (response.ok) {
      const result = await response.json();
      
      const normalizedLocks: TabLock[] = result.locks.map((lock: any) => ({
        ...lock,
        url: normalizeDomain(lock.url) 
      }));

      // --- EXPIRY LOGIC START ---
      const now = Date.now();
      const expiryMap = (data.exceptionExpiry || {}) as Record<string, number>;
      // FIX: Ensure exceptions is always an array
      let exceptions = Array.isArray(data.unlockedExceptions) ? data.unlockedExceptions : [];

      // Filter 1: Remove Expired Exceptions (Auto-Relock)
      const validExceptions = exceptions.filter(domain => {
          const expiresAt = expiryMap[domain];
          if (!expiresAt) return true; // Keep legacy exceptions
          return expiresAt > now;
      });

      // Filter 2: Server-based Cleanup (If server says "Not Locked", remove exception)
      const activeLockDomains = normalizedLocks.filter(l => l.is_locked).map(l => l.url);
      const cleanedExceptions = validExceptions.filter(domain => 
         activeLockDomains.some(lockUrl => domain.includes(lockUrl))
      );

      // Filter 3: Cleanup Expiry Map
      const finalExpiryMap: Record<string, number> = {};
      cleanedExceptions.forEach(domain => {
          if (expiryMap[domain]) finalExpiryMap[domain] = expiryMap[domain];
      });
      // --- EXPIRY LOGIC END ---

      // Deep compare
      const currentLocks = data.lockedSites || [];
      const hasChanged = JSON.stringify(normalizedLocks) !== JSON.stringify(currentLocks) ||
                         JSON.stringify(cleanedExceptions) !== JSON.stringify(exceptions);

      if (hasChanged) {
          await chrome.storage.local.set({ 
            lockedSites: normalizedLocks,
            unlockedExceptions: cleanedExceptions,
            exceptionExpiry: finalExpiryMap, 
            lastSync: Date.now() 
          });
          logInfo('ExtensionBackground', 'Synced lock cache', { lockCount: normalizedLocks.length, exceptionCount: cleanedExceptions.length });
      }
      
      enforceLocksOnActiveTabs(normalizedLocks, cleanedExceptions);
      updateBadge('', '');
    }
  } catch (error) {
    logError('ExtensionBackground', 'Lock sync failed', { error: error instanceof Error ? error.message : 'unknown_error' });
    updateBadge('ERR', '#f59e0b');
  }
}

function updateBadge(text: string, color: string) {
    chrome.action.setBadgeText({ text });
    if (color) {
        chrome.action.setBadgeBackgroundColor({ color });
    }
}

// --- 3. NAVIGATION HANDLER ---
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
  // FIX: Ensure array
  const unlockedExceptions = Array.isArray(data.unlockedExceptions) ? data.unlockedExceptions : [];

  if (!Array.isArray(lockedSites) || lockedSites.length === 0) return;

  if (unlockedExceptions.some((u) => hostname === u || hostname.endsWith('.' + u))) {
    return; 
  }

  const matchedLock = lockedSites.find((lock: TabLock) => {
    if (!lock?.is_locked) return false;
    return hostname === lock.url || hostname.endsWith('.' + lock.url);
  });

  if (matchedLock) {
    logInfo('ExtensionBackground', 'Blocking navigation due to lock', { hostname, lockId: matchedLock.id });
    const lockPageUrl = chrome.runtime.getURL('popup/lock.html') + 
      `?url=${encodeURIComponent(details.url)}&id=${matchedLock.id}`;
    chrome.tabs.update(details.tabId, { url: lockPageUrl });
  }
}

// --- LISTENERS ---
chrome.webNavigation.onBeforeNavigate.addListener(handleNavigation);
chrome.webNavigation.onHistoryStateUpdated.addListener(handleNavigation);

chrome.runtime.onInstalled.addListener(() => {
  logInfo('ExtensionBackground', 'Extension installed/updated, priming sync');
  syncLocks();
  setInterval(syncLocks, 5000);
});

setInterval(syncLocks, 5000);

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === GOOGLE_TOKEN_MESSAGE && typeof msg.token === 'string') {
    persistAuthToken(msg.token).then(() => {
      syncLocks();
      sendResponse({ success: true });
    });
    return true;
  }

  if (msg.type === GOOGLE_ERROR_MESSAGE) {
    logWarn('ExtensionBackground', 'Received internal Google error', { error: msg.error ?? 'unknown_error' });
    sendResponse({ success: true });
    return true;
  }

  if (msg.type === 'SYNC_LOCKS') {
    logInfo('ExtensionBackground', 'Received SYNC_LOCKS message');
    syncLocks().then(() => sendResponse({ success: true }));
    return true; 
  }
  
  // HANDLE UNLOCK
  if (msg.type === 'UNLOCK_SITE') {
    const urlToUnlock = msg.url;
    const hostname = normalizeDomain(urlToUnlock);
    
    if (hostname) {
        logInfo('ExtensionBackground', 'Unlock request received', { hostname });
        chrome.storage.local.get(['unlockedExceptions', 'exceptionExpiry']).then(async (data) => {
            const list: string[] = Array.isArray(data.unlockedExceptions) ? data.unlockedExceptions : [];
            const expiry = (data.exceptionExpiry || {}) as Record<string, number>;

            if (!list.includes(hostname)) list.push(hostname);
            
            expiry[hostname] = Date.now() + AUTO_LOCK_TIMEOUT_MS;

            await chrome.storage.local.set({ 
                unlockedExceptions: list,
                exceptionExpiry: expiry
            });
            sendResponse({ success: true });
        });
        return true; 
    }
  }

  // HANDLE RE-LOCK
  if (msg.type === 'RELOCK_SITE') {
    const hostname = normalizeDomain(msg.url);
    if (hostname) {
      logInfo('ExtensionBackground', 'Relock request received', { hostname });
      chrome.storage.local.get(['unlockedExceptions', 'exceptionExpiry']).then(async (data) => {
        let list: string[] = Array.isArray(data.unlockedExceptions) ? data.unlockedExceptions : [];
        let expiry = (data.exceptionExpiry || {}) as Record<string, number>;

        list = list.filter(domain => domain !== hostname);
        delete expiry[hostname];

        await chrome.storage.local.set({ 
            unlockedExceptions: list,
            exceptionExpiry: expiry
        });
        sendResponse({ success: true });
      });
      return true;
    }
  }
});

chrome.runtime.onMessageExternal.addListener((msg, _sender, sendResponse) => {
  if (msg.type === 'SYNC_LOCKS') {
    logInfo('ExtensionBackground', 'Received external SYNC_LOCKS message');
    syncLocks().then(() => sendResponse({ success: true }));
    return true;
  }

  if (msg.type === GOOGLE_TOKEN_MESSAGE && typeof msg.token === 'string') {
    logInfo('ExtensionBackground', 'Received external Google token');
    persistAuthToken(msg.token).then(() => {
      relayGoogleMessage(GOOGLE_TOKEN_MESSAGE, { token: msg.token });
      syncLocks();
      sendResponse({ success: true });
    });
    return true;
  }

  if (msg.type === GOOGLE_ERROR_MESSAGE) {
    logWarn('ExtensionBackground', 'Received external Google error', { error: msg.error ?? 'unknown_error' });
    relayGoogleMessage(GOOGLE_ERROR_MESSAGE, { error: msg.error ?? 'unknown_error' });
    sendResponse({ success: true });
    return true;
  }
});