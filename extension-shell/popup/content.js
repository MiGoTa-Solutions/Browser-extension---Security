const I="http://localhost:4000/api",N="AIzaSyDvHWTKIxHxGo1IWwEPZNqzvnBYuzUFVDc",_="https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent",m="secure-shield-float-btn",k="secure-shield-style",f="ss-overlay",C="ss-chat-overlay",$={"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"};function v(e){return e.replace(/[&<>"']/g,t=>$[t]??t)}function O(e){return e.replace(/```json/gi,"").replace(/```/g,"").trim()}function T(e){var t;return(t=e.candidates)!=null&&t.length?e.candidates.flatMap(n=>{var o;return((o=n.content)==null?void 0:o.parts)??[]}).map(n=>n.text??"").join(`
`).trim():""}function B(){return typeof chrome<"u"&&!!chrome.runtime}function j(){if(!B())return!0;const e=window.location.protocol;if(["chrome:","edge:","about:","devtools:","file:"].includes(e))return!0;try{const t=chrome.runtime.getURL("");if(window.location.href.startsWith(t))return!0}catch{}return!1}function z(){if(document.getElementById(k))return;const e=document.createElement("style");e.id=k,e.textContent=`
    #${m} {
      position: fixed; bottom: 24px; right: 24px; width: 56px; height: 56px;
      border-radius: 50%; background: linear-gradient(135deg, #6c63ff 0%, #5850d6 100%);
      border: none; color: white; font-size: 24px; cursor: pointer; z-index: 2147483647;
      box-shadow: 0 4px 16px rgba(108,99,255,0.4); display: flex; align-items: center; justify-content: center;
      transition: transform 0.2s;
    }
    #${m}:hover { transform: scale(1.1); }
    .${f} {
      position: fixed; top: 0; left: 0; width: 100%; height: 100%;
      background: rgba(5,8,22,0.85); backdrop-filter: blur(8px);
      z-index: 2147483647; display: flex; justify-content: center; align-items: center;
      padding: 24px;
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
  `,document.head.appendChild(e)}async function A(e){const t=await fetch(`${_}?key=${N}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({contents:[{parts:[{text:e}]}]})});if(!t.ok)throw new Error("Gemini API responded with an error");const n=await t.json(),o=T(n);if(!o)throw new Error("Gemini returned an empty response");return o}async function P(e){const t=`You are an expert productivity assistant. Analyze ${e} and reply ONLY with JSON of shape { "description": string, "pros": string[], "cons": string[] } where pros highlight reasons to lock the site.`,n=await A(t),o=O(n);try{const s=JSON.parse(o);return{description:s.description??"AI could not produce a description.",pros:Array.isArray(s.pros)?s.pros:[],cons:Array.isArray(s.cons)?s.cons:[]}}catch(s){throw console.error("Failed to parse Gemini JSON",o,s),new Error("Invalid AI response")}}async function L(){if(j())return;z();const{lockedSites:e}=await chrome.storage.local.get("lockedSites"),t=window.location.hostname.toLowerCase();Array.isArray(e)&&e.some(n=>n.is_locked&&t.includes(n.url.toLowerCase()))||R()}function R(){if(document.getElementById(m)||!document.body)return;const e=document.createElement("button");e.id=m,e.type="button",e.setAttribute("aria-label","SecureShield: Lock this site"),e.textContent="🔒",e.addEventListener("click",H),document.body.appendChild(e)}async function H(){const{auth_token:e}=await chrome.storage.local.get("auth_token");if(!e){alert("Please log in to SecureShield extension first.");return}const t=document.getElementById(m);t&&(t.textContent="⏳",t.disabled=!0);try{const n=await P(window.location.href);M(n,e)}catch(n){console.error(n),alert("Failed to analyze site.")}finally{t&&(t.textContent="🔒",t.disabled=!1)}}function S(e,t){return e.length?e.map(n=>`<li>${v(n)}</li>`).join(""):`<li>${v(t)}</li>`}function M(e,t){var r,c;const n=document.querySelector(`.${f}[data-overlay="analysis"]`);n==null||n.remove();const o=document.createElement("div");o.className=f,o.dataset.overlay="analysis",o.innerHTML=`
    <div class="ss-popup">
      <h2 style="color:#6c63ff; margin-top:0">Website Analysis</h2>
      <p>${v(e.description)}</p>
      
      <h3 style="color:#2ecc71">Why Lock?</h3>
      <ul>${S(e.pros,"No locking benefits detected.")}</ul>
      
      <h3 style="color:#e74c3c">Cons</h3>
      <ul>${S(e.cons,"AI did not list any cons.")}</ul>

      <div style="display:flex; justify-content:center; margin-top:20px; flex-wrap:wrap; gap:8px">
        <button class="ss-btn ss-btn-danger" id="ss-close">Close</button>
        <button class="ss-btn ss-btn-primary" id="ss-confirm">🔒 Lock Site</button>
        <button class="ss-btn" style="background:#4a5568; color:white" id="ss-chat">💬 Chat AI</button>
      </div>
    </div>
  `;const s=l=>{l.key==="Escape"&&d()},d=()=>{o.remove(),document.removeEventListener("keydown",s)};document.body.appendChild(o),document.addEventListener("keydown",s),o.addEventListener("click",l=>{l.target===o&&d()}),(r=o.querySelector("#ss-close"))==null||r.addEventListener("click",d),(c=o.querySelector("#ss-chat"))==null||c.addEventListener("click",()=>Y(e.description));const i=o.querySelector("#ss-confirm");i==null||i.addEventListener("click",async()=>{if(!i)return;i.disabled=!0;const l=i.textContent;i.textContent="Locking...";try{if(!(await fetch(`${I}/locks`,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${t}`},body:JSON.stringify({url:window.location.hostname,name:document.title})})).ok)throw new Error("Failed to lock site");alert("Site Locked! Refreshing..."),chrome.runtime.sendMessage({type:"SYNC_LOCKS"}),window.location.reload()}catch(u){console.error(u),alert("Unable to lock site.")}finally{i.disabled=!1,i.textContent=l??"🔒 Lock Site"}})}function Y(e){var E;(E=document.getElementById(C))==null||E.remove();const t=document.createElement("div");t.id=C,t.className=f;const n=document.createElement("div");n.className="ss-popup",n.style.height="500px",n.style.display="flex",n.style.flexDirection="column";const o=document.createElement("h3");o.style.marginTop="0",o.textContent="Chat with AI";const s=document.createElement("div");s.id="ss-chat-box",s.style.flex="1",s.style.overflowY="auto",s.style.background="rgba(0,0,0,0.2)",s.style.padding="10px",s.style.borderRadius="8px",s.style.marginBottom="10px";const d=document.createElement("div");d.style.color="#a0aec0",d.style.fontSize="0.9em",d.textContent=`Context: ${e}`,s.appendChild(d);const i=document.createElement("div");i.style.display="flex",i.style.gap="10px";const r=document.createElement("input");r.type="text",r.id="ss-chat-input",r.placeholder="Ask about this site...",r.style.flex="1",r.style.padding="10px",r.style.borderRadius="8px",r.style.border="none";const c=document.createElement("button");c.className="ss-btn ss-btn-primary",c.id="ss-send",c.textContent="Send";const l=document.createElement("button");l.className="ss-btn ss-btn-danger",l.id="ss-close-chat",l.textContent="Close",i.append(r,c,l),n.append(o,s,i),t.appendChild(n),document.body.appendChild(t);const u=a=>{a.key==="Escape"&&g()},g=()=>{t.remove(),document.removeEventListener("keydown",u)};document.addEventListener("keydown",u),t.addEventListener("click",a=>{a.target===t&&g()}),l.addEventListener("click",g);const b=(a,y)=>{const h=document.createElement("div");h.style.textAlign=a==="user"?"right":"left",h.style.margin="5px 0";const p=document.createElement("span");p.style.display="inline-block",p.style.padding="5px 10px",p.style.borderRadius="10px",p.style.background=a==="user"?"#6c63ff":a==="ai"?"#2d3748":"#e53e3e",p.style.color="#fff",p.textContent=y,h.appendChild(p),s.appendChild(h),s.scrollTop=s.scrollHeight};let x=!1;const w=async()=>{if(x)return;const a=r.value.trim();if(a){b("user",a),r.value="",x=!0,c.textContent="...",c.disabled=!0;try{const y=await A(`Context: ${e}. User question: ${a}. Provide a concise plain-text answer.`);b("ai",y)}catch(y){console.error(y),b("error","Error getting response.")}finally{x=!1,c.textContent="Send",c.disabled=!1,r.focus()}}};c.addEventListener("click",w),r.addEventListener("keydown",a=>{a.key==="Enter"&&(a.preventDefault(),w())})}document.readyState==="loading"?document.addEventListener("DOMContentLoaded",()=>{L()},{once:!0}):L();
