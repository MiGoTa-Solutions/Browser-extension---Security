/// <reference types="chrome" />

import { TabInfo, TabLock } from '../src/types';

const BUTTON_ID = 'secureshield-floating-lock-button';
const MODAL_ID = 'secureshield-lock-modal';
const PAGE_OVERLAY_ID = 'secureshield-locked-overlay';
const STYLE_ID = 'secureshield-lock-styles';
const CHROME_AUTH_KEY = 'secureShield.auth';
const API_BASE_URL = 'http://localhost:4000/api';

interface AuthSnapshot {
	token: string;
	user: {
		hasPin: boolean;
		email?: string;
	};
}

interface LockCheckResponse {
	success: boolean;
	locked?: boolean;
	error?: string;
}

// Inline chrome storage helper
async function readAuthFromChromeStorage(): Promise<AuthSnapshot | null> {
	if (typeof chrome === 'undefined' || !chrome.storage?.local) {
		console.log('[SecureShield] Chrome storage not available');
		return null;
	}

	return new Promise((resolve) => {
		try {
			chrome.storage.local.get([CHROME_AUTH_KEY], (result) => {
				console.log('[SecureShield] Chrome storage result:', result);
				console.log('[SecureShield] Auth key value:', result?.[CHROME_AUTH_KEY]);
				resolve((result?.[CHROME_AUTH_KEY] as AuthSnapshot) ?? null);
			});
		} catch (error) {
			console.warn('[SecureShield] Failed to read auth data from chrome.storage', error);
			resolve(null);
		}
	});
}

// Inline API helper for AI analysis
const GEMINI_API_KEY = 'AIzaSyDAsTZ-iWYH9TQ26OVfHTNhxIaeF85i04c';

