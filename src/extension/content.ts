const API_BASE_URL = 'http://127.0.0.1:4000/api';
// UPDATED KEY
const GEMINI_API_KEY = 'AIzaSyAt5C9kLi8W4khsQrmKTtfWtn6N_W0WP9k'; 
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

// --- INJECT STYLES ---
const style = document.createElement('style');
style.textContent = `
  #ss-float-btn { position: fixed; bottom: 24px; right: 24px; width: 56px; height: 56px; border-radius: 50%; background: linear-gradient(135deg, #6c63ff, #5850d6); color: white; border: none; font-size: 24px; cursor: pointer; z-index: 2147483647; box-shadow: 0 4px 16px rgba(108,99,255,0.4); display: flex; align-items: center; justify-content: center; transition: transform 0.2s; }
  #ss-float-btn:hover { transform: scale(1.1); }
  .ss-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(5,8,22,0.85); backdrop-filter: blur(8px); z-index: 2147483647; display: flex; justify-content: center; align-items: center; }
  .ss-popup { background: rgba(11,20,40,0.95); padding: 32px; border-radius: 16px; width: 90%; max-width: 500px; color: #f8fbff; font-family: system-ui, sans-serif; border: 1px solid rgba(255,255,255,0.1); max-height: 80vh; overflow-y: auto; display: flex; flex-direction: column; }
  .ss-btn { padding: 10px 20px; border-radius: 8px; border: none; cursor: pointer; margin: 5px; font-weight: 600; }
  .ss-btn-primary { background: #6c63ff; color: white; }
  .ss-btn-secondary { background: #4a5568; color: white; }
  .ss-btn-danger { background: rgba(231,76,60,0.2); color: #e74c3c; border: 1px solid #e74c3c; }
  .ss-chat-msg { padding: 8px 12px; border-radius: 8px; margin: 5px 0; max-width: 80%; word-wrap: break-word; }
  .ss-msg-user { background: #6c63ff; color: white; align-self: flex-end; margin-left: auto; }
  .ss-msg-ai { background: #2d3748; color: white; align-self: flex-start; margin-right: auto; }
`;
document.head.appendChild(style);

// --- HELPER TYPES ---
interface SiteAnalysis {
  description: string;
  pros: string[];
  cons: string[];
}

interface TabLock {
  url: string;
  is_locked: boolean;
}

// Define expected storage structure
interface StorageData {
  lockedSites?: TabLock[];
  auth_token?: string;
}

// --- MAIN LOGIC ---
async function init() {
  // Check if site is locked
  const data = await chrome.storage.local.get('lockedSites') as StorageData;
  const lockedSites = data.lockedSites;
  const hostname = window.location.hostname.toLowerCase();
  
  // Don't show button if site is already locked
  if (Array.isArray(lockedSites) && lockedSites.some((l) => l.is_locked && hostname.includes(l.url))) {
    return; 
  }

  const btn = document.createElement('button');
  btn.id = 'ss-float-btn';
  btn.innerHTML = '白';
  btn.onclick = handleLockClick;
  document.body.appendChild(btn);
}

async function handleLockClick() {
  const data = await chrome.storage.local.get('auth_token') as StorageData;
  const auth_token = data.auth_token;

  if (!auth_token || typeof auth_token !== 'string') {
    return alert('Please log in to SecureShield extension.');
  }

  const btn = document.getElementById('ss-float-btn');
  if (btn) btn.innerHTML = '竢ｳ';
  
  try {
    const prompt = `Analyze ${window.location.href}. Return valid JSON only: {"description": "string", "pros": ["string"], "cons": ["string"]}`;
    
    const res = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
    });
    
    // FIX: Handle API Errors (like 429 Quota Exceeded)
    if (!res.ok) {
      if (res.status === 429) throw new Error('API Quota Exceeded. Please try again later.');
      throw new Error(`API Error: ${res.status} ${res.statusText}`);
    }

    const apiData = await res.json();
    
    // FIX: Handle Empty/Blocked AI Responses
    if (!apiData.candidates || !apiData.candidates[0] || !apiData.candidates[0].content) {
      throw new Error('AI returned no analysis (Safety Block or Empty Response).');
    }

    // Robust JSON parsing
    let jsonText = apiData.candidates[0].content.parts[0].text;
    jsonText = jsonText.replace(/```json/g, '').replace(/```/g, '').trim();
    
    const analysis: SiteAnalysis = JSON.parse(jsonText);
    showPopup(analysis, auth_token);

  } catch (e: any) {
    console.error('SecureShield AI Error:', e);
    // Show a user-friendly alert instead of crashing
    alert(`Analysis Failed: ${e.message}`);
  } finally {
    if (btn) btn.innerHTML = '白';
  }
}

