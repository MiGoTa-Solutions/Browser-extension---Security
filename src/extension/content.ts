const API_BASE_URL = 'http://127.0.0.1:4000/api';
const GEMINI_API_KEY = 'AIzaSyDvHWTKIxHxGo1IWwEPZNqzvnBYuzUFVDc'; // Friend's Key
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
        <button class="ss-btn ss-btn-secondary" id="ss-chat">💬 Chat with AI</button>
        <button class="ss-btn ss-btn-primary" id="ss-confirm">Lock Site</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  
  document.getElementById('ss-close')!.onclick = () => overlay.remove();
  
  document.getElementById('ss-chat')!.onclick = () => {
    overlay.remove();
    showChatOverlay(data.description);
  };

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

  const box = document.getElementById('ss-chat-box')!;
  const input = document.getElementById('ss-chat-input') as HTMLInputElement;

  document.getElementById('ss-close-chat')?.addEventListener('click', () => overlay.remove());
  
  const sendMessage = async () => {
    const msg = input.value;
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
      const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: `Context: ${context}. User question: ${msg}` }] }] })
      });
      const data = await response.json();
      const reply = data.candidates[0].content.parts[0].text;
      
      // AI Msg
      const aiDiv = document.createElement('div');
      aiDiv.className = 'ss-chat-msg ss-msg-ai';
      aiDiv.textContent = reply;
      box.appendChild(aiDiv);
      box.scrollTop = box.scrollHeight;
    } catch (e) {
      const errDiv = document.createElement('div');
      errDiv.textContent = "Error getting response.";
      errDiv.style.color = "red";
      box.appendChild(errDiv);
    }
  };

  document.getElementById('ss-send')?.addEventListener('click', sendMessage);
  input.addEventListener('keypress', (e) => { if(e.key === 'Enter') sendMessage(); });
}

init();