const API_BASE_URL = 'http://127.0.0.1:4000/api';
const contentLog = (message: string, data?: Record<string, unknown>) => {
  if (data) {
    console.info('[SecureShield Content]', message, data);
  } else {
    console.info('[SecureShield Content]', message);
  }
};

// --- INJECT STYLES ---
const style = document.createElement('style');
style.textContent = `
  #ss-float-btn { position: fixed; bottom: 24px; right: 24px; width: 56px; height: 56px; border-radius: 50%; background: linear-gradient(135deg, #6c63ff, #5850d6); color: white; border: none; font-size: 24px; cursor: pointer; z-index: 2147483647; box-shadow: 0 4px 16px rgba(108,99,255,0.4); display: flex; align-items: center; justify-content: center; transition: transform 0.2s; }
  #ss-float-btn:hover { transform: scale(1.1); }
  
  /* Red Button Style for Re-Locking */
  #ss-float-btn.ss-unlocked { background: linear-gradient(135deg, #e74c3c, #c0392b); box-shadow: 0 4px 16px rgba(231,76,60,0.4); }

  #ss-quick-menu { position: fixed; bottom: 92px; right: 24px; background: rgba(15,23,42,0.95); border-radius: 16px; padding: 12px; display: flex; flex-direction: column; gap: 8px; box-shadow: 0 20px 40px rgba(15,23,42,0.35); z-index: 2147483646; opacity: 0; transform: translateY(10px); pointer-events: none; transition: opacity 0.2s ease, transform 0.2s ease; }
  #ss-quick-menu.visible { opacity: 1; transform: translateY(0); pointer-events: auto; }
  #ss-quick-menu button { border: none; border-radius: 12px; padding: 10px 16px; font-weight: 600; color: white; background: rgba(255,255,255,0.08); display: flex; align-items: center; gap: 8px; cursor: pointer; font-family: system-ui, sans-serif; }
  #ss-quick-menu button:hover { background: rgba(108,99,255,0.25); }
  #ss-quick-menu button span { font-size: 16px; }

  .ss-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(5,8,22,0.85); backdrop-filter: blur(8px); z-index: 2147483647; display: flex; justify-content: center; align-items: center; }
  .ss-popup { background: rgba(11,20,40,0.95); padding: 32px; border-radius: 16px; width: 90%; max-width: 500px; color: #f8fbff; font-family: system-ui, sans-serif; border: 1px solid rgba(255,255,255,0.1); max-height: 80vh; overflow-y: auto; display: flex; flex-direction: column; }
  .ss-btn { padding: 10px 20px; border-radius: 8px; border: none; cursor: pointer; margin: 5px; font-weight: 600; }
  .ss-btn-primary { background: #6c63ff; color: white; }
  .ss-btn-secondary { background: #4a5568; color: white; }
  .ss-btn-danger { background: rgba(231,76,60,0.2); color: #e74c3c; border: 1px solid #e74c3c; }
  .ss-chat-msg { padding: 8px 12px; border-radius: 8px; margin: 5px 0; max-width: 80%; word-wrap: break-word; }
  .ss-msg-user { background: #6c63ff; color: white; align-self: flex-end; margin-left: auto; }
  .ss-msg-ai { background: #2d3748; color: white; align-self: flex-start; margin-right: auto; }
  .ss-confidence { margin-top: 16px; }
  .ss-confidence-bar { width: 100%; height: 8px; background: rgba(255,255,255,0.1); border-radius: 999px; margin-top: 6px; }
  .ss-confidence-bar span { display: block; height: 100%; background: linear-gradient(90deg, #34d399, #10b981); border-radius: 999px; }
  .ss-stat-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(110px, 1fr)); gap: 12px; margin-top: 16px; }
  .ss-stat-card { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 12px; text-align: center; }
  .ss-signals { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; margin-top: 16px; }
  .ss-signal { border-left: 4px solid; border-radius: 12px; padding: 10px 12px; background: rgba(255,255,255,0.02); }
  .ss-signal.positive { border-color: #10b981; }
  .ss-signal.warning { border-color: #fbbf24; }
  .ss-signal.danger { border-color: #f87171; }
  .ss-signal-label { font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.08em; color: #94a3b8; }
  .ss-signal-value { font-size: 1.1rem; font-weight: 600; color: #f8fafc; }
  .ss-signal-hint { font-size: 0.75rem; color: #cbd5f5; margin-top: 4px; }

  /* TOAST NOTIFICATIONS */
  .ss-toast {
    position: fixed; top: 24px; left: 50%; transform: translateX(-50%) translateY(-100px);
    background: #1f2937; color: white; padding: 12px 24px; border-radius: 8px;
    z-index: 2147483648; font-family: system-ui, sans-serif; font-size: 14px; font-weight: 500;
    box-shadow: 0 10px 25px rgba(0,0,0,0.2); opacity: 0; transition: all 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55);
    display: flex; align-items: center; gap: 10px; border: 1px solid rgba(255,255,255,0.1);
  }
  .ss-toast.visible { transform: translateX(-50%) translateY(0); opacity: 1; }
  .ss-toast.error { background: #991b1b; border-color: #f87171; }
  .ss-toast.success { background: #065f46; border-color: #34d399; }
`;
document.head.appendChild(style);