async function analyzeWebsiteWithAI(url: string): Promise<{ description: string; pros: string[]; cons: string[] }> {
	const payload = {
		contents: [
			{
				parts: [
					{
						text: `Analyze the website ${url} and provide the following details in a structured JSON format:

1. **Description**: A brief summary of what the website does.
2. **Pros**: A list of advantages of locking this site - 5 points.
3. **Cons**: A list of disadvantages of locking this site - 5 points.

Format the response as a JSON object with the following keys:
- "description": A string containing the summary.
- "pros": An array of strings, each describing an advantage.
- "cons": An array of strings, each describing a disadvantage.

Example response:
{
  "description": "LinkedIn is a professional networking website...",
  "pros": [
    "Privacy: Prevents unauthorized access to your professional network...",
    "Focus/Productivity: Reduces the temptation to browse LinkedIn..."
  ],
  "cons": [
    "Inconvenience: Makes it difficult to quickly check LinkedIn...",
    "Missed Opportunities: Could lead to missing time-sensitive job postings..."
  ]
}`
					}
				]
			}
		]
	};

	try {
		const response = await fetch(
			`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
			{
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload)
			}
		);

		const data = await response.json();
		const responseText = data.candidates[0].content.parts[0].text;
		const jsonString = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
		return JSON.parse(jsonString);
	} catch (error) {
		console.error('[SecureShield] AI analysis error:', error);
		return {
			description: 'Failed to analyze website. Please try again.',
			pros: [],
			cons: []
		};
	}
}

async function chatWithAI(message: string, websiteContext: string): Promise<string> {
	const payload = {
		contents: [
			{
				parts: [
					{
						text: `You are an AI assistant. The user is asking about the website: ${websiteContext}. 
The user is also using a SecureShield extension to manage locked sites. 
Respond only to queries related to the SecureShield extension or the given website. 
Keep your response concise and limited to one paragraph. Do not include titles or headings. 
If the query is unrelated, respond with: "I can only answer questions related to the SecureShield extension or the given website."
User's question: ${message}`
					}
				]
			}
		]
	};

	try {
		const response = await fetch(
			`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
			{
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload)
			}
		);

		const data = await response.json();
		return data.candidates[0].content.parts[0].text;
	} catch (error) {
		console.error('[SecureShield] AI chat error:', error);
		return 'Failed to get response from AI. Please try again.';
	}
}

// Inline API helper for creating locks via background script
async function createTabLock(token: string, data: { name: string; isGroup: boolean; tabs: TabInfo[]; pin: string }): Promise<{ lock: TabLock }> {
	if (typeof chrome === 'undefined' || !chrome.runtime?.sendMessage) {
		throw new Error('Chrome extension API not available');
	}

	return new Promise((resolve, reject) => {
		chrome.runtime.sendMessage(
			{
				action: 'CREATE_LOCK',
				payload: { token, data },
			},
			(response) => {
				if (chrome.runtime.lastError) {
					reject(new Error(chrome.runtime.lastError.message));
					return;
				}
				if (!response?.success) {
					reject(new Error(response?.error || 'Failed to create lock'));
					return;
				}
				resolve(response.data);
			}
		);
	});
}

const isTopFrame = (() => {
	try {
		return window.self === window.top;
	} catch {
		return false;
	}
})();

if (shouldInject()) {
  // With document_start, we need to wait for body to exist
  if (!document.body) {
    const observer = new MutationObserver(() => {
      if (document.body) {
        observer.disconnect();
        void initialize();
      }
    });
    observer.observe(document.documentElement, { childList: true });
  } else {
    void initialize();
  }
}

async function initialize() {
	if (!document.body) return;

	const lockStatus = await isCurrentSiteLocked();
	if (lockStatus.locked) {
		// Show password-protected overlay on locked page
		renderPasswordProtectedOverlay();
		return;
	}

	injectStyles();
	createFloatingButton();
}

function shouldInject(): boolean {
	if (!isTopFrame) return false;
	if (typeof chrome === 'undefined' || !chrome.runtime?.id) return false;
	const protocol = window.location.protocol;
	return protocol === 'http:' || protocol === 'https:';
}

async function isCurrentSiteLocked(): Promise<{ locked: boolean; pin?: string; lockId?: number }> {
  if (typeof chrome === 'undefined' || !chrome.runtime?.sendMessage) {
    return { locked: false };
  }

  return new Promise((resolve) => {
    chrome.runtime.sendMessage(
      { action: 'CHECK_IF_LOCKED', payload: { url: window.location.href } },
      (response: any) => {
        if (chrome.runtime.lastError) {
          resolve({ locked: false });
          return;
        }
        resolve({ 
          locked: Boolean(response?.locked),
          pin: response?.pin,
          lockId: response?.lockId
        });
      }
    );
  });
}function injectStyles() {
	if (document.getElementById(STYLE_ID)) return;
	const style = document.createElement('style');
	style.id = STYLE_ID;
	style.textContent = `
		@keyframes spin {
			0% { transform: rotate(0deg); }
			100% { transform: rotate(360deg); }
		}
		
		#${BUTTON_ID} {
			position: fixed;
			bottom: 20px;
			right: 20px;
			z-index: 2147483000;
			background: linear-gradient(135deg, #2563eb, #7c3aed);
			color: #fff;
			border: none;
			border-radius: 999px;
			padding: 12px 20px;
			font-size: 14px;
			font-weight: 600;
			font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
			box-shadow: 0 12px 30px rgba(59, 130, 246, 0.35);
			display: flex;
			gap: 8px;
			align-items: center;
			cursor: pointer;
			transition: transform 0.2s ease, box-shadow 0.2s ease;
		}

		#${BUTTON_ID}:hover {
			transform: translateY(-2px);
			box-shadow: 0 18px 40px rgba(79, 70, 229, 0.45);
		}

		#${BUTTON_ID}:focus {
			outline: none;
			box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.35);
		}

		#${MODAL_ID} {
			position: fixed;
			inset: 0;
			background: rgba(15, 23, 42, 0.6);
			backdrop-filter: blur(6px);
			z-index: 2147483600;
			display: flex;
			align-items: center;
			justify-content: center;
			padding: 16px;
		}

		#${MODAL_ID} .ss-modal-card {
			background: #fff;
			border-radius: 20px;
			width: min(420px, 100%);
			padding: 28px;
			box-shadow: 0 25px 80px rgba(15, 23, 42, 0.25);
			font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
			color: #0f172a;
		}

		#${MODAL_ID} h2 {
			margin: 0 0 12px;
			font-size: 22px;
			font-weight: 700;
		}

		#${MODAL_ID} p {
			margin: 0 0 20px;
			font-size: 15px;
			line-height: 1.6;
			color: #475569;
		}

		#${MODAL_ID} label {
			display: block;
			font-size: 13px;
			font-weight: 600;
			color: #0f172a;
			margin-bottom: 6px;
		}

		#${MODAL_ID} input[type="password"] {
			width: 100%;
			border-radius: 12px;
			border: 1px solid #e2e8f0;
			padding: 12px 14px;
			font-size: 15px;
			font-weight: 600;
			letter-spacing: 2px;
			background: #f8fafc;
			transition: border-color 0.2s ease;
		}

		#${MODAL_ID} input[type="password"]:focus {
			outline: none;
			border-color: #6366f1;
		}

		#${MODAL_ID} .ss-modal-actions {
			display: flex;
			justify-content: flex-end;
			gap: 12px;
		}

		#${MODAL_ID} button {
			border-radius: 10px;
			border: none;
			font-weight: 600;
			padding: 10px 18px;
			cursor: pointer;
		}

		#${MODAL_ID} .ss-cancel {
			background: #e2e8f0;
			color: #0f172a;
		}

		#${MODAL_ID} .ss-confirm {
			background: linear-gradient(135deg, #2563eb, #7c3aed);
			color: #fff;
			min-width: 140px;
		}

		#${MODAL_ID} .ss-error {
			color: #dc2626;
			font-size: 13px;
			margin-top: 16px;
			min-height: 18px;
		}

		#${PAGE_OVERLAY_ID} {
			position: fixed;
			inset: 0;
			background: linear-gradient(135deg, #111827, #1e1b4b);
			z-index: 2147483900;
			display: flex;
			align-items: center;
			justify-content: center;
			font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
			color: #fff;
			text-align: center;
			padding: 24px;
		}

		#${PAGE_OVERLAY_ID} .ss-overlay-card {
			background: rgba(15, 23, 42, 0.55);
			border-radius: 24px;
			padding: 32px;
			max-width: 460px;
			width: 100%;
			box-shadow: 0 25px 80px rgba(0, 0, 0, 0.35);
		}

		#${PAGE_OVERLAY_ID} h3 {
			margin-top: 0;
			font-size: 26px;
		}

		#${PAGE_OVERLAY_ID} p {
			margin-bottom: 0;
			color: rgba(248, 250, 252, 0.85);
			line-height: 1.6;
		}
	`;
	document.head.appendChild(style);
}

function createFloatingButton() {
	if (!document.body || document.getElementById(BUTTON_ID)) return;
	const button = document.createElement('button');
	button.id = BUTTON_ID;
	button.type = 'button';
	button.innerHTML = '<span aria-hidden="true">🔒</span><span>SecureShield Lock</span>';
	button.title = 'Lock this site with SecureShield';
	button.addEventListener('click', openLockModal);
	document.body.appendChild(button);
}

function removeFloatingButton() {
	document.getElementById(BUTTON_ID)?.remove();
}

function openLockModal() {
	// First show AI analysis, then lock modal
	showAIAnalysisModal();
}

function showAIAnalysisModal() {
	if (document.getElementById('secureshield-ai-analysis-modal')) return;
	
	const loadingOverlay = document.createElement('div');
	loadingOverlay.id = 'secureshield-ai-analysis-modal';
	loadingOverlay.innerHTML = `
		<div class="ss-modal-card" style="max-width: 600px;">
			<div style="text-align: center; padding: 40px;">
				<div style="display: inline-block; width: 50px; height: 50px; border: 4px solid #f3f3f3; border-top: 4px solid #2563eb; border-radius: 50%; animation: spin 1s linear infinite;"></div>
				<p style="margin-top: 20px; color: #6b7280;">Analyzing website with AI...</p>
			</div>
		</div>
	`;
	document.body.appendChild(loadingOverlay);
	
	const currentUrl = window.location.href;
	
	analyzeWebsiteWithAI(currentUrl).then((analysis) => {
		loadingOverlay.remove();
		showAnalysisResults(analysis);
	}).catch(() => {
		loadingOverlay.remove();
		showPINModal(); // Fallback to direct lock if AI fails
	});
}

function showAnalysisResults(analysis: { description: string; pros: string[]; cons: string[] }) {
	if (document.getElementById('secureshield-analysis-results')) return;
	
	const overlay = document.createElement('div');
	overlay.id = 'secureshield-analysis-results';
	overlay.innerHTML = `
		<div class="ss-modal-card" style="max-width: 700px; max-height: 90vh; overflow-y: auto;">
			<h2 style="color: #2563eb; margin-bottom: 16px;">🤖 AI Analysis</h2>
			
			<div style="background: #f9fafb; padding: 16px; border-radius: 8px; margin-bottom: 20px;">
				<h3 style="color: #1f2937; font-size: 14px; margin-bottom: 8px;">Website Overview</h3>
				<p style="color: #6b7280; font-size: 14px; line-height: 1.6;">${analysis.description}</p>
			</div>
			
			<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px;">
				<div style="background: #ecfdf5; padding: 16px; border-radius: 8px; border-left: 4px solid #10b981;">
					<h3 style="color: #065f46; font-size: 14px; margin-bottom: 12px;">✅ Advantages of Locking</h3>
					<ul style="padding-left: 20px; margin: 0; color: #047857; font-size: 13px; line-height: 1.8;">
						${analysis.pros.map(pro => `<li>${pro}</li>`).join('')}
					</ul>
				</div>
				
				<div style="background: #fef2f2; padding: 16px; border-radius: 8px; border-left: 4px solid #ef4444;">
					<h3 style="color: #991b1b; font-size: 14px; margin-bottom: 12px;">⚠️ Disadvantages of Locking</h3>
					<ul style="padding-left: 20px; margin: 0; color: #b91c1c; font-size: 13px; line-height: 1.8;">
						${analysis.cons.map(con => `<li>${con}</li>`).join('')}
					</ul>
				</div>
			</div>
			
			<div class="ss-modal-actions">
				<button class="ss-btn-secondary" id="secureshield-analysis-cancel">Cancel</button>
				<button class="ss-btn-secondary" id="secureshield-chat-ai">💬 Chat with AI</button>
				<button class="ss-btn-primary" id="secureshield-analysis-proceed">🔒 Proceed to Lock</button>
			</div>
		</div>
	`;
	document.body.appendChild(overlay);
	
	document.getElementById('secureshield-analysis-cancel')?.addEventListener('click', () => {
		overlay.remove();
	});
	
	document.getElementById('secureshield-chat-ai')?.addEventListener('click', () => {
		showChatModal(analysis.description);
	});
	
	document.getElementById('secureshield-analysis-proceed')?.addEventListener('click', () => {
		overlay.remove();
		showPINModal();
	});
}

function showChatModal(websiteContext: string) {
	if (document.getElementById('secureshield-chat-modal')) return;
	
	const overlay = document.createElement('div');
	overlay.id = 'secureshield-chat-modal';
	overlay.innerHTML = `
		<div class="ss-modal-card" style="max-width: 600px; height: 600px; display: flex; flex-direction: column;">
			<h2 style="color: #2563eb; margin-bottom: 16px;">💬 Chat with AI Assistant</h2>
			
			<div id="secureshield-chat-messages" style="flex: 1; overflow-y: auto; background: #f9fafb; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
				<div style="background: #e0e7ff; padding: 12px; border-radius: 8px; margin-bottom: 12px;">
					<strong style="color: #3730a3;">AI:</strong>
					<p style="margin: 8px 0 0 0; color: #4338ca;">Hello! I can help you with questions about this website and the SecureShield extension. How can I assist you?</p>
				</div>
			</div>
			
			<div style="display: flex; gap: 8px;">
				<input 
					type="text" 
					id="secureshield-chat-input" 
					placeholder="Type your message..."
					style="flex: 1; padding: 12px; border: 1px solid #d1d5db; border-radius: 8px; font-size: 14px;"
				/>
				<button class="ss-btn-primary" id="secureshield-send-chat" style="padding: 12px 24px;">Send</button>
			</div>
			
			<div class="ss-modal-actions" style="margin-top: 16px;">
				<button class="ss-btn-secondary" id="secureshield-close-chat">Close</button>
			</div>
		</div>
	`;
	document.body.appendChild(overlay);
	
	const chatInput = document.getElementById('secureshield-chat-input') as HTMLInputElement;
	const chatMessages = document.getElementById('secureshield-chat-messages') as HTMLDivElement;
	
	const sendMessage = async () => {
		const message = chatInput.value.trim();
		if (!message) return;
		
		// Add user message
		const userMsg = document.createElement('div');
		userMsg.style.cssText = 'background: #dbeafe; padding: 12px; border-radius: 8px; margin-bottom: 12px; text-align: right;';
		userMsg.innerHTML = `<strong style="color: #1e40af;">You:</strong><p style="margin: 8px 0 0 0; color: #1e3a8a;">${message}</p>`;
		chatMessages.appendChild(userMsg);
		chatInput.value = '';
		chatMessages.scrollTop = chatMessages.scrollHeight;
		
		// Get AI response
		const aiResponse = await chatWithAI(message, websiteContext);
		
		const aiMsg = document.createElement('div');
		aiMsg.style.cssText = 'background: #e0e7ff; padding: 12px; border-radius: 8px; margin-bottom: 12px;';
		aiMsg.innerHTML = `<strong style="color: #3730a3;">AI:</strong><p style="margin: 8px 0 0 0; color: #4338ca;">${aiResponse}</p>`;
		chatMessages.appendChild(aiMsg);
		chatMessages.scrollTop = chatMessages.scrollHeight;
	};
	
	document.getElementById('secureshield-send-chat')?.addEventListener('click', sendMessage);
	chatInput.addEventListener('keypress', (e) => {
		if (e.key === 'Enter') sendMessage();
	});
	
	document.getElementById('secureshield-close-chat')?.addEventListener('click', () => {
		overlay.remove();
	});
}

function showPINModal() {
	if (document.getElementById(MODAL_ID)) return;
	const overlay = document.createElement('div');
	overlay.id = MODAL_ID;
	overlay.innerHTML = `
		<div class="ss-modal-card">
			<h2>Lock this site?</h2>
			<p>
				SecureShield will hide this website, require your security PIN, and list it inside the extension.
				You can unlock or delete it anytime from the Web Access Lock module.
			</p>
			<div class="ss-field">
				<label for="secureshield-pin-input">Security PIN</label>
				<input
					id="secureshield-pin-input"
					type="password"
					maxlength="12"
					data-role="pin"
					placeholder="Enter PIN to confirm"
					autocomplete="off"
				/>
			</div>
			<div class="ss-modal-actions">
				<button type="button" class="ss-cancel" data-action="cancel">Cancel</button>
				<button type="button" class="ss-confirm" data-action="confirm">Lock Site</button>
			</div>
			<div class="ss-error" data-role="error"></div>
		</div>
	`;

	overlay.addEventListener('click', (event) => {
		if (event.target === overlay) {
			overlay.remove();
		}
	});

	const cancelBtn = overlay.querySelector('[data-action="cancel"]') as HTMLButtonElement;
	const confirmBtn = overlay.querySelector('[data-action="confirm"]') as HTMLButtonElement;

	cancelBtn.addEventListener('click', () => overlay.remove());
	confirmBtn.addEventListener('click', () => handleLockConfirmation(overlay, confirmBtn));

	document.body?.appendChild(overlay);
}

async function handleLockConfirmation(modal: HTMLElement, confirmBtn: HTMLButtonElement) {
	const errorNode = modal.querySelector('[data-role="error"]') as HTMLDivElement;
	const pinInput = modal.querySelector('[data-role="pin"]') as HTMLInputElement;
	errorNode.textContent = '';
	confirmBtn.disabled = true;
	confirmBtn.textContent = 'Locking...';

	const pin = pinInput?.value.trim() || '';
	if (!pin) {
		errorNode.textContent = 'Enter your security PIN to lock this site.';
		confirmBtn.disabled = false;
		confirmBtn.textContent = 'Lock Site';
		pinInput?.focus();
		return;
	}

	try {
		// Debug: Check all chrome.storage.local data
		if (chrome?.storage?.local) {
			chrome.storage.local.get(null, (allData) => {
				console.log('[SecureShield] ALL Chrome storage data:', allData);
			});
		}
		
		const auth = (await readAuthFromChromeStorage()) as AuthSnapshot | null;
		console.log('[SecureShield] Auth check:', { hasAuth: !!auth, hasToken: !!auth?.token, hasPin: auth?.user?.hasPin, authData: auth });
		
		if (!auth) {
			throw new Error('Open the SecureShield extension and sign in before locking sites.');
		}

		if (!auth.user.hasPin) {
			throw new Error('Set up your security PIN inside the SecureShield extension to lock sites.');
		}

	const tabInfo = extractCurrentTabInfo();
	console.log('[SecureShield] Creating lock for:', tabInfo);
	
	// Extract domain name for better lock naming
	const hostname = new URL(tabInfo.url).hostname;
	const domainName = hostname.replace(/^www\./, '').split('.')[0];
	const lockName = `Quick Lock: ${domainName.charAt(0).toUpperCase() + domainName.slice(1)}`;
	
	const response = await createTabLock(auth.token, {
		name: lockName,
		isGroup: false,
		tabs: [tabInfo],
		pin,
	});		console.log('[SecureShield] Lock created, response:', response);
		
		// Use the original tabInfo since API response might have empty tabs array
		const lockWithTabs = { ...response.lock, tabs: [tabInfo] };
		await lockTabsInBackground(lockWithTabs, pin);
		
		modal.remove();
		removeFloatingButton();
		renderPasswordProtectedOverlay();
	} catch (error) {
		console.error('[SecureShield] Quick lock failed', error);
		errorNode.textContent = error instanceof Error ? error.message : 'Unable to lock this site. Please try again.';
	} finally {
		if (document.contains(confirmBtn)) {
			confirmBtn.disabled = false;
			confirmBtn.textContent = 'Lock Site';
		}
	}
}

function extractCurrentTabInfo(): TabInfo {
	const url = window.location.href;
	const hostname = (() => {
		try {
			return new URL(url).hostname;
		} catch {
			return url;
		}
	})();

	return {
		title: document.title?.trim() || hostname,
		url,
	} satisfies TabInfo;
}

async function lockTabsInBackground(lock: TabLock, pin: string) {
	if (typeof chrome === 'undefined' || !chrome.runtime?.sendMessage) return;

	await new Promise<void>((resolve, reject) => {
		chrome.runtime.sendMessage(
			{
				action: 'LOCK_TABS',
				payload: {
					lockId: lock.id,
					tabs: lock.tabs,
					pin,
					keepTabsOpen: true,
				},
			},
			(response) => {
				if (chrome.runtime.lastError) {
					reject(new Error(chrome.runtime.lastError.message));
					return;
				}
				if (!response?.success) {
					reject(new Error(response?.error || 'Background lock failed'));
					return;
				}
				resolve();
			}
		);
	});
}

async function renderPasswordProtectedOverlay() {
	if (document.getElementById(PAGE_OVERLAY_ID)) return;
	
	const lockStatus = await isCurrentSiteLocked();
	if (!lockStatus.locked) return;
	
	console.log('[SecureShield] Rendering password overlay for locked site');
	
	// Ensure body exists
	if (!document.body) {
		console.log('[SecureShield] Body not ready, waiting...');
		const observer = new MutationObserver(() => {
			if (document.body) {
				observer.disconnect();
				renderPasswordProtectedOverlay();
			}
		});
		observer.observe(document.documentElement, { childList: true, subtree: true });
		return;
	}
	
	const overlay = document.createElement('div');
	overlay.id = PAGE_OVERLAY_ID;
	overlay.style.cssText = `
		position: fixed !important;
		top: 0 !important;
		left: 0 !important;
		width: 100vw !important;
		height: 100vh !important;
		background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
		display: flex !important;
		align-items: center !important;
		justify-content: center !important;
		z-index: 2147483647 !important;
		font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
		pointer-events: auto !important;
	`;
	
	overlay.innerHTML = `
		<div style="background: white; padding: 48px; border-radius: 24px; box-shadow: 0 20px 60px rgba(0,0,0,0.3); text-align: center; max-width: 500px; width: 90%;">
			<div style="font-size: 72px; margin-bottom: 24px;">🔐</div>
			<h2 style="margin: 0 0 12px 0; font-size: 32px; color: #1a202c; font-weight: 700;">Site Locked</h2>
			<p style="margin: 0 0 32px 0; color: #4a5568; font-size: 16px; line-height: 1.6;">
				This website is protected by SecureShield. Enter your PIN to unlock.
			</p>
			
			<input 
				type="password" 
				id="ss-pin-input" 
				placeholder="Enter PIN" 
				maxlength="6"
				style="width: 100%; padding: 16px 20px; font-size: 18px; border: 2px solid #e2e8f0; border-radius: 12px; margin-bottom: 8px; box-sizing: border-box; text-align: center; letter-spacing: 4px; font-weight: 600;"
			/>
			
			<div id="ss-pin-error" style="color: #e53e3e; font-size: 14px; margin-bottom: 16px; min-height: 20px; font-weight: 500;"></div>
			
			<button 
				id="ss-unlock-btn"
				style="width: 100%; padding: 16px; font-size: 18px; font-weight: 600; color: white; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border: none; border-radius: 12px; cursor: pointer; transition: all 0.3s ease; box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);"
				onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 6px 16px rgba(102, 126, 234, 0.5)';"
				onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 12px rgba(102, 126, 234, 0.4)';"
			>
				Unlock
			</button>
		</div>
	`;
	
	// Hide all page content
	const hideStyle = document.createElement('style');
	hideStyle.id = 'ss-hide-content';
	hideStyle.textContent = `
		body > *:not(#${PAGE_OVERLAY_ID}) {
			display: none !important;
		}
		body {
			overflow: hidden !important;
		}
	`;
	document.head?.appendChild(hideStyle);
	
	document.body.appendChild(overlay);
	document.documentElement.style.overflow = 'hidden';
	
	const pinInput = document.getElementById('ss-pin-input') as HTMLInputElement;
	const unlockBtn = document.getElementById('ss-unlock-btn') as HTMLButtonElement;
	const errorDiv = document.getElementById('ss-pin-error') as HTMLDivElement;
	
	const handleUnlock = async () => {
		const enteredPin = pinInput?.value || '';
		if (!enteredPin) {
			errorDiv.textContent = 'Please enter a PIN';
			return;
		}
		
		if (enteredPin === lockStatus.pin) {
			// Correct PIN - reload the page to show content
			document.getElementById('ss-hide-content')?.remove();
			document.documentElement.style.overflow = '';
			overlay.remove();
			window.location.reload();
		} else {
			// Wrong PIN - show error and shake
			errorDiv.textContent = 'Incorrect PIN';
			const card = overlay.firstElementChild as HTMLElement;
			card.style.animation = 'shake 0.5s';
			setTimeout(() => {
				card.style.animation = '';
			}, 500);
			pinInput.value = '';
			pinInput.focus();
		}
	};
	
	unlockBtn?.addEventListener('click', handleUnlock);
	pinInput?.addEventListener('keypress', (e) => {
		if (e.key === 'Enter') {
			handleUnlock();
		}
	});
	
	// Add shake animation
	if (!document.getElementById('ss-shake-animation')) {
		const style = document.createElement('style');
		style.id = 'ss-shake-animation';
		style.textContent = `
			@keyframes shake {
				0%, 100% { transform: translateX(0); }
				25% { transform: translateX(-10px); }
				75% { transform: translateX(10px); }
			}
		`;
		document.head.appendChild(style);
	}
	
	pinInput?.focus();
}

export {};
