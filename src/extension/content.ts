const API_BASE_URL = 'http://127.0.0.1:4000/api';
const GEMINI_API_KEY = 'AIzaSyDvHWTKIxHxGo1IWwEPZNqzvnBYuzUFVDc'; // Friend's Key
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

// --- INJECT STYLES ---
const style = document.createElement('style');
style.textContent = `
  #ss-float-btn { position: fixed; bottom: 24px; right: 24px; width: 56px; height: 56px; border-radius: 50%; background: linear-gradient(135deg, #6c63ff, #5850d6); color: white; border: none; font-size: 24px; cursor: pointer; z-index: 2147483647; box-shadow: 0 4px 16px rgba(108,99,255,0.4); display: flex; align-items: center; justify-content: center; transition: transform 0.2s; }
  #ss-float-btn:hover { transform: scale(1.1); }
  .ss-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(5,8,22,0.85); backdrop-filter: blur(8px); z-index: 2147483647; display: flex; justify-content: center; align-items: center; }
  .ss-popup { background: rgba(11,20,40,0.95); padding: 32px; border-radius: 16px; width: 90%; max-width: 500px; color: #f8fbff; font-family: system-ui, sans-serif; border: 1px solid rgba(255,255,255,0.1); max-height: 80vh; overflow-y: auto; }
  .ss-btn { padding: 10px 20px; border-radius: 8px; border: none; cursor: pointer; margin: 5px; font-weight: 600; }
  .ss-btn-primary { background: #6c63ff; color: white; }
  .ss-btn-danger { background: rgba(231,76,60,0.2); color: #e74c3c; border: 1px solid #e74c3c; }
`;
document.head.appendChild(style);

// --- HELPER TYPES ---
interface SiteAnalysis {
  description: string;
  pros: string[];
  cons: string[];
}

// --- MAIN LOGIC ---
async function init() {
  const { lockedSites } = await chrome.storage.local.get('lockedSites');
  const hostname = window.location.hostname.toLowerCase();
  
  // Don't show button if site is already locked
  if (Array.isArray(lockedSites) && lockedSites.some((l: any) => l.is_locked && hostname.includes(l.url))) {
    return; 
  }

  const btn = document.createElement('button');
  btn.id = 'ss-float-btn';
  btn.innerHTML = '🔒';
  btn.onclick = handleLockClick;
  document.body.appendChild(btn);
}

async function handleLockClick() {
  const { auth_token } = await chrome.storage.local.get('auth_token');
  if (!auth_token) return alert('Please log in to SecureShield extension.');

  const btn = document.getElementById('ss-float-btn')!;
  btn.innerHTML = '⏳';
  
  try {
    const prompt = `Analyze ${window.location.href}. Return valid JSON only: {"description": "string", "pros": ["string"], "cons": ["string"]}`;
    const res = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST', headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
    });
    
    const data = await res.json();
    const jsonText = data.candidates[0].content.parts[0].text.replace(/```json|```/g, '').trim();
    const analysis = JSON.parse(jsonText);
    showPopup(analysis, auth_token);
  } catch (e) {
    alert('AI Analysis failed.');
    console.error(e);
  } finally {
    btn.innerHTML = '🔒';
  }
}

function showPopup(data: SiteAnalysis, token: string) {
  const overlay = document.createElement('div');
  overlay.className = 'ss-overlay';
  overlay.innerHTML = `
    <div class="ss-popup">
      <h2 style="color:#6c63ff; margin-top:0">Website Analysis</h2>
      <p>${data.description}</p>
      <h3 style="color:#2ecc71">Why Lock?</h3><ul>${data.pros.map(p=>`<li>${p}</li>`).join('')}</ul>
      <h3 style="color:#e74c3c">Cons</h3><ul>${data.cons.map(c=>`<li>${c}</li>`).join('')}</ul>
      <div style="text-align:center; margin-top:20px">
        <button class="ss-btn ss-btn-danger" id="ss-close">Close</button>
        <button class="ss-btn ss-btn-primary" id="ss-confirm">Lock Site</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  
  document.getElementById('ss-close')!.onclick = () => overlay.remove();
  document.getElementById('ss-confirm')!.onclick = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/locks`, {
        method: 'POST', headers: {'Content-Type':'application/json', 'Authorization': `Bearer ${token}`},
        body: JSON.stringify({ url: window.location.hostname, name: document.title })
      });
      if(res.ok) {
        chrome.runtime.sendMessage({ type: 'SYNC_LOCKS' });
        alert('Locked! Refreshing...');
        window.location.reload();
      } else {
        alert('Failed to lock.');
      }
    } catch(e) { console.error(e); }
  };
}

init();