// --- HELPER TYPES ---
type DetectorRiskLevel = 'safe' | 'suspicious' | 'danger';

interface SiteAnalysis {
  description: string;
  pros: string[];
  cons: string[];
}

type DetectorSignalStatus = 'positive' | 'warning' | 'danger';

interface DetectorSignal {
  label: string;
  value: string;
  status: DetectorSignalStatus;
  hint?: string;
}

interface DetectorStats {
  harmless: number;
  malicious: number;
  suspicious: number;
  undetected: number;
  timeout?: number;
}

interface DetectorAnalysis {
  url: string;
  verdict: 'safe' | 'phishing' | 'malicious';
  riskLevel: DetectorRiskLevel;
  threats: string[];
  analyzedAt: string;
  source: string;
  confidence?: number;
  signals?: DetectorSignal[];
  stats?: DetectorStats;
}

const RISK_THEMES: Record<DetectorRiskLevel, { label: string; color: string; chipBg: string }> = {
  safe: { label: 'Site Looks Safe', color: '#10b981', chipBg: 'rgba(16,185,129,0.15)' },
  suspicious: { label: 'Suspicious Signals', color: '#f59e0b', chipBg: 'rgba(245,158,11,0.15)' },
  danger: { label: 'High Risk Detected', color: '#ef4444', chipBg: 'rgba(239,68,68,0.15)' },
};

function getRiskTheme(level: DetectorRiskLevel | string) {
  if (level === 'safe' || level === 'suspicious' || level === 'danger') {
    return RISK_THEMES[level];
  }
  return RISK_THEMES.danger;
}

function normalizeRiskLevel(level: unknown, verdict: string | undefined): DetectorRiskLevel {
  if (typeof level === 'string') {
    const normalized = level.toLowerCase();
    if (normalized === 'safe' || normalized === 'suspicious' || normalized === 'danger') {
      return normalized;
    }
  }
  return verdict?.toLowerCase() === 'safe' ? 'safe' : 'danger';
}

function normalizeDetectorVerdict(value: unknown): DetectorAnalysis['verdict'] {
  if (typeof value !== 'string') {
    return 'safe';
  }
  const normalized = value.toLowerCase();
  if (normalized.includes('phish')) {
    return 'phishing';
  }
  if (normalized.includes('mal')) {
    return 'malicious';
  }
  return 'safe';
}

