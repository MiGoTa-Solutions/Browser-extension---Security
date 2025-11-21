import { getLockForDomain } from '../utils/chromeStorage';

const SESSION_KEY_PREFIX = 'ss_unlocked_';

async function init() {
  const hostname = window.location.hostname;
  
  // 1. Check Session Storage (Fast Pass)
  if (sessionStorage.getItem(SESSION_KEY_PREFIX + hostname)) {
    console.log('[Content] Session unlocked.');
    return;
  }

  // 2. Check Locks
  const lock = await getLockForDomain(hostname);
  if (lock) {
    console.log('[Content] Locking:', hostname);
    enforceLock(lock);
  }
}

function enforceLock(lock: { id: number; name: string }) {
  // Create Host
  const host = document.createElement('div');
  host.id = 'secure-shield-root';
  
  // Shadow DOM to protect styles
  const shadow = host.attachShadow({ mode: 'closed' });
  
  // Style
  const style = document.createElement('style');
  style.textContent = `
    :host { all: initial; }
    .overlay {
      position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
      background: #f3f4f6; z-index: 2147483647;
      display: flex; align-items: center; justify-content: center;
      font-family: system-ui, sans-serif;
    }
    .card {
      background: white; padding: 2rem; border-radius: 1rem;
      box-shadow: 0 10px 25px rgba(0,0,0,0.1);
      text-align: center; width: 90%; max-width: 400px;
    }
    h1 { margin: 0 0 1rem 0; color: #111827; }
    input { 
      width: 100%; padding: 0.75rem; border: 1px solid #e5e7eb; 
      border-radius: 0.5rem; margin-bottom: 1rem;
      box-sizing: border-box; font-size: 1rem;
    }
    button {
      background: #2563eb; color: white; width: 100%;
      padding: 0.75rem; border: none; border-radius: 0.5rem;
      font-weight: bold; cursor: pointer; font-size: 1rem;
    }
    button:disabled { opacity: 0.7; cursor: wait; }
    .error { color: #ef4444; margin-top: 1rem; font-size: 0.875rem; }
  `;

  // UI
  const container = document.createElement('div');
  container.className = 'overlay';
  container.innerHTML = `
    <div class="card">
      <h1>Site Locked</h1>
      <p>Access to <strong>${lock.name}</strong> is restricted.</p>
      <input type="password" placeholder="Enter PIN" id="pin" />
      <button id="unlockBtn">Unlock</button>
      <div class="error" id="errorMsg"></div>
    </div>
  `;

  shadow.appendChild(style);
  shadow.appendChild(container);

  // Logic
  const pinInput = container.querySelector('#pin') as HTMLInputElement;
  const btn = container.querySelector('#unlockBtn') as HTMLButtonElement;
  const errorMsg = container.querySelector('#errorMsg') as HTMLDivElement;

  const handleUnlock = async () => {
    btn.disabled = true;
    btn.textContent = 'Verifying...';
    errorMsg.textContent = '';

    chrome.runtime.sendMessage({ 
      type: 'UNLOCK_REQUEST', 
      lockId: lock.id, 
      pin: pinInput.value 
    }, (response) => {
      if (response && response.success) {
        // SUCCESS: Set session flag and reload
        sessionStorage.setItem(SESSION_KEY_PREFIX + window.location.hostname, 'true');
        window.location.reload();
      } else {
        btn.disabled = false;
        btn.textContent = 'Unlock';
        errorMsg.textContent = response?.error || 'Incorrect PIN';
      }
    });
  };

  btn.onclick = handleUnlock;
  
  // Anti-Tamper: Stop body scroll and prevent removal
  document.documentElement.style.overflow = 'hidden';
  document.body.appendChild(host);

  const observer = new MutationObserver(() => {
    if (!document.body.contains(host)) {
      document.body.appendChild(host);
      document.documentElement.style.overflow = 'hidden';
    }
  });
  
  observer.observe(document.body, { childList: true, subtree: true });
}

// Run
init();