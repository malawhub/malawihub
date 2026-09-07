(function(){
  if(!location.pathname.includes('/business')) return;

  const style=document.createElement('style');
  style.textContent=`
    .mh-official-bar{display:flex;align-items:center;gap:10px;background:#0b4f3a;color:#fff;border-radius:14px;padding:11px 14px;margin:0 0 14px;font-size:13px;font-weight:700}
    .mh-official-mark{width:28px;height:28px;border-radius:8px;background:#fff;color:#0b4f3a;display:grid;place-items:center;font-weight:900}
    .mh-official-text{flex:1}.mh-official-sub{display:block;font-size:11px;font-weight:500;opacity:.86;margin-top:2px}
    .mh-invite-box{margin-top:12px;padding:14px;border:1px solid #cfe3ff;background:#f7fbff;border-radius:14px}
    .mh-invite-link{font-size:12px;word-break:break-all;background:#fff;border:1px solid #d8e2ee;border-radius:10px;padding:10px;margin:8px 0;color:#152033}
    .mh-invite-actions{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
    .mh-invite-actions button{margin:0}
    .mh-invite-status{font-size:12px;color:#667085;margin-top:8px}
    @media(max-width:520px){.mh-invite-actions{grid-template-columns:1fr}.mh-invite-actions button{width:100%}}
  `;
  document.head.appendChild(style);

  function addOfficialBar(){
    const wrap=document.querySelector('.wrap');
    if(!wrap||document.getElementById('mhOfficialBar')) return;
    const bar=document.createElement('div');
    bar.id='mhOfficialBar';
    bar.className='mh-official-bar';
    bar.innerHTML='<span class="mh-official-mark">MH</span><span class="mh-official-text">Official MalawiHub Business<span class="mh-official-sub">Private business workspace • malawihub.pages.dev</span></span>';
    wrap.insertBefore(bar,wrap.firstChild);
    document.title='MalawiHub Business';
    let meta=document.querySelector('meta[name="theme-color"]');
    if(!meta){meta=document.createElement('meta');meta.name='theme-color';document.head.appendChild(meta)}
    meta.content='#0b4f3a';
  }

  async function waitForClient(){
    for(let i=0;i<40;i++){if(window.supabaseClient)return window.supabaseClient;await new Promise(r=>setTimeout(r,100))}
    return null;
  }

  function randomToken(){
    const bytes=new Uint8Array(32);crypto.getRandomValues(bytes);
    return Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');
  }

  async function getEmployerWorkspace(client){
    const {data:{user}}=await client.auth.getUser();
    if(!user) throw new Error('Please sign in first.');
    const {data,error}=await client.from('business_members').select('workspace_id,role').eq('user_id',user.id).eq('role','employer').limit(1).maybeSingle();
    if(error) throw error;
    if(!data) throw new Error('Employer workspace not found. Create your business first.');
    return data.workspace_id;
  }

  function renderInvite(box,link,expiresAt){
    box.className='mh-invite-box';
    box.innerHTML=`<b>🔗 Employee invitation link</b><div class="muted">Send this link directly to your employee.</div><div class="mh-invite-link" id="mhInviteLink">${link}</div><div class="mh-invite-actions"><button type="button" id="mhCopy">Copy Link</button><button type="button" id="mhOpen">Open Link</button><button type="button" id="mhShare">Share Link</button></div><div class="mh-invite-status">Valid until ${new Date(expiresAt).toLocaleString()}</div>`;
    document.getElementById('mhCopy').onclick=async()=>{try{await navigator.clipboard.writeText(link);document.getElementById('mhCopy').textContent='Copied ✓';setTimeout(()=>document.getElementById('mhCopy').textContent='Copy Link',1800)}catch(e){alert('Copy failed. Long-press the link and copy it.')}};
    document.getElementById('mhOpen').onclick=()=>window.open(link,'_blank');
    document.getElementById('mhShare').onclick=async()=>{if(navigator.share){try{await navigator.share({title:'MalawiHub Business invitation',text:'Join my business on MalawiHub',url:link})}catch(e){}}else{try{await navigator.clipboard.writeText(link);alert('Link copied. You can now share it on WhatsApp or another app.')}catch(e){alert('Copy the link and share it privately.')}}};
  }

  async function generateOfficialInvite(){
    const button=document.querySelector('#employerPanel button[onclick="generateInvite()"]');
    const box=document.getElementById('inviteBox');
    if(!box)return;
    try{
      if(button){button.disabled=true;button.textContent='Generating link…'}
      const client=await waitForClient();
      if(!client)throw new Error('MalawiHub connection is unavailable. Refresh and try again.');
      const workspaceId=await getEmployerWorkspace(client);
      const token=randomToken();
      const {error}=await client.rpc('create_business_invite',{target_workspace:workspaceId,raw_token:token,hours_valid:72});
      if(error)throw error;
      const expiresAt=Date.now()+72*60*60*1000;
      const link=new URL('/business/',location.origin);link.searchParams.set('invite',token);
      renderInvite(box,link.toString(),expiresAt);
    }catch(error){box.className='notice error';box.textContent=error.message||'Could not generate the invitation link.'}
    finally{if(button){button.disabled=false;button.textContent='Generate employee invitation'}}
  }

  function wireInviteButton(){
    const button=document.querySelector('#employerPanel button[onclick="generateInvite()"]');
    if(!button)return false;
    button.onclick=generateOfficialInvite;
    button.removeAttribute('onclick');
    return true;
  }

  function start(){
    addOfficialBar();
    if(!wireInviteButton())setTimeout(wireInviteButton,500);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();
