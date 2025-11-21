import { readLocksFromChromeStorage } from '../utils/chromeStorage';

const SESSION_UNLOCK_PREFIX = 'secureShield_unlocked_';
const BUTTON_ID = 'secureshield-floating-lock-button';

function getSessionKey(hostname: string): string {
  return SESSION_UNLOCK_PREFIX + hostname.replace(/^www\./, '');
}

async function checkLockStatus() {
  const hostname = window.location.hostname.replace(/^www\./, '');
  console.log(`[Content] Checking status for: ${hostname}`);
  
  const isUnlocked = sessionStorage.getItem(getSessionKey(hostname)) === 'true';
  if (isUnlocked) {
    console.log(`[Content] 🔓 Session Bypass Active`);
    injectFloatingButton(); 
    return; 
  }

  const locks = await readLocksFromChromeStorage();
  console.log(`[Content] Loaded ${Object.keys(locks).length} locks from storage`);
  
  if (locks[hostname]) {
    console.log(`[Content] 🔒 Site is LOCKED`);
    createLockOverlay(locks[hostname].name, locks[hostname].lockId, hostname);
  } else {
    console.log(`[Content] ✅ Site is NOT locked`);
    injectFloatingButton();
  }
}

// ==================== OVERLAY ====================

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
    font-family: -apple-system, system-ui, sans-serif;
  `;

  overlay.innerHTML = `
    <div style="background: white; padding: 2.5rem; border-radius: 1rem; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25); width: 90%; max-width: 400px; text-align: center;">
      <h1 style="font-size: 1.5rem; font-weight: 700; margin-bottom: 0.5rem; color: #1f2937;">Site Locked</h1>
      <p style="color: #6b7280; margin-bottom: 2rem;">${lockName}</p>
      <input type="password" id="pin" placeholder="Enter PIN" style="width: 100%; padding: 0.75rem; margin-bottom: 1rem; border: 1px solid #e5e7eb; border-radius: 0.5rem;">
      <button id="unlock" style="width: 100%; background: #2563eb; color: white; padding: 0.75rem; border-radius: 0.5rem; font-weight: 600; cursor: pointer; border:none;">Unlock</button>
      <p id="error" style="color: #ef4444; font-size: 0.875rem; margin-top: 1rem; display: none;"></p>
    </div>
  `;

  shadow.appendChild(overlay);

  const input = overlay.querySelector('#pin') as HTMLInputElement;
  const btn = overlay.querySelector('#unlock') as HTMLButtonElement;
  const errorMsg = overlay.querySelector('#error') as HTMLParagraphElement;

  input?.focus();

  const handleUnlock = async () => {
    if (!input.value) return;
    btn.textContent = 'Verifying...';
    
    try {
      const response = await chrome.runtime.sendMessage({ type: 'UNLOCK_SITE', lockId, pin: input.value });
      if (response?.success) {
        sessionStorage.setItem(getSessionKey(hostname), 'true');
        window.location.reload();
      } else {
        errorMsg.textContent = response?.error || 'Incorrect PIN';
        errorMsg.style.display = 'block';
        btn.textContent = 'Unlock';
      }
    } catch (e) {
      console.error(e);
      btn.textContent = 'Unlock';
    }
  };

  btn.onclick = handleUnlock;
  input.onkeydown = (e) => { if (e.key === 'Enter') handleUnlock(); };
}

// ==================== FLOATING BUTTON ====================

function injectFloatingButton() {
  if (document.getElementById(BUTTON_ID)) return;

  const btn = document.createElement('button');
  btn.id = BUTTON_ID;
  btn.innerHTML = '🔒';
  btn.title = "Lock this site";
  btn.style.cssText = `
    position: fixed; bottom: 20px; right: 20px; z-index: 2147483646;
    background: #2563eb; color: white; width: 50px; height: 50px;
    border: none; border-radius: 50%; font-size: 24px;
    box-shadow: 0 4px 10px rgba(0,0,0,0.2); cursor: pointer;
    transition: transform 0.2s; display: flex; justify-content: center; align-items: center;
  `;
  
  btn.onmouseenter = () => { btn.style.transform = 'scale(1.1)'; };
  btn.onmouseleave = () => { btn.style.transform = 'scale(1)'; };
  btn.onclick = showQuickLockModal;

  // Robust injection: ensure body exists
  if (document.body) {
    document.body.appendChild(btn);
  } else {
    window.addEventListener('DOMContentLoaded', () => document.body.appendChild(btn));
  }
}

function showQuickLockModal() {
  const id = 'ss-quick-lock-modal';
  if (document.getElementById(id)) return;

  const modal = document.createElement('div');
  modal.id = id;
  modal.style.cssText = `
    position: fixed; top: 0; left: 0; width: 100%; height: 100%;
    background: rgba(0,0,0,0.5); z-index: 2147483647;
    display: flex; justify-content: center; align-items: center; font-family: system-ui;
  `;

  modal.innerHTML = `
    <div style="background: white; padding: 20px; border-radius: 10px; width: 300px; text-align: center;">
      <h3 style="margin-top: 0;">Lock ${window.location.hostname}?</h3>
      <input type="password" id="ql-pin" placeholder="Enter PIN" style="width: 100%; padding: 8px; margin: 10px 0; border: 1px solid #ccc; border-radius: 4px;">
      <div style="display: flex; gap: 10px; justify-content: center;">
        <button id="ql-cancel" style="padding: 8px 16px; cursor: pointer;">Cancel</button>
        <button id="ql-ok" style="padding: 8px 16px; background: #2563eb; color: white; border: none; border-radius: 4px; cursor: pointer;">Lock</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);
  
  const close = () => modal.remove();
  const input = modal.querySelector('#ql-pin') as HTMLInputElement;
  
  modal.querySelector('#ql-cancel')?.addEventListener('click', close);
  modal.querySelector('#ql-ok')?.addEventListener('click', async () => {
    if (input.value.length < 4) return alert('PIN too short');
    
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'CREATE_LOCK',
        pin: input.value,
        tabs: [{ title: document.title, url: window.location.href }]
      });
      if (response?.success) {
        close();
        window.location.reload();
      } else {
        alert('Failed: ' + (response?.error || 'Unknown error'));
      }
    } catch (e) {
      alert('Extension error. Refresh page.');
    }
  });
  
  input.focus();
}

checkLockStatus();