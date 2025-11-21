// src/extension/content.ts
import { readLocksFromChromeStorage } from '../utils/chromeStorage';

const SESSION_UNLOCK_PREFIX = 'secureShield_unlocked_';

function getSessionKey(domain: string): string {
  return SESSION_UNLOCK_PREFIX + domain;
}

// Helper to check subdomains (e.g. 'mail.google.com' matches 'google.com')
function isDomainMatch(currentHost: string, lockedHost: string): boolean {
  if (currentHost === lockedHost) return true;
  if (currentHost.endsWith('.' + lockedHost)) return true;
  return false;
}

async function checkLockStatus() {
  const currentHost = window.location.hostname.replace(/^www\./, '');
  const locks = await readLocksFromChromeStorage();
  
  // Iterate over all locked domains to find a match (handling subdomains)
  const lockedDomain = Object.keys(locks).find(domain => isDomainMatch(currentHost, domain));

  if (lockedDomain) {
    // Check if we have a session bypass for this SPECIFIC locked domain
    const sessionKey = getSessionKey(lockedDomain);
    if (sessionStorage.getItem(sessionKey) === 'true') {
      console.log(`[Content] 🔓 Session Bypass Active for ${lockedDomain}`);
      return;
    }

    console.log(`[Content] 🔒 Locked by rule: ${lockedDomain}`);
    createLockOverlay(locks[lockedDomain].name, locks[lockedDomain].lockId, lockedDomain);
  }
}

function createLockOverlay(lockName: string, lockId: number, lockedDomainKey: string) {
  // Prevent duplicate overlays
  if (document.getElementById('secureshield-root')) return;

  // Create Shadow DOM container to prevent page CSS from breaking the overlay
  const rootHost = document.createElement('div');
  rootHost.id = 'secureshield-root';
  document.body.appendChild(rootHost);
  const shadow = rootHost.attachShadow({ mode: 'closed' });

  // Stop page scrolling
  document.body.style.overflow = 'hidden';

  const overlay = document.createElement('div');
  overlay.style.cssText = `
    position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
    background-color: #f3f4f6; z-index: 2147483647;
    display: flex; justify-content: center; align-items: center;
    font-family: system-ui, -apple-system, sans-serif;
  `;

  overlay.innerHTML = `
    <div style="background: white; padding: 2.5rem; border-radius: 1rem; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25); width: 90%; max-width: 400px; text-align: center;">
      <div style="margin: 0 auto 1.5rem; width: 3rem; height: 3rem; background: #eff6ff; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #2563eb;">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
      </div>
      <h1 style="font-size: 1.5rem; font-weight: 700; color: #111827; margin-bottom: 0.5rem;">Access Locked</h1>
      <p style="color: #6b7280; margin-bottom: 2rem;">
        ${lockName}<br><span style="font-size:0.8em; opacity:0.7">${window.location.hostname}</span>
      </p>
      <input type="password" id="pin" placeholder="Enter PIN" style="width: 100%; padding: 0.75rem; margin-bottom: 1rem; border: 1px solid #e5e7eb; border-radius: 0.5rem; box-sizing: border-box; outline: none;">
      <button id="unlock" style="width: 100%; background: #2563eb; color: white; padding: 0.75rem; border-radius: 0.5rem; border: none; font-weight: 600; cursor: pointer;">Unlock</button>
      <p id="error" style="color: #ef4444; font-size: 0.875rem; margin-top: 1rem; display: none;"></p>
    </div>
  `;

  shadow.appendChild(overlay);

  const input = overlay.querySelector('#pin') as HTMLInputElement;
  const btn = overlay.querySelector('#unlock') as HTMLButtonElement;
  const errorMsg = overlay.querySelector('#error') as HTMLParagraphElement;

  input.focus();

  const handleUnlock = async () => {
    if (!input.value) return;
    
    btn.textContent = 'Verifying...';
    btn.disabled = true;
    errorMsg.style.display = 'none';

    try {
      const response = await chrome.runtime.sendMessage({ 
        type: 'UNLOCK_SITE', 
        lockId, 
        pin: input.value 
      });

      if (response && response.success) {
        // Set session bypass
        sessionStorage.setItem(getSessionKey(lockedDomainKey), 'true');
        
        errorMsg.textContent = '✓ Unlocked';
        errorMsg.style.color = '#10b981';
        errorMsg.style.display = 'block';
        
        // Wait a moment then reload to clear overlay cleanly and fetch fresh content
        setTimeout(() => {
          window.location.reload();
        }, 500);
      } else {
        throw new Error(response?.error || 'Incorrect PIN');
      }
    } catch (err) {
      errorMsg.textContent = err instanceof Error ? err.message : 'Failed to unlock';
      errorMsg.style.display = 'block';
      errorMsg.style.color = '#ef4444';
      btn.textContent = 'Unlock';
      btn.disabled = false;
    }
  };

  btn.onclick = handleUnlock;
  input.onkeydown = (e) => { if (e.key === 'Enter') handleUnlock(); };
}

// Run Check
checkLockStatus();