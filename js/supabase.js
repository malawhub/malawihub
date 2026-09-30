const MH_SUPABASE_URL="https://cdqrdovgdidzxmyygoee.supabase.co";
const MH_SUPABASE_KEY="sb_publishable_XHAK368Bg4dirFmtl229bQ_xzjCyqbv";
const supabaseClient=window.supabase.createClient(MH_SUPABASE_URL,MH_SUPABASE_KEY);
window.supabaseClient=supabaseClient;

(function enforceAreaRoutes(){
 const path=(location.pathname||"").toLowerCase(),params=new URLSearchParams(location.search),adminFrame=document.referrer.includes("/admin/administrator-classroom.html");
 const adminPage=path.includes("/admin/"),adminLogin=path.endsWith("/admin/login.html")||path.endsWith("/admin/login");
 const online=path.includes("/online-class/"),onlineAdmin=path.endsWith("/online-class/admin.html")||path.endsWith("/online-class/admin");
 const onlineLanding=path.endsWith("/online-class/landing.html")||path.endsWith("/online-class/landing")||path==="/online-classes/"||path.endsWith("/online-classes/index.html");
 const studentLogin=path.endsWith("/online-class/login.html")||path.endsWith("/online-class/login")||path==="/student-portal/"||path.endsWith("/student-portal/index.html");
 const teacherLogin=path==="/teacher-portal/"||path.endsWith("/teacher-portal/index.html");
 const teacherPrivate=/\/online-class\/(teacher|teacher-workspace)(\.html)?$/.test(path)||path.endsWith("/online-class/teacher-portal.html")||path.endsWith("/online-class/teacher-portal");
 const teacherDashboard=path.endsWith("/teacher-portal/dashboard.html")||path.endsWith("/teacher-portal/dashboard");
 const studentPrivate=path.endsWith("/student-portal/classroom.html")||path.endsWith("/student-portal/classroom");
 const studentLive=path.endsWith("/online-class/index.html")||path.endsWith("/online-class/");
 const businessAdminUsers=path.endsWith("/admin/business-users.html")||path.endsWith("/admin/business-users");
 const businessEntry=path==="/business/users/"||path.endsWith("/business/users/index.html")||path.endsWith("/business/users");
 const businessPrivate=/\/business\/(employee|employer)(\.html)?$/.test(path);
 async function profile(id){const r=await supabaseClient.from("profiles").select("role").eq("id",id).maybeSingle();if(r.error)throw r.error;return r.data}
 async function session(){const r=await supabaseClient.auth.getSession();return r.data?.session||null}
 async function guard(){
  try{
   const s=await session();
   if(businessAdminUsers||businessEntry)return;
   if(adminPage&&!adminLogin){if(!s){location.replace("/admin/login.html");return}const p=await profile(s.user.id);if(p?.role!=="admin"){await supabaseClient.auth.signOut();location.replace("/admin/login.html?error=unauthorized")}return}
   if(onlineAdmin){if(!s){location.replace("/admin/login.html?area=online-class");return}const p=await profile(s.user.id);if(p?.role!=="admin"){await supabaseClient.auth.signOut();location.replace("/admin/login.html?error=unauthorized&area=online-class")}return}
   if(businessPrivate){if(!s){location.replace("/business/users/");return}const p=await profile(s.user.id);if(["admin","student","teacher"].includes(p?.role)){await supabaseClient.auth.signOut();location.replace("/business/users/?error=business_only");return}const m=await supabaseClient.from("business_members").select("role").eq("user_id",s.user.id).in("role",["employee","employer"]).limit(1);if(m.error||!m.data?.length){await supabaseClient.auth.signOut();location.replace("/business/users/?error=business_only")}return}
   if(teacherDashboard){if(!s){location.replace("/teacher-portal/");return}const p=await profile(s.user.id);if(p?.role!=="teacher"&&p?.role!=="admin"){await supabaseClient.auth.signOut();location.replace("/teacher-portal/?error=teacher_only")}return}
   if(studentPrivate){if(!s){location.replace("/student-portal/");return}const p=await profile(s.user.id);if(p?.role!=="student"){await supabaseClient.auth.signOut();location.replace("/student-portal/?error=student_only")}return}
   if(!online||onlineLanding||studentLogin||teacherLogin)return;
   if(teacherPrivate){if(!s){location.replace("/teacher-portal/");return}const p=await profile(s.user.id);if(p?.role!=="teacher"&&p?.role!=="admin"){await supabaseClient.auth.signOut();location.replace("/teacher-portal/?error=teacher_only")}return}
   if(studentLive){const teacherLaunch=params.get("teacher")==="1";const adminLaunch=adminFrame||params.get("mode")==="admin"||params.get("admin")==="1"||params.get("role")==="admin"||location.hash==="#admin";if(adminLaunch)return;if(!s){location.replace("/student-portal/?next=live");return}const p=await profile(s.user.id);if(teacherLaunch&&(p?.role==="teacher"||p?.role==="admin"))return;if(!teacherLaunch&&p?.role!=="student"){await supabaseClient.auth.signOut();location.replace("/student-portal/?error=student_only")}}
  }catch(e){console.error("MalawiHub area access verification failed:",e);const liveAdmin=params.get("mode")==="admin"||params.get("admin")==="1"||params.get("role")==="admin"||location.hash==="#admin";const liveTeacher=params.get("teacher")==="1";if(adminPage&&!adminLogin)location.replace("/admin/login.html?error=verification");else if(onlineAdmin)location.replace("/admin/login.html?error=verification");else if(businessPrivate)location.replace("/business/users/?error=verification");else if(teacherPrivate||teacherDashboard)location.replace("/teacher-portal/?error=verification");else if(studentPrivate)location.replace("/student-portal/?error=verification");else if(studentLive&&!liveAdmin&&!liveTeacher)location.replace("/student-portal/?error=verification")}
 }
 guard();
})();

