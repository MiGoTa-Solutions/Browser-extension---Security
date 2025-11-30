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

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const pin = input.value;
        
        btn.textContent = 'Verifying...';
        btn.disabled = true;
        errorMsg.style.display = 'none';

        try {
            // Get token from storage
            const { auth_token } = await chrome.storage.local.get('auth_token');
            
            if (!auth_token) {
                alert('You are not logged in to SecureShield extension.');
                return;
            }

            const response = await fetch(`${API_BASE_URL}/auth/verify-pin`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${auth_token}`
                },
                body: JSON.stringify({ pin })
            });

            if (response.ok) {
                // Unlock successful
                // 1. Notify background to whitelist/unlock
                chrome.runtime.sendMessage({ type: 'UNLOCK_SITE', url: targetUrl });
                
                // 2. Redirect back to original site
                if (targetUrl) {
                    window.location.href = targetUrl;
                } else {
                    window.close(); // Close tab if no target
                }
            } else {
                // Unlock failed
                errorMsg.style.display = 'block';
                input.value = '';
                btn.textContent = 'Unlock Access';
                btn.disabled = false;
            }
        } catch (error) {
            console.error(error);
            alert('Connection error. Is the server running?');
            btn.textContent = 'Unlock Access';
            btn.disabled = false;
        }
    });
});