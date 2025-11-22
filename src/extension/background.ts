// Web Access Lock background script removed.
// Placeholder keeps service worker minimal until external module is integrated.
chrome.runtime.onInstalled.addListener(() => {
  console.log('[Background] Web Access Lock module removed – no sync or locking active.');
});

chrome.runtime.onMessage.addListener((_msg, _sender, sendResponse) => {
  // Respond to legacy messages gracefully so callers don't crash.
  sendResponse({ success: false, error: 'Web Access Lock module removed' });
  return false;
});