// src/utils/chromeStorage.ts
import { URL } from 'node:url';

interface ChromeStorageArea {
  get: <T = Record<string, unknown>>(
    keys: string | string[] | Record<string, unknown>
  ) => Promise<T>;
  set: (items: Record<string, unknown>) => Promise<void>;
}

interface ChromeTabInfo {
  url: string;
}

export interface ChromeTabLock {
  id: number;
  name: string;
  isGroup: boolean;
  status: 'locked' | 'unlocked';
  tabs: ChromeTabInfo[];
}

// Shape of the data stored in Chrome Local Storage
export interface LockedDomainCache {
  [hostname: string]: {
    lockId: number;
    name: string;
    isGroup: boolean;
  };
}

export interface AuthStorage {
  token: string;
  user: any;
}

function getChromeStorage(): ChromeStorageArea {
  const storage = (
    globalThis as typeof globalThis & {
      chrome?: { storage?: { local?: ChromeStorageArea } };
    }
  ).chrome?.storage?.local;

  if (!storage) {
    throw new Error('Chrome storage API unavailable in this environment');
  }

  return storage;
}

/**
 * Reads the authenticated user token from storage
 */
export const readAuthFromChromeStorage = async (): Promise<AuthStorage | null> => {
  const storage = getChromeStorage();
  const result = await storage.get<{ auth_token?: string; auth_user?: unknown }>(['auth_token', 'auth_user']);
  if (result.auth_token) {
    return { token: result.auth_token, user: result.auth_user };
  }
  return null;
};

/**
 * Reads the cached list of locked domains
 */
export const readLocksFromChromeStorage = async (): Promise<LockedDomainCache> => {
  const storage = getChromeStorage();
  const result = await storage.get<{ locked_domains?: LockedDomainCache }>('locked_domains');
  return result.locked_domains || {};
};

/**
 * Syncs the list of locks from the Database API into Chrome Storage
 * Only stores items that are actually STATUS = 'locked'
 */
export const syncLocksToChromeStorage = async (locks: ChromeTabLock[]) => {
  const cache: LockedDomainCache = {};

  locks.forEach((lock) => {
    if (lock.status === 'locked') {
      lock.tabs.forEach((tab: ChromeTabInfo) => {
        try {
          // Normalize URL to hostname for cache key
          const url = new URL(tab.url);
          const hostname = url.hostname.replace(/^www\./, '');
          
          cache[hostname] = {
            lockId: lock.id,
            name: lock.name,
            isGroup: lock.isGroup
          };
        } catch (e) {
          console.warn('Invalid URL in lock:', tab.url);
        }
      });
    }
  });

  const storage = getChromeStorage();
  await storage.set({ locked_domains: cache });
  return cache;
};