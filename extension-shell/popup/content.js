const f="http://127.0.0.1:4000/api",p="AIzaSyDvHWTKIxHxGo1IWwEPZNqzvnBYuzUFVDc",m="https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent",u=document.createElement("style");u.textContent=`
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
`;document.head.appendChild(u);async function y(){const n=(await chrome.storage.local.get("lockedSites")).lockedSites,t=window.location.hostname.toLowerCase();if(Array.isArray(n)&&n.some(i=>i.is_locked&&t.includes(i.url)))return;const e=document.createElement("button");e.id="ss-float-btn",e.innerHTML="🔒",e.onclick=b,document.body.appendChild(e)}async function b(){const n=(await chrome.storage.local.get("auth_token")).auth_token;if(!n||typeof n!="string")return alert("Please log in to SecureShield extension.");const t=document.getElementById("ss-float-btn");t&&(t.innerHTML="⏳");try{const e=`Analyze ${window.location.href}. Return valid JSON only: {"description": "string", "pros": ["string"], "cons": ["string"]}`;let o=(await(await fetch(`${m}?key=${p}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({contents:[{parts:[{text:e}]}]})})).json()).candidates[0].content.parts[0].text;o=o.replace(/```json/g,"").replace(/```/g,"").trim();const a=JSON.parse(o);x(a,n)}catch(e){alert("AI Analysis failed or API Key is invalid."),console.error(e)}finally{t&&(t.innerHTML="🔒")}}function x(s,n){const t=document.createElement("div");t.className="ss-overlay",t.innerHTML=`
    <div class="ss-popup">
      <h2 style="color:#6c63ff; margin-top:0">Website Analysis</h2>
      <p>${s.description}</p>
      <h3 style="color:#2ecc71">Why Lock?</h3>
      <ul>${s.pros.map(o=>`<li>${o}</li>`).join("")}</ul>
      <h3 style="color:#e74c3c">Cons</h3>
      <ul>${s.cons.map(o=>`<li>${o}</li>`).join("")}</ul>
      <div style="text-align:center; margin-top:20px">
        <button class="ss-btn ss-btn-danger" id="ss-close">Close</button>
        <button class="ss-btn ss-btn-secondary" id="ss-chat">💬 Chat with AI</button>
        <button class="ss-btn ss-btn-primary" id="ss-confirm">Lock Site</button>
      </div>
    </div>
  `,document.body.appendChild(t);const e=document.getElementById("ss-close");e&&(e.onclick=()=>t.remove());const i=document.getElementById("ss-chat");i&&(i.onclick=()=>{t.remove(),v(s.description)});const r=document.getElementById("ss-confirm");r&&(r.onclick=async()=>{try{(await fetch(`${f}/locks`,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${n}`},body:JSON.stringify({url:window.location.hostname,name:document.title})})).ok?(chrome.runtime.sendMessage({type:"SYNC_LOCKS"}),alert("Locked! Refreshing..."),window.location.reload()):alert("Failed to lock site.")}catch(o){console.error(o),alert("Network Error.")}})}function v(s){const n=document.createElement("div");n.className="ss-overlay",n.innerHTML=`
    <div class="ss-popup" style="height: 500px;">
      <h3 style="margin-top:0; color:#6c63ff">Chat about this Site</h3>
      <div id="ss-chat-box" style="flex:1; overflow-y:auto; background:rgba(0,0,0,0.2); padding:10px; border-radius:8px; margin-bottom:10px; display:flex; flex-direction:column;">
        <div style="color:#a0aec0; font-size:0.9em; text-align:center; margin-bottom:10px">Context: ${s}</div>
      </div>
      <div style="display:flex; gap:10px">
        <input type="text" id="ss-chat-input" placeholder="Is this site safe?" style="flex:1; padding:10px; border-radius:8px; border:none;">
        <button class="ss-btn ss-btn-primary" id="ss-send">Send</button>
        <button class="ss-btn ss-btn-danger" id="ss-close-chat">Close</button>
      </div>
    </div>
  `,document.body.appendChild(n);const t=document.getElementById("ss-chat-box"),e=document.getElementById("ss-chat-input"),i=document.getElementById("ss-send"),r=document.getElementById("ss-close-chat");r&&(r.onclick=()=>n.remove());const o=async()=>{if(!e||!t)return;const a=e.value.trim();if(!a)return;const l=document.createElement("div");l.className="ss-chat-msg ss-msg-user",l.textContent=a,t.appendChild(l),e.value="",t.scrollTop=t.scrollHeight;try{const g=(await(await fetch(`${m}?key=${p}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({contents:[{parts:[{text:`Context: ${s}. User Question: ${a}`}]}]})})).json()).candidates[0].content.parts[0].text,d=document.createElement("div");d.className="ss-chat-msg ss-msg-ai",d.textContent=g,t.appendChild(d)}catch{const c=document.createElement("div");c.textContent="Error getting response.",c.style.color="red",t.appendChild(c)}t.scrollTop=t.scrollHeight};i&&(i.onclick=o),e&&e.addEventListener("keypress",a=>{a.key==="Enter"&&o()})}y();
