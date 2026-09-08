const MH_SUPABASE_URL = "https://cdqrdovgdidzxmyygoee.supabase.co";
const MH_SUPABASE_KEY = "sb_publishable_XHAK368Bg4dirFmtl229bQ_xzjCyqbv";
const supabaseClient = window.supabase.createClient(MH_SUPABASE_URL, MH_SUPABASE_KEY);
window.supabaseClient = supabaseClient;

// MalawiHub has three separate user areas:
// 1) Main Hub: public student tools/resources
// 2) Online Classes: student/teacher accounts only
// 3) Business Hub: registered business employees/employers only
// Authentication is shared at the Supabase project level, but access is
// explicitly checked by area so one area's account cannot enter another area's private pages.
(function enforceAreaRoutes(){
  const path = (location.pathname || "").toLowerCase();
  const isAdminPage = path.includes("/admin/");
  const isOnlineClass = path.includes("/online-class/");
  const isBusiness = path.includes("/business/");
  const isAdminLogin = path.endsWith("/admin/login.html") || path.endsWith("/admin/login");
  const isOnlineLanding = path.endsWith("/online-class/landing.html") || path.endsWith("/online-class/landing");
  const isStudentLogin = path.endsWith("/online-class/login.html") || path.endsWith("/online-class/login");
  const isTeacherPortal = path.endsWith("/online-class/teacher-portal.html") || path.endsWith("/online-class/teacher-portal");
  const isOnlineAdmin = path.endsWith("/online-class/admin.html") || path.endsWith("/online-class/admin");
  const isTeacherPrivate = /\/online-class\/(teacher|teacher-workspace)(\.html)?$/.test(path);
  const isStudentLive = path.endsWith("/online-class/index.html") || path.endsWith("/online-class/");
  const isBusinessLogin = path.endsWith("/business/index.html") || path.endsWith("/business/");
  const isBusinessPrivate = /\/business\/(employee|employer)(\.html)?$/.test(path);

  async function getProfile(userId){
    const {data,error}=await supabaseClient.from("profiles").select("role").eq("id",userId).maybeSingle();
    if(error) throw error;
    return data;
  }

  async function guard(){
    try{
      const {data:{session}}=await supabaseClient.auth.getSession();

      if(isAdminPage && !isAdminLogin){
        if(!session){location.replace("/admin/login.html");return}
        const profile=await getProfile(session.user.id);
        if(profile?.role!=="admin"){
          await supabaseClient.auth.signOut();
          location.replace("/admin/login.html?error=unauthorized");
        }
        return;
      }

      if(!isOnlineClass) return;
      if(isOnlineLanding || isStudentLogin || isTeacherPortal || isOnlineAdmin) return;

      if(isTeacherPrivate){
        if(!session){location.replace("/online-class/teacher-portal.html");return}
        const profile=await getProfile(session.user.id);
        if(profile?.role!=="teacher"){
          await supabaseClient.auth.signOut();
          location.replace("/online-class/teacher-portal.html?error=unauthorized");
        }
        return;
      }

      if(isStudentLive){
        if(!session){location.replace("/online-class/login.html?next=live");return}
        const profile=await getProfile(session.user.id);
        if(profile?.role!=="student"){
          await supabaseClient.auth.signOut();
          location.replace("/online-class/login.html?error=student_only");
        }
        return;
      }

      if(isBusinessPrivate){
        if(!session){location.replace("/business/index.html");return}
        const profile=await getProfile(session.user.id);
        if(profile?.role==="admin"){
          await supabaseClient.auth.signOut();
          location.replace("/business/index.html?error=business_only");
          return;
        }
        const {data:members,error}=await supabaseClient.from("business_members").select("role").eq("user_id",session.user.id).in("role",["employee","employer"]).limit(1);
        if(error || !members?.length){
          await supabaseClient.auth.signOut();
          location.replace("/business/index.html?error=business_only");
        }
      }
    }catch(error){
      console.error("MalawiHub area access verification failed:",error);
      if(isAdminPage && !isAdminLogin) location.replace("/admin/login.html?error=verification");
      else if(isTeacherPrivate) location.replace("/online-class/teacher-portal.html?error=verification");
      else if(isStudentLive) location.replace("/online-class/login.html?error=verification");
      else if(isBusinessPrivate) location.replace("/business/index.html?error=verification");
    }
  }

  guard();
})();

(function normalizeBusinessInviteUrl(){if(!location.pathname.includes("/business"))return;const hash=location.hash||"";if(!hash.startsWith("#invite="))return;const token=hash.slice("#invite=".length);if(!token)return;const url=new URL(location.href);url.hash="";url.searchParams.set("invite",token);history.replaceState(null,document.title,url.pathname+url.search)})();
(function loadBusinessBranding(){if(!location.pathname.includes("/business"))return;const s=document.createElement("script");s.src="../business/brand.js?v=2";s.defer=true;document.head.appendChild(s);const p=document.createElement("script");p.src="../business/app-polish.js?v=2";p.defer=true;document.head.appendChild(p)})();
async function updateMalawiHubLastSeen(){try{const {data:{user}}=await supabaseClient.auth.getUser();if(!user)return;await supabaseClient.from("profiles").upsert({id:user.id,email:user.email,last_seen:new Date().toISOString(),is_online:true})}catch(error){console.error("MalawiHub activity tracking error:",error)}}
async function fillOnlineClassCode(){const input=document.getElementById("code");const teacherButton=document.getElementById("teacherBtn");if(teacherButton)teacherButton.style.display="none";if(input){const params=new URLSearchParams(location.search);const code=params.get("code");if(code)input.value=code.trim().toUpperCase();if(params.get("teacher")==="1"){try{const {data:{user}}=await supabaseClient.auth.getUser();if(!user){alert("Teacher login required. Please use the private Teacher Portal.");location.href="./teacher-portal.html";return}const {data:profile,error}=await supabaseClient.from("profiles").select("role").eq("id",user.id).maybeSingle();if(error||profile?.role!=="teacher"){alert("Teacher access denied. Only registered MalawiHub teachers can open teacher classes.");location.href="./teacher-portal.html";return}if(teacherButton){teacherButton.click()}}catch(error){console.error("Teacher class access error:",error);alert("Could not verify teacher access. Please use the private Teacher Portal.");location.href="./teacher-portal.html"}}}}
window.updateMalawiHubLastSeen=updateMalawiHubLastSeen;if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",fillOnlineClassCode);else fillOnlineClassCode();