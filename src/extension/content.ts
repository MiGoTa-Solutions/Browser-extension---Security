const API_BASE_URL = 'http://127.0.0.1:4000/api';
const GEMINI_API_KEY = 'AIzaSyD8w_KtZvvLN1MIiFjyWAXE2u4X5W1hnjE';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';
const BUTTON_ID = 'secure-shield-float-btn';
const STYLE_ID = 'secure-shield-style';
const OVERLAY_CLASS = 'ss-overlay';
const CHAT_OVERLAY_ID = 'ss-chat-overlay';

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

type GeminiContentPart = { text?: string };
type GeminiCandidate = { content?: { parts?: GeminiContentPart[] } };
interface GeminiResponse {
  candidates?: GeminiCandidate[];
}

function normalizeDomain(value?: string | null): string | null {
  if (!value) return null;
  try {
    return value.replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0].toLowerCase();
  } catch {
    return null;
  }
}

function lockMatchesHost(lock: TabLock, hostname: string): boolean {
  if (!lock?.is_locked) return false;
  const normalized = normalizeDomain(lock?.url);
  if (!normalized) return false;
  return hostname.includes(normalized);
}

const HTML_ESCAPE_MAP: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
};

function sanitizeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => HTML_ESCAPE_MAP[char] ?? char);
}

function extractJsonBlock(text: string): string {
  return text.replace(/```json/gi, '').replace(/```/g, '').trim();
}

function collectGeminiText(data: GeminiResponse): string {
  if (!data.candidates?.length) {
    return '';
  }
  return data.candidates
    .flatMap((candidate) => candidate.content?.parts ?? [])
    .map((part) => part.text ?? '')
    .join('\n')
    .trim();
}

function hasChromeRuntime(): boolean {
  return typeof chrome !== 'undefined' && !!chrome.runtime;
}

function shouldSkipInjection(): boolean {
  if (!hasChromeRuntime()) return true;
  const protocol = window.location.protocol;
  if (['chrome:', 'edge:', 'about:', 'devtools:', 'file:'].includes(protocol)) {
    return true;
  }
  try {
    const extensionUrl = chrome.runtime.getURL('');
    if (window.location.href.startsWith(extensionUrl)) {
      return true;
    }
  } catch {
    // Ignore inability to resolve runtime URL
  }
  return false;
}

function ensureStylesInjected() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    #${BUTTON_ID} {
      position: fixed; bottom: 24px; right: 24px; width: 56px; height: 56px;
      border-radius: 50%; background: linear-gradient(135deg, #6c63ff 0%, #5850d6 100%);
      border: none; color: white; font-size: 24px; cursor: pointer; z-index: 2147483647;
      box-shadow: 0 4px 16px rgba(108,99,255,0.4); display: flex; align-items: center; justify-content: center;
      transition: transform 0.2s;
    }
    #${BUTTON_ID}:hover { transform: scale(1.1); }
    .${OVERLAY_CLASS} {
      position: fixed; top: 0; left: 0; width: 100%; height: 100%;
      background: rgba(5,8,22,0.85); backdrop-filter: blur(8px);
      z-index: 2147483647; display: flex; justify-content: center; align-items: center;
      padding: 24px;
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
}

async function fetchGeminiText(prompt: string): Promise<string> {
  const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
  });

  if (!response.ok) {
    throw new Error('Gemini API responded with an error');
  }

  const data = (await response.json()) as GeminiResponse;
  const text = collectGeminiText(data);
  if (!text) {
    throw new Error('Gemini returned an empty response');
  }
  return text;
}

async function analyzeSite(url: string): Promise<SiteAnalysis> {
  const prompt = `You are an expert productivity assistant. Analyze ${url} and reply ONLY with JSON of shape { "description": string, "pros": string[], "cons": string[] } where pros highlight reasons to lock the site.`;
  const raw = await fetchGeminiText(prompt);
  const jsonStr = extractJsonBlock(raw);
  try {
    const parsed = JSON.parse(jsonStr) as Partial<SiteAnalysis>;
    return {
      description: parsed.description ?? 'AI could not produce a description.',
      pros: Array.isArray(parsed.pros) ? parsed.pros : [],
      cons: Array.isArray(parsed.cons) ? parsed.cons : []
    };
  } catch (error) {
    console.error('Failed to parse Gemini JSON', jsonStr, error);
    throw new Error('Invalid AI response');
  }
}

