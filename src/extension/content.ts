// Define API URL relative to the extension
const API_BASE_URL = 'http://localhost:4000/api';
const GEMINI_API_KEY = 'AIzaSyDvHWTKIxHxGo1IWwEPZNqzvnBYuzUFVDc'; // Key from friend's repo

interface TabLock {
  id: number;
  url: string;
  is_locked: boolean;
}

type SiteAnalysis = {
  description: string;
  pros: string[];
  cons: string[];
};

// --- STYLES INJECTION ---
const style = document.createElement('style');
style.textContent = `
  #secure-shield-float-btn {
    position: fixed; bottom: 24px; right: 24px; width: 56px; height: 56px;
    border-radius: 50%; background: linear-gradient(135deg, #6c63ff 0%, #5850d6 100%);
    border: none; color: white; font-size: 24px; cursor: pointer; z-index: 2147483647;
    box-shadow: 0 4px 16px rgba(108,99,255,0.4); display: flex; align-items: center; justify-content: center;
    transition: transform 0.2s;
  }
  #secure-shield-float-btn:hover { transform: scale(1.1); }
  
  .ss-overlay {
    position: fixed; top: 0; left: 0; width: 100%; height: 100%;
    background: rgba(5,8,22,0.85); backdrop-filter: blur(8px);
    z-index: 2147483647; display: flex; justify-content: center; align-items: center;
  }
  .ss-popup {
    background: rgba(11,20,40,0.95); border: 1px solid rgba(255,255,255,0.1);
    padding: 32px; border-radius: 16px; width: 90%; max-width: 600px; max-height: 80vh;
    overflow-y: auto; color: #f8fbff; font-family: system-ui, sans-serif;
    box-shadow: 0 20px 50px rgba(0,0,0,0.5);
  }
  .ss-btn {
    padding: 10px 20px; border-radius: 8px; border: none; cursor: pointer; font-weight: 600; margin: 5px;
  }
  .ss-btn-primary { background: #6c63ff; color: white; }
  .ss-btn-danger { background: rgba(231,76,60,0.2); color: #e74c3c; border: 1px solid rgba(231,76,60,0.3); }
`;
document.head.appendChild(style);

// --- MAIN LOGIC ---
async function init() {
  // Check if site is already locked to avoid showing button on locked pages
  const { lockedSites } = (await chrome.storage.local.get('lockedSites')) as {
    lockedSites?: TabLock[];
  };
  const hostname = window.location.hostname;
  
  if (Array.isArray(lockedSites) && lockedSites.some((l) => l.is_locked && hostname.includes(l.url))) {
    return; // Don't show button on locked sites
  }

  createFloatingButton();
}

function createFloatingButton() {
  const btn = document.createElement('button');
  btn.id = 'secure-shield-float-btn';
  btn.innerHTML = '🔒';
  btn.title = 'SecureShield: Lock this site';
  btn.onclick = handleLockClick;
  document.body.appendChild(btn);
}

async function handleLockClick() {
  // 1. Check Authentication
  const { auth_token } = (await chrome.storage.local.get('auth_token')) as {
    auth_token?: string;
  };
  if (!auth_token) {
    alert('Please log in to SecureShield extension first.');
    return;
  }

  // 2. Show Loading
  const btn = document.getElementById('secure-shield-float-btn') as HTMLButtonElement;
  const originalText = btn.innerHTML;
  btn.innerHTML = '⏳';

  // 3. Analyze Site with Gemini
  try {
    const analysis = await analyzeSite(window.location.href);
    showAnalysisPopup(analysis, auth_token);
  } catch (error) {
    console.error(error);
    alert('Failed to analyze site.');
  } finally {
    btn.innerHTML = originalText;
  }
}

async function analyzeSite(url: string): Promise<SiteAnalysis> {
  const prompt = `Analyze ${url}. JSON response: { "description": "summary", "pros": ["advantage 1", "advantage 2"], "cons": ["disadvantage 1"] }`;
  
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
  });
  
  const data = await response.json();
  const text = data.candidates[0].content.parts[0].text;
  const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
  return JSON.parse(jsonStr) as SiteAnalysis;
}

