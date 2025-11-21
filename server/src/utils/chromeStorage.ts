// src/utils/chromeStorage.ts
import { TabLock } from '../types';

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

/**
 * Reads the authenticated user token from storage
 */
export const readAuthFromChromeStorage = async (): Promise<AuthStorage | null> => {
  const result = await chrome.storage.local.get(['auth_token', 'auth_user']);
  if (result.auth_token) {
    return { token: result.auth_token, user: result.auth_user };
  }
  return null;
};

/**
 * Reads the cached list of locked domains
 */
export const readLocksFromChromeStorage = async (): Promise<LockedDomainCache> => {
  const result = await chrome.storage.local.get('locked_domains');
  return result.locked_domains || {};
};

/**
 * Syncs the list of locks from the Database API into Chrome Storage
 * Only stores items that are actually STATUS = 'locked'
 */
export const syncLocksToChromeStorage = async (locks: TabLock[]) => {
  const cache: LockedDomainCache = {};

  locks.forEach((lock) => {
    if (lock.status === 'locked') {
      lock.tabs.forEach((tab) => {
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

  await chrome.storage.local.set({ locked_domains: cache });
  return cache;
};