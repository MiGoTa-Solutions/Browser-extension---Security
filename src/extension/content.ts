import { readLocksFromChromeStorage } from '../utils/chromeStorage';

// ==================== 1. SESSION BYPASS MECHANISM ====================
// This prevents the "Unlock -> Reload -> Lock Again" loop
// It persists across reloads within the same tab session
const SESSION_UNLOCK_PREFIX = 'secureShield_unlocked_';

function getSessionKey(): string {
  // Remove 'www.' to match how keys are stored
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
  // If the user just entered the PIN, we trust this flag over chrome.storage
  // because chrome.storage might be slightly stale during the reload race.
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
  // Avoid duplicate overlays
  if (document.getElementById('secureshield-overlay')) return;

  const overlay = document.createElement('div');
  overlay.id = 'secureshield-overlay';
  
  // Robust styling to ensure it covers everything and stays on top
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

  // --- UNLOCK HANDLER ---
  const handleUnlock = async (e?: Event) => {
    // 1. Stop auto-reload behavior
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
      // Check connection
      if (!chrome.runtime?.id) {
        throw new Error('Extension updated. Please refresh page manually.');
      }

      console.log('[Content] 📤 Sending UNLOCK_SITE...');
      const response = await chrome.runtime.sendMessage({ 
        type: 'UNLOCK_SITE', 
        lockId, 
        pin 
      });

      console.log('[Content] 📥 Response:', response);

      if (response && response.success) {
        // --- SUCCESS ---
        // 2. Set Bypass Flag so the reload doesn't lock it again
        setSessionUnlocked();

        errorMsg.textContent = '✓ Unlocked! Reloading...';
        errorMsg.style.color = '#10b981';
        errorMsg.style.display = 'block';
        
        // 3. Wait and Reload
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
        errorMsg.textContent = 'Connection lost. Reloading...';
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

  // Attach listeners with event passing
  btn?.addEventListener('click', handleUnlock);
  input?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleUnlock(e);
  });
}

// Run check immediately
checkLockStatus();