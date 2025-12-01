const b="http://127.0.0.1:4000/api",f="AIzaSyCxFvQnPLhcTDRnVmKBOdQ20jOKY2Z1hA4",h="https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent",g=document.createElement("style");g.textContent=`
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
`;document.head.appendChild(g);let m=!1;function d(n,o="info"){const e=document.createElement("div");e.className=`ss-toast ${o}`;const s=o==="success"?"✓":o==="error"?"⚠":"ℹ";e.innerHTML=`<span style="font-size:1.2em">${s}</span><span>${n}</span>`,document.body.appendChild(e),requestAnimationFrame(()=>e.classList.add("visible")),setTimeout(()=>{e.classList.remove("visible"),setTimeout(()=>e.remove(),400)},3e3)}async function x(){const n=await chrome.storage.local.get(["lockedSites","unlockedExceptions"]),o=n.lockedSites||[],e=n.unlockedExceptions||[],s=window.location.hostname.toLowerCase(),i=o.some(a=>a.is_locked&&s.includes(a.url)),r=e.some(a=>s.includes(a));if(i&&!r)return;const t=document.createElement("button");t.id="ss-float-btn",document.body.appendChild(t),i&&r?(m=!0,t.innerHTML="🔒",t.classList.add("ss-unlocked"),t.title="Site is temporarily unlocked. Click to Re-Lock."):(m=!1,t.innerHTML="🛡️",t.title="SecureShield AI Analysis"),t.onclick=y}async function y(){const o=(await chrome.storage.local.get("auth_token")).auth_token;if(!o||typeof o!="string")return d("Please log in to SecureShield extension.","error");const e=document.getElementById("ss-float-btn");if(m){confirm("Re-lock this website?")&&(e&&(e.innerHTML="..."),await chrome.runtime.sendMessage({type:"RELOCK_SITE",url:window.location.hostname}),d("Site Locked!","success"),setTimeout(()=>window.location.reload(),1e3));return}e&&(e.innerHTML="⏳");try{const s=`Analyze ${window.location.href}. Return valid JSON only: {"description": "string", "pros": ["string"], "cons": ["string"]}`,i=await fetch(`${h}?key=${f}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({contents:[{parts:[{text:s}]}]})});if(!i.ok)throw i.status===429?new Error("Quota Exceeded. Try again later."):new Error(`API Error: ${i.status}`);const r=await i.json();if(!r.candidates||!r.candidates[0]||!r.candidates[0].content)throw new Error("No analysis returned.");let t=r.candidates[0].content.parts[0].text;t=t.replace(/```json/g,"").replace(/```/g,"").trim();const a=JSON.parse(t);k(a,o)}catch(s){console.error("SecureShield AI Error:",s),d(s.message,"error")}finally{e&&(e.innerHTML="🛡️")}}function k(n,o){const e=document.createElement("div");e.className="ss-overlay",e.innerHTML=`
    <div class="ss-popup">
      <h2 style="color:#6c63ff; margin-top:0">Website Analysis</h2>
      <p>${n.description}</p>
      <h3 style="color:#2ecc71">Why Lock?</h3>
      <ul>${n.pros.map(t=>`<li>${t}</li>`).join("")}</ul>
      <h3 style="color:#e74c3c">Cons</h3>
      <ul>${n.cons.map(t=>`<li>${t}</li>`).join("")}</ul>
      <div style="text-align:center; margin-top:20px">
        <button class="ss-btn ss-btn-danger" id="ss-close">Close</button>
        <button class="ss-btn ss-btn-secondary" id="ss-chat">💬 Chat with AI</button>
        <button class="ss-btn ss-btn-primary" id="ss-confirm">Lock Site</button>
      </div>
    </div>
  `,document.body.appendChild(e);const s=document.getElementById("ss-close");s&&(s.onclick=()=>e.remove());const i=document.getElementById("ss-chat");i&&(i.onclick=()=>{e.remove(),w(n.description)});const r=document.getElementById("ss-confirm");r&&(r.onclick=async()=>{try{(await fetch(`${b}/locks`,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${o}`},body:JSON.stringify({url:window.location.hostname,name:document.title})})).ok?(chrome.runtime.sendMessage({type:"SYNC_LOCKS"}),d("Site Locked! Refreshing...","success"),setTimeout(()=>window.location.reload(),1e3)):d("Failed to lock site.","error")}catch{d("Network Error.","error")}})}function w(n){const o=document.createElement("div");o.className="ss-overlay",o.innerHTML=`
    <div class="ss-popup" style="height: 500px;">
      <h3 style="margin-top:0; color:#6c63ff">Chat about this Site</h3>
      <div id="ss-chat-box" style="flex:1; overflow-y:auto; background:rgba(0,0,0,0.2); padding:10px; border-radius:8px; margin-bottom:10px; display:flex; flex-direction:column;">
        <div style="color:#a0aec0; font-size:0.9em; text-align:center; margin-bottom:10px">Context: ${n}</div>
      </div>
      <div style="display:flex; gap:10px">
        <input type="text" id="ss-chat-input" placeholder="Is this site safe?" style="flex:1; padding:10px; border-radius:8px; border:none;">
        <button class="ss-btn ss-btn-primary" id="ss-send">Send</button>
        <button class="ss-btn ss-btn-danger" id="ss-close-chat">Close</button>
      </div>
    </div>
  `,document.body.appendChild(o);const e=document.getElementById("ss-chat-box"),s=document.getElementById("ss-chat-input"),i=document.getElementById("ss-send"),r=document.getElementById("ss-close-chat");r&&(r.onclick=()=>o.remove());const t=async()=>{if(!s||!e)return;const a=s.value.trim();if(!a)return;const l=document.createElement("div");l.className="ss-chat-msg ss-msg-user",l.textContent=a,e.appendChild(l),s.value="",e.scrollTop=e.scrollHeight;try{const p=await fetch(`${h}?key=${f}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({contents:[{parts:[{text:`Context: ${n}. User Question: ${a}`}]}]})}),c=await p.json();if(!p.ok||!c.candidates)throw new Error("AI Error");const u=document.createElement("div");u.className="ss-chat-msg ss-msg-ai",u.textContent=c.candidates[0].content.parts[0].text,e.appendChild(u)}catch{const c=document.createElement("div");c.textContent="Error getting response.",c.style.color="red",e.appendChild(c)}e.scrollTop=e.scrollHeight};i&&(i.onclick=t),s&&s.addEventListener("keypress",a=>{a.key==="Enter"&&t()})}x();
