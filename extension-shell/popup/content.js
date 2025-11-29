const u="http://localhost:4000/api",c="AIzaSyDvHWTKIxHxGo1IWwEPZNqzvnBYuzUFVDc",d=document.createElement("style");d.textContent=`
  #secure-shield-float-btn {
    position: fixed; bottom: 24px; right: 24px; width: 56px; height: 56px;
    border-radius: 50%; background: linear-gradient(135deg, #6c63ff 0%, #5850d6 100%);
    border: none; color: white; font-size: 24px; cursor: pointer; z-index: 2147483647;
    box-shadow: 0 4px 16px rgba(108,99,255,0.4); display: flex; align-items: center; justify-content: center;
    transition: transform 0.2s;
  }
  #secure-shield-float-btn:hover { transform: scale(1.1); }
  
  .ss-overlay {
    position: fixed; top: 0; left: 0; width: 100%; height: 100%;
    background: rgba(5,8,22,0.85); backdrop-filter: blur(8px);
    z-index: 2147483647; display: flex; justify-content: center; align-items: center;
  }
  .ss-popup {
    background: rgba(11,20,40,0.95); border: 1px solid rgba(255,255,255,0.1);
    padding: 32px; border-radius: 16px; width: 90%; max-width: 600px; max-height: 80vh;
    overflow-y: auto; color: #f8fbff; font-family: system-ui, sans-serif;
    box-shadow: 0 20px 50px rgba(0,0,0,0.5);
  }
  .ss-btn {
    padding: 10px 20px; border-radius: 8px; border: none; cursor: pointer; font-weight: 600; margin: 5px;
  }
  .ss-btn-primary { background: #6c63ff; color: white; }
  .ss-btn-danger { background: rgba(231,76,60,0.2); color: #e74c3c; border: 1px solid rgba(231,76,60,0.3); }
`;document.head.appendChild(d);async function g(){const{lockedSites:e}=await chrome.storage.local.get("lockedSites"),n=window.location.hostname;Array.isArray(e)&&e.some(t=>t.is_locked&&n.includes(t.url))||h()}function h(){const e=document.createElement("button");e.id="secure-shield-float-btn",e.innerHTML="🔒",e.title="SecureShield: Lock this site",e.onclick=y,document.body.appendChild(e)}async function y(){const{auth_token:e}=await chrome.storage.local.get("auth_token");if(!e){alert("Please log in to SecureShield extension first.");return}const n=document.getElementById("secure-shield-float-btn"),t=n.innerHTML;n.innerHTML="⏳";try{const o=await m(window.location.href);b(o,e)}catch(o){console.error(o),alert("Failed to analyze site.")}finally{n.innerHTML=t}}async function m(e){const n=`Analyze ${e}. JSON response: { "description": "summary", "pros": ["advantage 1", "advantage 2"], "cons": ["disadvantage 1"] }`,i=(await(await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${c}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({contents:[{parts:[{text:n}]}]})})).json()).candidates[0].content.parts[0].text.replace(/```json/g,"").replace(/```/g,"").trim();return JSON.parse(i)}function b(e,n){var o,a,i;const t=document.createElement("div");t.className="ss-overlay",t.innerHTML=`
    <div class="ss-popup">
      <h2 style="color:#6c63ff; margin-top:0">Website Analysis</h2>
      <p>${e.description}</p>
      
      <h3 style="color:#2ecc71">Why Lock?</h3>
      <ul>${e.pros.map(s=>`<li>${s}</li>`).join("")}</ul>
      
      <h3 style="color:#e74c3c">Cons</h3>
      <ul>${e.cons.map(s=>`<li>${s}</li>`).join("")}</ul>

      <div style="display:flex; justify-content:center; margin-top:20px">
        <button class="ss-btn ss-btn-danger" id="ss-close">Close</button>
        <button class="ss-btn ss-btn-primary" id="ss-confirm">🔒 Lock Site</button>
        <button class="ss-btn" style="background:#4a5568; color:white" id="ss-chat">💬 Chat AI</button>
      </div>
    </div>
  `,document.body.appendChild(t),(o=document.getElementById("ss-close"))==null||o.addEventListener("click",()=>t.remove()),(a=document.getElementById("ss-chat"))==null||a.addEventListener("click",()=>x(e.description)),(i=document.getElementById("ss-confirm"))==null||i.addEventListener("click",async()=>{try{(await fetch(`${u}/locks`,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${n}`},body:JSON.stringify({url:window.location.hostname,name:document.title})})).ok?(alert("Site Locked! Refreshing..."),chrome.runtime.sendMessage({type:"SYNC_LOCKS"}),window.location.reload()):alert("Failed to lock site.")}catch{alert("Network error.")}})}function x(e){var i,s;const n=document.createElement("div");n.className="ss-overlay",n.innerHTML=`
    <div class="ss-popup" style="height: 500px; display:flex; flex-direction:column;">
      <h3 style="margin-top:0">Chat with AI</h3>
      <div id="ss-chat-box" style="flex:1; overflow-y:auto; background:rgba(0,0,0,0.2); padding:10px; border-radius:8px; margin-bottom:10px;">
        <div style="color:#a0aec0; font-size:0.9em">Context: ${e}</div>
      </div>
      <div style="display:flex; gap:10px">
        <input type="text" id="ss-chat-input" placeholder="Ask about this site..." style="flex:1; padding:10px; border-radius:8px; border:none;">
        <button class="ss-btn ss-btn-primary" id="ss-send">Send</button>
        <button class="ss-btn ss-btn-danger" id="ss-close-chat">Close</button>
      </div>
    </div>
  `,document.body.appendChild(n);const t=document.getElementById("ss-chat-box"),o=document.getElementById("ss-chat-input");(i=document.getElementById("ss-close-chat"))==null||i.addEventListener("click",()=>n.remove());const a=async()=>{const r=o.value;if(r){t.innerHTML+=`<div style="text-align:right; margin:5px 0"><span style="background:#6c63ff; padding:5px 10px; border-radius:10px; display:inline-block">${r}</span></div>`,o.value="";try{const p=(await(await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${c}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({contents:[{parts:[{text:`Context: ${e}. User question: ${r}`}]}]})})).json()).candidates[0].content.parts[0].text;t.innerHTML+=`<div style="text-align:left; margin:5px 0"><span style="background:#2d3748; padding:5px 10px; border-radius:10px; display:inline-block">${p}</span></div>`,t.scrollTop=t.scrollHeight}catch{t.innerHTML+='<div style="color:red">Error getting response.</div>'}}};(s=document.getElementById("ss-send"))==null||s.addEventListener("click",a)}g();
