const p="secureshield-floating-lock-button",d="secureshield-lock-modal",u="secureshield-locked-overlay",y="secureshield-lock-styles",h="secureShield.auth";async function I(){var e;return typeof chrome>"u"||!((e=chrome.storage)!=null&&e.local)?(console.log("[SecureShield] Chrome storage not available"),null):new Promise(o=>{try{chrome.storage.local.get([h],t=>{console.log("[SecureShield] Chrome storage result:",t),console.log("[SecureShield] Auth key value:",t==null?void 0:t[h]),o((t==null?void 0:t[h])??null)})}catch(t){console.warn("[SecureShield] Failed to read auth data from chrome.storage",t),o(null)}})}const b="AIzaSyDAsTZ-iWYH9TQ26OVfHTNhxIaeF85i04c";async function L(e){const o={contents:[{parts:[{text:`Analyze the website ${e} and provide the following details in a structured JSON format:

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
}`}]}]};try{const i=(await(await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${b}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(o)})).json()).candidates[0].content.parts[0].text.replace(/```json/g,"").replace(/```/g,"").trim();return JSON.parse(i)}catch(t){return console.error("[SecureShield] AI analysis error:",t),{description:"Failed to analyze website. Please try again.",pros:[],cons:[]}}}async function C(e,o){const t={contents:[{parts:[{text:`You are an AI assistant. The user is asking about the website: ${o}. 
The user is also using a SecureShield extension to manage locked sites. 
Respond only to queries related to the SecureShield extension or the given website. 
Keep your response concise and limited to one paragraph. Do not include titles or headings. 
If the query is unrelated, respond with: "I can only answer questions related to the SecureShield extension or the given website."
User's question: ${e}`}]}]};try{return(await(await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${b}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(t)})).json()).candidates[0].content.parts[0].text}catch(n){return console.error("[SecureShield] AI chat error:",n),"Failed to get response from AI. Please try again."}}async function A(e,o){var t;if(typeof chrome>"u"||!((t=chrome.runtime)!=null&&t.sendMessage))throw new Error("Chrome extension API not available");return new Promise((n,s)=>{chrome.runtime.sendMessage({action:"CREATE_LOCK",payload:{token:e,data:o}},i=>{if(chrome.runtime.lastError){s(new Error(chrome.runtime.lastError.message));return}if(!(i!=null&&i.success)){s(new Error((i==null?void 0:i.error)||"Failed to create lock"));return}n(i.data)})})}const T=(()=>{try{return window.self===window.top}catch{return!1}})();if(P())if(document.body)x();else{const e=new MutationObserver(()=>{document.body&&(e.disconnect(),x())});e.observe(document.documentElement,{childList:!0})}async function x(){if(!document.body)return;if((await v()).locked){g();return}M(),$()}function P(){var o;if(!T||typeof chrome>"u"||!((o=chrome.runtime)!=null&&o.id))return!1;const e=window.location.protocol;return e==="http:"||e==="https:"}async function v(){var e;return typeof chrome>"u"||!((e=chrome.runtime)!=null&&e.sendMessage)?{locked:!1}:new Promise(o=>{chrome.runtime.sendMessage({action:"CHECK_IF_LOCKED",payload:{url:window.location.href}},t=>{if(chrome.runtime.lastError){o({locked:!1});return}o({locked:!!(t!=null&&t.locked),pin:t==null?void 0:t.pin,lockId:t==null?void 0:t.lockId})})})}function M(){if(document.getElementById(y))return;const e=document.createElement("style");e.id=y,e.textContent=`
		@keyframes spin {
			0% { transform: rotate(0deg); }
			100% { transform: rotate(360deg); }
		}
		
		#${p} {
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

		#${p}:hover {
			transform: translateY(-2px);
			box-shadow: 0 18px 40px rgba(79, 70, 229, 0.45);
		}

		#${p}:focus {
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

		#${u} {
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

		#${u} .ss-overlay-card {
			background: rgba(15, 23, 42, 0.55);
			border-radius: 24px;
			padding: 32px;
			max-width: 460px;
			width: 100%;
			box-shadow: 0 25px 80px rgba(0, 0, 0, 0.35);
		}

		#${u} h3 {
			margin-top: 0;
			font-size: 26px;
		}

		#${u} p {
			margin-bottom: 0;
			color: rgba(248, 250, 252, 0.85);
			line-height: 1.6;
		}
	`,document.head.appendChild(e)}function $(){if(!document.body||document.getElementById(p))return;const e=document.createElement("button");e.id=p,e.type="button",e.innerHTML='<span aria-hidden="true">🔒</span><span>SecureShield Lock</span>',e.title="Lock this site with SecureShield",e.addEventListener("click",B),document.body.appendChild(e)}function z(){var e;(e=document.getElementById(p))==null||e.remove()}function B(){O()}function O(){if(document.getElementById("secureshield-ai-analysis-modal"))return;const e=document.createElement("div");e.id="secureshield-ai-analysis-modal",e.innerHTML=`
		<div class="ss-modal-card" style="max-width: 600px;">
			<div style="text-align: center; padding: 40px;">
				<div style="display: inline-block; width: 50px; height: 50px; border: 4px solid #f3f3f3; border-top: 4px solid #2563eb; border-radius: 50%; animation: spin 1s linear infinite;"></div>
				<p style="margin-top: 20px; color: #6b7280;">Analyzing website with AI...</p>
			</div>
		</div>
	`,document.body.appendChild(e);const o=window.location.href;L(o).then(t=>{e.remove(),N(t)}).catch(()=>{e.remove(),w()})}function N(e){var t,n,s;if(document.getElementById("secureshield-analysis-results"))return;const o=document.createElement("div");o.id="secureshield-analysis-results",o.innerHTML=`
		<div class="ss-modal-card" style="max-width: 700px; max-height: 90vh; overflow-y: auto;">
			<h2 style="color: #2563eb; margin-bottom: 16px;">🤖 AI Analysis</h2>
			
			<div style="background: #f9fafb; padding: 16px; border-radius: 8px; margin-bottom: 20px;">
				<h3 style="color: #1f2937; font-size: 14px; margin-bottom: 8px;">Website Overview</h3>
				<p style="color: #6b7280; font-size: 14px; line-height: 1.6;">${e.description}</p>
			</div>
			
			<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px;">
				<div style="background: #ecfdf5; padding: 16px; border-radius: 8px; border-left: 4px solid #10b981;">
					<h3 style="color: #065f46; font-size: 14px; margin-bottom: 12px;">✅ Advantages of Locking</h3>
					<ul style="padding-left: 20px; margin: 0; color: #047857; font-size: 13px; line-height: 1.8;">
						${e.pros.map(i=>`<li>${i}</li>`).join("")}
					</ul>
				</div>
				
				<div style="background: #fef2f2; padding: 16px; border-radius: 8px; border-left: 4px solid #ef4444;">
					<h3 style="color: #991b1b; font-size: 14px; margin-bottom: 12px;">⚠️ Disadvantages of Locking</h3>
					<ul style="padding-left: 20px; margin: 0; color: #b91c1c; font-size: 13px; line-height: 1.8;">
						${e.cons.map(i=>`<li>${i}</li>`).join("")}
					</ul>
				</div>
			</div>
			
			<div class="ss-modal-actions">
				<button class="ss-btn-secondary" id="secureshield-analysis-cancel">Cancel</button>
				<button class="ss-btn-secondary" id="secureshield-chat-ai">💬 Chat with AI</button>
				<button class="ss-btn-primary" id="secureshield-analysis-proceed">🔒 Proceed to Lock</button>
			</div>
		</div>
	`,document.body.appendChild(o),(t=document.getElementById("secureshield-analysis-cancel"))==null||t.addEventListener("click",()=>{o.remove()}),(n=document.getElementById("secureshield-chat-ai"))==null||n.addEventListener("click",()=>{H(e.description)}),(s=document.getElementById("secureshield-analysis-proceed"))==null||s.addEventListener("click",()=>{o.remove(),w()})}function H(e){var i,l;if(document.getElementById("secureshield-chat-modal"))return;const o=document.createElement("div");o.id="secureshield-chat-modal",o.innerHTML=`
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
	`,document.body.appendChild(o);const t=document.getElementById("secureshield-chat-input"),n=document.getElementById("secureshield-chat-messages"),s=async()=>{const r=t.value.trim();if(!r)return;const a=document.createElement("div");a.style.cssText="background: #dbeafe; padding: 12px; border-radius: 8px; margin-bottom: 12px; text-align: right;",a.innerHTML=`<strong style="color: #1e40af;">You:</strong><p style="margin: 8px 0 0 0; color: #1e3a8a;">${r}</p>`,n.appendChild(a),t.value="",n.scrollTop=n.scrollHeight;const m=await C(r,e),c=document.createElement("div");c.style.cssText="background: #e0e7ff; padding: 12px; border-radius: 8px; margin-bottom: 12px;",c.innerHTML=`<strong style="color: #3730a3;">AI:</strong><p style="margin: 8px 0 0 0; color: #4338ca;">${m}</p>`,n.appendChild(c),n.scrollTop=n.scrollHeight};(i=document.getElementById("secureshield-send-chat"))==null||i.addEventListener("click",s),t.addEventListener("keypress",r=>{r.key==="Enter"&&s()}),(l=document.getElementById("secureshield-close-chat"))==null||l.addEventListener("click",()=>{o.remove()})}function w(){var n;if(document.getElementById(d))return;const e=document.createElement("div");e.id=d,e.innerHTML=`
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
	`,e.addEventListener("click",s=>{s.target===e&&e.remove()});const o=e.querySelector('[data-action="cancel"]'),t=e.querySelector('[data-action="confirm"]');o.addEventListener("click",()=>e.remove()),t.addEventListener("click",()=>F(e,t)),(n=document.body)==null||n.appendChild(e)}async function F(e,o){var i,l;const t=e.querySelector('[data-role="error"]'),n=e.querySelector('[data-role="pin"]');t.textContent="",o.disabled=!0,o.textContent="Locking...";const s=(n==null?void 0:n.value.trim())||"";if(!s){t.textContent="Enter your security PIN to lock this site.",o.disabled=!1,o.textContent="Lock Site",n==null||n.focus();return}try{(i=chrome==null?void 0:chrome.storage)!=null&&i.local&&chrome.storage.local.get(null,E=>{console.log("[SecureShield] ALL Chrome storage data:",E)});const r=await I();if(console.log("[SecureShield] Auth check:",{hasAuth:!!r,hasToken:!!(r!=null&&r.token),hasPin:(l=r==null?void 0:r.user)==null?void 0:l.hasPin,authData:r}),!r)throw new Error("Open the SecureShield extension and sign in before locking sites.");if(!r.user.hasPin)throw new Error("Set up your security PIN inside the SecureShield extension to lock sites.");const a=j();console.log("[SecureShield] Creating lock for:",a);const c=new URL(a.url).hostname.replace(/^www\./,"").split(".")[0],k=`Quick Lock: ${c.charAt(0).toUpperCase()+c.slice(1)}`,f=await A(r.token,{name:k,isGroup:!1,tabs:[a],pin:s});console.log("[SecureShield] Lock created, response:",f);const S={...f.lock,tabs:[a]};await U(S,s),e.remove(),z(),g()}catch(r){console.error("[SecureShield] Quick lock failed",r),t.textContent=r instanceof Error?r.message:"Unable to lock this site. Please try again."}finally{document.contains(o)&&(o.disabled=!1,o.textContent="Lock Site")}}function j(){var t;const e=window.location.href,o=(()=>{try{return new URL(e).hostname}catch{return e}})();return{title:((t=document.title)==null?void 0:t.trim())||o,url:e}}async function U(e,o){var t;typeof chrome>"u"||!((t=chrome.runtime)!=null&&t.sendMessage)||await new Promise((n,s)=>{chrome.runtime.sendMessage({action:"LOCK_TABS",payload:{lockId:e.id,tabs:e.tabs,pin:o,keepTabsOpen:!0}},i=>{if(chrome.runtime.lastError){s(new Error(chrome.runtime.lastError.message));return}if(!(i!=null&&i.success)){s(new Error((i==null?void 0:i.error)||"Background lock failed"));return}n()})})}async function g(){var r;if(document.getElementById(u))return;const e=await v();if(!e.locked)return;if(console.log("[SecureShield] Rendering password overlay for locked site"),!document.body){console.log("[SecureShield] Body not ready, waiting...");const a=new MutationObserver(()=>{document.body&&(a.disconnect(),g())});a.observe(document.documentElement,{childList:!0,subtree:!0});return}const o=document.createElement("div");o.id=u,o.style.cssText=`
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
		body > *:not(#${u}) {
			display: none !important;
		}
		body {
			overflow: hidden !important;
		}
	`,(r=document.head)==null||r.appendChild(t),document.body.appendChild(o),document.documentElement.style.overflow="hidden";const n=document.getElementById("ss-pin-input"),s=document.getElementById("ss-unlock-btn"),i=document.getElementById("ss-pin-error"),l=async()=>{var m;const a=(n==null?void 0:n.value)||"";if(!a){i.textContent="Please enter a PIN";return}if(a===e.pin)(m=document.getElementById("ss-hide-content"))==null||m.remove(),document.documentElement.style.overflow="",o.remove(),window.location.reload();else{i.textContent="Incorrect PIN";const c=o.firstElementChild;c.style.animation="shake 0.5s",setTimeout(()=>{c.style.animation=""},500),n.value="",n.focus()}};if(s==null||s.addEventListener("click",l),n==null||n.addEventListener("keypress",a=>{a.key==="Enter"&&l()}),!document.getElementById("ss-shake-animation")){const a=document.createElement("style");a.id="ss-shake-animation",a.textContent=`
			@keyframes shake {
				0%, 100% { transform: translateX(0); }
				25% { transform: translateX(-10px); }
				75% { transform: translateX(10px); }
			}
		`,document.head.appendChild(a)}n==null||n.focus()}
