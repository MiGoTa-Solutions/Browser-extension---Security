import{a as m}from"./assets/chromeStorage-BSHNbP9R.js";const s="ss_unlocked_";async function u(){const t=window.location.hostname;if(sessionStorage.getItem(s+t)){console.log("[Content] Session unlocked.");return}const e=await m(t);e&&(console.log("[Content] Locking:",t),b(e))}function b(t){const e=document.createElement("div");e.id="secure-shield-root";const i=e.attachShadow({mode:"closed"}),d=document.createElement("style");d.textContent=`
    :host { all: initial; }
    .overlay {
      position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
      background: #f3f4f6; z-index: 2147483647;
      display: flex; align-items: center; justify-content: center;
      font-family: system-ui, sans-serif;
    }
    .card {
      background: white; padding: 2rem; border-radius: 1rem;
      box-shadow: 0 10px 25px rgba(0,0,0,0.1);
      text-align: center; width: 90%; max-width: 400px;
    }
    h1 { margin: 0 0 1rem 0; color: #111827; }
    input { 
      width: 100%; padding: 0.75rem; border: 1px solid #e5e7eb; 
      border-radius: 0.5rem; margin-bottom: 1rem;
      box-sizing: border-box; font-size: 1rem;
    }
    button {
      background: #2563eb; color: white; width: 100%;
      padding: 0.75rem; border: none; border-radius: 0.5rem;
      font-weight: bold; cursor: pointer; font-size: 1rem;
    }
    button:disabled { opacity: 0.7; cursor: wait; }
    .error { color: #ef4444; margin-top: 1rem; font-size: 0.875rem; }
  `;const o=document.createElement("div");o.className="overlay",o.innerHTML=`
    <div class="card">
      <h1>Site Locked</h1>
      <p>Access to <strong>${t.name}</strong> is restricted.</p>
      <input type="password" placeholder="Enter PIN" id="pin" />
      <button id="unlockBtn">Unlock</button>
      <div class="error" id="errorMsg"></div>
    </div>
  `,i.appendChild(d),i.appendChild(o);const a=o.querySelector("#pin"),n=o.querySelector("#unlockBtn"),c=o.querySelector("#errorMsg"),l=async()=>{n.disabled=!0,n.textContent="Verifying...",c.textContent="",chrome.runtime.sendMessage({type:"UNLOCK_REQUEST",lockId:t.id,pin:a.value},r=>{r&&r.success?(sessionStorage.setItem(s+window.location.hostname,"true"),window.location.reload()):(n.disabled=!1,n.textContent="Unlock",c.textContent=(r==null?void 0:r.error)||"Incorrect PIN")})};n.onclick=l,document.documentElement.style.overflow="hidden",document.body.appendChild(e),new MutationObserver(()=>{document.body.contains(e)||(document.body.appendChild(e),document.documentElement.style.overflow="hidden")}).observe(document.body,{childList:!0,subtree:!0})}u();
