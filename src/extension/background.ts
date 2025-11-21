import { authApi } from '../services/api';
import { readAuthFromChromeStorage } from '../utils/chromeStorage';

// Basic install listener
chrome.runtime.onInstalled.addListener(() => {
  console.log('SecureShield installed');
});

// Listen for messages from Content Script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'VERIFY_PIN') {
    handleVerifyPin(message.pin)
      .then((isValid) => sendResponse({ success: isValid }))
      .catch((err) => sendResponse({ success: false, error: err.message }));
    
    // Keep the channel open for the asynchronous response
    return true; 
  }
});

async function handleVerifyPin(pin: string): Promise<boolean> {
  const auth = await readAuthFromChromeStorage();
  
  if (!auth || !auth.token) {
    console.warn('VERIFY_PIN failed: User not authenticated');
    return false;
  }

  try {
    // Verify the PIN against the server using the stored token
    await authApi.verifyPin(auth.token, { pin });
    return true;
  } catch (error) {
    console.error('PIN Verification failed:', error);
    return false;
  }
}

export {};