const f="http://127.0.0.1:4000/api",m="AIzaSyAt5C9kLi8W4khsQrmKTtfWtn6N_W0WP9k",u="https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent",h=document.createElement("style");h.textContent=`
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
`;document.head.appendChild(h);async function y(){const o=(await chrome.storage.local.get("lockedSites")).lockedSites,t=window.location.hostname.toLowerCase();if(Array.isArray(o)&&o.some(n=>n.is_locked&&t.includes(n.url)))return;const e=document.createElement("button");e.id="ss-float-btn",e.innerHTML="白",e.onclick=b,document.body.appendChild(e)}async function b(){const o=(await chrome.storage.local.get("auth_token")).auth_token;if(!o||typeof o!="string")return alert("Please log in to SecureShield extension.");const t=document.getElementById("ss-float-btn");t&&(t.innerHTML="竢ｳ");try{const e=`Analyze ${window.location.href}. Return valid JSON only: {"description": "string", "pros": ["string"], "cons": ["string"]}`,n=await fetch(`${u}?key=${m}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({contents:[{parts:[{text:e}]}]})});if(!n.ok)throw n.status===429?new Error("API Quota Exceeded. Please try again later."):new Error(`API Error: ${n.status} ${n.statusText}`);const r=await n.json();if(!r.candidates||!r.candidates[0]||!r.candidates[0].content)throw new Error("AI returned no analysis (Safety Block or Empty Response).");let s=r.candidates[0].content.parts[0].text;s=s.replace(/```json/g,"").replace(/```/g,"").trim();const i=JSON.parse(s);x(i,o)}catch(e){console.error("SecureShield AI Error:",e),alert(`Analysis Failed: ${e.message}`)}finally{t&&(t.innerHTML="白")}}function x(a,o){const t=document.createElement("div");t.className="ss-overlay",t.innerHTML=`
    <div class="ss-popup">
      <h2 style="color:#6c63ff; margin-top:0">Website Analysis</h2>
      <p>${a.description}</p>
      <h3 style="color:#2ecc71">Why Lock?</h3>
      <ul>${a.pros.map(s=>`<li>${s}</li>`).join("")}</ul>
      <h3 style="color:#e74c3c">Cons</h3>
      <ul>${a.cons.map(s=>`<li>${s}</li>`).join("")}</ul>
      <div style="text-align:center; margin-top:20px">
        <button class="ss-btn ss-btn-danger" id="ss-close">Close</button>
        <button class="ss-btn ss-btn-secondary" id="ss-chat">町 Chat with AI</button>
        <button class="ss-btn ss-btn-primary" id="ss-confirm">Lock Site</button>
      </div>
    </div>
  `,document.body.appendChild(t);const e=document.getElementById("ss-close");e&&(e.onclick=()=>t.remove());const n=document.getElementById("ss-chat");n&&(n.onclick=()=>{t.remove(),w(a.description)});const r=document.getElementById("ss-confirm");r&&(r.onclick=async()=>{try{(await fetch(`${f}/locks`,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${o}`},body:JSON.stringify({url:window.location.hostname,name:document.title})})).ok?(chrome.runtime.sendMessage({type:"SYNC_LOCKS"}),alert("Locked! Refreshing..."),window.location.reload()):alert("Failed to lock site.")}catch(s){console.error(s),alert("Network Error.")}})}function w(a){const o=document.createElement("div");o.className="ss-overlay",o.innerHTML=`
    <div class="ss-popup" style="height: 500px;">
      <h3 style="margin-top:0; color:#6c63ff">Chat about this Site</h3>
      <div id="ss-chat-box" style="flex:1; overflow-y:auto; background:rgba(0,0,0,0.2); padding:10px; border-radius:8px; margin-bottom:10px; display:flex; flex-direction:column;">
        <div style="color:#a0aec0; font-size:0.9em; text-align:center; margin-bottom:10px">Context: ${a}</div>
      </div>
      <div style="display:flex; gap:10px">
        <input type="text" id="ss-chat-input" placeholder="Is this site safe?" style="flex:1; padding:10px; border-radius:8px; border:none;">
        <button class="ss-btn ss-btn-primary" id="ss-send">Send</button>
        <button class="ss-btn ss-btn-danger" id="ss-close-chat">Close</button>
      </div>
    </div>
  `,document.body.appendChild(o);const t=document.getElementById("ss-chat-box"),e=document.getElementById("ss-chat-input"),n=document.getElementById("ss-send"),r=document.getElementById("ss-close-chat");r&&(r.onclick=()=>o.remove());const s=async()=>{if(!e||!t)return;const i=e.value.trim();if(!i)return;const d=document.createElement("div");d.className="ss-chat-msg ss-msg-user",d.textContent=i,t.appendChild(d),e.value="",t.scrollTop=t.scrollHeight;try{const l=await fetch(`${u}?key=${m}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({contents:[{parts:[{text:`Context: ${a}. User Question: ${i}`}]}]})}),c=await l.json();if(!l.ok||!c.candidates||!c.candidates[0])throw new Error("AI Error");const g=c.candidates[0].content.parts[0].text,p=document.createElement("div");p.className="ss-chat-msg ss-msg-ai",p.textContent=g,t.appendChild(p)}catch{const c=document.createElement("div");c.textContent="Error getting response.",c.style.color="red",t.appendChild(c)}t.scrollTop=t.scrollHeight};n&&(n.onclick=s),e&&e.addEventListener("keypress",i=>{i.key==="Enter"&&s()})}y();
