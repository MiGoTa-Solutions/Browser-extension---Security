import { readLocksFromChromeStorage } from '../utils/chromeStorage';

// ==================== 1. SESSION BYPASS MECHANISM ====================
// This is the key to fixing the loop. It remembers "Unlock" state 
// across page reloads for this specific tab/session.
const SESSION_UNLOCK_PREFIX = 'secureShield_unlocked_';

function getSessionKey(): string {
  // Remove 'www.' and protocol to match storage keys
  return SESSION_UNLOCK_PREFIX + window.location.hostname.replace(/^www\./, '');
}

function isSessionUnlocked(): boolean {
  return sessionStorage.getItem(getSessionKey()) === 'true';
}

function setSessionUnlocked() {
  console.log('[Content] 🔓 Setting session bypass flag');
  sessionStorage.setItem(getSessionKey(), 'true');
}

// ==================== 2. MAIN CHECK LOGIC ====================

async function checkLockStatus() {
  const hostname = window.location.hostname.replace(/^www\./, '');
  
  console.log(`[Content] Checking status for: ${hostname}`);

  // CRITICAL: Check session bypass FIRST. 
  // If we just unlocked it, ignore chrome.storage for now.
  if (isSessionUnlocked()) {
    console.log('[Content] 🔓 Session Bypass Active - Access Granted');
    return; 
  }

  const locks = await readLocksFromChromeStorage();
  
  if (locks[hostname]) {
    console.log('[Content] 🔒 Site is LOCKED in storage:', locks[hostname].name);
    createLockOverlay(locks[hostname].name, locks[hostname].lockId);
  } else {
    console.log('[Content] ✅ Site is NOT locked in storage');
  }
}

// ==================== 3. OVERLAY & INTERACTION ====================

function createLockOverlay(lockName: string, lockId: number) {
  if (document.getElementById('secureshield-overlay')) return;

  const overlay = document.createElement('div');
  overlay.id = 'secureshield-overlay';
  
  // Heavy-handed styling to ensure it covers everything
  overlay.style.cssText = `
    position: fixed !important; top: 0; left: 0; width: 100vw; height: 100vh;
    background-color: rgba(243, 244, 246, 0.98);
    z-index: 2147483647; display: flex; justify-content: center; align-items: center;
    font-family: ui-sans-serif, system-ui, sans-serif;
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
          style="width: 100%; padding: 0.75rem; border: 1px solid #e5e7eb; border-radius: 0.5rem; font-size: 1rem; outline: none;"
        />
      </div>

      <button id="ss-unlock-btn" style="width: 100%; background: #2563eb; color: white; padding: 0.75rem; border-radius: 0.5rem; font-weight: 600; border: none; cursor: pointer;">
        Unlock Access
      </button>
      
      <p id="ss-error-msg" style="color: #ef4444; font-size: 0.875rem; margin-top: 1rem; display: none;"></p>
    </div>
  `;

  document.body.appendChild(overlay);
  document.body.style.overflow = 'hidden';

  const input = document.getElementById('ss-pin-input') as HTMLInputElement;
  const btn = document.getElementById('ss-unlock-btn');
  const errorMsg = document.getElementById('ss-error-msg');

  if (input) input.focus();

  // --- HANDLE UNLOCK LOGIC ---
  const handleUnlock = async (e?: Event) => {
    // Prevent form submission reload loops
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    if (!input || !btn || !errorMsg) return;
    
    const pin = input.value;
    if (pin.length < 4) {
      errorMsg.textContent = 'PIN must be at least 4 digits';
      errorMsg.style.display = 'block';
      return;
    }

    // UI Feedback
    const originalText = btn.textContent;
    btn.textContent = 'Verifying...';
    btn.setAttribute('disabled', 'true');
    errorMsg.style.display = 'none';

    try {
      // Ensure extension context is alive
      if (!chrome.runtime?.id) {
        throw new Error('Extension context lost. Please refresh the page manually.');
      }

      console.log('[Content] 📤 Sending UNLOCK_SITE...');
      const response = await chrome.runtime.sendMessage({ 
        type: 'UNLOCK_SITE', 
        lockId, 
        pin 
      });

      if (response && response.success) {
        // --- CRITICAL FIX: Set Bypass Flag ---
        setSessionUnlocked();

        errorMsg.textContent = '✓ Unlocked! Reloading...';
        errorMsg.style.color = '#10b981';
        errorMsg.style.display = 'block';
        
        // Wait briefly then reload
        setTimeout(() => {
          overlay.remove();
          document.body.style.overflow = '';
          window.location.reload();
        }, 500);
      } else {
        throw new Error(response?.error || 'Incorrect PIN');
      }
    } catch (e) {
      console.error('[Content] Unlock Error:', e);
      const msg = e instanceof Error ? e.message : 'Unknown error';
      
      // Handle invalidation gracefully
      if (msg.includes('invalidated')) {
        errorMsg.textContent = 'Extension updated. Reloading page...';
        setTimeout(() => window.location.reload(), 1000);
      } else {
        errorMsg.textContent = msg;
        errorMsg.style.color = '#ef4444';
        errorMsg.style.display = 'block';
        btn.textContent = originalText;
        btn.removeAttribute('disabled');
        input.value = '';
        input.focus();
      }
    }
  };

  // Attach listeners
  btn?.addEventListener('click', handleUnlock);
  input?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleUnlock(e);
  });
}

checkLockStatus();
```csv