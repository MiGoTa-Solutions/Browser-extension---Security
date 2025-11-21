// Type definitions
export interface CachedLock {
  id: number;
  name: string;
  domains: string[]; // List of URLs/Hostnames
}

export interface StorageSchema {
  auth_token?: string;
  locked_domains?: Record<string, number>; // hostname -> lock_id
  lock_metadata?: Record<number, { name: string }>; // lock_id -> details
}

// 1. Save Auth Token (Call this from your Login page!)
export const saveAuthToken = async (token: string) => {
  await chrome.storage.local.set({ auth_token: token });
};

// 2. Get Auth Token
export const getAuthToken = async (): Promise<string | null> => {
  const res = await chrome.storage.local.get('auth_token');
  return res.auth_token || null;
};

// 3. Sync Logic (Called by Background)
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

// 4. Read Logic (Called by Content Script)
export const getLockForDomain = async (hostname: string) => {
  const { locked_domains, lock_metadata } = await chrome.storage.local.get(['locked_domains', 'lock_metadata']);
  if (!locked_domains) return null;

  // Simple normalization
  const cleanHost = hostname.replace(/^www\./, '');
  
  // Exact match or subdomain match
  // We search keys because we need to handle "google.com" matching "mail.google.com"
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