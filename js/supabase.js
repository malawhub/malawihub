const MH_SUPABASE_URL = "https://cdqrdovgdidzxmyygoee.supabase.co";
const MH_SUPABASE_KEY = "sb_publishable_XHAK368Bg4dirFmtl229bQ_xzjCyqbv";
const supabaseClient = window.supabase.createClient(MH_SUPABASE_URL, MH_SUPABASE_KEY);
window.supabaseClient = supabaseClient;

// MalawiHub has separate areas:
// 1) Main Hub: public student tools/resources
// 2) Online Classes: public landing only
// 3) Student Portal: registered students only
// 4) Teacher Portal: registered teachers only
// 5) Business Hub: registered business employees/employers only
// 6) Admin Hub: administrators only
(function enforceAreaRoutes(){
  const path = (location.pathname || "").toLowerCase();
  const isAdminPage = path.includes("/admin/");
  const isBusinessAdminUsers = path.endsWith("/admin/business-users.html") || path.endsWith("/admin/business-users");
  const isOnlineClass = path.includes("/online-class/");
  const isOnlineAdmin = path.endsWith("/online-class/admin.html") || path.endsWith("/online-class/admin");
  const isBusinessPrivate = /\/business\/(employee|employer)(\.html)?$/.test(path);
  const isBusinessUserEntry = path === "/business/users/" || path.endsWith("/business/users/index.html") || path.endsWith("/business/users");
  const isAdminLogin = path.endsWith("/admin/login.html") || path.endsWith("/admin/login");
  const isOnlineLanding = path.endsWith("/online-class/landing.html") || path.endsWith("/online-class/landing") || path === "/online-classes/" || path.endsWith("/online-classes/index.html");
  const isStudentLogin = path.endsWith("/online-class/login.html") || path.endsWith("/online-class/login") || path === "/student-portal/" || path.endsWith("/student-portal/index.html");
  const isStudentPortalPrivate = path.endsWith("/student-portal/classroom.html") || path.endsWith("/student-portal/classroom");
  const isTeacherPortalLogin = path === "/teacher-portal/" || path.endsWith("/teacher-portal/index.html");
  const isTeacherPortalPrivate = path.endsWith("/teacher-portal/dashboard.html") || path.endsWith("/teacher-portal/dashboard");
  const isTeacherPortalLegacyEntry = path.endsWith("/online-class/teacher-portal.html") || path.endsWith("/online-class/teacher-portal");
  const isTeacherPrivate = /\/online-class\/(teacher|teacher-workspace)(\.html)?$/.test(path);
  const isStudentLive = path.endsWith("/online-class/index.html") || path.endsWith("/online-class/");

  async function getProfile(userId){
    const {data,error}=await supabaseClient.from("profiles").select("role").eq("id",userId).maybeSingle();
    if(error) throw error;
    return data;
  }

  async function requireRole(role, loginUrl){
    const {data:{session}}=await supabaseClient.auth.getSession();
    if(!session){location.replace(loginUrl);return false}
    const profile=await getProfile(session.user.id);
    if(profile?.role!==role){
      await supabaseClient.auth.signOut();
      location.replace(loginUrl+"?error="+encodeURIComponent(role+"_only"));
      return false;
    }
    return true;
  }

  async function guard(){
    try{
      const {data:{session}}=await supabaseClient.auth.getSession();

      // Business Users has its own login/session flow.
      if(isBusinessAdminUsers || isBusinessUserEntry) return;

      if(isAdminPage && !isAdminLogin){
        if(!session){location.replace("/admin/login.html");return}
        const profile=await getProfile(session.user.id);
        if(profile?.role!=="admin"){
          await supabaseClient.auth.signOut();
          location.replace("/admin/login.html?error=unauthorized");
        }
        return;
      }

      if(isOnlineAdmin){
        if(!session){location.replace("/admin/login.html?area=online-class");return}
        const profile=await getProfile(session.user.id);
        if(profile?.role!=="admin"){
          await supabaseClient.auth.signOut();
          location.replace("/admin/login.html?error=unauthorized&area=online-class");
        }
        return;
      }

      if(isBusinessPrivate){
        if(!session){location.replace("/business/users/");return}
        const profile=await getProfile(session.user.id);
        if(profile?.role==="admin" || profile?.role==="student" || profile?.role==="teacher"){
          await supabaseClient.auth.signOut();
          location.replace("/business/users/?error=business_only");
          return;
        }
        const {data:members,error}=await supabaseClient.from("business_members").select("role").eq("user_id",session.user.id).in("role",["employee","employer"]).limit(1);
        if(error || !members?.length){
          await supabaseClient.auth.signOut();
          location.replace("/business/users/?error=business_only");
        }
        return;
      }

      if(isTeacherPortalPrivate){await requireRole("teacher","/teacher-portal/");return}
      if(isStudentPortalPrivate){await requireRole("student","/student-portal/");return}

      if(!isOnlineClass) return;
      if(isOnlineLanding || isStudentLogin || isTeacherPortalLogin) return;

      if(isTeacherPrivate || isTeacherPortalLegacyEntry){
        if(!session){location.replace("/teacher-portal/");return}
        const profile=await getProfile(session.user.id);
        if(profile?.role!=="teacher"){
          await supabaseClient.auth.signOut();
          location.replace("/teacher-portal/?error=teacher_only");
        }
        return;
      }

      if(isStudentLive){
        if(!session){location.replace("/student-portal/?next=live");return}
        const profile=await getProfile(session.user.id);
        if(profile?.role!=="student"){
          await supabaseClient.auth.signOut();
          location.replace("/student-portal/?error=student_only");
        }
      }
    }catch(error){
      console.error("MalawiHub area access verification failed:",error);
      if(isBusinessAdminUsers || isBusinessUserEntry) return;
      if(isAdminPage && !isAdminLogin) location.replace("/admin/login.html?error=verification");
      else if(isOnlineAdmin) location.replace("/admin/login.html?error=verification");
      else if(isBusinessPrivate) location.replace("/business/users/?error=verification");
      else if(isTeacherPortalPrivate) location.replace("/teacher-portal/?error=verification");
      else if(isStudentPortalPrivate) location.replace("/student-portal/?error=verification");
      else if(isTeacherPrivate) location.replace("/teacher-portal/?error=verification");
      else if(isStudentLive) location.replace("/student-portal/?error=verification");
    }
  }

  guard();
})();

