import { createClient } from 'npm:@supabase/supabase-js@2'
const corsHeaders={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS"}
const out=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...corsHeaders,"Content-Type":"application/json"}})
const clean=(v:unknown)=>String(v??'').trim()
const usernameOf=(v:unknown)=>clean(v).toLowerCase().replace(/[^a-z0-9._-]/g,'')
async function hashCode(code:string){const b=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(code));return Array.from(new Uint8Array(b),x=>x.toString(16).padStart(2,'0')).join('')}
function randomCode(){const b=crypto.getRandomValues(new Uint8Array(8));const chars='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';return Array.from(b,x=>chars[x%chars.length]).join('')}
async function sendAccessEmail(to:string,name:string,username:string,code:string,role:string,workspace:string){
 const key=Deno.env.get('BREVO_API_KEY')||''
 if(!key)throw new Error('Brevo email delivery is not configured in Supabase.')
 const r=await fetch('https://api.brevo.com/v3/smtp/email',{method:'POST',headers:{accept:'application/json','api-key':key,'Content-Type':'application/json'},body:JSON.stringify({to:[{email:to,name}],templateId:2,params:{name,username,code,role,workspace,login_url:'https://malawihub.pages.dev/business/users/'}})})
 if(!r.ok){const detail=await r.text().catch(()=> '');throw new Error(`Business access email could not be sent (${r.status}). ${detail.slice(0,180)}`)}
}
async function findAuthUserByEmail(admin:any,email:string){const {data,error}=await admin.auth.admin.listUsers({page:1,perPage:1000});if(error)throw error;return(data?.users||[]).find((u:any)=>String(u.email||'').toLowerCase()===email)||null}
Deno.serve(async(req)=>{
 if(req.method==='OPTIONS')return new Response('ok',{headers:corsHeaders});if(req.method!=='POST')return out({error:'Method not allowed'},405)
 try{
  const token=clean(req.headers.get('Authorization')).replace(/^Bearer\s+/i,'').trim();if(!token)return out({error:'Authentication required'},401)
  const url=Deno.env.get('SUPABASE_URL')||'',service=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||'';if(!url||!service)throw new Error('Supabase server configuration is missing')
  const admin=createClient(url,service);const {data:{user},error:ae}=await admin.auth.getUser(token);if(ae||!user)return out({error:'Invalid session'},401)
  const {data:profile,error:pe}=await admin.from('profiles').select('role').eq('id',user.id).maybeSingle();if(pe)throw pe;if(profile?.role!=='admin')return out({error:'Administrator access required'},403)
  const b=await req.json();const workspaceId=clean(b.workspace_id),name=clean(b.display_name),email=clean(b.email).toLowerCase(),role=clean(b.role||'employee').toLowerCase(),requestedUsername=usernameOf(b.username)
  if(!workspaceId||!name||!email||!requestedUsername)return out({error:'Business, full name, email and username are required'},400)
  if(!/^\S+@\S+\.\S+$/.test(email))return out({error:'Enter a valid email address'},400)
  if(!['employee','employer'].includes(role))return out({error:'Role must be employee or employer'},400)
  if(requestedUsername.length<3||requestedUsername.length>40)return out({error:'Username must be 3-40 characters'},400)
  const {data:workspace,error:we}=await admin.from('business_workspaces').select('id,name').eq('id',workspaceId).maybeSingle();if(we)throw we;if(!workspace)return out({error:'Business workspace not found'},404)
  const existingUsername=await admin.from('business_members').select('id').eq('login_username',requestedUsername).limit(1);if(existingUsername.error)throw existingUsername.error
  const existingAuth=await findAuthUserByEmail(admin,email)
  const issueCode=async(memberId:string,displayName:string,memberRole:string)=>{const code=randomCode(),codeHash=await hashCode(code);const {error}=await admin.from('business_members').update({login_code_hash:codeHash}).eq('id',memberId);if(error)throw error;await sendAccessEmail(email,displayName,requestedUsername,code,memberRole,workspace.name);return code}
  if(existingAuth){
   const {data:members,error:memberError}=await admin.from('business_members').select('id,workspace_id,role,display_name,login_username').eq('user_id',existingAuth.id);if(memberError)throw memberError
   if(members?.length){
    const current=members.find((m:any)=>m.workspace_id===workspaceId);if(!current)return out({error:'This email is already registered as a Business user for another business. Use the existing Business account or a different email address.'},409)
    if(existingUsername.data?.length&&existingUsername.data[0].id!==current.id)return out({error:'That username is already in use'},409)
    try{await issueCode(current.id,current.display_name||name,current.role)}catch(e){return out({error:e instanceof Error?e.message:'Business access email failed. The existing account was not duplicated.'},503)}
    return out({success:true,reused:true,workspace:workspace.name,role:current.role,username:current.login_username,emailSent:true,message:'Existing Business access renewed. A fresh access code was sent to the email address.'})
   }
   const taggedAsBusiness=Boolean(existingAuth.user_metadata?.business_login_username);if(!taggedAsBusiness)return out({error:'This email is already used by another MalawiHub account. Business accounts use separate access from Main Hub and Online Class, so use a different email address.'},409)
   if(existingUsername.data?.length)return out({error:'That username is already in use'},409)
   const {data:member,error:me}=await admin.from('business_members').insert({workspace_id:workspaceId,user_id:existingAuth.id,role,display_name:name,login_username:requestedUsername}).select('id').single();if(me||!member)return out({error:me?.message||'Could not restore Business membership'},400)
   if(role==='employee'){const {error:be}=await admin.from('business_wallet_balances').insert([{workspace_id:workspaceId,member_id:member.id,provider:'airtel_money',balance:0,currency:'MWK',status:'pending'},{workspace_id:workspaceId,member_id:member.id,provider:'mpamba',balance:0,currency:'MWK',status:'pending'}]);if(be){await admin.from('business_members').delete().eq('id',member.id);return out({error:be.message},400)}}
   try{await issueCode(member.id,name,role)}catch(e){await admin.from('business_wallet_balances').delete().eq('member_id',member.id);await admin.from('business_members').delete().eq('id',member.id);return out({error:e instanceof Error?e.message:'Business access email failed. The previous Business identity was kept.'},503)}
   return out({success:true,reused:true,restored:true,workspace:workspace.name,role,username:requestedUsername,emailSent:true,message:'Previous incomplete Business account restored. A new access code was sent to the email address.'})
  }
  if(existingUsername.data?.length)return out({error:'That username is already in use'},409)
  const {data:created,error:ce}=await admin.auth.admin.createUser({email,email_confirm:true,user_metadata:{display_name:name,business_login_username:requestedUsername}});if(ce||!created.user)return out({error:ce?.message||'Could not create account'},400)
  const userId=created.user.id
  const {data:member,error:me}=await admin.from('business_members').insert({workspace_id:workspaceId,user_id:userId,role,display_name:name,login_username:requestedUsername}).select('id').single();if(me||!member){await admin.auth.admin.deleteUser(userId);return out({error:me?.message||'Could not create Business membership'},400)}
  if(role==='employee'){const {error:be}=await admin.from('business_wallet_balances').insert([{workspace_id:workspaceId,member_id:member.id,provider:'airtel_money',balance:0,currency:'MWK',status:'pending'},{workspace_id:workspaceId,member_id:member.id,provider:'mpamba',balance:0,currency:'MWK',status:'pending'}]);if(be){await admin.from('business_members').delete().eq('id',member.id);await admin.auth.admin.deleteUser(userId);return out({error:be.message},400)}}
  try{await issueCode(member.id,name,role)}catch(e){await admin.from('business_wallet_balances').delete().eq('member_id',member.id);await admin.from('business_members').delete().eq('id',member.id);await admin.auth.admin.deleteUser(userId);return out({error:e instanceof Error?e.message:'Business access email failed'},503)}
  return out({success:true,reused:false,workspace:workspace.name,role,username:requestedUsername,emailSent:true,message:'Business account created. The username and access code were sent to the email address.'})
 }catch(e){console.error('admin-create-business-user:',e);return out({error:e instanceof Error?e.message:'Unexpected error'},500)}
})