function resolveHostname(value: string) {
  try {
    const host = new URL(value).hostname;
    return host || value;
  } catch {
    return value;
  }
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
interface TabLock {
  url: string;
  is_locked: boolean;
}
interface StorageData {
  lockedSites?: TabLock[];
  unlockedExceptions?: string[];
  auth_token?: string;
}

// --- STATE TRACKING ---
let isRelockMode = false;
let floatBtn: HTMLButtonElement | null = null;
let quickMenu: HTMLDivElement | null = null;
let menuVisible = false;

// --- UI HELPERS ---
function showToast(message: string, type: 'success' | 'error' | 'info' = 'info') {
  const toast = document.createElement('div');
  toast.className = `ss-toast ${type}`;
  const icon = type === 'success' ? '✓' : type === 'error' ? '⚠' : 'ℹ';
  toast.innerHTML = `<span style="font-size:1.2em">${icon}</span><span>${message}</span>`;
  document.body.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('visible'));
  setTimeout(() => {
    toast.classList.remove('visible');
    setTimeout(() => toast.remove(), 400);
  }, 3000);
}

function showConfirmDialog(title: string, message: string, onConfirm: () => void | Promise<void>, confirmLabel = 'Yes, Re-lock') {
  const overlay = document.createElement('div');
  overlay.className = 'ss-overlay';
  overlay.style.animation = 'fadeIn 0.3s ease-out';
  
  const dialog = document.createElement('div');
  dialog.style.cssText = `
    background: white;
    border-radius: 20px;
    padding: 32px;
    max-width: 450px;
    width: 90%;
    box-shadow: 0 20px 60px rgba(0,0,0,0.3);
    transform: scale(0.9);
    animation: scaleIn 0.3s ease-out forwards;
    text-align: center;
  `;
  
  const iconDiv = document.createElement('div');
  iconDiv.style.cssText = `
    background: linear-gradient(135deg, #3b82f6, #2563eb);
    width: 64px;
    height: 64px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto 20px;
    font-size: 32px;
  `;
  iconDiv.textContent = '🔒';
  
  const titleEl = document.createElement('h3');
  titleEl.style.cssText = `
    color: #1f2937;
    font-size: 24px;
    font-weight: 700;
    margin: 0 0 12px 0;
    font-family: system-ui, sans-serif;
  `;
  titleEl.textContent = title;
  
  const messageEl = document.createElement('p');
  messageEl.style.cssText = `
    color: #6b7280;
    font-size: 16px;
    line-height: 1.6;
    margin: 0 0 24px 0;
    font-family: system-ui, sans-serif;
  `;
  messageEl.textContent = message;
  
  const buttonContainer = document.createElement('div');
  buttonContainer.style.cssText = `
    display: flex;
    gap: 12px;
    justify-content: center;
  `;
  
  const cancelBtn = document.createElement('button');
  cancelBtn.style.cssText = `
    background: #f3f4f6;
    color: #374151;
    border: none;
    padding: 12px 24px;
    border-radius: 10px;
    font-size: 15px;
    font-weight: 600;
    cursor: pointer;  
    font-family: system-ui, sans-serif;
    transition: all 0.2s;
    flex: 1;
  `;
  cancelBtn.textContent = 'Cancel';
  cancelBtn.onmouseover = () => cancelBtn.style.background = '#e5e7eb';
  cancelBtn.onmouseout = () => cancelBtn.style.background = '#f3f4f6';
  cancelBtn.onclick = () => overlay.remove();
  
  const confirmBtn = document.createElement('button');
  confirmBtn.style.cssText = `
    background: linear-gradient(135deg, #3b82f6, #2563eb);
    color: white;
    border: none;
    padding: 12px 24px;
    border-radius: 10px;
    font-size: 15px;
    font-weight: 600;
    cursor: pointer;
    font-family: system-ui, sans-serif;
    transition: all 0.2s;
    flex: 1;
  `;
  confirmBtn.textContent = confirmLabel;
  confirmBtn.onmouseover = () => confirmBtn.style.transform = 'scale(1.05)';
  confirmBtn.onmouseout = () => confirmBtn.style.transform = 'scale(1)';
  confirmBtn.onclick = () => {
    overlay.remove();
    void onConfirm();
  };
  
  // Add keyframe animations
  if (!document.getElementById('ss-confirm-animations')) {
    const animStyle = document.createElement('style');
    animStyle.id = 'ss-confirm-animations';
    animStyle.textContent = `
      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      @keyframes scaleIn {
        from { transform: scale(0.9); opacity: 0; }
        to { transform: scale(1); opacity: 1; }
      }
    `;
    document.head.appendChild(animStyle);
  }
  
  buttonContainer.appendChild(cancelBtn);
  buttonContainer.appendChild(confirmBtn);
  
  dialog.appendChild(iconDiv);
  dialog.appendChild(titleEl);
  dialog.appendChild(messageEl);
  dialog.appendChild(buttonContainer);
  
  overlay.appendChild(dialog);
  document.body.appendChild(overlay);
  
  // Close on outside click
  overlay.onclick = (e) => {
    if (e.target === overlay) overlay.remove();
  };
}