(function normalizeBusinessInviteUrl(){if(!location.pathname.includes("/business"))return;const hash=location.hash||"";if(!hash.startsWith("#invite="))return;const token=hash.slice("#invite=".length);if(!token)return;const url=new URL(location.href);url.hash="";url.searchParams.set("invite",token);history.replaceState(null,document.title,url.pathname+url.search)})();
(function loadBusinessBranding(){if(!location.pathname.includes("/business"))return;const s=document.createElement("script");s.src="../business/brand.js?v=2";s.defer=true;document.head.appendChild(s);const p=document.createElement("script");p.src="../business/app-polish.js?v=2";p.defer=true;document.head.appendChild(p)})();
async function updateMalawiHubLastSeen(){try{const {data:{user}}=await supabaseClient.auth.getUser();if(!user)return;await supabaseClient.from("profiles").upsert({id:user.id,email:user.email,last_seen:new Date().toISOString(),is_online:true})}catch(error){console.error("MalawiHub activity tracking error:",error)}}
async function fillOnlineClassCode(){const input=document.getElementById("code");const teacherButton=document.getElementById("teacherBtn");if(teacherButton)teacherButton.style.display="none";if(input){const params=new URLSearchParams(location.search);const code=params.get("code");if(code)input.value=code.trim().toUpperCase();if(params.get("teacher")==="1"){try{const {data:{user}}=await supabaseClient.auth.getUser();if(!user){alert("Teacher login required. Please use the private Teacher Portal.");location.href="/teacher-portal/";return}const {data:profile,error}=await supabaseClient.from("profiles").select("role").eq("id",user.id).maybeSingle();if(error||profile?.role!=="teacher"){alert("Teacher access denied. Only registered MalawiHub teachers can open teacher classes.");location.href="/teacher-portal/";return}if(teacherButton){teacherButton.click()}}catch(error){console.error("Teacher class access error:",error);alert("Could not verify teacher access. Please use the private Teacher Portal.");location.href="/teacher-portal/"}}}}
window.updateMalawiHubLastSeen=updateMalawiHubLastSeen;if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",fillOnlineClassCode);else fillOnlineClassCode();