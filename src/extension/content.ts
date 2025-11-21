import { readLocksFromChromeStorage } from '../utils/chromeStorage';

// Check if current site is locked
async function checkLockStatus() {
  const hostname = window.location.hostname.replace(/^www\./, '');
  const locks = await readLocksFromChromeStorage();
  
  console.log('[Content Script] Checking lock status for:', hostname);
  console.log('[Content Script] Locked sites in storage:', Object.keys(locks));
  
  if (locks[hostname]) {
    console.log('[Content Script] 🔒 Site is LOCKED - Lock ID:', locks[hostname].lockId, 'Name:', locks[hostname].name);
    createLockOverlay(locks[hostname].name, locks[hostname].lockId);
  } else {
    console.log('[Content Script] ✅ Site is NOT locked - access granted');
  }
}

function createLockOverlay(lockName: string, lockId: number) {
  // Avoid duplicate overlays
  if (document.getElementById('secureshield-overlay')) return;

  // Create Overlay
  const overlay = document.createElement('div');
  overlay.id = 'secureshield-overlay';
  
  // Styling (matching Migota Blue/Clean theme)
  overlay.style.cssText = `
    position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
    background-color: rgba(243, 244, 246, 0.98); /* gray-100 with high opacity */
    z-index: 2147483647; display: flex; justify-content: center; align-items: center;
    font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  `;

  overlay.innerHTML = `
    <div style="background: white; padding: 2.5rem; border-radius: 1rem; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25); text-align: center; max-width: 28rem; width: 90%;">
      <div style="margin: 0 auto 1.5rem; width: 3rem; height: 3rem; background: #eff6ff; border-radius: 50%; display: flex; items-center; justify-content: center; color: #2563eb;">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
      </div>
      
      <h1 style="font-size: 1.5rem; font-weight: 700; color: #111827; margin-bottom: 0.5rem;">Site Locked</h1>
      <p style="color: #6b7280; margin-bottom: 2rem;">
        Access to <strong>${window.location.hostname}</strong> is protected by<br>SecureShield (${lockName}).
      </p>

      <div style="margin-bottom: 1rem;">
        <input type="password" id="ss-pin-input" placeholder="Enter Security PIN" 
          style="width: 100%; padding: 0.75rem; border: 1px solid #e5e7eb; border-radius: 0.5rem; font-size: 1rem; outline: none; transition: border-color 0.2s;"
        />
      </div>

      <button id="ss-unlock-btn" style="width: 100%; background: #2563eb; color: white; padding: 0.75rem; border-radius: 0.5rem; font-weight: 600; border: none; cursor: pointer; transition: background 0.2s;">
        Unlock Access
      </button>
      
      <p id="ss-error-msg" style="color: #ef4444; font-size: 0.875rem; margin-top: 1rem; display: none;"></p>
    </div>
  `;

  document.body.appendChild(overlay);
  document.body.style.overflow = 'hidden'; // Prevent scrolling

  // Event Listeners
  const input = document.getElementById('ss-pin-input') as HTMLInputElement;
  const btn = document.getElementById('ss-unlock-btn');
  const errorMsg = document.getElementById('ss-error-msg');

  if (input) input.focus();

  const handleUnlock = async () => {
    if (!input || !errorMsg || !btn) return;
    
    const pin = input.value;
    console.log('[Content Script] Unlock attempt - Lock ID:', lockId, 'PIN length:', pin.length);
    
    if (pin.length < 4) {
      errorMsg.textContent = 'PIN must be at least 4 digits';
      errorMsg.style.display = 'block';
      console.log('[Content Script] ❌ PIN too short');
      return;
    }

    // UI Loading State
    const originalBtnText = btn.textContent;
    btn.textContent = 'Verifying...';
    btn.setAttribute('disabled', 'true');
    errorMsg.style.display = 'none';

    console.log('[Content Script] 📤 Sending UNLOCK_SITE message to background...');
    
    try {
      // Send message to background to unlock (updates DB + chrome.storage)
      const response = await chrome.runtime.sendMessage({ 
        type: 'UNLOCK_SITE', 
        lockId: lockId,
        pin 
      });

      console.log('[Content Script] 📥 Received response from background:', response);

      if (response && response.success) {
        console.log('[Content Script] ✅ Unlock successful! Removing overlay and reloading...');
        // Success: overlay removed, storage updated, DB unlocked
        overlay.remove();
        document.body.style.overflow = '';
        
        // Reload to show unlocked content
        setTimeout(() => {
          window.location.reload();
        }, 300);
      } else {
        console.log('[Content Script] ❌ Unlock failed:', response?.error);
        errorMsg.textContent = response?.error || 'Incorrect PIN';
        errorMsg.style.display = 'block';
        input.value = '';
        input.focus();
      }
    } catch (e) {
      console.error('[Content Script] ❌ Exception during unlock:', e);
      errorMsg.textContent = 'Unlock failed. Check connection.';
      errorMsg.style.display = 'block';
    } finally {
      btn.textContent = originalBtnText;
      btn.removeAttribute('disabled');
    }
  };

  btn?.addEventListener('click', handleUnlock);
  input?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleUnlock();
  });
}

// Initial check
checkLockStatus();

export {};