function promptLockWithoutAnalysis(token: string) {
  const hostname = window.location.hostname;
  showConfirmDialog(
    'Lock this site without AI?',
    `AI analysis is unavailable right now. Do you still want to lock ${hostname}?`,
    async () => {
      setFloatingButtonBusy(true);
      try {
        await lockCurrentDomain(token);
      } finally {
        setFloatingButtonBusy(false);
      }
    },
    'Lock site'
  );
}

// --- MAIN LOGIC ---
async function init() {
  const data = await chrome.storage.local.get(['lockedSites', 'unlockedExceptions']) as StorageData;
  const lockedSites = data.lockedSites || [];
  const unlockedExceptions = data.unlockedExceptions || [];
  const hostname = window.location.hostname.toLowerCase();
  
  const isServerLocked = lockedSites.some((l) => l.is_locked && hostname.includes(l.url));
  const isLocallyUnlocked = unlockedExceptions.some((u) => hostname.includes(u));

  contentLog('Content script init state', {
    hostname,
    lockedCount: lockedSites.length,
    isServerLocked,
    isLocallyUnlocked,
  });

  if (isServerLocked && !isLocallyUnlocked) {
    contentLog('Site currently locked by server, no UI injected');
    return;
  }

  const btn = document.createElement('button');
  btn.id = 'ss-float-btn';
  document.body.appendChild(btn);
  floatBtn = btn;

  if (isServerLocked && isLocallyUnlocked) {
    isRelockMode = true;
    contentLog('Rendered floating button in relock mode');
  } else {
    isRelockMode = false;
    contentLog('Rendered floating button in analysis mode');
  }

  updateFloatingButtonState();
  createQuickMenu();
  btn.onclick = toggleQuickMenu;
}

function updateFloatingButtonState() {
  if (!floatBtn) return;
  if (isRelockMode) {
    floatBtn.innerHTML = '🔒';
    floatBtn.classList.add('ss-unlocked');
    floatBtn.title = 'Site unlocked locally. Open quick actions.';
  } else {
    floatBtn.innerHTML = '🛡️';
    floatBtn.classList.remove('ss-unlocked');
    floatBtn.title = 'SecureShield quick actions';
  }
  updateQuickMenuLabels();
}

function updateQuickMenuLabels() {
  const lockBtn = document.getElementById('ss-action-lock');
  if (lockBtn) {
    const label = lockBtn.querySelector('span:last-child');
    if (label) {
      label.textContent = isRelockMode ? 'Re-lock site' : 'Web access lock';
    }
  }
}

