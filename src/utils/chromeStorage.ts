import { AuthUser, TabLock } from '../types';

const CHROME_AUTH_KEY = 'secureShield.auth';
const CHROME_LOCKS_KEY = 'secureShield.locks';

function hasChromeStorage(): boolean {
  return typeof chrome !== 'undefined' && typeof chrome.storage?.local !== 'undefined';
}

// --- Auth Helpers ---

export async function writeAuthToChromeStorage(data: { token: string; user: AuthUser }): Promise<void> {
  if (!hasChromeStorage()) return;

  await new Promise<void>((resolve) => {
    try {
      chrome.storage.local.set({ [CHROME_AUTH_KEY]: data }, () => resolve());
    } catch (error) {
      console.warn('[SecureShield] Failed to persist auth data in chrome.storage', error);
      resolve();
    }
  });
}

export async function readAuthFromChromeStorage(): Promise<{ token: string; user: AuthUser } | null> {
  if (!hasChromeStorage()) return null;

  return new Promise((resolve) => {
    try {
      chrome.storage.local.get([CHROME_AUTH_KEY], (result) => {
        resolve((result?.[CHROME_AUTH_KEY] as { token: string; user: AuthUser }) ?? null);
      });
    } catch (error) {
      console.warn('[SecureShield] Failed to read auth data from chrome.storage', error);
      resolve(null);
    }
  });
}

export async function clearAuthFromChromeStorage(): Promise<void> {
  if (!hasChromeStorage()) return;

  await new Promise<void>((resolve) => {
    try {
      chrome.storage.local.remove([CHROME_AUTH_KEY, CHROME_LOCKS_KEY], () => resolve());
    } catch (error) {
      console.warn('[SecureShield] Failed to remove auth data from chrome.storage', error);
      resolve();
    }
  });
}

// --- Lock Sync Helpers ---

export interface LockedDomainCache {
  [hostname: string]: {
    lockId: number;
    name: string;
  };
}

export async function syncLocksToChromeStorage(locks: TabLock[]): Promise<void> {
  if (!hasChromeStorage()) return;

  const lockCache: LockedDomainCache = {};

  locks.forEach((lock) => {
    if (lock.status === 'locked') {
      lock.tabs.forEach((tab) => {
        try {
          // Extract hostname for robust matching (remove www.)
          const hostname = new URL(tab.url).hostname.replace(/^www\./, '');
          lockCache[hostname] = {
            lockId: lock.id,
            name: lock.name,
          };
        } catch (e) {
          // Ignore invalid URLs
        }
      });
    }
  });

  await new Promise<void>((resolve) => {
    chrome.storage.local.set({ [CHROME_LOCKS_KEY]: lockCache }, () => resolve());
  });
}

export async function readLocksFromChromeStorage(): Promise<LockedDomainCache> {
  if (!hasChromeStorage()) return {};

  return new Promise((resolve) => {
    chrome.storage.local.get([CHROME_LOCKS_KEY], (result) => {
      resolve((result?.[CHROME_LOCKS_KEY] as LockedDomainCache) ?? {});
    });
  });
}

export { CHROME_AUTH_KEY, CHROME_LOCKS_KEY };