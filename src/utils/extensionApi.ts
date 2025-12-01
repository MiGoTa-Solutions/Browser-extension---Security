// Hardcode your extension ID (you get this from chrome://extensions)
// For development, this ID changes unless you set a "key" in manifest.json
const EXTENSION_ID = "YOUR_ACTUAL_EXTENSION_ID_HERE"; 

export const notifyExtensionSync = async () => {
  // If we are IN the extension, send normally
  if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id) {
     try {
       await chrome.runtime.sendMessage({ type: 'SYNC_LOCKS' });
       return;
     } catch (e) { /* ignore */ }
  }

  // If we are on the WEB APP, send to the specific Extension ID
  if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
    try {
      // This sends a message "externally" to the extension
      await chrome.runtime.sendMessage(EXTENSION_ID, { type: 'SYNC_LOCKS' });
    } catch (e) {
      console.warn("Extension not found or not installed.");
    }
  }
};