function createQuickMenu() {
  if (quickMenu) return;
  quickMenu = document.createElement('div');
  quickMenu.id = 'ss-quick-menu';
  quickMenu.innerHTML = `
    <button id="ss-action-lock"><span>🔒</span><span>Web access lock</span></button>
    <button id="ss-action-detect"><span>🛡️</span><span>Analyze site</span></button>
  `;
  document.body.appendChild(quickMenu);
  quickMenu.addEventListener('click', (event) => event.stopPropagation());

  const lockBtn = document.getElementById('ss-action-lock');
  const detectBtn = document.getElementById('ss-action-detect');

  lockBtn?.addEventListener('click', () => {
    closeQuickMenu();
    void handleWebAccessLockShortcut();
  });

  detectBtn?.addEventListener('click', () => {
    closeQuickMenu();
    void handleSiteDetectorShortcut();
  });

  updateQuickMenuLabels();
}

function toggleQuickMenu() {
  if (!quickMenu) return;
  menuVisible = !menuVisible;
  quickMenu.classList.toggle('visible', menuVisible);
  if (menuVisible) {
    document.addEventListener('click', handleMenuDismiss, true);
  } else {
    document.removeEventListener('click', handleMenuDismiss, true);
  }
}

function closeQuickMenu() {
  if (!menuVisible || !quickMenu) return;
  menuVisible = false;
  quickMenu.classList.remove('visible');
  document.removeEventListener('click', handleMenuDismiss, true);
}

function handleMenuDismiss(event: MouseEvent) {
  const target = event.target as Node | null;
  if (!target) return;
  if (quickMenu?.contains(target) || target === floatBtn) {
    return;
  }
  closeQuickMenu();
}

async function getAuthToken(): Promise<string | null> {
  const data = await chrome.storage.local.get('auth_token') as StorageData;
  const auth_token = data.auth_token;

  if (!auth_token || typeof auth_token !== 'string') {
    contentLog('Action blocked: missing auth token');
    showToast('Please log in to SecureShield extension.', 'error');
    return null;
  }

  return auth_token;
}

async function handleWebAccessLockShortcut() {
  const auth_token = await getAuthToken();
  if (!auth_token) return;

  if (isRelockMode) {
    contentLog('Relock confirmation opened');
    showConfirmDialog(
      '🔒 Re-lock Website?',
      'Do you want to re-lock this website? You will need your Master PIN to access it again.',
      async () => {
        setFloatingButtonBusy(true);
        try {
          contentLog('Sending relock request', { hostname: window.location.hostname });
          await chrome.runtime.sendMessage({ type: 'RELOCK_SITE', url: window.location.hostname });
          showToast('Site Locked!', 'success');
          setTimeout(() => window.location.reload(), 1000);
        } finally {
          setFloatingButtonBusy(false);
        }
      }
    );
    return;
  }
  await analyzeCurrentSiteWithGemini(auth_token, () => {
    promptLockWithoutAnalysis(auth_token);
  });
}

