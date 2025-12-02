// This runs on the lock page
const API_BASE_URL = 'http://127.0.0.1:4000/api';

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('pinForm');
    const input = document.getElementById('pin');
    const errorMsg = document.getElementById('errorMsg');
    const btn = document.getElementById('unlockBtn');

    // Get URL params to find which lock ID this is
    const params = new URLSearchParams(window.location.search);
    const targetUrl = params.get('url');
    const lockId = params.get('id'); // <--- Vital for updating server

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
        if (targetUrl) window.location.href = targetUrl;
        else window.close();
    };

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
                btn.disabled = false;
                return;
            }

            // 1. Verify PIN
            const response = await fetch(`${API_BASE_URL}/auth/verify-pin`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${auth_token}` },
                body: JSON.stringify({ pin })
            });

            if (response.ok) {
                showNotification('Unlocked! Updating status...', false);
                
                // 2. NEW: Update Server DB to mark as Unlocked
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

                // 3. Notify Background to clear immediate blocks
                chrome.runtime.sendMessage({ type: 'UNLOCK_SITE', url: targetUrl });
                chrome.runtime.sendMessage({ type: 'SYNC_LOCKS' }, () => {
                    setTimeout(finishUnlock, 500); 
                });
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