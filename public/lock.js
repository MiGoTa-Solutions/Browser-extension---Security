const API_BASE_URL = 'http://127.0.0.1:4000/api';

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('pinForm');
    const input = document.getElementById('pin');
    const errorMsg = document.getElementById('errorMsg');
    const btn = document.getElementById('unlockBtn');

    const params = new URLSearchParams(window.location.search);
    const targetUrl = params.get('url');
    const lockId = params.get('id'); 

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
            `;
            document.body.appendChild(toast);
        }
        toast.textContent = message;
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

            // Redirect if lock deleted, disabled, or locally excepted
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
        
        btn.textContent = 'Verifying...';
        btn.disabled = true;
        errorMsg.style.display = 'none';

        try {
            const { auth_token } = await chrome.storage.local.get('auth_token');
            if (!auth_token) {
                showNotification('Please log in to SecureShield extension.', true);
                btn.disabled = false;
                return;
            }

            const response = await fetch(`${API_BASE_URL}/auth/verify-pin`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${auth_token}` },
                body: JSON.stringify({ pin })
            });

            if (response.ok) {
                showNotification('Unlocked! Redirecting...', false);
                
                // Update Server
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
                errorMsg.style.display = 'block';
                input.value = '';
                btn.textContent = 'Unlock Access';
                btn.disabled = false;
            }
        } catch (error) {
            showNotification('Connection error.', true);
            btn.textContent = 'Unlock Access';
            btn.disabled = false;
        }
    });
});