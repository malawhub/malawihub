/* MalawiHub Official App install experience */
(function(){
  'use strict';
  const root=document.documentElement;
  root.classList.add('malawihub-official-app');
  const style=document.createElement('style');
  style.textContent=`
    .mh-official-badge{display:inline-flex;align-items:center;gap:7px;margin:8px 0 0;padding:7px 11px;border-radius:999px;background:#eaf7ef;color:#087f3f;font-size:12px;font-weight:800;letter-spacing:.2px;border:1px solid #ccebd8}
    .mh-official-dot{width:8px;height:8px;border-radius:50%;background:#087f3f;box-shadow:0 0 0 3px #d8f1e2}
    .mh-install{position:fixed;left:12px;right:12px;bottom:12px;z-index:99999;display:none;align-items:center;gap:10px;padding:14px;border-radius:18px;background:#fff;box-shadow:0 12px 35px rgba(0,0,0,.18);border:1px solid #dfe9e3}
    .mh-install.show{display:flex}.mh-install-text{flex:1}.mh-install strong{display:block;color:#10261a;font-size:14px}.mh-install span{display:block;color:#65756c;font-size:12px;margin-top:3px}.mh-install button{border:0;border-radius:12px;background:#087f3f;color:#fff;padding:10px 14px;font-weight:800;white-space:nowrap}.mh-install .mh-close{background:#edf3ef;color:#284034;padding:9px 11px}
    .mh-install-help{position:fixed;left:12px;right:12px;bottom:12px;z-index:100000;display:none;padding:16px;border-radius:18px;background:#fff;box-shadow:0 12px 35px rgba(0,0,0,.2);border:1px solid #dfe9e3}.mh-install-help.show{display:block}.mh-install-help h3{margin:0 0 8px;color:#10261a}.mh-install-help p{margin:6px 0;color:#52635a;font-size:13px}.mh-install-help button{margin-top:10px;border:0;border-radius:12px;background:#087f3f;color:#fff;padding:10px 14px;font-weight:800}
    body.mh-app-installed .mh-install,body.mh-app-installed .mh-install-help{display:none!important}
  `;
  document.head.appendChild(style);
  function addBadge(){
    const hero=document.querySelector('.hero-modern .hero-badge');
    if(hero && !document.querySelector('.mh-official-badge')) hero.insertAdjacentHTML('afterend','<div class="mh-official-badge"><span class="mh-official-dot"></span>Official MalawiHub app</div>');
  }
  function isInstalled(){
    return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true || document.referrer.startsWith('android-app://');
  }
  function showInstallHelp(){
    if(document.querySelector('.mh-install-help')) return;
    const box=document.createElement('div');
    box.className='mh-install-help show';
    box.innerHTML='<h3>📲 Install MalawiHub</h3><p><b>Android / Chrome:</b> tap the ⋮ menu, then choose <b>Install app</b> or <b>Add to Home screen</b>.</p><p>After installation, open MalawiHub from your phone home screen like a normal app.</p><button id="mhHelpClose">Got it</button>';
    document.body.appendChild(box);
    box.querySelector('#mhHelpClose').onclick=()=>box.remove();
  }
  function installPrompt(){
    if(isInstalled()){document.body.classList.add('mh-app-installed');return;}
    let deferred=null;
    const show=()=>{
      if(document.querySelector('.mh-install')||isInstalled())return;
      const box=document.createElement('div');
      box.className='mh-install show';
      box.innerHTML='<div class="mh-install-text"><strong>📲 Install the official MalawiHub app</strong><span>Install MalawiHub on your phone for faster access and an app-like experience.</span></div><button id="mhInstallBtn">Install</button><button class="mh-close" id="mhCloseBtn">×</button>';
      document.body.appendChild(box);
      box.querySelector('#mhInstallBtn').onclick=async()=>{
        if(deferred){deferred.prompt();await deferred.userChoice;deferred=null;box.remove();return;}
        box.remove();showInstallHelp();
      };
      box.querySelector('#mhCloseBtn').onclick=()=>box.remove();
    };
    window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferred=e;show();});
    window.addEventListener('appinstalled',()=>{document.body.classList.add('mh-app-installed');deferred=null;});
    setTimeout(()=>{if(!isInstalled())show();},1500);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{addBadge();installPrompt();});else{addBadge();installPrompt();}
})();
