/**
 * safeSendMessage
 * Safely sends a message to the Chrome Runtime, but ONLY if we are running
 * inside the extension context. Prevents crashes on the web app (localhost).
 */
export const isExtensionContext = (): boolean => {
  return (
    typeof chrome !== 'undefined' &&
    !!chrome.runtime &&
    !!chrome.runtime.id // This is the key check: .id is undefined on web pages
  );
};

export const notifyExtensionSync = async () => {
  if (isExtensionContext()) {
    try {
      await chrome.runtime.sendMessage({ type: 'FORCE_SYNC' });
    } catch (e) {
      // Ignore errors (e.g. background script sleeping)
      console.debug('[ExtensionApi] Sync signal skipped');
    }
  }
};