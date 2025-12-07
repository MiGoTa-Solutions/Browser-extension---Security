const w="http://127.0.0.1:4000/api",g=(e,s)=>{s?console.info("[SecureShield Content]",e,s):console.info("[SecureShield Content]",e)},$=document.createElement("style");$.textContent=`
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
`;document.head.appendChild($);const L={safe:{label:"Site Looks Safe",color:"#10b981",chipBg:"rgba(16,185,129,0.15)"},suspicious:{label:"Suspicious Signals",color:"#f59e0b",chipBg:"rgba(245,158,11,0.15)"},danger:{label:"High Risk Detected",color:"#ef4444",chipBg:"rgba(239,68,68,0.15)"}};function M(e){return e==="safe"||e==="suspicious"||e==="danger"?L[e]:L.danger}function N(e,s){if(typeof e=="string"){const t=e.toLowerCase();if(t==="safe"||t==="suspicious"||t==="danger")return t}return(s==null?void 0:s.toLowerCase())==="safe"?"safe":"danger"}function B(e){if(typeof e!="string")return"safe";const s=e.toLowerCase();return s.includes("phish")?"phishing":s.includes("mal")?"malicious":"safe"}function j(e){try{return new URL(e).hostname||e}catch{return e}}function y(e){return e.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;")}let v=!1,m=null,f=null,x=!1;function h(e,s="info"){const t=document.createElement("div");t.className=`ss-toast ${s}`;const i=s==="success"?"✓":s==="error"?"⚠":"ℹ";t.innerHTML=`<span style="font-size:1.2em">${i}</span><span>${e}</span>`,document.body.appendChild(t),requestAnimationFrame(()=>t.classList.add("visible")),setTimeout(()=>{t.classList.remove("visible"),setTimeout(()=>t.remove(),400)},3e3)}function z(e,s,t,i="Yes, Re-lock"){const n=document.createElement("div");n.className="ss-overlay",n.style.animation="fadeIn 0.3s ease-out";const o=document.createElement("div");o.style.cssText=`
    background: white;
    border-radius: 20px;
    padding: 32px;
    max-width: 450px;
    width: 90%;
    box-shadow: 0 20px 60px rgba(0,0,0,0.3);
    transform: scale(0.9);
    animation: scaleIn 0.3s ease-out forwards;
    text-align: center;
  `;const l=document.createElement("div");l.style.cssText=`
    background: linear-gradient(135deg, #3b82f6, #2563eb);
    width: 64px;
    height: 64px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto 20px;
    font-size: 32px;
  `,l.textContent="🔒";const r=document.createElement("h3");r.style.cssText=`
    color: #1f2937;
    font-size: 24px;
    font-weight: 700;
    margin: 0 0 12px 0;
    font-family: system-ui, sans-serif;
  `,r.textContent=e;const u=document.createElement("p");u.style.cssText=`
    color: #6b7280;
    font-size: 16px;
    line-height: 1.6;
    margin: 0 0 24px 0;
    font-family: system-ui, sans-serif;
  `,u.textContent=s;const a=document.createElement("div");a.style.cssText=`
    display: flex;
    gap: 12px;
    justify-content: center;
  `;const d=document.createElement("button");d.style.cssText=`
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
  `,d.textContent="Cancel",d.onmouseover=()=>d.style.background="#e5e7eb",d.onmouseout=()=>d.style.background="#f3f4f6",d.onclick=()=>n.remove();const p=document.createElement("button");if(p.style.cssText=`
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
  `,p.textContent=i,p.onmouseover=()=>p.style.transform="scale(1.05)",p.onmouseout=()=>p.style.transform="scale(1)",p.onclick=()=>{n.remove(),t()},!document.getElementById("ss-confirm-animations")){const c=document.createElement("style");c.id="ss-confirm-animations",c.textContent=`
      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      @keyframes scaleIn {
        from { transform: scale(0.9); opacity: 0; }
        to { transform: scale(1); opacity: 1; }
      }
    `,document.head.appendChild(c)}a.appendChild(d),a.appendChild(p),o.appendChild(l),o.appendChild(r),o.appendChild(u),o.appendChild(a),n.appendChild(o),document.body.appendChild(n),n.onclick=c=>{c.target===n&&n.remove()}}function O(e){const s=window.location.hostname;z("Lock this site without AI?",`AI analysis is unavailable right now. Do you still want to lock ${s}?`,async()=>{b(!0);try{await C(e)}finally{b(!1)}},"Lock site")}async function D(){const e=await chrome.storage.local.get(["lockedSites","unlockedExceptions"]),s=e.lockedSites||[],t=e.unlockedExceptions||[],i=window.location.hostname.toLowerCase(),n=s.some(r=>r.is_locked&&i.includes(r.url)),o=t.some(r=>i.includes(r));if(g("Content script init state",{hostname:i,lockedCount:s.length,isServerLocked:n,isLocallyUnlocked:o}),n&&!o){g("Site currently locked by server, no UI injected");return}const l=document.createElement("button");l.id="ss-float-btn",document.body.appendChild(l),m=l,n&&o?(v=!0,g("Rendered floating button in relock mode")):(v=!1,g("Rendered floating button in analysis mode")),T(),q(),l.onclick=H}function T(){m&&(v?(m.innerHTML="🔒",m.classList.add("ss-unlocked"),m.title="Site unlocked locally. Open quick actions."):(m.innerHTML="🛡️",m.classList.remove("ss-unlocked"),m.title="SecureShield quick actions"),A())}function A(){const e=document.getElementById("ss-action-lock");if(e){const s=e.querySelector("span:last-child");s&&(s.textContent=v?"Re-lock site":"Web access lock")}}function q(){if(f)return;f=document.createElement("div"),f.id="ss-quick-menu",f.innerHTML=`
    <button id="ss-action-lock"><span>🔒</span><span>Web access lock</span></button>
    <button id="ss-action-detect"><span>🛡️</span><span>Analyze site</span></button>
  `,document.body.appendChild(f),f.addEventListener("click",t=>t.stopPropagation());const e=document.getElementById("ss-action-lock"),s=document.getElementById("ss-action-detect");e==null||e.addEventListener("click",()=>{E(),_()}),s==null||s.addEventListener("click",()=>{E(),W()}),A()}function H(){f&&(x=!x,f.classList.toggle("visible",x),x?document.addEventListener("click",S,!0):document.removeEventListener("click",S,!0))}function E(){!x||!f||(x=!1,f.classList.remove("visible"),document.removeEventListener("click",S,!0))}function S(e){const s=e.target;s&&(f!=null&&f.contains(s)||s===m||E())}async function I(){const s=(await chrome.storage.local.get("auth_token")).auth_token;return!s||typeof s!="string"?(g("Action blocked: missing auth token"),h("Please log in to SecureShield extension.","error"),null):s}async function _(){const e=await I();if(e){if(v){g("Relock confirmation opened"),z("🔒 Re-lock Website?","Do you want to re-lock this website? You will need your Master PIN to access it again.",async()=>{b(!0);try{g("Sending relock request",{hostname:window.location.hostname}),await chrome.runtime.sendMessage({type:"RELOCK_SITE",url:window.location.hostname}),h("Site Locked!","success"),setTimeout(()=>window.location.reload(),1e3)}finally{b(!1)}});return}await P(e,()=>{O(e)})}}async function P(e,s){g("Requesting Gemini analysis for page",{url:window.location.href}),b(!0);try{const t=`Analyze ${window.location.href}. Return valid JSON only: {"description": "string", "pros": ["string"], "cons": ["string"]}`,i=await fetch(`${w}/gemini/analyze`,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${e}`},body:JSON.stringify({prompt:t})});if(!i.ok){const r=new Error(i.status===429?"Quota exceeded. Try again later.":`AI Error: ${i.status}`);throw r.status=i.status,r}const n=await i.json();if(!n.candidates||!n.candidates[0]||!n.candidates[0].content)throw new Error("No analysis returned.");let o=n.candidates[0].content.parts[0].text;o=o.replace(/```json/g,"").replace(/```/g,"").trim();const l=JSON.parse(o);g("Received Gemini analysis response"),U(l,e)}catch(t){const i=t instanceof Error?t.message:"Failed to analyze site.";g("Gemini analysis failed",{error:i}),h(i,"error"),typeof s=="function"&&s()}finally{b(!1)}}async function W(){const e=await I();if(e){g("Requesting detector verdict for page",{url:window.location.href}),b(!0);try{const s=await fetch(`${w}/site-detector/analyze`,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${e}`},body:JSON.stringify({url:window.location.href})});let t=null;try{t=await s.json()}catch{t=null}if(!s.ok){const a=(t==null?void 0:t.error)||`API Error: ${s.status}`;throw new Error(a)}if(!t)throw new Error("Empty response from detector service");const i=B(t.verdict),n=N(t.riskLevel,i),o=t.stats,l=o&&typeof o=="object"?{harmless:Number(o.harmless??0),malicious:Number(o.malicious??0),suspicious:Number(o.suspicious??0),undetected:Number(o.undetected??0),timeout:Number(o.timeout??0)}:void 0,r=Array.isArray(t.signals)?t.signals.map(a=>({label:typeof a.label=="string"?a.label:"Signal",value:typeof a.value=="string"?a.value:String(a.value??"N/A"),status:a.status==="warning"||a.status==="danger"?a.status:"positive",hint:typeof a.hint=="string"?a.hint:void 0})):[],u={url:typeof t.url=="string"?t.url:window.location.href,verdict:i,riskLevel:n,threats:Array.isArray(t.threats)?t.threats:[],analyzedAt:typeof t.analyzedAt=="string"?t.analyzedAt:new Date().toISOString(),source:typeof t.source=="string"?t.source:"Site detector service",confidence:typeof t.confidence=="number"?t.confidence:void 0,stats:l,signals:r};g("Received detector analysis response",{verdict:u.verdict,risk:u.riskLevel}),Y(u,e)}catch(s){const t=s instanceof Error?s.message:"Failed to analyze site.";g("Detector analysis failed",{error:t}),h(t,"error")}finally{b(!1)}}}function b(e){m&&(e?(m.dataset.prevIcon=m.innerHTML,m.innerHTML="⏳",m.style.pointerEvents="none"):(m.style.pointerEvents="auto",T()))}async function C(e){try{(await fetch(`${w}/locks`,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${e}`},body:JSON.stringify({url:window.location.hostname,name:document.title})})).ok?(await chrome.runtime.sendMessage({type:"RELOCK_SITE",url:window.location.hostname}),chrome.runtime.sendMessage({type:"SYNC_LOCKS"}),h("Site Locked! Refreshing...","success"),setTimeout(()=>window.location.reload(),1e3)):h("Failed to lock site.","error")}catch{h("Network Error.","error")}}function U(e,s){const t=Array.isArray(e.pros)?e.pros:[],i=Array.isArray(e.cons)?e.cons:[],n=document.createElement("div");n.className="ss-overlay",n.innerHTML=`
    <div class="ss-popup">
      <h2 style="color:#6c63ff; margin-top:0">Website Analysis</h2>
      <p>${e.description}</p>
      <h3 style="color:#2ecc71">Why Lock?</h3>
      <ul>${t.map(u=>`<li>${u}</li>`).join("")}</ul>
      <h3 style="color:#e74c3c">Cons</h3>
      <ul>${i.map(u=>`<li>${u}</li>`).join("")}</ul>
      <div style="text-align:center; margin-top:20px">
        <button class="ss-btn ss-btn-danger" id="ss-close-gemini">Close</button>
        <button class="ss-btn ss-btn-secondary" id="ss-chat-gemini">💬 Chat with AI</button>
        <button class="ss-btn ss-btn-primary" id="ss-confirm-gemini">Lock Site</button>
      </div>
    </div>
  `,document.body.appendChild(n);const o=n.querySelector("#ss-close-gemini");o==null||o.addEventListener("click",()=>n.remove());const l=n.querySelector("#ss-chat-gemini");l==null||l.addEventListener("click",()=>{n.remove(),R(e.description)});const r=n.querySelector("#ss-confirm-gemini");r&&r.addEventListener("click",async()=>{r.disabled=!0,r.textContent="Locking...",await C(s),n.remove()})}function Y(e,s){const t=document.createElement("div");t.className="ss-overlay";const i=M(e.riskLevel),n=e.threats.length?`<ul style="margin: 12px 0 0; padding-left: 18px; color: #fca5a5;">${e.threats.map(c=>`<li style="margin-bottom:6px">${y(c)}</li>`).join("")}</ul>`:'<p style="margin:12px 0 0; color:#10b981; font-weight:600;">No active threats reported.</p>',o=typeof e.confidence=="number"?Math.round(Math.min(1,Math.max(0,e.confidence))*100):null,l=o!==null?`
      <div class="ss-confidence">
        <div style="display:flex; justify-content:space-between; font-size:0.85rem; color:#cbd5f5;">
          <span>Confidence</span>
          <strong>${o}%</strong>
        </div>
        <div class="ss-confidence-bar">
          <span style="width:${o}%; background:${e.riskLevel==="safe"?"#34d399":"#f87171"}"></span>
        </div>
      </div>
    `:"",r=e.stats?`
      <div class="ss-stat-grid">
        ${[{label:"Harmless",value:e.stats.harmless},{label:"Malicious",value:e.stats.malicious},{label:"Suspicious",value:e.stats.suspicious},{label:"Undetected",value:e.stats.undetected}].map(c=>`
              <div class="ss-stat-card">
                <div style="font-size:0.75rem; text-transform:uppercase; color:#a5b4fc;">${c.label}</div>
                <div style="font-size:1.4rem; font-weight:700; color:#f8fafc;">${c.value}</div>
              </div>
            `).join("")}
      </div>
    `:"",u=e.signals&&e.signals.length?`
      <div class="ss-signals">
        ${e.signals.map(c=>`
              <div class="ss-signal ${c.status==="warning"?"warning":c.status==="danger"?"danger":"positive"}">
                <div class="ss-signal-label">${y(c.label)}</div>
                <div class="ss-signal-value">${y(c.value)}</div>
                ${c.hint?`<div class="ss-signal-hint">${y(c.hint)}</div>`:""}
              </div>
            `).join("")}
      </div>
    `:"";t.innerHTML=`
    <div class="ss-popup">
      <div style="display:flex; justify-content:space-between; gap:12px; align-items:flex-start;">
        <div>
          <p style="margin:0; font-size:0.85rem; color:#94a3b8;">Analyzed ${new Date(e.analyzedAt).toLocaleString()}</p>
          <h2 style="margin:6px 0 0; font-size:1.5rem;">${y(j(e.url))}</h2>
          <p style="margin:4px 0 0; color:#cbd5f5; font-size:0.9rem;">Raw verdict: <strong style="color:${i.color}; text-transform:uppercase;">${y(e.verdict)}</strong></p>
        </div>
        <span style="padding:6px 14px; border-radius:999px; font-weight:600; color:${i.color}; background:${i.chipBg};">${i.label}</span>
      </div>
      <div style="margin-top:12px; font-size:0.85rem; color:#94a3b8;">
        Signal source: <strong style="color:#e0e7ff;">${y(e.source)}</strong>
      </div>
      ${l}
      ${r}
      <div style="margin-top:16px;">
        <div style="font-size:0.85rem; color:#94a3b8; text-transform:uppercase; letter-spacing:0.08em;">Threat insights</div>
        ${n}
      </div>
      ${u}
      <div style="text-align:center; margin-top:24px">
        <button class="ss-btn ss-btn-danger" id="ss-close">Close</button>
        <button class="ss-btn ss-btn-secondary" id="ss-chat">💬 Ask AI</button>
        <button class="ss-btn ss-btn-primary" id="ss-confirm">Lock Site</button>
      </div>
    </div>
  `,document.body.appendChild(t);const a=document.getElementById("ss-close");a==null||a.addEventListener("click",()=>t.remove());const d=document.getElementById("ss-chat");d==null||d.addEventListener("click",()=>{t.remove();const c=`URL: ${e.url}. Risk: ${e.riskLevel}. Verdict: ${e.verdict}. Threats: ${e.threats.join(", ")||"none"}`;R(c)});const p=document.getElementById("ss-confirm");p&&p.addEventListener("click",async()=>{p.disabled=!0,p.textContent="Locking...",await C(s),t.remove()})}function R(e){const s=document.createElement("div");s.className="ss-overlay",s.innerHTML=`
    <div class="ss-popup" style="height: 500px;">
      <h3 style="margin-top:0; color:#6c63ff">Chat about this Site</h3>
      <div id="ss-chat-box" style="flex:1; overflow-y:auto; background:rgba(0,0,0,0.2); padding:10px; border-radius:8px; margin-bottom:10px; display:flex; flex-direction:column;">
        <div style="color:#a0aec0; font-size:0.9em; text-align:center; margin-bottom:10px">Context: ${e}</div>
      </div>
      <div style="display:flex; gap:10px">
        <input type="text" id="ss-chat-input" placeholder="Is this site safe?" style="flex:1; padding:10px; border-radius:8px; border:none;">
        <button class="ss-btn ss-btn-primary" id="ss-send">Send</button>
        <button class="ss-btn ss-btn-danger" id="ss-close-chat">Close</button>
      </div>
    </div>
  `,document.body.appendChild(s);const t=document.getElementById("ss-chat-box"),i=document.getElementById("ss-chat-input"),n=document.getElementById("ss-send"),o=document.getElementById("ss-close-chat");o&&(o.onclick=()=>s.remove());const l=async()=>{if(!i||!t)return;const r=i.value.trim();if(!r)return;const u=document.createElement("div");u.className="ss-chat-msg ss-msg-user",u.textContent=r,t.appendChild(u),i.value="",t.scrollTop=t.scrollHeight;try{const d=(await chrome.storage.local.get("auth_token")).auth_token;if(!d)throw new Error("Not authenticated");const p=await fetch(`${w}/gemini/analyze`,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${d}`},body:JSON.stringify({prompt:`Context: ${e}. User Question: ${r}`})}),c=await p.json();if(!p.ok||!c.candidates)throw new Error("AI Error");const k=document.createElement("div");k.className="ss-chat-msg ss-msg-ai",k.textContent=c.candidates[0].content.parts[0].text,t.appendChild(k)}catch{const d=document.createElement("div");d.textContent="Error getting response.",d.style.color="red",t.appendChild(d)}t.scrollTop=t.scrollHeight};n&&(n.onclick=l),i&&i.addEventListener("keypress",r=>{r.key==="Enter"&&l()})}D();
