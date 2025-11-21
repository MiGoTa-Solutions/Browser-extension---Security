import{a as y}from"./assets/chromeStorage-1RTfqZBY.js";const h="secureShield_unlocked_",u="secureshield-floating-lock-button";function m(e){return h+e.replace(/^www\./,"")}async function g(){const e=window.location.hostname.replace(/^www\./,"");if(console.log(`[Content] Checking status for: ${e}`),sessionStorage.getItem(m(e))==="true"){console.log("[Content] 🔓 Session Bypass Active"),p();return}const r=await y();console.log(`[Content] Loaded ${Object.keys(r).length} locks from storage`),r[e]?(console.log("[Content] 🔒 Site is LOCKED"),f(r[e].name,r[e].lockId,e)):(console.log("[Content] ✅ Site is NOT locked"),p())}function f(e,o,r){if(document.getElementById("secureshield-root"))return;const c=document.createElement("div");c.id="secureshield-root",document.body.appendChild(c);const s=c.attachShadow({mode:"closed"});document.body.style.overflow="hidden";const i=document.createElement("div");i.style.cssText=`
    position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
    background-color: #f3f4f6; z-index: 2147483647;
    display: flex; justify-content: center; align-items: center;
    font-family: -apple-system, system-ui, sans-serif;
  `,i.innerHTML=`
    <div style="background: white; padding: 2.5rem; border-radius: 1rem; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25); width: 90%; max-width: 400px; text-align: center;">
      <h1 style="font-size: 1.5rem; font-weight: 700; margin-bottom: 0.5rem; color: #1f2937;">Site Locked</h1>
      <p style="color: #6b7280; margin-bottom: 2rem;">${e}</p>
      <input type="password" id="pin" placeholder="Enter PIN" style="width: 100%; padding: 0.75rem; margin-bottom: 1rem; border: 1px solid #e5e7eb; border-radius: 0.5rem;">
      <button id="unlock" style="width: 100%; background: #2563eb; color: white; padding: 0.75rem; border-radius: 0.5rem; font-weight: 600; cursor: pointer; border:none;">Unlock</button>
      <p id="error" style="color: #ef4444; font-size: 0.875rem; margin-top: 1rem; display: none;"></p>
    </div>
  `,s.appendChild(i);const t=i.querySelector("#pin"),d=i.querySelector("#unlock"),l=i.querySelector("#error");t==null||t.focus();const a=async()=>{if(t.value){d.textContent="Verifying...";try{const n=await chrome.runtime.sendMessage({type:"UNLOCK_SITE",lockId:o,pin:t.value});n!=null&&n.success?(sessionStorage.setItem(m(r),"true"),window.location.reload()):(l.textContent=(n==null?void 0:n.error)||"Incorrect PIN",l.style.display="block",d.textContent="Unlock")}catch(n){console.error(n),d.textContent="Unlock"}}};d.onclick=a,t.onkeydown=n=>{n.key==="Enter"&&a()}}function p(){if(document.getElementById(u))return;const e=document.createElement("button");e.id=u,e.innerHTML="🔒",e.title="Lock this site",e.style.cssText=`
    position: fixed; bottom: 20px; right: 20px; z-index: 2147483646;
    background: #2563eb; color: white; width: 50px; height: 50px;
    border: none; border-radius: 50%; font-size: 24px;
    box-shadow: 0 4px 10px rgba(0,0,0,0.2); cursor: pointer;
    transition: transform 0.2s; display: flex; justify-content: center; align-items: center;
  `,e.onmouseenter=()=>{e.style.transform="scale(1.1)"},e.onmouseleave=()=>{e.style.transform="scale(1)"},e.onclick=b,document.body?document.body.appendChild(e):window.addEventListener("DOMContentLoaded",()=>document.body.appendChild(e))}function b(){var s,i;const e="ss-quick-lock-modal";if(document.getElementById(e))return;const o=document.createElement("div");o.id=e,o.style.cssText=`
    position: fixed; top: 0; left: 0; width: 100%; height: 100%;
    background: rgba(0,0,0,0.5); z-index: 2147483647;
    display: flex; justify-content: center; align-items: center; font-family: system-ui;
  `,o.innerHTML=`
    <div style="background: white; padding: 20px; border-radius: 10px; width: 300px; text-align: center;">
      <h3 style="margin-top: 0;">Lock ${window.location.hostname}?</h3>
      <input type="password" id="ql-pin" placeholder="Enter PIN" style="width: 100%; padding: 8px; margin: 10px 0; border: 1px solid #ccc; border-radius: 4px;">
      <div style="display: flex; gap: 10px; justify-content: center;">
        <button id="ql-cancel" style="padding: 8px 16px; cursor: pointer;">Cancel</button>
        <button id="ql-ok" style="padding: 8px 16px; background: #2563eb; color: white; border: none; border-radius: 4px; cursor: pointer;">Lock</button>
      </div>
    </div>
  `,document.body.appendChild(o);const r=()=>o.remove(),c=o.querySelector("#ql-pin");(s=o.querySelector("#ql-cancel"))==null||s.addEventListener("click",r),(i=o.querySelector("#ql-ok"))==null||i.addEventListener("click",async()=>{if(c.value.length<4)return alert("PIN too short");try{const t=await chrome.runtime.sendMessage({type:"CREATE_LOCK",pin:c.value,tabs:[{title:document.title,url:window.location.href}]});t!=null&&t.success?(r(),window.location.reload()):alert("Failed: "+((t==null?void 0:t.error)||"Unknown error"))}catch{alert("Extension error. Refresh page.")}}),c.focus()}g();