(function normalizeBusinessInviteUrl(){if(!location.pathname.includes("/business"))return;const h=location.hash||"";if(!h.startsWith("#invite="))return;const t=h.slice(8);if(!t)return;const u=new URL(location.href);u.hash="";u.searchParams.set("invite",t);history.replaceState(null,document.title,u.pathname+u.search)})();
(function loadBusinessBranding(){if(!location.pathname.includes("/business"))return;const s=document.createElement("script");s.src="../business/brand.js?v=2";s.defer=true;document.head.appendChild(s);const p=document.createElement("script");p.src="../business/app-polish.js?v=2";p.defer=true;document.head.appendChild(p)})();
async function updateMalawiHubLastSeen(){
 try{
  const {data:{user}}=await supabaseClient.auth.getUser();
  if(!user)return;
  await supabaseClient.from("profiles").update({last_seen:new Date().toISOString(),is_online:true}).eq("id",user.id);
 }catch(e){console.error("MalawiHub activity tracking error:",e)}
}
async function trackMalawiHubVisitor(){
 try{
  const key="malawihub_visitor_id";
  let visitorId=localStorage.getItem(key);
  if(!visitorId){
   visitorId=(crypto.randomUUID?crypto.randomUUID():Date.now()+"-"+Math.random().toString(36).slice(2));
   localStorage.setItem(key,visitorId);
  }
  await fetch(MH_SUPABASE_URL+"/functions/v1/track-visitor",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({visitorId,path:location.pathname})});
 }catch(e){console.debug("MalawiHub visitor tracking unavailable:",e)}
}
(async function startMalawiHubActivityTracking(){
 const path=(location.pathname||"").toLowerCase();
 let isAdmin=false;
 try{
  const {data:{user}}=await supabaseClient.auth.getUser();
  if(user){
   const {data:profile}=await supabaseClient.from("profiles").select("role").eq("id",user.id).maybeSingle();
   isAdmin=profile?.role==="admin";
  }
 }catch(e){console.debug("MalawiHub role check unavailable:",e)}
 if(!isAdmin)await trackMalawiHubVisitor();
 const beat=()=>updateMalawiHubLastSeen();
 beat();
 setInterval(beat,2*60*1000);
 document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible")beat()});
})();
async function fillOnlineClassCode(){
 const input=document.getElementById("code"),teacherButton=document.getElementById("teacherBtn"),params=new URLSearchParams(location.search),studentView=params.get("student")==="1";
 if(teacherButton)teacherButton.style.display="none";
 const mainHubLink=document.querySelector('.top a[href="../index.html"]');if(studentView&&mainHubLink)mainHubLink.style.display="none";
 if(!input)return;
 const code=params.get("code");if(code)input.value=code.trim().toUpperCase();
 if(params.get("teacher")!=="1")return;
 try{const {data:{user}}=await supabaseClient.auth.getUser();if(!user){alert("Teacher or administrator login required. Please use the private portal.");location.href="/teacher-portal/";return}const {data:p,error}=await supabaseClient.from("profiles").select("role").eq("id",user.id).maybeSingle();if(error||!p||(p.role!=="teacher"&&p.role!=="admin")){alert("Teacher access denied. Only registered teachers or administrators can open teacher classes.");location.href=p?.role==="admin"?"/admin/":"/teacher-portal/";return}if(teacherButton)teacherButton.click()}catch(e){console.error("Teacher class access error:",e);alert("Could not verify teacher access. Please use the private portal.");location.href="/teacher-portal/"} 
}
window.updateMalawiHubLastSeen=updateMalawiHubLastSeen;
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",fillOnlineClassCode);else fillOnlineClassCode();
// Administrator classroom routing deployment marker: 2026-09-21-admin6
// Admin live-class guard fix: never redirect administrator launches to Student Portal.
// Activity and visitor tracking deployment marker: 2026-09-27-stats1

// Student workspace loader: 2026-09-30
(function(){const p=(location.pathname||"").toLowerCase();if(!p.endsWith("/online-class/index.html")&&!p.endsWith("/online-class/"))return;const q=new URLSearchParams(location.search);if(q.get("student")!=="1"&&q.get("role")!=="student"&&sessionStorage.getItem("malawihub_student_portal")!=="1")return;const s=document.createElement("script");s.src="../js/student-workspace.js?v=20260930";s.defer=true;document.head.appendChild(s)})();