async function analyzeCurrentSiteWithGemini(token: string, onFallback?: () => void) {
  contentLog('Requesting Gemini analysis for page', { url: window.location.href });
  setFloatingButtonBusy(true);

  try {
    const prompt = `Analyze ${window.location.href}. Return valid JSON only: {"description": "string", "pros": ["string"], "cons": ["string"]}`;

    const res = await fetch(`${API_BASE_URL}/gemini/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ prompt }),
    });

    if (!res.ok) {
      const error = new Error(res.status === 429 ? 'Quota exceeded. Try again later.' : `AI Error: ${res.status}`);
      (error as any).status = res.status;
      throw error;
    }

    const apiData = await res.json();
    if (!apiData.candidates || !apiData.candidates[0] || !apiData.candidates[0].content) {
      throw new Error('No analysis returned.');
    }

    let jsonText = apiData.candidates[0].content.parts[0].text;
    jsonText = jsonText.replace(/```json/g, '').replace(/```/g, '').trim();

    const analysis: SiteAnalysis = JSON.parse(jsonText);
    contentLog('Received Gemini analysis response');
    showGeminiOverlay(analysis, token);
  } catch (e: any) {
    const errorMessage = e instanceof Error ? e.message : 'Failed to analyze site.';
    contentLog('Gemini analysis failed', { error: errorMessage });
    showToast(errorMessage, 'error');
    if (typeof onFallback === 'function') {
      onFallback();
    }
  } finally {
    setFloatingButtonBusy(false);
  }
}

async function handleSiteDetectorShortcut() {
  const auth_token = await getAuthToken();
  if (!auth_token) return;

  contentLog('Requesting detector verdict for page', { url: window.location.href });
  setFloatingButtonBusy(true);

  try {
    const res = await fetch(`${API_BASE_URL}/site-detector/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${auth_token}`,
      },
      body: JSON.stringify({ url: window.location.href }),
    });

    let payload: any = null;
    try {
      payload = await res.json();
    } catch {
      payload = null;
    }

    if (!res.ok) {
      const message = payload?.error || `API Error: ${res.status}`;
      throw new Error(message);
    }

    if (!payload) {
      throw new Error('Empty response from detector service');
    }

    const verdict = normalizeDetectorVerdict(payload.verdict);
    const normalizedRisk = normalizeRiskLevel(payload.riskLevel, verdict);

    const statsPayload = payload.stats;
    const stats: DetectorStats | undefined = statsPayload && typeof statsPayload === 'object'
      ? {
          harmless: Number(statsPayload.harmless ?? 0),
          malicious: Number(statsPayload.malicious ?? 0),
          suspicious: Number(statsPayload.suspicious ?? 0),
          undetected: Number(statsPayload.undetected ?? 0),
          timeout: Number(statsPayload.timeout ?? 0),
        }
      : undefined;

    const signals = Array.isArray(payload.signals)
      ? payload.signals.map((signal: any) => ({
          label: typeof signal.label === 'string' ? signal.label : 'Signal',
          value: typeof signal.value === 'string' ? signal.value : String(signal.value ?? 'N/A'),
          status:
            signal.status === 'warning' || signal.status === 'danger'
              ? signal.status
              : 'positive',
          hint: typeof signal.hint === 'string' ? signal.hint : undefined,
        }))
      : [];

    const analysis: DetectorAnalysis = {
      url: typeof payload.url === 'string' ? payload.url : window.location.href,
      verdict,
      riskLevel: normalizedRisk,
      threats: Array.isArray(payload.threats) ? payload.threats : [],
      analyzedAt: typeof payload.analyzedAt === 'string' ? payload.analyzedAt : new Date().toISOString(),
      source: typeof payload.source === 'string' ? payload.source : 'Site detector service',
      confidence: typeof payload.confidence === 'number' ? payload.confidence : undefined,
      stats,
      signals,
    };

    contentLog('Received detector analysis response', { verdict: analysis.verdict, risk: analysis.riskLevel });
    showDetectorOverlay(analysis, auth_token);
  } catch (e: any) {
    const errorMessage = e instanceof Error ? e.message : 'Failed to analyze site.';
    contentLog('Detector analysis failed', { error: errorMessage });
    showToast(errorMessage, 'error');
  } finally {
    setFloatingButtonBusy(false);
  }
}

function setFloatingButtonBusy(busy: boolean) {
  if (!floatBtn) return;
  if (busy) {
    floatBtn.dataset.prevIcon = floatBtn.innerHTML;
    floatBtn.innerHTML = '⏳';
    floatBtn.style.pointerEvents = 'none';
  } else {
    floatBtn.style.pointerEvents = 'auto';
    updateFloatingButtonState();
  }
}

async function lockCurrentDomain(token: string) {
  try {
    const res = await fetch(`${API_BASE_URL}/locks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ url: window.location.hostname, name: document.title }),
    });

    if (res.ok) {
      await chrome.runtime.sendMessage({ type: 'RELOCK_SITE', url: window.location.hostname });
      chrome.runtime.sendMessage({ type: 'SYNC_LOCKS' });
      showToast('Site Locked! Refreshing...', 'success');
      setTimeout(() => window.location.reload(), 1000);
    } else {
      showToast('Failed to lock site.', 'error');
    }
  } catch (error) {
    showToast('Network Error.', 'error');
  }
}

