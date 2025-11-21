const m="secureshield-floating-lock-button",d="secureshield-lock-modal",l="secureshield-locked-overlay",x="secureshield-lock-styles",y="secureShield.auth";async function I(){var e;return typeof chrome>"u"||!((e=chrome.storage)!=null&&e.local)?(console.log("[SecureShield] Chrome storage not available"),null):new Promise(o=>{try{chrome.storage.local.get([y],t=>{console.log("[SecureShield] Chrome storage result:",t),console.log("[SecureShield] Auth key value:",t==null?void 0:t[y]),o((t==null?void 0:t[y])??null)})}catch(t){console.warn("[SecureShield] Failed to read auth data from chrome.storage",t),o(null)}})}const k="AIzaSyDAsTZ-iWYH9TQ26OVfHTNhxIaeF85i04c";async function L(e){const o={contents:[{parts:[{text:`Analyze the website ${e} and provide the following details in a structured JSON format:

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
}`}]}]};try{const i=(await(await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${k}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(o)})).json()).candidates[0].content.parts[0].text.replace(/```json/g,"").replace(/```/g,"").trim();return JSON.parse(i)}catch(t){return console.error("[SecureShield] AI analysis error:",t),{description:"Failed to analyze website. Please try again.",pros:[],cons:[]}}}async function C(e,o){const t={contents:[{parts:[{text:`You are an AI assistant. The user is asking about the website: ${o}. 
The user is also using a SecureShield extension to manage locked sites. 
Respond only to queries related to the SecureShield extension or the given website. 
Keep your response concise and limited to one paragraph. Do not include titles or headings. 
If the query is unrelated, respond with: "I can only answer questions related to the SecureShield extension or the given website."
User's question: ${e}`}]}]};try{return(await(await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${k}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(t)})).json()).candidates[0].content.parts[0].text}catch(n){return console.error("[SecureShield] AI chat error:",n),"Failed to get response from AI. Please try again."}}async function A(e,o){var t;if(typeof chrome>"u"||!((t=chrome.runtime)!=null&&t.sendMessage))throw new Error("Chrome extension API not available");return new Promise((n,r)=>{chrome.runtime.sendMessage({action:"CREATE_LOCK",payload:{token:e,data:o}},i=>{if(chrome.runtime.lastError){r(new Error(chrome.runtime.lastError.message));return}if(!(i!=null&&i.success)){r(new Error((i==null?void 0:i.error)||"Failed to create lock"));return}n(i.data)})})}const T=(()=>{try{return window.self===window.top}catch{return!1}})();if(z())if(document.body)b();else{const e=new MutationObserver(()=>{document.body&&(e.disconnect(),b())});e.observe(document.documentElement,{childList:!0})}async function b(){if(!document.body)return;if((await v()).locked){g();return}M(),$()}function z(){var o;if(!T||typeof chrome>"u"||!((o=chrome.runtime)!=null&&o.id))return!1;const e=window.location.protocol;return e==="http:"||e==="https:"}async function v(){var e;return typeof chrome>"u"||!((e=chrome.runtime)!=null&&e.sendMessage)?{locked:!1}:new Promise(o=>{chrome.runtime.sendMessage({action:"CHECK_IF_LOCKED",payload:{url:window.location.href}},t=>{if(chrome.runtime.lastError){o({locked:!1});return}o({locked:!!(t!=null&&t.locked),pin:t==null?void 0:t.pin,lockId:t==null?void 0:t.lockId})})})}function M(){if(document.getElementById(x))return;const e=document.createElement("style");e.id=x,e.textContent=`
		@keyframes spin {
			0% { transform: rotate(0deg); }
			100% { transform: rotate(360deg); }
		}
		
		#${m} {
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

		#${m}:hover {
			transform: translateY(-2px);
			box-shadow: 0 18px 40px rgba(79, 70, 229, 0.45);
		}

		#${m}:focus {
			outline: none;
			box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.35);
		}

		#${d} {
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

		#${d} .ss-modal-card {
			background: #fff;
			border-radius: 20px;
			width: min(420px, 100%);
			padding: 28px;
			box-shadow: 0 25px 80px rgba(15, 23, 42, 0.25);
			font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
			color: #0f172a;
		}

		#${d} h2 {
			margin: 0 0 12px;
			font-size: 22px;
			font-weight: 700;
		}

		#${d} p {
			margin: 0 0 20px;
			font-size: 15px;
			line-height: 1.6;
			color: #475569;
		}

		#${d} label {
			display: block;
			font-size: 13px;
			font-weight: 600;
			color: #0f172a;
			margin-bottom: 6px;
		}

		#${d} input[type="password"] {
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

		#${d} input[type="password"]:focus {
			outline: none;
			border-color: #6366f1;
		}

		#${d} .ss-modal-actions {
			display: flex;
			justify-content: flex-end;
			gap: 12px;
		}

		#${d} button {
			border-radius: 10px;
			border: none;
			font-weight: 600;
			padding: 10px 18px;
			cursor: pointer;
		}

		#${d} .ss-cancel {
			background: #e2e8f0;
			color: #0f172a;
		}

		#${d} .ss-confirm {
			background: linear-gradient(135deg, #2563eb, #7c3aed);
			color: #fff;
			min-width: 140px;
		}

		#${d} .ss-error {
			color: #dc2626;
			font-size: 13px;
			margin-top: 16px;
			min-height: 18px;
		}

		/* AI Analysis Modal Styles */
		#secureshield-ai-analysis-modal,
		#secureshield-analysis-results,
		#secureshield-chat-modal {
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

		.ss-btn-primary {
			background: linear-gradient(135deg, #2563eb, #7c3aed);
			color: #fff;
			border: none;
			border-radius: 10px;
			padding: 10px 18px;
			font-weight: 600;
			cursor: pointer;
			transition: transform 0.2s ease;
		}

		.ss-btn-primary:hover {
			transform: translateY(-1px);
		}

		.ss-btn-secondary {
			background: #e2e8f0;
			color: #0f172a;
			border: none;
			border-radius: 10px;
			padding: 10px 18px;
			font-weight: 600;
			cursor: pointer;
			transition: background 0.2s ease;
		}

		.ss-btn-secondary:hover {
			background: #cbd5e1;
		}

		#${l} {
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

		#${l} .ss-overlay-card {
			background: rgba(15, 23, 42, 0.55);
			border-radius: 24px;
			padding: 32px;
			max-width: 460px;
			width: 100%;
			box-shadow: 0 25px 80px rgba(0, 0, 0, 0.35);
		}

		#${l} h3 {
			margin-top: 0;
			font-size: 26px;
		}

		#${l} p {
			margin-bottom: 0;
			color: rgba(248, 250, 252, 0.85);
			line-height: 1.6;
		}
	`,document.head.appendChild(e)}function $(){if(!document.body||document.getElementById(m))return;const e=document.createElement("button");e.id=m,e.type="button",e.innerHTML='<span aria-hidden="true">🔒</span><span>SecureShield Lock</span>',e.title="Lock this site with SecureShield",e.addEventListener("click",O),document.body.appendChild(e)}function P(){var e;(e=document.getElementById(m))==null||e.remove()}async function B(e){return new Promise(o=>{chrome.runtime.sendMessage({action:"CHECK_DUPLICATE",payload:{url:e}},t=>{t!=null&&t.success&&t.data?o(t.data):o({isDuplicate:!1,lockId:null,hostname:null})})})}async function O(){const e=window.location.href,o=await B(e);if(o.isDuplicate){N(o.hostname||e,o.lockId);return}j()}function N(e,o){var n;if(document.getElementById("secureshield-already-locked-modal"))return;const t=document.createElement("div");t.id="secureshield-already-locked-modal",t.style.cssText=`
		position: fixed;
		inset: 0;
		background: rgba(15, 23, 42, 0.6);
		backdrop-filter: blur(6px);
		z-index: 2147483600;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 16px;
	`,t.innerHTML=`
		<div class="ss-modal-card" style="max-width: 500px; background: #fff; border-radius: 20px; padding: 32px; font-family: system-ui, sans-serif; text-align: center;">
			<div style="font-size: 64px; margin-bottom: 20px;">⚠️</div>
			<h2 style="color: #dc2626; margin-bottom: 16px; font-size: 24px; font-weight: 700;">Already Locked</h2>
			<p style="color: #6b7280; font-size: 15px; line-height: 1.6; margin-bottom: 24px;">
				This website is already locked by SecureShield.
				<br/><br/>
				<strong style="color: #1f2937;">${e}</strong>
				${o?`<br/><span style="font-size: 13px; color: #9ca3af;">(Lock ID: ${o})</span>`:""}
			</p>
			<p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin-bottom: 28px;">
				To lock this site again, you must first unlock it from the SecureShield extension's Web Access Lock page.
			</p>
			<button 
				id="secureshield-understood-btn"
				style="background: linear-gradient(135deg, #2563eb, #7c3aed); color: #fff; border: none; border-radius: 12px; padding: 12px 28px; font-weight: 600; cursor: pointer; font-size: 15px; width: 100%;"
			>
				Understood
			</button>
		</div>
	`,document.body.appendChild(t),(n=document.getElementById("secureshield-understood-btn"))==null||n.addEventListener("click",()=>{t.remove()}),t.addEventListener("click",r=>{r.target===t&&t.remove()})}function j(){if(document.getElementById("secureshield-ai-analysis-modal"))return;const e=document.createElement("div");e.id="secureshield-ai-analysis-modal",e.style.cssText=`
		position: fixed;
		inset: 0;
		background: rgba(15, 23, 42, 0.6);
		backdrop-filter: blur(6px);
		z-index: 2147483600;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 16px;
	`,e.innerHTML=`
		<div class="ss-modal-card" style="max-width: 600px; background: #fff; border-radius: 20px; padding: 28px; font-family: system-ui, sans-serif;">
			<div style="text-align: center; padding: 40px;">
				<div style="display: inline-block; width: 50px; height: 50px; border: 4px solid #f3f3f3; border-top: 4px solid #2563eb; border-radius: 50%; animation: spin 1s linear infinite;"></div>
				<p style="margin-top: 20px; color: #6b7280; font-size: 15px;">Analyzing website with AI...</p>
			</div>
		</div>
	`,document.body.appendChild(e);const o=window.location.href;L(o).then(t=>{e.remove(),H(t)}).catch(()=>{e.remove(),w()})}function H(e){var t,n,r;if(document.getElementById("secureshield-analysis-results"))return;const o=document.createElement("div");o.id="secureshield-analysis-results",o.style.cssText=`
		position: fixed;
		inset: 0;
		background: rgba(15, 23, 42, 0.6);
		backdrop-filter: blur(6px);
		z-index: 2147483600;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 16px;
	`,o.innerHTML=`
		<div class="ss-modal-card" style="max-width: 700px; max-height: 90vh; overflow-y: auto;">
			<h2 style="color: #2563eb; margin-bottom: 16px; font-family: system-ui, sans-serif;">🤖 AI Analysis</h2>
			
			<div style="background: #f9fafb; padding: 16px; border-radius: 8px; margin-bottom: 20px;">
				<h3 style="color: #1f2937; font-size: 14px; margin: 0 0 8px 0; font-weight: 600;">Website Overview</h3>
				<p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 0;">${e.description}</p>
			</div>
			
			<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px;">
				<div style="background: #ecfdf5; padding: 16px; border-radius: 8px; border-left: 4px solid #10b981;">
					<h3 style="color: #065f46; font-size: 14px; margin: 0 0 12px 0; font-weight: 600;">✅ Advantages of Locking</h3>
					<ul style="padding-left: 20px; margin: 0; color: #047857; font-size: 13px; line-height: 1.8;">
						${e.pros.map(i=>`<li>${i}</li>`).join("")}
					</ul>
				</div>
				
				<div style="background: #fef2f2; padding: 16px; border-radius: 8px; border-left: 4px solid #ef4444;">
					<h3 style="color: #991b1b; font-size: 14px; margin: 0 0 12px 0; font-weight: 600;">⚠️ Disadvantages of Locking</h3>
					<ul style="padding-left: 20px; margin: 0; color: #b91c1c; font-size: 13px; line-height: 1.8;">
						${e.cons.map(i=>`<li>${i}</li>`).join("")}
					</ul>
				</div>
			</div>
			
			<div style="display: flex; justify-content: flex-end; gap: 12px; margin-top: 24px;">
				<button class="ss-btn-secondary" id="secureshield-analysis-cancel" style="background: #e2e8f0; color: #0f172a; border: none; border-radius: 10px; padding: 10px 18px; font-weight: 600; cursor: pointer; font-family: system-ui, sans-serif;">Cancel</button>
				<button class="ss-btn-secondary" id="secureshield-chat-ai" style="background: #e2e8f0; color: #0f172a; border: none; border-radius: 10px; padding: 10px 18px; font-weight: 600; cursor: pointer; font-family: system-ui, sans-serif;">💬 Chat with AI</button>
				<button class="ss-btn-primary" id="secureshield-analysis-proceed" style="background: linear-gradient(135deg, #2563eb, #7c3aed); color: #fff; border: none; border-radius: 10px; padding: 10px 18px; font-weight: 600; cursor: pointer; font-family: system-ui, sans-serif;">🔒 Proceed to Lock</button>
			</div>
		</div>
	`,document.body.appendChild(o),(t=document.getElementById("secureshield-analysis-cancel"))==null||t.addEventListener("click",()=>{o.remove()}),(n=document.getElementById("secureshield-chat-ai"))==null||n.addEventListener("click",()=>{D(e.description)}),(r=document.getElementById("secureshield-analysis-proceed"))==null||r.addEventListener("click",()=>{o.remove(),w()})}function D(e){var i,u;if(document.getElementById("secureshield-chat-modal"))return;const o=document.createElement("div");o.id="secureshield-chat-modal",o.innerHTML=`
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
	`,document.body.appendChild(o);const t=document.getElementById("secureshield-chat-input"),n=document.getElementById("secureshield-chat-messages"),r=async()=>{const s=t.value.trim();if(!s)return;const c=document.createElement("div");c.style.cssText="background: #dbeafe; padding: 12px; border-radius: 8px; margin-bottom: 12px; text-align: right;",c.innerHTML=`<strong style="color: #1e40af;">You:</strong><p style="margin: 8px 0 0 0; color: #1e3a8a;">${s}</p>`,n.appendChild(c),t.value="",n.scrollTop=n.scrollHeight;const h=await C(s,e),a=document.createElement("div");a.style.cssText="background: #e0e7ff; padding: 12px; border-radius: 8px; margin-bottom: 12px;",a.innerHTML=`<strong style="color: #3730a3;">AI:</strong><p style="margin: 8px 0 0 0; color: #4338ca;">${h}</p>`,n.appendChild(a),n.scrollTop=n.scrollHeight};(i=document.getElementById("secureshield-send-chat"))==null||i.addEventListener("click",r),t.addEventListener("keypress",s=>{s.key==="Enter"&&r()}),(u=document.getElementById("secureshield-close-chat"))==null||u.addEventListener("click",()=>{o.remove()})}function w(){var n;if(document.getElementById(d))return;const e=document.createElement("div");e.id=d,e.innerHTML=`
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
	`,e.addEventListener("click",r=>{r.target===e&&e.remove()});const o=e.querySelector('[data-action="cancel"]'),t=e.querySelector('[data-action="confirm"]');o.addEventListener("click",()=>e.remove()),t.addEventListener("click",()=>U(e,t)),(n=document.body)==null||n.appendChild(e)}async function U(e,o){var i,u;const t=e.querySelector('[data-role="error"]'),n=e.querySelector('[data-role="pin"]');t.textContent="",o.disabled=!0,o.textContent="Locking...";const r=(n==null?void 0:n.value.trim())||"";if(!r){t.textContent="Enter your security PIN to lock this site.",o.disabled=!1,o.textContent="Lock Site",n==null||n.focus();return}try{(i=chrome==null?void 0:chrome.storage)!=null&&i.local&&chrome.storage.local.get(null,E=>{console.log("[SecureShield] ALL Chrome storage data:",E)});const s=await I();if(console.log("[SecureShield] Auth check:",{hasAuth:!!s,hasToken:!!(s!=null&&s.token),hasPin:(u=s==null?void 0:s.user)==null?void 0:u.hasPin,authData:s}),!s)throw new Error("Open the SecureShield extension and sign in before locking sites.");if(!s.user.hasPin)throw new Error("Set up your security PIN inside the SecureShield extension to lock sites.");const c=F();console.log("[SecureShield] Creating lock for:",c);const a=new URL(c.url).hostname.replace(/^www\./,"").split(".")[0],p=`Quick Lock: ${a.charAt(0).toUpperCase()+a.slice(1)}`,f=await A(s.token,{name:p,isGroup:!1,tabs:[c],pin:r});console.log("[SecureShield] Lock created, response:",f);const S={...f.lock,tabs:[c]};await _(S,r),e.remove(),P(),g()}catch(s){console.error("[SecureShield] Quick lock failed",s),t.textContent=s instanceof Error?s.message:"Unable to lock this site. Please try again."}finally{document.contains(o)&&(o.disabled=!1,o.textContent="Lock Site")}}function F(){var t;const e=window.location.href,o=(()=>{try{return new URL(e).hostname}catch{return e}})();return{title:((t=document.title)==null?void 0:t.trim())||o,url:e}}async function _(e,o){var t;typeof chrome>"u"||!((t=chrome.runtime)!=null&&t.sendMessage)||await new Promise((n,r)=>{chrome.runtime.sendMessage({action:"LOCK_TABS",payload:{lockId:e.id,tabs:e.tabs,pin:o,keepTabsOpen:!0}},i=>{if(chrome.runtime.lastError){r(new Error(chrome.runtime.lastError.message));return}if(!(i!=null&&i.success)){r(new Error((i==null?void 0:i.error)||"Background lock failed"));return}n()})})}async function g(){var h;if(document.getElementById(l))return;const e=await v();if(!e.locked)return;if(console.log("[SecureShield] Rendering password overlay for locked site"),!document.body){console.log("[SecureShield] Body not ready, waiting...");const a=new MutationObserver(()=>{document.body&&(a.disconnect(),g())});a.observe(document.documentElement,{childList:!0,subtree:!0});return}const o=document.createElement("div");o.id=l,o.style.cssText=`
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
	`,o.innerHTML=`
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
	`;const t=document.createElement("style");t.id="ss-hide-content",t.textContent=`
		body > *:not(#${l}) {
			display: none !important;
		}
		body {
			overflow: hidden !important;
		}
	`,(h=document.head)==null||h.appendChild(t),document.body.appendChild(o),document.documentElement.style.overflow="hidden";const n=document.getElementById("ss-pin-input"),r=document.getElementById("ss-unlock-btn"),i=document.getElementById("ss-pin-error");let u=!1;const s=async()=>{var p;const a=(n==null?void 0:n.value)||"";if(!a){i.textContent="Please enter a PIN";return}if(a===e.pin)u=!0,(p=document.getElementById("ss-hide-content"))==null||p.remove(),document.documentElement.style.overflow="",o.remove(),window.location.reload();else{i.textContent="Incorrect PIN";const f=o.firstElementChild;f.style.animation="shake 0.5s",setTimeout(()=>{f.style.animation=""},500),n.value="",n.focus()}};if(r==null||r.addEventListener("click",s),n==null||n.addEventListener("keypress",a=>{a.key==="Enter"&&s()}),!document.getElementById("ss-shake-animation")){const a=document.createElement("style");a.id="ss-shake-animation",a.textContent=`
			@keyframes shake {
				0%, 100% { transform: translateX(0); }
				25% { transform: translateX(-10px); }
				75% { transform: translateX(10px); }
			}
		`,document.head.appendChild(a)}n==null||n.focus();const c=setInterval(()=>{var a;if(u){clearInterval(c);return}if(!document.getElementById(l)){console.warn("[SecureShield] Security violation detected: Overlay removed. Re-applying lock..."),clearInterval(c),g();return}if(!document.getElementById("ss-hide-content")){const p=document.createElement("style");p.id="ss-hide-content",p.textContent=`
				body > *:not(#${l}) {
					display: none !important;
				}
				body {
					overflow: hidden !important;
				}
			`,(a=document.head)==null||a.appendChild(p)}},500)}
