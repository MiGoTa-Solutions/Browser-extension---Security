import { AuthUser } from '../types';

const CHROME_AUTH_KEY = 'secureShield.auth';

function hasChromeStorage(): boolean {
  return typeof chrome !== 'undefined' && typeof chrome.storage?.local !== 'undefined';
}

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
      chrome.storage.local.remove(CHROME_AUTH_KEY, () => resolve());
    } catch (error) {
      console.warn('[SecureShield] Failed to remove auth data from chrome.storage', error);
      resolve();
    }
  });
}

export { CHROME_AUTH_KEY };