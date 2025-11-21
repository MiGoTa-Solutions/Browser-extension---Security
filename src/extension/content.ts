import { readLocksFromChromeStorage } from '../utils/chromeStorage';

// ==================== HELPER: SESSION BYPASS ====================
// This prevents the "Unlock -> Reload -> Lock Again" loop
const SESSION_UNLOCK_KEY = `secureShield_unlocked_${window.location.hostname}`;

function isSessionUnlocked(): boolean {
  return sessionStorage.getItem(SESSION_UNLOCK_KEY) === 'true';
}

function setSessionUnlocked() {
  sessionStorage.setItem(SESSION_UNLOCK_KEY, 'true');
}

// ==================== MAIN LOGIC ====================

async function checkLockStatus() {
  // 1. Check for immediate session bypass (Optimistic Unlock)
  if (isSessionUnlocked()) {
    console.log('[Content] 🔓 Session is temporarily unlocked (Bypass active)');
    return; 
  }

  const hostname = window.location.hostname.replace(/^www\./, '');
  const locks = await readLocksFromChromeStorage();
  
  console.log('[Content] Checking lock status for:', hostname);
  
  if (locks[hostname]) {
    console.log('[Content] 🔒 Site is LOCKED:', locks[hostname].name);
    createLockOverlay(locks[hostname].name, locks[hostname].lockId);
  } else {
    console.log('[Content] ✅ Site is NOT locked');
  }
}

function createLockOverlay(lockName: string, lockId: number) {
  if (document.getElementById('secureshield-overlay')) return;

  const overlay = document.createElement('div');
  overlay.id = 'secureshield-overlay';
  
  // Overlay Styling
  overlay.style.cssText = `
    position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
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

  // --- UNLOCK HANDLER ---
  // Accepts the event 'e' to prevent default browser behavior
  const handleUnlock = async (e?: Event) => {
    // 1. STOP AUTO-RELOAD
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

    // UI Loading State
    const originalText = btn.textContent;
    btn.textContent = 'Verifying...';
    btn.setAttribute('disabled', 'true');
    errorMsg.style.display = 'none';

    try {
      // 2. Check Connection
      if (!chrome.runtime?.id) {
        throw new Error('Extension disconnected. Please refresh the page manually.');
      }

      console.log('[Content] 📤 Sending UNLOCK_SITE...');
      const response = await chrome.runtime.sendMessage({ 
        type: 'UNLOCK_SITE', 
        lockId, 
        pin 
      });

      console.log('[Content] 📥 Response:', response);

      if (response && response.success) {
        // 3. SET SESSION BYPASS (Critical Fix for Reload Loop)
        setSessionUnlocked();

        errorMsg.textContent = '✓ Unlocked!';
        errorMsg.style.color = '#10b981';
        errorMsg.style.display = 'block';
        
        setTimeout(() => {
          overlay.remove();
          document.body.style.overflow = '';
          window.location.reload();
        }, 500);
      } else {
        throw new Error(response?.error || 'Incorrect PIN');
      }
    } catch (e) {
      console.error('[Content] ❌ Unlock Error:', e);
      const msg = e instanceof Error ? e.message : 'Unknown error';
      
      if (msg.includes('invalidated') || msg.includes('context')) {
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

  btn?.addEventListener('click', handleUnlock);
  
  // Pass 'e' to handleUnlock
  input?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      handleUnlock(e); 
    }
  });
}

// Initial check
checkLockStatus();