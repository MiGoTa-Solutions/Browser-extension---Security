// This runs on the lock page
const API_BASE_URL = 'http://127.0.0.1:4000/api';

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('pinForm');
    const input = document.getElementById('pin');
    const errorMsg = document.getElementById('errorMsg');
    const btn = document.getElementById('unlockBtn');

    // Get URL params
    const params = new URLSearchParams(window.location.search);
    const targetUrl = params.get('url');
    const lockId = params.get('id'); 

    // --- UI Helper ---
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
        if (targetUrl) {
            window.location.href = targetUrl;
        } else {
            window.close();
        }
    };

    // --- REAL-TIME STATUS CHECKER ---
    const checkLockStatus = async () => {
        try {
            const data = await chrome.storage.local.get(['lockedSites', 'unlockedExceptions']);
            const lockedSites = data.lockedSites || [];
            const exceptions = data.unlockedExceptions || [];

            // 1. Find the specific lock rule for this page (by ID)
            const currentLock = lockedSites.find(l => l.id == lockId);

            // 2. Check if it's unlocked via PIN (Exception list)
            let isLocallyUnlocked = false;
            if (targetUrl) {
                try {
                    // Extract hostname to match background.ts logic
                    let hostname = new URL(targetUrl).hostname.toLowerCase();
                    hostname = hostname.replace(/^(www\.)/, '');
                    
                    isLocallyUnlocked = exceptions.some(ex => ex.includes(hostname));
                } catch(e) {}
            }

            // CRITICAL LOGIC:
            // Redirect IF:
            // a) The lock doesn't exist anymore (Deleted in Web App)
            // b) The lock exists but is_locked is FALSE (Toggled in Web App)
            // c) The user has a local exception (Unlocked via PIN previously)
            if (!currentLock || !currentLock.is_locked || isLocallyUnlocked) {
                console.log("Site unlocked! Redirecting...");
                finishUnlock();
            }
        } catch (err) {
            console.error("Auto-check failed", err);
        }
    };

    // Check once on load
    checkLockStatus();

    // Check whenever storage changes (triggered by Web App Sync or PIN unlock)
    chrome.storage.onChanged.addListener((changes, area) => {
        if (area === 'local') {
            checkLockStatus();
        }
    });
    // --------------------------------

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const pin = input.value;
        
        btn.textContent = 'Verifying...';
        btn.disabled = true;
        errorMsg.style.display = 'none';

        try {
            const { auth_token } = await chrome.storage.local.get('auth_token');
            
            if (!auth_token) {
                showNotification('Please log in to SecureShield extension.', true);
                btn.textContent = 'Unlock Access';
                btn.disabled = false;
                return;
            }

            const response = await fetch(`${API_BASE_URL}/auth/verify-pin`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${auth_token}` },
                body: JSON.stringify({ pin })
            });

            if (response.ok) {
                showNotification('Unlocked! Updating status...', false);
                
                // 1. Update Server Status
                if (lockId) {
                    try {
                        await fetch(`${API_BASE_URL}/locks/${lockId}/status`, {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${auth_token}` },
                            body: JSON.stringify({ is_locked: false })
                        });
                    } catch (err) {
                        console.error("Failed to update server status:", err);
                    }
                }

                // 2. Whitelist Locally & Sync
                // Note: We don't rely purely on this sendMessage callback anymore.
                // The checkLockStatus() listener above will handle the redirection 
                // once the storage updates.
                chrome.runtime.sendMessage({ type: 'UNLOCK_SITE', url: targetUrl });
                chrome.runtime.sendMessage({ type: 'SYNC_LOCKS' });

            } else {
                errorMsg.style.display = 'block';
                input.value = '';
                btn.textContent = 'Unlock Access';
                btn.disabled = false;
            }
        } catch (error) {
            console.error(error);
            showNotification('Connection error.', true);
            btn.textContent = 'Unlock Access';
            btn.disabled = false;
        }
    });
});