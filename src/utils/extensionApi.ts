// ⚠️ IMPORTANT: Replace this with your actual Extension ID from chrome://extensions
// If you are in development mode, this ID changes unless you set a "key" in manifest.json
const EXTENSION_ID = "ikjflgmjpfgpmfemhlogmochmjcjhihg"; 

/**
 * safeSendMessage
 * Safely checks if we are running inside the extension context.
 * This prevents crashes on the web app (localhost).
 */
export const isExtensionContext = (): boolean => {
  return (
    typeof chrome !== 'undefined' &&
    !!chrome.runtime &&
    !!chrome.runtime.id // .id is usually undefined on standard web pages
  );
};

/**
 * Triggers a sync event.
 * - If inside the Extension: Sends an internal message.
 * - If on the Web App: Sends an external message to the Extension ID.
 */
export const notifyExtensionSync = async () => {
  // 1. Internal Sync (Extension Popup/Background)
  if (isExtensionContext()) {
    try {
      await chrome.runtime.sendMessage({ type: 'SYNC_LOCKS' });
      return;
    } catch (e) {
      // Ignore errors (e.g., background script sleeping)
      console.debug('[ExtensionApi] Internal sync skipped');
    }
  }

  // 2. External Sync (Web Dashboard)
  // This requires "externally_connectable" in manifest.json
  if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
    try {
      // Send message to the specific Extension ID
      await chrome.runtime.sendMessage(EXTENSION_ID, { type: 'SYNC_LOCKS' });
      console.log('[ExtensionApi] Sync signal sent to extension');
    } catch (e) {
      console.warn("[ExtensionApi] Extension not found or connection not allowed. Check manifest.json 'externally_connectable'.", e);
    }
  }
};
