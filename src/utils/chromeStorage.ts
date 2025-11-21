import { AuthUser, TabLock } from '../types';

// ==================== TYPES ====================

export interface CachedLock {
  id: number;
  name: string;
  domains: string[];
}

export interface StorageSchema {
  auth_token?: string;
  locked_domains?: Record<string, number>;
  lock_metadata?: Record<number, { name: string }>;
}

// ==================== AUTH HELPERS ====================

/**
 * Save the Auth Token so the Background Script can read it.
 * Note: We only store the token in Chrome Storage. User details stay in LocalStorage.
 */
export const saveAuthToken = async (token: string): Promise<void> => {
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    await chrome.storage.local.set({ auth_token: token });
  }
};

export const getAuthToken = async (): Promise<string | null> => {
  if (typeof chrome === 'undefined' || !chrome.storage || !chrome.storage.local) return null;
  const res = await chrome.storage.local.get('auth_token');
  return res.auth_token || null;
};

export const clearAuthToken = async (): Promise<void> => {
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    await chrome.storage.local.remove('auth_token');
  }
};

// ==================== LOCK HELPERS ====================

export const updateLockCache = async (apiLocks: CachedLock[]) => {
  const domainMap: Record<string, number> = {};
  const metaMap: Record<number, { name: string }> = {};

  apiLocks.forEach(lock => {
    metaMap[lock.id] = { name: lock.name };
    
    lock.domains.forEach(url => {
      try {
        // Normalize: https://www.google.com -> google.com
        const hostname = new URL(url.startsWith('http') ? url : `https://${url}`).hostname;
        const cleanHost = hostname.replace(/^www\./, '');
        domainMap[cleanHost] = lock.id;
      } catch (e) {
        console.warn('Invalid domain in lock:', url);
      }
    });
  });

  await chrome.storage.local.set({ 
    locked_domains: domainMap,
    lock_metadata: metaMap 
  });
  
  return { domainCount: Object.keys(domainMap).length };
};

export const getLockForDomain = async (hostname: string) => {
  if (typeof chrome === 'undefined' || !chrome.storage || !chrome.storage.local) return null;

  const { locked_domains, lock_metadata } = await chrome.storage.local.get(['locked_domains', 'lock_metadata']);
  if (!locked_domains) return null;

  const cleanHost = hostname.replace(/^www\./, '');
  
  // Check for exact match or subdomain match
  const foundDomain = Object.keys(locked_domains).find(key => 
    cleanHost === key || cleanHost.endsWith('.' + key)
  );

  if (foundDomain) {
    const lockId = locked_domains[foundDomain];
    const meta = lock_metadata?.[lockId];
    return { id: lockId, name: meta?.name || 'Locked Site' };
  }

  return null;
};