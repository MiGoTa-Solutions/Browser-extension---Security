/**
 * Chrome Extension API helpers for communicating with background service worker
 */

import { TabInfo } from '../types';

type BackgroundAction = 'GET_CURRENT_TABS' | 'GET_ACTIVE_TAB' | 'LOCK_TABS' | 'UNLOCK_TABS';

interface RuntimeMessage {
  action: BackgroundAction;
  payload?: unknown;
}

interface MessageResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Check if running in Chrome extension context
 */
export function isExtensionContext(): boolean {
  return typeof chrome !== 'undefined' && chrome.runtime?.id !== undefined;
}

/**
 * Send message to background script
 */
async function sendMessage<T>(action: BackgroundAction, payload?: unknown): Promise<T> {
  if (!isExtensionContext()) {
    throw new Error('Not running in extension context');
  }

  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ action, payload } satisfies RuntimeMessage, (response: MessageResponse<T>) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }

      if (!response.success) {
        reject(new Error(response.error || 'Unknown error'));
        return;
      }

      resolve(response.data as T);
    });
  });
}

/**
 * Get all currently open tabs
 */
export async function getCurrentTabs(): Promise<TabInfo[]> {
  return sendMessage<TabInfo[]>('GET_CURRENT_TABS');
}

/**
 * Get the active tab in the current window
 */
export async function getActiveTab(): Promise<TabInfo> {
  return sendMessage<TabInfo>('GET_ACTIVE_TAB');
}

/**
 * Lock tabs (close them and store state) with optional PIN
 */
export async function lockTabs(lockId: number, tabs: TabInfo[], pin?: string): Promise<void> {
  await sendMessage('LOCK_TABS', { lockId, tabs, pin });
}

/**
 * Unlock tabs (reopen from stored state) with optional PIN
 */
export async function unlockTabs(lockId: number, pin?: string): Promise<void> {
  await sendMessage('UNLOCK_TABS', { lockId, pin });
}
