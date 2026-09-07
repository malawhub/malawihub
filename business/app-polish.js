(function(){
  if(!location.pathname.includes('/business'))return;
  const s=document.createElement('style');
  s.textContent=`
    :root{--mh-green:#0b4f3a;--mh-green2:#126b50;--mh-bg:#f5f7f9;--mh-text:#14201c;--mh-muted:#66756f}
    body{background:var(--mh-bg)!important;color:var(--mh-text)!important}
    .wrap{max-width:720px!important;padding:14px!important}
    .wrap>h1{font-size:25px;margin:8px 0 4px;font-weight:850;letter-spacing:-.4px}
    .wrap>p.muted{margin-top:0}
    .card{border:1px solid #e4e9e6!important;border-radius:18px!important;box-shadow:0 6px 24px rgba(16,40,30,.06)!important;padding:18px!important;margin:12px 0!important}
    h2{font-size:18px!important;margin:0 0 10px!important;font-weight:800}
    input,select,button{min-height:46px!important;border-radius:12px!important;font-size:15px!important}
    button{background:var(--mh-green)!important;box-shadow:0 2px 7px rgba(11,79,58,.16);transition:transform .12s,opacity .12s}
    button:active{transform:scale(.98);opacity:.9}
    .grid{gap:10px!important}
    #app>.card:first-child{background:linear-gradient(135deg,var(--mh-green),var(--mh-green2))!important;color:#fff!important;border:0!important}
    #app>.card:first-child .muted,#app>.card:first-child div{color:#fff}
    #businessName{font-size:19px;font-weight:800;margin-top:3px}
    #role{font-weight:700;text-transform:capitalize;margin-top:3px}
    #unread{font-size:19px;font-weight:800;margin-top:3px}
    .notice{border-radius:12px!important}
    .guide{background:#f0f8f4!important;border-color:#cfe5da!important}
    .success{background:#effaf4!important;border-color:#cce8d8!important}
    .test{background:#fff7ed!important;border-color:#fed7aa!important}
    .step{margin:8px 0!important}
    .num{background:var(--mh-green)!important}
    #notifications{background:#f8fafb;border-radius:12px;padding:12px;min-height:20px}
    #integrationResult,#inviteBox{margin-top:10px}
    .mh-section-label{font-size:12px;text-transform:uppercase;letter-spacing:.08em;color:var(--mh-muted);font-weight:800;margin-bottom:7px}
    .mh-app-footer{text-align:center;color:var(--mh-muted);font-size:11px;padding:20px 0 8px}
    @media(max-width:520px){.wrap{padding:10px!important}.card{padding:15px!important}h1{font-size:23px!important}.grid{grid-template-columns:1fr!important}}
  `;
  document.head.appendChild(s);
  function polish(){
    const wrap=document.querySelector('.wrap');if(!wrap)return;
    if(!document.getElementById('mhAppFooter')){const f=document.createElement('div');f.id='mhAppFooter';f.className='mh-app-footer';f.textContent='MalawiHub Business • Official MalawiHub workspace';wrap.appendChild(f)}
    document.querySelectorAll('#employerPanel>.card,#employeePanel>.card').forEach(card=>{const h=card.querySelector('h2');if(h&&!card.querySelector('.mh-section-label')){const label=document.createElement('div');label.className='mh-section-label';label.textContent=h.textContent.replace(/^[^A-Za-z0-9]+/,'').replace(/\s+/g,' ');h.parentNode.insertBefore(label,h);h.style.display='none'}});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(polish,300));else setTimeout(polish,300);
  new MutationObserver(()=>setTimeout(polish,50)).observe(document.body,{childList:true,subtree:true});
})();
