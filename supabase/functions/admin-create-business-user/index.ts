import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS"}
const out=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...corsHeaders,"Content-Type":"application/json"}})
const clean=(v:unknown)=>String(v??'').trim()
const usernameOf=(v:unknown)=>clean(v).toLowerCase().replace(/[^a-z0-9._-]/g,'')
function randomPassword(){const chars='ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%';const b=crypto.getRandomValues(new Uint8Array(16));return Array.from(b,x=>chars[x%chars.length]).join('')}
async function sendCredentialsEmail(to:string,name:string,username:string,password:string,role:string,workspace:string){
 const key=Deno.env.get('BREVO_API_KEY')||''
 if(!key) throw new Error('Brevo email delivery is not configured in Supabase.')
 const r=await fetch('https://api.brevo.com/v3/smtp/email',{method:'POST',headers:{accept:'application/json','api-key':key,'Content-Type':'application/json'},body:JSON.stringify({to:[{email:to,name}],templateId:2,params:{name,username,password,role,workspace}})})
 if(!r.ok){const detail=await r.text().catch(()=> '');throw new Error(`Business welcome email could not be sent (${r.status}). ${detail.slice(0,180)}`)}
}
Deno.serve(async(req)=>{
 if(req.method==='OPTIONS')return new Response('ok',{headers:corsHeaders}); if(req.method!=='POST')return out({error:'Method not allowed'},405)
 try{
  const authHeader=clean(req.headers.get('Authorization'))
  const token=authHeader.replace(/^Bearer\s+/i,'').trim()
  if(!token)return out({error:'Authentication required'},401)
  const url=Deno.env.get('SUPABASE_URL')||''; const service=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||''
  if(!url||!service)throw new Error('Supabase server configuration is missing')
  const admin=createClient(url,service)
  const {data:{user},error:ae}=await admin.auth.getUser(token); if(ae||!user)return out({error:'Invalid session'},401)
  const {data:profile,error:pe}=await admin.from('profiles').select('role').eq('id',user.id).maybeSingle(); if(pe)throw pe; if(profile?.role!=='admin')return out({error:'Administrator access required'},403)
  const b=await req.json(); const workspaceId=clean(b.workspace_id),name=clean(b.display_name),email=clean(b.email).toLowerCase(),role=clean(b.role||'employee').toLowerCase(),username=usernameOf(b.username)
  if(!workspaceId||!name||!email||!username)return out({error:'Business, full name, email and username are required'},400)
  if(!/^\S+@\S+\.\S+$/.test(email))return out({error:'Enter a valid email address'},400)
  if(!['employee','employer'].includes(role))return out({error:'Role must be employee or employer'},400)
  if(username.length<3||username.length>40)return out({error:'Username must be 3-40 characters'},400)
  const {data:workspace,error:we}=await admin.from('business_workspaces').select('id,name').eq('id',workspaceId).maybeSingle(); if(we)throw we; if(!workspace)return out({error:'Business workspace not found'},404)
  const {data:existing}=await admin.from('business_members').select('id').eq('login_username',username).limit(1); if(existing?.length)return out({error:'That username is already in use'},409)
  const password=randomPassword()
  const {data:created,error:ce}=await admin.auth.admin.createUser({email,password,email_confirm:true,user_metadata:{display_name:name,business_login_username:username,must_change_password:true}}); if(ce||!created.user)return out({error:ce?.message||'Could not create account'},400)
  const userId=created.user.id
  const {data:member,error:me}=await admin.from('business_members').insert({workspace_id:workspaceId,user_id:userId,role,display_name:name,login_username:username}).select('id').single()
  if(me||!member){await admin.auth.admin.deleteUser(userId);return out({error:me?.message||'Could not create Business membership'},400)}
  if(role==='employee'){
   const {error:be}=await admin.from('business_wallet_balances').insert([{workspace_id:workspaceId,member_id:member.id,provider:'airtel_money',balance:0,currency:'MWK',status:'pending'},{workspace_id:workspaceId,member_id:member.id,provider:'mpamba',balance:0,currency:'MWK',status:'pending'}])
   if(be){await admin.from('business_members').delete().eq('id',member.id);await admin.auth.admin.deleteUser(userId);return out({error:be.message},400)}
  }
  try{await sendCredentialsEmail(email,name,username,password,role,workspace.name)}catch(e){await admin.from('business_wallet_balances').delete().eq('member_id',member.id);await admin.from('business_members').delete().eq('id',member.id);await admin.auth.admin.deleteUser(userId);return out({error:e instanceof Error?e.message:'Credential email failed'},503)}
  return out({success:true,workspace:workspace.name,role,username,emailSent:true})
 }catch(e){console.error('admin-create-business-user:',e);return out({error:e instanceof Error?e.message:'Unexpected server error'},500)}
})