function showPopup(data: SiteAnalysis, token: string) {
  const overlay = document.createElement('div');
  overlay.className = 'ss-overlay';
  overlay.innerHTML = `
    <div class="ss-popup">
      <h2 style="color:#6c63ff; margin-top:0">Website Analysis</h2>
      <p>${data.description}</p>
      <h3 style="color:#2ecc71">Why Lock?</h3>
      <ul>${data.pros.map(p => `<li>${p}</li>`).join('')}</ul>
      <h3 style="color:#e74c3c">Cons</h3>
      <ul>${data.cons.map(c => `<li>${c}</li>`).join('')}</ul>
      <div style="text-align:center; margin-top:20px">
        <button class="ss-btn ss-btn-danger" id="ss-close">Close</button>
        <button class="ss-btn ss-btn-secondary" id="ss-chat">町 Chat with AI</button>
        <button class="ss-btn ss-btn-primary" id="ss-confirm">Lock Site</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  
  const closeBtn = document.getElementById('ss-close');
  if (closeBtn) closeBtn.onclick = () => overlay.remove();
  
  const chatBtn = document.getElementById('ss-chat');
  if (chatBtn) chatBtn.onclick = () => {
    overlay.remove();
    showChatOverlay(data.description);
  };

  const confirmBtn = document.getElementById('ss-confirm');
  if (confirmBtn) confirmBtn.onclick = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/locks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ url: window.location.hostname, name: document.title })
      });

      if(res.ok) {
        chrome.runtime.sendMessage({ type: 'SYNC_LOCKS' });
        alert('Locked! Refreshing...');
        window.location.reload();
      } else {
        alert('Failed to lock site.');
      }
    } catch(e) {
      console.error(e);
      alert('Network Error.');
    }
  };
}

function showChatOverlay(context: string) {
  const overlay = document.createElement('div');
  overlay.className = 'ss-overlay';
  overlay.innerHTML = `
    <div class="ss-popup" style="height: 500px;">
      <h3 style="margin-top:0; color:#6c63ff">Chat about this Site</h3>
      <div id="ss-chat-box" style="flex:1; overflow-y:auto; background:rgba(0,0,0,0.2); padding:10px; border-radius:8px; margin-bottom:10px; display:flex; flex-direction:column;">
        <div style="color:#a0aec0; font-size:0.9em; text-align:center; margin-bottom:10px">Context: ${context}</div>
      </div>
      <div style="display:flex; gap:10px">
        <input type="text" id="ss-chat-input" placeholder="Is this site safe?" style="flex:1; padding:10px; border-radius:8px; border:none;">
        <button class="ss-btn ss-btn-primary" id="ss-send">Send</button>
        <button class="ss-btn ss-btn-danger" id="ss-close-chat">Close</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  const box = document.getElementById('ss-chat-box');
  const input = document.getElementById('ss-chat-input') as HTMLInputElement;
  const sendBtn = document.getElementById('ss-send');
  const closeBtn = document.getElementById('ss-close-chat');

  if (closeBtn) closeBtn.onclick = () => overlay.remove();
  
  const sendMessage = async () => {
    if (!input || !box) return;
    const msg = input.value.trim();
    if (!msg) return;
    
    // User Msg
    const userDiv = document.createElement('div');
    userDiv.className = 'ss-chat-msg ss-msg-user';
    userDiv.textContent = msg;
    box.appendChild(userDiv);
    input.value = '';
    box.scrollTop = box.scrollHeight;

    // AI API Call
    try {
      const res = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: `Context: ${context}. User Question: ${msg}` }] }] })
      });
      
      const data = await res.json();
      
      // FIX: Handle API errors in chat
      if (!res.ok || !data.candidates || !data.candidates[0]) {
        throw new Error('AI Error');
      }

      const reply = data.candidates[0].content.parts[0].text;
      
      // AI Msg
      const aiDiv = document.createElement('div');
      aiDiv.className = 'ss-chat-msg ss-msg-ai';
      aiDiv.textContent = reply;
      box.appendChild(aiDiv);
    } catch (e) {
      const errDiv = document.createElement('div');
      errDiv.textContent = "Error getting response.";
      errDiv.style.color = "red";
      box.appendChild(errDiv);
    }
    box.scrollTop = box.scrollHeight;
  };

  if (sendBtn) sendBtn.onclick = sendMessage;
  if (input) input.addEventListener('keypress', (e) => { if(e.key === 'Enter') sendMessage(); });
}

// Initialize
init();