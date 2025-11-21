import { readLocksFromChromeStorage } from '../utils/chromeStorage';

// ==================== 1. CONSTANTS & SETUP ====================
const SESSION_UNLOCK_PREFIX = 'secureShield_unlocked_';
const BUTTON_ID = 'secureshield-floating-lock-button';

function getSessionKey(hostname: string): string {
  return SESSION_UNLOCK_PREFIX + hostname.replace(/^www\./, '');
}

async function checkLockStatus() {
  const hostname = window.location.hostname.replace(/^www\./, '');
  
  // 1. Check Session Bypass FIRST
  const isUnlocked = sessionStorage.getItem(getSessionKey(hostname)) === 'true';
  if (isUnlocked) {
    console.log(`[Content] 🔓 Session Bypass Active for ${hostname}`);
    injectFloatingButton(); // Allow locking even if unlocked temporarily
    return; 
  }

  // 2. Check Chrome Storage
  const locks = await readLocksFromChromeStorage();
  
  if (locks[hostname]) {
    console.log(`[Content] 🔒 Site is LOCKED: ${hostname}`);
    createLockOverlay(locks[hostname].name, locks[hostname].lockId, hostname);
  } else {
    console.log(`[Content] ✅ Site is NOT locked: ${hostname}`);
    injectFloatingButton(); // Show button to allow locking
  }
}

// ==================== 2. LOCK OVERLAY UI (Shadow DOM) ====================

function createLockOverlay(lockName: string, lockId: number, hostname: string) {
  if (document.getElementById('secureshield-root')) return;

  const rootHost = document.createElement('div');
  rootHost.id = 'secureshield-root';
  document.body.appendChild(rootHost);
  const shadow = rootHost.attachShadow({ mode: 'closed' });

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
        sessionStorage.setItem(getSessionKey(hostname), 'true');
        errorMsg.textContent = '✓ Unlocked';
        errorMsg.style.color = '#10b981';
        errorMsg.style.display = 'block';
        setTimeout(() => window.location.reload(), 500);
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

// ==================== 3. FLOATING BUTTON UI ====================

function injectFloatingButton() {
  if (document.getElementById(BUTTON_ID)) return;

  const btn = document.createElement('button');
  btn.id = BUTTON_ID;
  btn.innerHTML = '🔒 Lock';
  btn.style.cssText = `
    position: fixed; bottom: 20px; right: 20px; z-index: 2147483646;
    background: linear-gradient(135deg, #2563eb, #7c3aed); color: white;
    border: none; border-radius: 50px; padding: 10px 20px;
    font-weight: 600; font-family: system-ui, sans-serif;
    box-shadow: 0 4px 15px rgba(0,0,0,0.2); cursor: pointer;
    transition: transform 0.2s;
  `;
  
  btn.onmouseenter = () => { btn.style.transform = 'scale(1.05)'; };
  btn.onmouseleave = () => { btn.style.transform = 'scale(1)'; };
  btn.onclick = showQuickLockModal;

  document.body.appendChild(btn);
}

function showQuickLockModal() {
  const overlayId = 'secureshield-quick-lock';
  if (document.getElementById(overlayId)) return;

  const modal = document.createElement('div');
  modal.id = overlayId;
  modal.style.cssText = `
    position: fixed; top: 0; left: 0; width: 100%; height: 100%;
    background: rgba(0,0,0,0.5); z-index: 2147483647;
    display: flex; justify-content: center; align-items: center;
    font-family: system-ui, sans-serif;
  `;

  modal.innerHTML = `
    <div style="background: white; padding: 2rem; border-radius: 12px; width: 320px; text-align: center;">
      <h2 style="margin-top: 0; color: #1f2937;">Lock Current Site</h2>
      <p style="color: #6b7280; font-size: 0.9rem;">Enter your PIN to lock:<br><strong>${window.location.hostname}</strong></p>
      <input type="password" id="ql-pin" placeholder="Security PIN" style="width: 100%; padding: 10px; margin: 10px 0; border: 1px solid #ddd; border-radius: 6px;">
      <div style="display: flex; gap: 10px; justify-content: center; margin-top: 10px;">
        <button id="ql-cancel" style="background: #eee; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer;">Cancel</button>
        <button id="ql-confirm" style="background: #2563eb; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer;">Lock</button>
      </div>
      <div id="ql-error" style="color: red; font-size: 0.8rem; margin-top: 10px;"></div>
    </div>
  `;

  document.body.appendChild(modal);

  const close = () => modal.remove();
  const input = modal.querySelector('#ql-pin') as HTMLInputElement;
  const error = modal.querySelector('#ql-error') as HTMLDivElement;
  
  modal.querySelector('#ql-cancel')?.addEventListener('click', close);
  
  const doLock = async () => {
    if (!input.value || input.value.length < 4) {
      error.textContent = 'PIN must be 4+ chars';
      return;
    }
    
    try {
      // Need to import TabInfo structure to match API
      const tabInfo = { title: document.title, url: window.location.href };
      
      const response = await chrome.runtime.sendMessage({
        type: 'CREATE_LOCK',
        pin: input.value,
        tabs: [tabInfo]
      });

      if (response && response.success) {
        close();
        window.location.reload();
      } else {
        error.textContent = response?.error || 'Failed. Check PIN.';
      }
    } catch (e) {
      error.textContent = 'Connection error.';
    }
  };

  modal.querySelector('#ql-confirm')?.addEventListener('click', doLock);
  input.focus();
}

checkLockStatus();