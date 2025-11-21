import{a as f}from"./assets/chromeStorage-1RTfqZBY.js";const h="secureShield_unlocked_";function m(e){return h+e.replace(/^www\./,"")}async function p(){const e=window.location.hostname.replace(/^www\./,"");if(sessionStorage.getItem(m(e))==="true"){console.log(`[Content] 🔓 Session Bypass Active for ${e}`);return}const n=await f();n[e]?(console.log(`[Content] 🔒 Site is LOCKED: ${e}`),g(n[e].name,n[e].lockId,e)):console.log(`[Content] ✅ Site is NOT locked: ${e}`)}function g(e,d,n){if(document.getElementById("secureshield-root"))return;const l=document.createElement("div");l.id="secureshield-root",document.body.appendChild(l);const u=l.attachShadow({mode:"closed"});document.body.style.overflow="hidden";const r=document.createElement("div");r.style.cssText=`
    position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
    background-color: #f3f4f6; z-index: 2147483647;
    display: flex; justify-content: center; align-items: center;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  `,r.innerHTML=`
    <div style="background: white; padding: 2.5rem; border-radius: 1rem; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25); width: 90%; max-width: 400px; text-align: center; color: #1f2937;">
      <div style="margin: 0 auto 1.5rem; width: 3rem; height: 3rem; background: #eff6ff; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #2563eb;">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
      </div>
      <h1 style="font-size: 1.5rem; font-weight: 700; margin-bottom: 0.5rem;">Site Locked</h1>
      <p style="color: #6b7280; margin-bottom: 2rem;">
        <strong>${n}</strong> is protected by<br>${e}
      </p>
      
      <input type="password" id="pin" placeholder="Enter PIN" style="width: 100%; padding: 0.75rem; margin-bottom: 1rem; border: 1px solid #e5e7eb; border-radius: 0.5rem; box-sizing: border-box; font-size: 1rem; outline: none;">
      <button id="unlock" style="width: 100%; background: #2563eb; color: white; padding: 0.75rem; border-radius: 0.5rem; border: none; font-weight: 600; cursor: pointer; font-size: 1rem;">Unlock Access</button>
      <p id="error" style="color: #ef4444; font-size: 0.875rem; margin-top: 1rem; display: none;"></p>
    </div>
  `,u.appendChild(r);const s=r.querySelector("#pin"),i=r.querySelector("#unlock"),o=r.querySelector("#error");s&&s.focus();const a=async()=>{const c=s.value;if(c){i.textContent="Verifying...",i.disabled=!0,o.style.display="none";try{const t=await chrome.runtime.sendMessage({type:"UNLOCK_SITE",lockId:d,pin:c});if(t&&t.success)sessionStorage.setItem(m(n),"true"),o.textContent="✓ Unlocked",o.style.color="#10b981",o.style.display="block",setTimeout(()=>{window.location.reload()},500);else throw new Error((t==null?void 0:t.error)||"Incorrect PIN")}catch(t){const y=t instanceof Error?t.message:"Unlock failed";o.textContent=y,o.style.color="#ef4444",o.style.display="block",i.textContent="Unlock Access",i.disabled=!1,s.value="",s.focus()}}};i.onclick=a,s.onkeydown=c=>{c.key==="Enter"&&a()}}p();
