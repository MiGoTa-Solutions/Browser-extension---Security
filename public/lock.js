// This runs on the lock page
const API_BASE_URL = 'http://127.0.0.1:4000/api';

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('pinForm');
    const input = document.getElementById('pin');
    const errorMsg = document.getElementById('errorMsg');
    const btn = document.getElementById('unlockBtn');
    const titleElement = document.getElementById('lock-title');
    const headerContainer = document.getElementById('header-container');

    const params = new URLSearchParams(window.location.search);
    const targetUrl = params.get('url');
    const lockId = params.get('id'); 

    // --- UI: Favicon Injection ---
    if (targetUrl && headerContainer) {
        try {
            const domain = new URL(targetUrl).hostname;
            const iconUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=128`; // Larger icon
            
            const img = document.createElement('img');
            img.src = iconUrl;
            img.className = 'w-16 h-16 rounded-xl shadow-md mx-auto mb-4'; // Tailwind classes
            img.alt = `${domain} icon`;
            
            headerContainer.appendChild(img);
            if (titleElement) {
                titleElement.innerText = `Locked: ${domain.replace('www.', '')}`;
            }
        } catch (e) {
            console.error('Favicon load failed', e);
        }
    }
    // ---------------------------

    let isRedirecting = false;

    function showNotification(message, isError = false) {
        let toast = document.getElementById('lock-toast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'lock-toast';
            toast.style.cssText = `
                position: fixed; top: 24px; left: 50%; transform: translateX(-50%) translateY(-20px);
                padding: 12px 24px; border-radius: 8px; color: white; font-weight: 600; z-index: 100;
                opacity: 0; transition: all 0.3s ease; box-shadow: 0 10px 25px rgba(0,0,0,0.2);
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                display: flex; align-items: center; gap: 8px;
            `;
            
            // Add an icon to the toast
            const icon = document.createElement('span');
            icon.innerHTML = isError ? 
                '<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" /></svg>' : 
                '<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM3.857 9.309a1 1 0 011.414-1.414L8.586 11.172l6.143-6.143a1 1 0 011.414 1.414l-7.557 7.557a1 1 0 01-1.414 0L3.857 9.309z" clip-rule="evenodd" /></svg>';
            toast.appendChild(icon);
            
            const textNode = document.createTextNode(message);
            toast.appendChild(textNode);

            document.body.appendChild(toast);
        } else {
            // Update existing toast
            toast.lastChild.textContent = message;
        }
        
        toast.style.backgroundColor = isError ? '#ef4444' : '#10b981';
        toast.style.transform = 'translateX(-50%) translateY(0)';
        toast.style.opacity = '1';
        
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(-50%) translateY(-20px)';
        }, 3000);
    }

    const finishUnlock = () => {
        if (isRedirecting) return;
        isRedirecting = true;
        if (targetUrl) window.location.href = targetUrl;
        else window.close();
    };

    // Listen for remote unlocks (from Web App)
    const checkLockStatus = async () => {
        if (isRedirecting) return;
        try {
            const data = await chrome.storage.local.get(['lockedSites', 'unlockedExceptions']);
            const lockedSites = data.lockedSites || [];
            const exceptions = data.unlockedExceptions || [];
            const currentLock = lockedSites.find(l => l.id == lockId);

            let isLocallyUnlocked = false;
            if (targetUrl) {
                try {
                    let hostname = new URL(targetUrl).hostname.toLowerCase();
                    hostname = hostname.replace(/^(www\.)/, '');
                    isLocallyUnlocked = exceptions.some(ex => ex.includes(hostname));
                } catch(e) {}
            }

            if (!currentLock || !currentLock.is_locked || isLocallyUnlocked) {
                console.log("Status change detected. Unlocking...");
                finishUnlock();
            }
        } catch (err) { }
    };

    checkLockStatus();
    chrome.storage.onChanged.addListener((changes, area) => {
        if (area === 'local') checkLockStatus();
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (isRedirecting) return;
        const pin = input.value;
        
        btn.innerHTML = '<svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Verifying...';
        btn.disabled = true;
        errorMsg.classList.add('hidden');

        try {
            const { auth_token } = await chrome.storage.local.get('auth_token');
            if (!auth_token) {
                showNotification('Please log in to SecureShield extension.', true);
                btn.disabled = false;
                btn.textContent = 'Unlock Access';
                return;
            }

            const response = await fetch(`${API_BASE_URL}/auth/verify-pin`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${auth_token}` },
                body: JSON.stringify({ pin })
            });

            if (response.ok) {
                showNotification('Unlocked! Redirecting...', false);
                
                if (lockId) {
                    fetch(`${API_BASE_URL}/locks/${lockId}/status`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${auth_token}` },
                        body: JSON.stringify({ is_locked: false })
                    }).catch(console.error);
                }

                chrome.runtime.sendMessage({ type: 'UNLOCK_SITE', url: targetUrl });
                chrome.runtime.sendMessage({ type: 'SYNC_LOCKS' });
                setTimeout(finishUnlock, 500); 

            } else {
                errorMsg.classList.remove('hidden');
                input.value = '';
                btn.textContent = 'Unlock Access';
                btn.disabled = false;
                input.focus();
            }
        } catch (error) {
            showNotification('Connection error.', true);
            btn.textContent = 'Unlock Access';
            btn.disabled = false;
        }
    });
});