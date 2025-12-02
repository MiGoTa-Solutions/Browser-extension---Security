const h="http://127.0.0.1:4000/api",x=document.createElement("style");x.textContent=`
  #ss-float-btn { position: fixed; bottom: 24px; right: 24px; width: 56px; height: 56px; border-radius: 50%; background: linear-gradient(135deg, #6c63ff, #5850d6); color: white; border: none; font-size: 24px; cursor: pointer; z-index: 2147483647; box-shadow: 0 4px 16px rgba(108,99,255,0.4); display: flex; align-items: center; justify-content: center; transition: transform 0.2s; }
  #ss-float-btn:hover { transform: scale(1.1); }
  
  /* Red Button Style for Re-Locking */
  #ss-float-btn.ss-unlocked { background: linear-gradient(135deg, #e74c3c, #c0392b); box-shadow: 0 4px 16px rgba(231,76,60,0.4); }

  .ss-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(5,8,22,0.85); backdrop-filter: blur(8px); z-index: 2147483647; display: flex; justify-content: center; align-items: center; }
  .ss-popup { background: rgba(11,20,40,0.95); padding: 32px; border-radius: 16px; width: 90%; max-width: 500px; color: #f8fbff; font-family: system-ui, sans-serif; border: 1px solid rgba(255,255,255,0.1); max-height: 80vh; overflow-y: auto; display: flex; flex-direction: column; }
  .ss-btn { padding: 10px 20px; border-radius: 8px; border: none; cursor: pointer; margin: 5px; font-weight: 600; }
  .ss-btn-primary { background: #6c63ff; color: white; }
  .ss-btn-secondary { background: #4a5568; color: white; }
  .ss-btn-danger { background: rgba(231,76,60,0.2); color: #e74c3c; border: 1px solid #e74c3c; }
  .ss-chat-msg { padding: 8px 12px; border-radius: 8px; margin: 5px 0; max-width: 80%; word-wrap: break-word; }
  .ss-msg-user { background: #6c63ff; color: white; align-self: flex-end; margin-left: auto; }
  .ss-msg-ai { background: #2d3748; color: white; align-self: flex-start; margin-right: auto; }

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
`;document.head.appendChild(x);let f=!1;function m(r,s="info"){const e=document.createElement("div");e.className=`ss-toast ${s}`;const t=s==="success"?"✓":s==="error"?"⚠":"ℹ";e.innerHTML=`<span style="font-size:1.2em">${t}</span><span>${r}</span>`,document.body.appendChild(e),requestAnimationFrame(()=>e.classList.add("visible")),setTimeout(()=>{e.classList.remove("visible"),setTimeout(()=>e.remove(),400)},3e3)}function y(r,s,e){const t=document.createElement("div");t.className="ss-overlay",t.style.animation="fadeIn 0.3s ease-out";const n=document.createElement("div");n.style.cssText=`
    background: white;
    border-radius: 20px;
    padding: 32px;
    max-width: 450px;
    width: 90%;
    box-shadow: 0 20px 60px rgba(0,0,0,0.3);
    transform: scale(0.9);
    animation: scaleIn 0.3s ease-out forwards;
    text-align: center;
  `;const i=document.createElement("div");i.style.cssText=`
    background: linear-gradient(135deg, #3b82f6, #2563eb);
    width: 64px;
    height: 64px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto 20px;
    font-size: 32px;
  `,i.textContent="🔒";const o=document.createElement("h3");o.style.cssText=`
    color: #1f2937;
    font-size: 24px;
    font-weight: 700;
    margin: 0 0 12px 0;
    font-family: system-ui, sans-serif;
  `,o.textContent=r;const a=document.createElement("p");a.style.cssText=`
    color: #6b7280;
    font-size: 16px;
    line-height: 1.6;
    margin: 0 0 24px 0;
    font-family: system-ui, sans-serif;
  `,a.textContent=s;const d=document.createElement("div");d.style.cssText=`
    display: flex;
    gap: 12px;
    justify-content: center;
  `;const l=document.createElement("button");l.style.cssText=`
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
  `,l.textContent="Cancel",l.onmouseover=()=>l.style.background="#e5e7eb",l.onmouseout=()=>l.style.background="#f3f4f6",l.onclick=()=>t.remove();const c=document.createElement("button");if(c.style.cssText=`
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
  `,c.textContent="Yes, Re-lock",c.onmouseover=()=>c.style.transform="scale(1.05)",c.onmouseout=()=>c.style.transform="scale(1)",c.onclick=()=>{t.remove(),e()},!document.getElementById("ss-confirm-animations")){const p=document.createElement("style");p.id="ss-confirm-animations",p.textContent=`
      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      @keyframes scaleIn {
        from { transform: scale(0.9); opacity: 0; }
        to { transform: scale(1); opacity: 1; }
      }
    `,document.head.appendChild(p)}d.appendChild(l),d.appendChild(c),n.appendChild(i),n.appendChild(o),n.appendChild(a),n.appendChild(d),t.appendChild(n),document.body.appendChild(t),t.onclick=p=>{p.target===t&&t.remove()}}async function b(){const r=await chrome.storage.local.get(["lockedSites","unlockedExceptions"]),s=r.lockedSites||[],e=r.unlockedExceptions||[],t=window.location.hostname.toLowerCase(),n=s.some(a=>a.is_locked&&t.includes(a.url)),i=e.some(a=>t.includes(a));if(n&&!i)return;const o=document.createElement("button");o.id="ss-float-btn",document.body.appendChild(o),n&&i?(f=!0,o.innerHTML="🔒",o.classList.add("ss-unlocked"),o.title="Site is temporarily unlocked. Click to Re-Lock."):(f=!1,o.innerHTML="🛡️",o.title="SecureShield AI Analysis"),o.onclick=w}async function w(){const s=(await chrome.storage.local.get("auth_token")).auth_token;if(!s||typeof s!="string")return m("Please log in to SecureShield extension.","error");const e=document.getElementById("ss-float-btn");if(f){y("🔒 Re-lock Website?","Do you want to re-lock this website? You will need your Master PIN to access it again.",async()=>{e&&(e.innerHTML="..."),await chrome.runtime.sendMessage({type:"RELOCK_SITE",url:window.location.hostname}),m("Site Locked!","success"),setTimeout(()=>window.location.reload(),1e3)});return}e&&(e.innerHTML="⏳");try{const t=`Analyze ${window.location.href}. Return valid JSON only: {"description": "string", "pros": ["string"], "cons": ["string"]}`,n=await fetch(`${h}/gemini/analyze`,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${s}`},body:JSON.stringify({prompt:t})});if(!n.ok)throw n.status===429?new Error("Quota Exceeded. Try again later."):new Error(`API Error: ${n.status}`);const i=await n.json();if(!i.candidates||!i.candidates[0]||!i.candidates[0].content)throw new Error("No analysis returned.");let o=i.candidates[0].content.parts[0].text;o=o.replace(/```json/g,"").replace(/```/g,"").trim();const a=JSON.parse(o);k(a,s)}catch(t){console.error("SecureShield AI Error:",t),m(t.message,"error")}finally{e&&(e.innerHTML="🛡️")}}function k(r,s){const e=document.createElement("div");e.className="ss-overlay",e.innerHTML=`
    <div class="ss-popup">
      <h2 style="color:#6c63ff; margin-top:0">Website Analysis</h2>
      <p>${r.description}</p>
      <h3 style="color:#2ecc71">Why Lock?</h3>
      <ul>${r.pros.map(o=>`<li>${o}</li>`).join("")}</ul>
      <h3 style="color:#e74c3c">Cons</h3>
      <ul>${r.cons.map(o=>`<li>${o}</li>`).join("")}</ul>
      <div style="text-align:center; margin-top:20px">
        <button class="ss-btn ss-btn-danger" id="ss-close">Close</button>
        <button class="ss-btn ss-btn-secondary" id="ss-chat">💬 Chat with AI</button>
        <button class="ss-btn ss-btn-primary" id="ss-confirm">Lock Site</button>
      </div>
    </div>
  `,document.body.appendChild(e);const t=document.getElementById("ss-close");t&&(t.onclick=()=>e.remove());const n=document.getElementById("ss-chat");n&&(n.onclick=()=>{e.remove(),v(r.description)});const i=document.getElementById("ss-confirm");i&&(i.onclick=async()=>{try{(await fetch(`${h}/locks`,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${s}`},body:JSON.stringify({url:window.location.hostname,name:document.title})})).ok?(await chrome.runtime.sendMessage({type:"RELOCK_SITE",url:window.location.hostname}),chrome.runtime.sendMessage({type:"SYNC_LOCKS"}),m("Site Locked! Refreshing...","success"),setTimeout(()=>window.location.reload(),1e3)):m("Failed to lock site.","error")}catch{m("Network Error.","error")}})}function v(r){const s=document.createElement("div");s.className="ss-overlay",s.innerHTML=`
    <div class="ss-popup" style="height: 500px;">
      <h3 style="margin-top:0; color:#6c63ff">Chat about this Site</h3>
      <div id="ss-chat-box" style="flex:1; overflow-y:auto; background:rgba(0,0,0,0.2); padding:10px; border-radius:8px; margin-bottom:10px; display:flex; flex-direction:column;">
        <div style="color:#a0aec0; font-size:0.9em; text-align:center; margin-bottom:10px">Context: ${r}</div>
      </div>
      <div style="display:flex; gap:10px">
        <input type="text" id="ss-chat-input" placeholder="Is this site safe?" style="flex:1; padding:10px; border-radius:8px; border:none;">
        <button class="ss-btn ss-btn-primary" id="ss-send">Send</button>
        <button class="ss-btn ss-btn-danger" id="ss-close-chat">Close</button>
      </div>
    </div>
  `,document.body.appendChild(s);const e=document.getElementById("ss-chat-box"),t=document.getElementById("ss-chat-input"),n=document.getElementById("ss-send"),i=document.getElementById("ss-close-chat");i&&(i.onclick=()=>s.remove());const o=async()=>{if(!t||!e)return;const a=t.value.trim();if(!a)return;const d=document.createElement("div");d.className="ss-chat-msg ss-msg-user",d.textContent=a,e.appendChild(d),t.value="",e.scrollTop=e.scrollHeight;try{const c=(await chrome.storage.local.get("auth_token")).auth_token;if(!c)throw new Error("Not authenticated");const p=await fetch(`${h}/gemini/analyze`,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${c}`},body:JSON.stringify({prompt:`Context: ${r}. User Question: ${a}`})}),g=await p.json();if(!p.ok||!g.candidates)throw new Error("AI Error");const u=document.createElement("div");u.className="ss-chat-msg ss-msg-ai",u.textContent=g.candidates[0].content.parts[0].text,e.appendChild(u)}catch{const c=document.createElement("div");c.textContent="Error getting response.",c.style.color="red",e.appendChild(c)}e.scrollTop=e.scrollHeight};n&&(n.onclick=o),t&&t.addEventListener("keypress",a=>{a.key==="Enter"&&o()})}b();
