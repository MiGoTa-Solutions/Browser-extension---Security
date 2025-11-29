// ==================== TYPES ====================

export interface StorageSchema {
  auth_token?: string;
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
  const res = (await chrome.storage.local.get('auth_token')) as StorageSchema;
  return res.auth_token ?? null;
};

export const clearAuthToken = async (): Promise<void> => {
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    await chrome.storage.local.remove('auth_token');
  }
};

// (Lock-related storage removed. External module will supply cache helpers.)