function showAnalysisPopup(data: SiteAnalysis, token: string) {
  const overlay = document.createElement('div');
  overlay.className = 'ss-overlay';
  
  overlay.innerHTML = `
    <div class="ss-popup">
      <h2 style="color:#6c63ff; margin-top:0">Website Analysis</h2>
      <p>${data.description}</p>
      
      <h3 style="color:#2ecc71">Why Lock?</h3>
      <ul>${data.pros.map((p: string) => `<li>${p}</li>`).join('')}</ul>
      
      <h3 style="color:#e74c3c">Cons</h3>
      <ul>${data.cons.map((c: string) => `<li>${c}</li>`).join('')}</ul>

      <div style="display:flex; justify-content:center; margin-top:20px">
        <button class="ss-btn ss-btn-danger" id="ss-close">Close</button>
        <button class="ss-btn ss-btn-primary" id="ss-confirm">🔒 Lock Site</button>
        <button class="ss-btn" style="background:#4a5568; color:white" id="ss-chat">💬 Chat AI</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  document.getElementById('ss-close')?.addEventListener('click', () => overlay.remove());
  document.getElementById('ss-chat')?.addEventListener('click', () => showChatOverlay(data.description));
  
  document.getElementById('ss-confirm')?.addEventListener('click', async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/locks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ url: window.location.hostname, name: document.title })
      });
      
      if (res.ok) {
        alert('Site Locked! Refreshing...');
        chrome.runtime.sendMessage({ type: 'SYNC_LOCKS' });
        window.location.reload();
      } else {
        alert('Failed to lock site.');
      }
    } catch (e) {
      alert('Network error.');
    }
  });
}

function showChatOverlay(context: string) {
  const overlay = document.createElement('div');
  overlay.className = 'ss-overlay';
  overlay.innerHTML = `
    <div class="ss-popup" style="height: 500px; display:flex; flex-direction:column;">
      <h3 style="margin-top:0">Chat with AI</h3>
      <div id="ss-chat-box" style="flex:1; overflow-y:auto; background:rgba(0,0,0,0.2); padding:10px; border-radius:8px; margin-bottom:10px;">
        <div style="color:#a0aec0; font-size:0.9em">Context: ${context}</div>
      </div>
      <div style="display:flex; gap:10px">
        <input type="text" id="ss-chat-input" placeholder="Ask about this site..." style="flex:1; padding:10px; border-radius:8px; border:none;">
        <button class="ss-btn ss-btn-primary" id="ss-send">Send</button>
        <button class="ss-btn ss-btn-danger" id="ss-close-chat">Close</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  const box = document.getElementById('ss-chat-box')!;
  const input = document.getElementById('ss-chat-input') as HTMLInputElement;

  document.getElementById('ss-close-chat')?.addEventListener('click', () => overlay.remove());
  
  const sendMessage = async () => {
    const msg = input.value;
    if (!msg) return;
    
    // User Msg
    box.innerHTML += `<div style="text-align:right; margin:5px 0"><span style="background:#6c63ff; padding:5px 10px; border-radius:10px; display:inline-block">${msg}</span></div>`;
    input.value = '';

    // AI API Call
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: `Context: ${context}. User question: ${msg}` }] }] })
      });
      const data = await response.json();
      const reply = data.candidates[0].content.parts[0].text;
      
      // AI Msg
      box.innerHTML += `<div style="text-align:left; margin:5px 0"><span style="background:#2d3748; padding:5px 10px; border-radius:10px; display:inline-block">${reply}</span></div>`;
      box.scrollTop = box.scrollHeight;
    } catch (e) {
      box.innerHTML += `<div style="color:red">Error getting response.</div>`;
    }
  };

  document.getElementById('ss-send')?.addEventListener('click', sendMessage);
}

init();