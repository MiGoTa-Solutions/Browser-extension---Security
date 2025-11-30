const I="http://127.0.0.1:4000/api",N="AIzaSyD8w_KtZvvLN1MIiFjyWAXE2u4X5W1hnjE",_="https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent",m="secure-shield-float-btn",C="secure-shield-style",h="ss-overlay",k="ss-chat-overlay";function $(e){if(!e)return null;try{return e.replace(/^(https?:\/\/)?(www\.)?/,"").split("/")[0].toLowerCase()}catch{return null}}function O(e,t){if(!(e!=null&&e.is_locked))return!1;const n=$(e==null?void 0:e.url);return n?t.includes(n):!1}const j={"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"};function w(e){return e.replace(/[&<>"']/g,t=>j[t]??t)}function T(e){return e.replace(/```json/gi,"").replace(/```/g,"").trim()}function B(e){var t;return(t=e.candidates)!=null&&t.length?e.candidates.flatMap(n=>{var o;return((o=n.content)==null?void 0:o.parts)??[]}).map(n=>n.text??"").join(`
`).trim():""}function z(){return typeof chrome<"u"&&!!chrome.runtime}function M(){if(!z())return!0;const e=window.location.protocol;if(["chrome:","edge:","about:","devtools:","file:"].includes(e))return!0;try{const t=chrome.runtime.getURL("");if(window.location.href.startsWith(t))return!0}catch{}return!1}function P(){if(document.getElementById(C))return;const e=document.createElement("style");e.id=C,e.textContent=`
    #${m} {
      position: fixed; bottom: 24px; right: 24px; width: 56px; height: 56px;
      border-radius: 50%; background: linear-gradient(135deg, #6c63ff 0%, #5850d6 100%);
      border: none; color: white; font-size: 24px; cursor: pointer; z-index: 2147483647;
      box-shadow: 0 4px 16px rgba(108,99,255,0.4); display: flex; align-items: center; justify-content: center;
      transition: transform 0.2s;
    }
    #${m}:hover { transform: scale(1.1); }
    .${h} {
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
  `,document.head.appendChild(e)}async function A(e){const t=await fetch(`${_}?key=${N}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({contents:[{parts:[{text:e}]}]})});if(!t.ok)throw new Error("Gemini API responded with an error");const n=await t.json(),o=B(n);if(!o)throw new Error("Gemini returned an empty response");return o}async function R(e){const t=`You are an expert productivity assistant. Analyze ${e} and reply ONLY with JSON of shape { "description": string, "pros": string[], "cons": string[] } where pros highlight reasons to lock the site.`,n=await A(t),o=T(n);try{const r=JSON.parse(o);return{description:r.description??"AI could not produce a description.",pros:Array.isArray(r.pros)?r.pros:[],cons:Array.isArray(r.cons)?r.cons:[]}}catch(r){throw console.error("Failed to parse Gemini JSON",o,r),new Error("Invalid AI response")}}async function L(){if(M())return;P();const{lockedSites:e}=await chrome.storage.local.get("lockedSites"),t=window.location.hostname.toLowerCase();Array.isArray(e)&&e.some(n=>O(n,t))||D()}function D(){if(document.getElementById(m)||!document.body)return;const e=document.createElement("button");e.id=m,e.type="button",e.setAttribute("aria-label","SecureShield: Lock this site"),e.textContent="🔒",e.addEventListener("click",H),document.body.appendChild(e)}async function H(){const{auth_token:e}=await chrome.storage.local.get("auth_token");if(!e){alert("Please log in to SecureShield extension first.");return}const t=document.getElementById(m);t&&(t.textContent="⏳",t.disabled=!0);try{const n=await R(window.location.href);Y(n,e)}catch(n){console.error(n),alert("Failed to analyze site.")}finally{t&&(t.textContent="🔒",t.disabled=!1)}}function S(e,t){return e.length?e.map(n=>`<li>${w(n)}</li>`).join(""):`<li>${w(t)}</li>`}function Y(e,t){var s,c;const n=document.querySelector(`.${h}[data-overlay="analysis"]`);n==null||n.remove();const o=document.createElement("div");o.className=h,o.dataset.overlay="analysis",o.innerHTML=`
    <div class="ss-popup">
      <h2 style="color:#6c63ff; margin-top:0">Website Analysis</h2>
      <p>${w(e.description)}</p>
      
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
  `;const r=l=>{l.key==="Escape"&&d()},d=()=>{o.remove(),document.removeEventListener("keydown",r)};document.body.appendChild(o),document.addEventListener("keydown",r),o.addEventListener("click",l=>{l.target===o&&d()}),(s=o.querySelector("#ss-close"))==null||s.addEventListener("click",d),(c=o.querySelector("#ss-chat"))==null||c.addEventListener("click",()=>G(e.description));const i=o.querySelector("#ss-confirm");i==null||i.addEventListener("click",async()=>{if(!i)return;i.disabled=!0;const l=i.textContent;i.textContent="Locking...";try{if(!(await fetch(`${I}/locks`,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${t}`},body:JSON.stringify({url:window.location.hostname,name:document.title})})).ok)throw new Error("Failed to lock site");alert("Site Locked! Refreshing..."),chrome.runtime.sendMessage({type:"SYNC_LOCKS"}),window.location.reload()}catch(p){console.error(p),alert("Unable to lock site.")}finally{i.disabled=!1,i.textContent=l??"🔒 Lock Site"}})}function G(e){var E;(E=document.getElementById(k))==null||E.remove();const t=document.createElement("div");t.id=k,t.className=h;const n=document.createElement("div");n.className="ss-popup",n.style.height="500px",n.style.display="flex",n.style.flexDirection="column";const o=document.createElement("h3");o.style.marginTop="0",o.textContent="Chat with AI";const r=document.createElement("div");r.id="ss-chat-box",r.style.flex="1",r.style.overflowY="auto",r.style.background="rgba(0,0,0,0.2)",r.style.padding="10px",r.style.borderRadius="8px",r.style.marginBottom="10px";const d=document.createElement("div");d.style.color="#a0aec0",d.style.fontSize="0.9em",d.textContent=`Context: ${e}`,r.appendChild(d);const i=document.createElement("div");i.style.display="flex",i.style.gap="10px";const s=document.createElement("input");s.type="text",s.id="ss-chat-input",s.placeholder="Ask about this site...",s.style.flex="1",s.style.padding="10px",s.style.borderRadius="8px",s.style.border="none";const c=document.createElement("button");c.className="ss-btn ss-btn-primary",c.id="ss-send",c.textContent="Send";const l=document.createElement("button");l.className="ss-btn ss-btn-danger",l.id="ss-close-chat",l.textContent="Close",i.append(s,c,l),n.append(o,r,i),t.appendChild(n),document.body.appendChild(t);const p=a=>{a.key==="Escape"&&g()},g=()=>{t.remove(),document.removeEventListener("keydown",p)};document.addEventListener("keydown",p),t.addEventListener("click",a=>{a.target===t&&g()}),l.addEventListener("click",g);const b=(a,y)=>{const f=document.createElement("div");f.style.textAlign=a==="user"?"right":"left",f.style.margin="5px 0";const u=document.createElement("span");u.style.display="inline-block",u.style.padding="5px 10px",u.style.borderRadius="10px",u.style.background=a==="user"?"#6c63ff":a==="ai"?"#2d3748":"#e53e3e",u.style.color="#fff",u.textContent=y,f.appendChild(u),r.appendChild(f),r.scrollTop=r.scrollHeight};let x=!1;const v=async()=>{if(x)return;const a=s.value.trim();if(a){b("user",a),s.value="",x=!0,c.textContent="...",c.disabled=!0;try{const y=await A(`Context: ${e}. User question: ${a}. Provide a concise plain-text answer.`);b("ai",y)}catch(y){console.error(y),b("error","Error getting response.")}finally{x=!1,c.textContent="Send",c.disabled=!1,s.focus()}}};c.addEventListener("click",v),s.addEventListener("keydown",a=>{a.key==="Enter"&&(a.preventDefault(),v())})}document.readyState==="loading"?document.addEventListener("DOMContentLoaded",()=>{L()},{once:!0}):L();
