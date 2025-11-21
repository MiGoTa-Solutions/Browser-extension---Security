import { readLocksFromChromeStorage } from '../utils/chromeStorage';

// ==================== 1. SESSION BYPASS MECHANISM ====================
// This prevents the "Unlock -> Reload -> Lock Again" loop
// It persists across reloads within the same tab session
const SESSION_UNLOCK_PREFIX = 'secureShield_unlocked_';

function getSessionKey(hostname: string): string {
  // Remove 'www.' to match how keys are stored
  return SESSION_UNLOCK_PREFIX + hostname.replace(/^www\./, '');
}

async function checkLockStatus() {
  const hostname = window.location.hostname.replace(/^www\./, '');
  
  // 1. Check Session Bypass FIRST (Immediate check)
  const isUnlocked = sessionStorage.getItem(getSessionKey(hostname)) === 'true';
  if (isUnlocked) {
    console.log(`[Content] 🔓 Session Bypass Active for ${hostname}`);
    return; 
  }

  // 2. Check Chrome Storage
  const locks = await readLocksFromChromeStorage();
  
  if (locks[hostname]) {
    console.log(`[Content] 🔒 Site is LOCKED: ${hostname}`);
    createLockOverlay(locks[hostname].name, locks[hostname].lockId, hostname);
  } else {
    console.log(`[Content] ✅ Site is NOT locked: ${hostname}`);
  }
}

// ==================== 2. OVERLAY UI ====================

function createLockOverlay(lockName: string, lockId: number, hostname: string) {
  if (document.getElementById('secureshield-root')) return;

  // Use Shadow DOM to isolate styles from the page
  const rootHost = document.createElement('div');
  rootHost.id = 'secureshield-root';
  document.body.appendChild(rootHost);
  const shadow = rootHost.attachShadow({ mode: 'closed' });

  // Stop scrolling
  document.body.style.overflow = 'hidden';

  const overlay = document.createElement('div');
  overlay.style.cssText = `
    position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
    background-color: #f3f4f6; z-index: 2147483647;
    display: flex; justify-content: center; align-items: center;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  `;

  overlay.innerHTML = `
    <div style="background: white; padding: 2.5rem; border-radius: 1rem; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25); width: 90%; max-width: 400px; text-align: center; color: #1f2937;">
      <div style="margin: 0 auto 1.5rem; width: 3rem; height: 3rem; background: #eff6ff; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #2563eb;">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
      </div>
      <h1 style="font-size: 1.5rem; font-weight: 700; margin-bottom: 0.5rem;">Site Locked</h1>
      <p style="color: #6b7280; margin-bottom: 2rem;">
        <strong>${hostname}</strong> is protected by<br>${lockName}
      </p>
      
      <input type="password" id="pin" placeholder="Enter PIN" style="width: 100%; padding: 0.75rem; margin-bottom: 1rem; border: 1px solid #e5e7eb; border-radius: 0.5rem; box-sizing: border-box; font-size: 1rem; outline: none;">
      <button id="unlock" style="width: 100%; background: #2563eb; color: white; padding: 0.75rem; border-radius: 0.5rem; border: none; font-weight: 600; cursor: pointer; font-size: 1rem;">Unlock Access</button>
      <p id="error" style="color: #ef4444; font-size: 0.875rem; margin-top: 1rem; display: none;"></p>
    </div>
  `;

  shadow.appendChild(overlay);

  const input = overlay.querySelector('#pin') as HTMLInputElement;
  const btn = overlay.querySelector('#unlock') as HTMLButtonElement;
  const errorMsg = overlay.querySelector('#error') as HTMLParagraphElement;

  if(input) input.focus();

  const handleUnlock = async () => {
    const pin = input.value;
    if (!pin) return;

    btn.textContent = 'Verifying...';
    btn.disabled = true;
    errorMsg.style.display = 'none';

    try {
      const response = await chrome.runtime.sendMessage({ type: 'UNLOCK_SITE', lockId, pin });

      if (response && response.success) {
        // CRITICAL: Set session bypass before reload
        sessionStorage.setItem(getSessionKey(hostname), 'true');
        
        errorMsg.textContent = '✓ Unlocked';
        errorMsg.style.color = '#10b981';
        errorMsg.style.display = 'block';
        
        setTimeout(() => {
          window.location.reload();
        }, 500);
      } else {
        throw new Error(response?.error || 'Incorrect PIN');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unlock failed';
      errorMsg.textContent = msg;
      errorMsg.style.color = '#ef4444';
      errorMsg.style.display = 'block';
      btn.textContent = 'Unlock Access';
      btn.disabled = false;
      input.value = '';
      input.focus();
    }
  };

  btn.onclick = handleUnlock;
  input.onkeydown = (e) => { if (e.key === 'Enter') handleUnlock(); };
}

checkLockStatus();