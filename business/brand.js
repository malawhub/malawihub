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
    .mh-malipo-box{margin-top:12px;padding:14px;border:1px solid #cfe5da;background:#f7fbf9;border-radius:14px}
    .mh-malipo-row{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:10px}
    .mh-malipo-status{font-size:13px;padding:10px;border-radius:10px;background:#fff;border:1px solid #e2e8e5}
    .mh-malipo-status.ok{background:#effaf4;border-color:#cce8d8}.mh-malipo-status.bad{background:#fff7ed;border-color:#fed7aa}
    .mh-malipo-result{margin-top:10px;white-space:pre-wrap;word-break:break-word;font-size:12px}
    @media(max-width:520px){.mh-invite-actions,.mh-malipo-row{grid-template-columns:1fr}.mh-invite-actions button{width:100%}}
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

  async function callMalipo(action,extra={}){
    const client=await waitForClient();
    if(!client)throw new Error('MalawiHub connection is unavailable.');
    const {data:{session}}=await client.auth.getSession();
    if(!session?.access_token)throw new Error('Please sign in first.');
    const workspaceId=await getEmployerWorkspace(client);
    const r=await fetch('https://cdqrdovgdidzxmyygoee.supabase.co/functions/v1/malipo-business',{
      method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+session.access_token,'apikey':'sb_publishable_XHAK368Bg4dirFmtl229bQ_xzjCyqbv'},
      body:JSON.stringify({workspace_id:workspaceId,action,...extra})
    });
    const data=await r.json().catch(()=>({error:'Invalid server response'}));
    if(!r.ok)throw new Error(data.error||'Malipo request failed.');
    return data;
  }

  async function refreshMalipo(){
    const box=document.getElementById('mhMalipoBox');if(!box)return;
    try{
      const s=await callMalipo('status');
      const configured=s.configured;
      box.querySelector('#mhMalipoState').className='mh-malipo-status '+(configured?'ok':'bad');
      box.querySelector('#mhMalipoState').textContent=configured?'✓ Malipo API is configured':'⚠ Malipo API credentials still need to be added';
      const rows=(s.integrations||[]).map(x=>`${x.provider==='airtel_money'?'Airtel Money':'TNM Mpamba'}: ${x.status}`).join('\n');
      box.querySelector('#mhMalipoDetails').textContent=rows||'No provider records found.';
    }catch(e){box.querySelector('#mhMalipoState').className='mh-malipo-status bad';box.querySelector('#mhMalipoState').textContent='⚠ '+e.message;}
  }

  function addMalipoPanel(){
    const panel=document.getElementById('employerPanel');if(!panel||document.getElementById('mhMalipoBox'))return;
    const box=document.createElement('div');box.id='mhMalipoBox';box.className='card';
    box.innerHTML=`<h2>💳 Malipo payment hub</h2><div class="notice guide"><b>Airtel Money + TNM Mpamba through one connection</b><br>Malipo is used as the payment gateway. API credentials stay on the Supabase server and are never placed in this page.</div><div id="mhMalipoState" class="mh-malipo-status">Checking connection…</div><div id="mhMalipoDetails" class="small" style="white-space:pre-wrap;margin-top:8px">—</div><div class="mh-malipo-row"><div><select id="mhMalipoProvider"><option value="airtel_money">Airtel Money</option><option value="mpamba">TNM Mpamba</option></select><input id="mhMalipoPhone" inputmode="numeric" placeholder="Customer phone: 265XXXXXXXXX"><input id="mhMalipoAmount" type="number" min="1" placeholder="Amount (MWK)"><button type="button" id="mhMalipoPay">Request payment</button></div><div><button type="button" id="mhMalipoBalance">Refresh Malipo balance</button><input id="mhMalipoRef" placeholder="Merchant transaction ID"><button type="button" id="mhMalipoEnquire">Check transaction</button></div></div><div id="mhMalipoResult" class="mh-malipo-result"></div>`;
    const anchor=[...panel.querySelectorAll('.card')].find(c=>c.textContent.includes('Integration setup'));
    (anchor?.parentNode||panel).insertBefore(box,anchor||null);
    box.querySelector('#mhMalipoPay').onclick=async()=>{const result=box.querySelector('#mhMalipoResult');try{result.textContent='Sending payment request…';const d=await callMalipo('request_payment',{provider:box.querySelector('#mhMalipoProvider').value,customer_phone:box.querySelector('#mhMalipoPhone').value.trim(),amount:Number(box.querySelector('#mhMalipoAmount').value)});result.textContent=JSON.stringify(d,null,2)}catch(e){result.textContent='Error: '+e.message}};
    box.querySelector('#mhMalipoBalance').onclick=async()=>{const result=box.querySelector('#mhMalipoResult');try{result.textContent='Checking balance…';const d=await callMalipo('balance');result.textContent=JSON.stringify(d,null,2);refreshMalipo()}catch(e){result.textContent='Error: '+e.message}};
    box.querySelector('#mhMalipoEnquire').onclick=async()=>{const result=box.querySelector('#mhMalipoResult');try{const ref=box.querySelector('#mhMalipoRef').value.trim();if(!ref)throw new Error('Enter the merchant transaction ID.');result.textContent='Checking transaction…';const d=await callMalipo('enquire',{merchant_trx_id:ref});result.textContent=JSON.stringify(d,null,2)}catch(e){result.textContent='Error: '+e.message}};
    refreshMalipo();
  }

  function start(){
    addOfficialBar();
    if(!wireInviteButton())setTimeout(wireInviteButton,500);
    addMalipoPanel();
    setTimeout(addMalipoPanel,700);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();
