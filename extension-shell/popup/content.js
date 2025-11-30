const y="http://127.0.0.1:4000/api",m="AIzaSyAt5C9kLi8W4khsQrmKTtfWtn6N_W0WP9k",h="https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent",g=document.createElement("style");g.textContent=`
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
`;document.head.appendChild(g);let u=!1;async function b(){const a=await chrome.storage.local.get(["lockedSites","unlockedExceptions"]),i=a.lockedSites||[],e=a.unlockedExceptions||[],o=window.location.hostname.toLowerCase(),n=i.some(r=>r.is_locked&&o.includes(r.url)),s=e.some(r=>o.includes(r));if(n&&!s)return;const t=document.createElement("button");t.id="ss-float-btn",document.body.appendChild(t),n&&s?(u=!0,t.innerHTML="🔒",t.classList.add("ss-unlocked"),t.title="Site is temporarily unlocked. Click to Re-Lock."):(u=!1,t.innerHTML="白",t.title="SecureShield AI Analysis"),t.onclick=x}async function x(){const i=(await chrome.storage.local.get("auth_token")).auth_token;if(!i||typeof i!="string")return alert("Please log in to SecureShield extension.");const e=document.getElementById("ss-float-btn");if(u){confirm("Re-lock this website? You will need your PIN to access it again.")&&(e&&(e.innerHTML="..."),await chrome.runtime.sendMessage({type:"RELOCK_SITE",url:window.location.hostname}),alert("Site Locked."),window.location.reload());return}e&&(e.innerHTML="竢ｳ");try{const o=`Analyze ${window.location.href}. Return valid JSON only: {"description": "string", "pros": ["string"], "cons": ["string"]}`,n=await fetch(`${h}?key=${m}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({contents:[{parts:[{text:o}]}]})});if(!n.ok)throw n.status===429?new Error("API Quota Exceeded. Please try again later."):new Error(`API Error: ${n.status} ${n.statusText}`);const s=await n.json();if(!s.candidates||!s.candidates[0]||!s.candidates[0].content)throw new Error("AI returned no analysis (Safety Block or Empty Response).");let t=s.candidates[0].content.parts[0].text;t=t.replace(/```json/g,"").replace(/```/g,"").trim();const r=JSON.parse(t);k(r,i)}catch(o){console.error("SecureShield AI Error:",o),alert(`Analysis Failed: ${o.message}`)}finally{e&&(e.innerHTML="白")}}function k(a,i){const e=document.createElement("div");e.className="ss-overlay",e.innerHTML=`
    <div class="ss-popup">
      <h2 style="color:#6c63ff; margin-top:0">Website Analysis</h2>
      <p>${a.description}</p>
      <h3 style="color:#2ecc71">Why Lock?</h3>
      <ul>${a.pros.map(t=>`<li>${t}</li>`).join("")}</ul>
      <h3 style="color:#e74c3c">Cons</h3>
      <ul>${a.cons.map(t=>`<li>${t}</li>`).join("")}</ul>
      <div style="text-align:center; margin-top:20px">
        <button class="ss-btn ss-btn-danger" id="ss-close">Close</button>
        <button class="ss-btn ss-btn-secondary" id="ss-chat">町 Chat with AI</button>
        <button class="ss-btn ss-btn-primary" id="ss-confirm">Lock Site</button>
      </div>
    </div>
  `,document.body.appendChild(e);const o=document.getElementById("ss-close");o&&(o.onclick=()=>e.remove());const n=document.getElementById("ss-chat");n&&(n.onclick=()=>{e.remove(),w(a.description)});const s=document.getElementById("ss-confirm");s&&(s.onclick=async()=>{try{(await fetch(`${y}/locks`,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${i}`},body:JSON.stringify({url:window.location.hostname,name:document.title})})).ok?(chrome.runtime.sendMessage({type:"SYNC_LOCKS"}),alert("Locked! Refreshing..."),window.location.reload()):alert("Failed to lock site.")}catch(t){console.error(t),alert("Network Error.")}})}function w(a){const i=document.createElement("div");i.className="ss-overlay",i.innerHTML=`
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
  `,document.body.appendChild(i);const e=document.getElementById("ss-chat-box"),o=document.getElementById("ss-chat-input"),n=document.getElementById("ss-send"),s=document.getElementById("ss-close-chat");s&&(s.onclick=()=>i.remove());const t=async()=>{if(!o||!e)return;const r=o.value.trim();if(!r)return;const l=document.createElement("div");l.className="ss-chat-msg ss-msg-user",l.textContent=r,e.appendChild(l),o.value="",e.scrollTop=e.scrollHeight;try{const d=await fetch(`${h}?key=${m}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({contents:[{parts:[{text:`Context: ${a}. User Question: ${r}`}]}]})}),c=await d.json();if(!d.ok||!c.candidates||!c.candidates[0])throw new Error("AI Error");const f=c.candidates[0].content.parts[0].text,p=document.createElement("div");p.className="ss-chat-msg ss-msg-ai",p.textContent=f,e.appendChild(p)}catch{const c=document.createElement("div");c.textContent="Error getting response.",c.style.color="red",e.appendChild(c)}e.scrollTop=e.scrollHeight};n&&(n.onclick=t),o&&o.addEventListener("keypress",r=>{r.key==="Enter"&&t()})}b();