async function init() {
  if (shouldSkipInjection()) return;
  ensureStylesInjected();

  const { lockedSites } = (await chrome.storage.local.get('lockedSites')) as {
    lockedSites?: TabLock[];
  };

  const hostname = window.location.hostname.toLowerCase();
  if (Array.isArray(lockedSites) && lockedSites.some((lock) => lockMatchesHost(lock, hostname))) {
    return;
  }

  createFloatingButton();
}

function createFloatingButton() {
  if (document.getElementById(BUTTON_ID) || !document.body) {
    return;
  }
  const btn = document.createElement('button');
  btn.id = BUTTON_ID;
  btn.type = 'button';
  btn.setAttribute('aria-label', 'SecureShield: Lock this site');
  btn.textContent = '🔒';
  btn.addEventListener('click', handleLockClick);
  document.body.appendChild(btn);
}

async function handleLockClick() {
  const { auth_token } = (await chrome.storage.local.get('auth_token')) as {
    auth_token?: string;
  };
  if (!auth_token) {
    alert('Please log in to SecureShield extension first.');
    return;
  }

  const btn = document.getElementById(BUTTON_ID) as HTMLButtonElement | null;
  if (btn) {
    btn.textContent = '⏳';
    btn.disabled = true;
  }

  try {
    const analysis = await analyzeSite(window.location.href);
    showAnalysisPopup(analysis, auth_token);
  } catch (error) {
    console.error(error);
    alert('Failed to analyze site.');
  } finally {
    if (btn) {
      btn.textContent = '🔒';
      btn.disabled = false;
    }
  }
}

function renderList(items: string[], emptyCopy: string): string {
  if (!items.length) {
    return `<li>${sanitizeHtml(emptyCopy)}</li>`;
  }
  return items.map((item) => `<li>${sanitizeHtml(item)}</li>`).join('');
}

