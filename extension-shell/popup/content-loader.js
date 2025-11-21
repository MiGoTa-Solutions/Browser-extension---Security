// This loader handles the dynamic import of the actual content script
// which allows it to use ES Modules (import/export)
(async () => {
  try {
    const src = chrome.runtime.getURL('popup/content.js');
    await import(src);
  } catch (e) {
    console.error('[SecureShield] Failed to load content script module:', e);
  }
})();