import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS"}
const out=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...corsHeaders,"Content-Type":"application/json"}})
const clean=(v:unknown)=>String(v??'').trim()

Deno.serve(async(req)=>{
  if(req.method==='OPTIONS')return new Response('ok',{headers:corsHeaders})
  if(req.method!=='POST')return out({error:'Method not allowed'},405)
  try{
    const token=clean(req.headers.get('Authorization')).replace(/^Bearer\s+/i,'').trim()
    if(!token)return out({error:'Authentication required'},401)
    const url=Deno.env.get('SUPABASE_URL')||'',service=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||''
    if(!url||!service)throw new Error('Supabase server configuration is missing')
    const admin=createClient(url,service)
    const {data:{user},error:ae}=await admin.auth.getUser(token)
    if(ae||!user)return out({error:'Invalid session'},401)
    const {data:profile,error:pe}=await admin.from('profiles').select('role').eq('id',user.id).maybeSingle()
    if(pe)throw pe
    if(profile?.role!=='admin')return out({error:'Administrator access required'},403)

    const b=await req.json()
    const email=clean(b.email).toLowerCase()
    const username=clean(b.username).toLowerCase()
    if(!email&&!username)return out({error:'Enter the Business user email or username'},400)

    const {data:members,error:me}=await admin.from('business_members').select('id,user_id,workspace_id,display_name,login_username,role').limit(1000)
    if(me)throw me
    let member:any=null
    if(username)member=(members||[]).find((m:any)=>clean(m.login_username).toLowerCase()===username)
    if(!member&&email){
      for(const m of (members||[])){
        const {data:au}=await admin.auth.admin.getUserById(m.user_id)
        if(String(au?.user?.email||'').toLowerCase()===email){member=m;break}
      }
    }
    if(!member)return out({error:'Business user was not found'},404)

    const {data:authTarget,error:ate}=await admin.auth.admin.getUserById(member.user_id)
    if(ate||!authTarget?.user)return out({error:'Business Auth account could not be found'},404)
    const tagged=Boolean(authTarget.user.user_metadata?.business_login_username)
    if(!tagged)return out({error:'This account is not marked as a Business-only account. It was not deleted.'},409)

    const {data:otherMembers,error:oe}=await admin.from('business_members').select('id').eq('user_id',member.user_id).neq('id',member.id)
    if(oe)throw oe
    if((otherMembers||[]).length>0)return out({error:'This Business identity has another Business membership. Remove the other Business membership first.'},409)

    const {error:deleteMemberError}=await admin.from('business_members').delete().eq('id',member.id)
    if(deleteMemberError)throw deleteMemberError

    const {error:deleteAuthError}=await admin.auth.admin.deleteUser(member.user_id)
    if(deleteAuthError){
      await admin.from('business_members').insert({id:member.id,user_id:member.user_id,workspace_id:member.workspace_id,display_name:member.display_name,login_username:member.login_username,role:member.role})
      throw deleteAuthError
    }

    return out({success:true,email:authTarget.user.email||email||null,username:member.login_username,display_name:member.display_name,message:'Business user was unregistered and the Business Auth identity was removed. Main Hub and Online Class accounts are not converted or reused.'})
  }catch(e){
    console.error('admin-delete-business-user:',e)
    return out({error:e instanceof Error?e.message:'Unexpected error'},500)
  }
})