function showAnalysisPopup(data: SiteAnalysis, token: string) {
  const existing = document.querySelector(`.${OVERLAY_CLASS}[data-overlay="analysis"]`);
  existing?.remove();

  const overlay = document.createElement('div');
  overlay.className = OVERLAY_CLASS;
  overlay.dataset.overlay = 'analysis';
  overlay.innerHTML = `
    <div class="ss-popup">
      <h2 style="color:#6c63ff; margin-top:0">Website Analysis</h2>
      <p>${sanitizeHtml(data.description)}</p>
      
      <h3 style="color:#2ecc71">Why Lock?</h3>
      <ul>${renderList(data.pros, 'No locking benefits detected.')}</ul>
      
      <h3 style="color:#e74c3c">Cons</h3>
      <ul>${renderList(data.cons, 'AI did not list any cons.')}</ul>

      <div style="display:flex; justify-content:center; margin-top:20px; flex-wrap:wrap; gap:8px">
        <button class="ss-btn ss-btn-danger" id="ss-close">Close</button>
        <button class="ss-btn ss-btn-primary" id="ss-confirm">🔒 Lock Site</button>
        <button class="ss-btn" style="background:#4a5568; color:white" id="ss-chat">💬 Chat AI</button>
      </div>
    </div>
  `;

  const escHandler = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      closeOverlay();
    }
  };

  const closeOverlay = () => {
    overlay.remove();
    document.removeEventListener('keydown', escHandler);
  };

  document.body.appendChild(overlay);
  document.addEventListener('keydown', escHandler);
  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) {
      closeOverlay();
    }
  });

  overlay.querySelector<HTMLButtonElement>('#ss-close')?.addEventListener('click', closeOverlay);
  overlay.querySelector<HTMLButtonElement>('#ss-chat')?.addEventListener('click', () => showChatOverlay(data.description));

  const confirmButton = overlay.querySelector<HTMLButtonElement>('#ss-confirm');
  confirmButton?.addEventListener('click', async () => {
    if (!confirmButton) return;
    confirmButton.disabled = true;
    const previousLabel = confirmButton.textContent;
    confirmButton.textContent = 'Locking...';

    try {
      const response = await fetch(`${API_BASE_URL}/locks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ url: window.location.hostname, name: document.title })
      });

      if (!response.ok) {
        throw new Error('Failed to lock site');
      }

      alert('Site Locked! Refreshing...');
      chrome.runtime.sendMessage({ type: 'SYNC_LOCKS' });
      window.location.reload();
    } catch (error) {
      console.error(error);
      alert('Unable to lock site.');
    } finally {
      confirmButton.disabled = false;
      confirmButton.textContent = previousLabel ?? '🔒 Lock Site';
    }
  });
}

function showChatOverlay(context: string) {
  document.getElementById(CHAT_OVERLAY_ID)?.remove();

  const overlay = document.createElement('div');
  overlay.id = CHAT_OVERLAY_ID;
  overlay.className = OVERLAY_CLASS;

  const popup = document.createElement('div');
  popup.className = 'ss-popup';
  popup.style.height = '500px';
  popup.style.display = 'flex';
  popup.style.flexDirection = 'column';

  const title = document.createElement('h3');
  title.style.marginTop = '0';
  title.textContent = 'Chat with AI';

  const chatBox = document.createElement('div');
  chatBox.id = 'ss-chat-box';
  chatBox.style.flex = '1';
  chatBox.style.overflowY = 'auto';
  chatBox.style.background = 'rgba(0,0,0,0.2)';
  chatBox.style.padding = '10px';
  chatBox.style.borderRadius = '8px';
  chatBox.style.marginBottom = '10px';

  const contextNode = document.createElement('div');
  contextNode.style.color = '#a0aec0';
  contextNode.style.fontSize = '0.9em';
  contextNode.textContent = `Context: ${context}`;
  chatBox.appendChild(contextNode);

  const controls = document.createElement('div');
  controls.style.display = 'flex';
  controls.style.gap = '10px';

  const input = document.createElement('input');
  input.type = 'text';
  input.id = 'ss-chat-input';
  input.placeholder = 'Ask about this site...';
  input.style.flex = '1';
  input.style.padding = '10px';
  input.style.borderRadius = '8px';
  input.style.border = 'none';

  const sendBtn = document.createElement('button');
  sendBtn.className = 'ss-btn ss-btn-primary';
  sendBtn.id = 'ss-send';
  sendBtn.textContent = 'Send';

  const closeBtn = document.createElement('button');
  closeBtn.className = 'ss-btn ss-btn-danger';
  closeBtn.id = 'ss-close-chat';
  closeBtn.textContent = 'Close';

  controls.append(input, sendBtn, closeBtn);
  popup.append(title, chatBox, controls);
  overlay.appendChild(popup);
  document.body.appendChild(overlay);

  const escHandler = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      closeOverlay();
    }
  };

  const closeOverlay = () => {
    overlay.remove();
    document.removeEventListener('keydown', escHandler);
  };

  document.addEventListener('keydown', escHandler);
  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) {
      closeOverlay();
    }
  });
  closeBtn.addEventListener('click', closeOverlay);

  const appendBubble = (role: 'user' | 'ai' | 'error', text: string) => {
    const wrapper = document.createElement('div');
    wrapper.style.textAlign = role === 'user' ? 'right' : 'left';
    wrapper.style.margin = '5px 0';
    const bubble = document.createElement('span');
    bubble.style.display = 'inline-block';
    bubble.style.padding = '5px 10px';
    bubble.style.borderRadius = '10px';
    bubble.style.background = role === 'user' ? '#6c63ff' : role === 'ai' ? '#2d3748' : '#e53e3e';
    bubble.style.color = '#fff';
    bubble.textContent = text;
    wrapper.appendChild(bubble);
    chatBox.appendChild(wrapper);
    chatBox.scrollTop = chatBox.scrollHeight;
  };

  let sending = false;
  const sendMessage = async () => {
    if (sending) return;
    const value = input.value.trim();
    if (!value) return;

    appendBubble('user', value);
    input.value = '';
    sending = true;
    sendBtn.textContent = '...';
    sendBtn.disabled = true;

    try {
      const reply = await fetchGeminiText(`Context: ${context}. User question: ${value}. Provide a concise plain-text answer.`);
      appendBubble('ai', reply);
    } catch (error) {
      console.error(error);
      appendBubble('error', 'Error getting response.');
    } finally {
      sending = false;
      sendBtn.textContent = 'Send';
      sendBtn.disabled = false;
      input.focus();
    }
  };

  sendBtn.addEventListener('click', sendMessage);
  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      void sendMessage();
    }
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    void init();
  }, { once: true });
} else {
  void init();
}