function showGeminiOverlay(data: SiteAnalysis, token: string) {
  const pros = Array.isArray(data.pros) ? data.pros : [];
  const cons = Array.isArray(data.cons) ? data.cons : [];

  const overlay = document.createElement('div');
  overlay.className = 'ss-overlay';
  overlay.innerHTML = `
    <div class="ss-popup">
      <h2 style="color:#6c63ff; margin-top:0">Website Analysis</h2>
      <p>${data.description}</p>
      <h3 style="color:#2ecc71">Why Lock?</h3>
      <ul>${pros.map((p) => `<li>${p}</li>`).join('')}</ul>
      <h3 style="color:#e74c3c">Cons</h3>
      <ul>${cons.map((c) => `<li>${c}</li>`).join('')}</ul>
      <div style="text-align:center; margin-top:20px">
        <button class="ss-btn ss-btn-danger" id="ss-close-gemini">Close</button>
        <button class="ss-btn ss-btn-secondary" id="ss-chat-gemini">💬 Chat with AI</button>
        <button class="ss-btn ss-btn-primary" id="ss-confirm-gemini">Lock Site</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  const closeBtn = overlay.querySelector('#ss-close-gemini');
  closeBtn?.addEventListener('click', () => overlay.remove());

  const chatBtn = overlay.querySelector('#ss-chat-gemini');
  chatBtn?.addEventListener('click', () => {
    overlay.remove();
    showChatOverlay(data.description);
  });

  const confirmBtn = overlay.querySelector('#ss-confirm-gemini') as HTMLButtonElement | null;
  if (confirmBtn) {
    confirmBtn.addEventListener('click', async () => {
      confirmBtn.disabled = true;
      confirmBtn.textContent = 'Locking...';
      await lockCurrentDomain(token);
      overlay.remove();
    });
  }
}

function showDetectorOverlay(data: DetectorAnalysis, token: string) {
  const overlay = document.createElement('div');
  overlay.className = 'ss-overlay';
  const theme = getRiskTheme(data.riskLevel);
  const threatMarkup = data.threats.length
    ? `<ul style="margin: 12px 0 0; padding-left: 18px; color: #fca5a5;">${data.threats
        .map((t) => `<li style="margin-bottom:6px">${escapeHtml(t)}</li>`)
        .join('')}</ul>`
    : '<p style="margin:12px 0 0; color:#10b981; font-weight:600;">No active threats reported.</p>';

  const confidencePercent = typeof data.confidence === 'number'
    ? Math.round(Math.min(1, Math.max(0, data.confidence)) * 100)
    : null;

  const confidenceSection = confidencePercent !== null
    ? `
      <div class="ss-confidence">
        <div style="display:flex; justify-content:space-between; font-size:0.85rem; color:#cbd5f5;">
          <span>Confidence</span>
          <strong>${confidencePercent}%</strong>
        </div>
        <div class="ss-confidence-bar">
          <span style="width:${confidencePercent}%; background:${data.riskLevel === 'safe' ? '#34d399' : '#f87171'}"></span>
        </div>
      </div>
    `
    : '';

  const statsSection = data.stats
    ? `
      <div class="ss-stat-grid">
        ${[
          { label: 'Harmless', value: data.stats.harmless },
          { label: 'Malicious', value: data.stats.malicious },
          { label: 'Suspicious', value: data.stats.suspicious },
          { label: 'Undetected', value: data.stats.undetected },
        ]
          .map(
            (stat) => `
              <div class="ss-stat-card">
                <div style="font-size:0.75rem; text-transform:uppercase; color:#a5b4fc;">${stat.label}</div>
                <div style="font-size:1.4rem; font-weight:700; color:#f8fafc;">${stat.value}</div>
              </div>
            `,
          )
          .join('')}
      </div>
    `
    : '';

  const signalsSection = data.signals && data.signals.length
    ? `
      <div class="ss-signals">
        ${data.signals
          .map((signal) => {
            const tone = signal.status === 'warning' ? 'warning' : signal.status === 'danger' ? 'danger' : 'positive';
            return `
              <div class="ss-signal ${tone}">
                <div class="ss-signal-label">${escapeHtml(signal.label)}</div>
                <div class="ss-signal-value">${escapeHtml(signal.value)}</div>
                ${signal.hint ? `<div class="ss-signal-hint">${escapeHtml(signal.hint)}</div>` : ''}
              </div>
            `;
          })
          .join('')}
      </div>
    `
    : '';

  overlay.innerHTML = `
    <div class="ss-popup">
      <div style="display:flex; justify-content:space-between; gap:12px; align-items:flex-start;">
        <div>
          <p style="margin:0; font-size:0.85rem; color:#94a3b8;">Analyzed ${new Date(data.analyzedAt).toLocaleString()}</p>
          <h2 style="margin:6px 0 0; font-size:1.5rem;">${escapeHtml(resolveHostname(data.url))}</h2>
          <p style="margin:4px 0 0; color:#cbd5f5; font-size:0.9rem;">Raw verdict: <strong style="color:${theme.color}; text-transform:uppercase;">${escapeHtml(data.verdict)}</strong></p>
        </div>
        <span style="padding:6px 14px; border-radius:999px; font-weight:600; color:${theme.color}; background:${theme.chipBg};">${theme.label}</span>
      </div>
      <div style="margin-top:12px; font-size:0.85rem; color:#94a3b8;">
        Signal source: <strong style="color:#e0e7ff;">${escapeHtml(data.source)}</strong>
      </div>
      ${confidenceSection}
      ${statsSection}
      <div style="margin-top:16px;">
        <div style="font-size:0.85rem; color:#94a3b8; text-transform:uppercase; letter-spacing:0.08em;">Threat insights</div>
        ${threatMarkup}
      </div>
      ${signalsSection}
      <div style="text-align:center; margin-top:24px">
        <button class="ss-btn ss-btn-danger" id="ss-close">Close</button>
        <button class="ss-btn ss-btn-secondary" id="ss-chat">💬 Ask AI</button>
        <button class="ss-btn ss-btn-primary" id="ss-confirm">Lock Site</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  const closeBtn = document.getElementById('ss-close');
  closeBtn?.addEventListener('click', () => overlay.remove());

  const chatBtn = document.getElementById('ss-chat');
  chatBtn?.addEventListener('click', () => {
    overlay.remove();
    const context = `URL: ${data.url}. Risk: ${data.riskLevel}. Verdict: ${data.verdict}. Threats: ${data.threats.join(', ') || 'none'}`;
    showChatOverlay(context);
  });

  const confirmBtn = document.getElementById('ss-confirm') as HTMLButtonElement | null;
  if (confirmBtn) {
    confirmBtn.addEventListener('click', async () => {
      confirmBtn.disabled = true;
      confirmBtn.textContent = 'Locking...';
      await lockCurrentDomain(token);
      overlay.remove();
    });
  }
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
    
    const userDiv = document.createElement('div');
    userDiv.className = 'ss-chat-msg ss-msg-user';
    userDiv.textContent = msg;
    box.appendChild(userDiv);
    input.value = '';
    box.scrollTop = box.scrollHeight;

    try {
      const data = await chrome.storage.local.get('auth_token') as StorageData;
      const token = data.auth_token;

      if (!token) throw new Error('Not authenticated');

      const res = await fetch(`${API_BASE_URL}/gemini/analyze`, {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ prompt: `Context: ${context}. User Question: ${msg}` })
      });
      
      const dataRes = await res.json();
      if (!res.ok || !dataRes.candidates) throw new Error('AI Error');
      
      const aiDiv = document.createElement('div');
      aiDiv.className = 'ss-chat-msg ss-msg-ai';
      aiDiv.textContent = dataRes.candidates[0].content.parts[0].text;
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

init();