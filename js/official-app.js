/* MalawiHub Official App identity and install experience */
(function(){
  'use strict';
  const root=document.documentElement;
  root.classList.add('malawihub-official-app');
  const style=document.createElement('style');
  style.textContent=`
    .mh-official-badge{display:inline-flex;align-items:center;gap:7px;margin:8px 0 0;padding:7px 11px;border-radius:999px;background:#eaf7ef;color:#087f3f;font-size:12px;font-weight:800;letter-spacing:.2px;border:1px solid #ccebd8}
    .mh-official-dot{width:8px;height:8px;border-radius:50%;background:#087f3f;box-shadow:0 0 0 3px #d8f1e2}
    .mh-install{position:fixed;left:14px;right:14px;bottom:14px;z-index:9999;display:none;align-items:center;gap:12px;padding:13px 14px;border-radius:18px;background:#fff;box-shadow:0 12px 35px rgba(0,0,0,.16);border:1px solid #dfe9e3}
    .mh-install.show{display:flex}.mh-install-text{flex:1}.mh-install strong{display:block;color:#10261a;font-size:14px}.mh-install span{display:block;color:#65756c;font-size:12px;margin-top:2px}.mh-install button{border:0;border-radius:12px;background:#087f3f;color:#fff;padding:10px 13px;font-weight:800}.mh-install .mh-close{background:#edf3ef;color:#284034;padding:9px 10px}
    body.mh-app-installed .mh-install{display:none!important}
  `;
  document.head.appendChild(style);
  function addBadge(){
    const hero=document.querySelector('.hero-modern .hero-badge');
    if(hero && !document.querySelector('.mh-official-badge')) hero.insertAdjacentHTML('afterend','<div class="mh-official-badge"><span class="mh-official-dot"></span>Official MalawiHub app</div>');
  }
  function installPrompt(){
    let deferred=null;
    window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferred=e;show();});
    function show(){
      if(localStorage.getItem('mh_install_dismissed')==='1'||window.matchMedia('(display-mode: standalone)').matches)return;
      if(document.querySelector('.mh-install'))return;
      const box=document.createElement('div');box.className='mh-install';box.innerHTML='<div class="mh-install-text"><strong>Install the official MalawiHub app</strong><span>Add MalawiHub to your phone home screen for quick access.</span></div><button id="mhInstallBtn">Install</button><button class="mh-close" id="mhCloseBtn">×</button>';document.body.appendChild(box);box.classList.add('show');
      box.querySelector('#mhInstallBtn').onclick=async()=>{if(!deferred)return;deferred.prompt();await deferred.userChoice;deferred=null;box.remove();};
      box.querySelector('#mhCloseBtn').onclick=()=>{localStorage.setItem('mh_install_dismissed','1');box.remove();};
    }
    window.addEventListener('appinstalled',()=>{document.body.classList.add('mh-app-installed');deferred=null;});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{addBadge();installPrompt();});else{addBadge();installPrompt();}
})();
