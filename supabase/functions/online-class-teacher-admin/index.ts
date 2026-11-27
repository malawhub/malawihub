import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS"};
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,"Content-Type":"application/json"}});
Deno.serve(async(req)=>{if(req.method==="OPTIONS")return new Response("ok",{headers:cors});try{const url=Deno.env.get("SUPABASE_URL"),key=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");if(!url||!key)return json({error:"Server configuration is missing"},500);const admin=createClient(url,key);const token=(req.headers.get("Authorization")||"").replace(/^Bearer\s+/i,"").trim();if(!token)return json({error:"Unauthorized"},401);const {data:{user},error:ue}=await admin.auth.getUser(token);if(ue||!user)return json({error:"Invalid session"},401);const {data:profile,error:pe}=await admin.from("profiles").select("role,can_register_students").eq("id",user.id).maybeSingle();if(pe)throw pe;
const {data:teacherArea,error:teacherAreaError}=await admin.from("user_area_roles").select("area").eq("user_id",user.id).eq("area","teacher").maybeSingle();if(teacherAreaError)throw teacherAreaError;
const {data:classAdmin,error:classAdminError}=await admin.from("online_class_admins").select("user_id").eq("user_id",user.id).maybeSingle();if(classAdminError)throw classAdminError;
const body=await req.json().catch(()=>({}));const action=body.action||"list";const isAdmin=profile?.role==="admin"||Boolean(classAdmin),isTeacher=teacherArea?.area==="teacher"||profile?.role==="teacher",isStudent=profile?.role==="student";if(!isAdmin&&!isTeacher&&!isStudent)return json({error:"Teacher, student or administrator access required"},403);
if(action==="create_class"){
  if(!isAdmin&&!isTeacher)return json({error:"Teacher access required"},403);
  const title=String(body.title||"").trim();
  const subject=String(body.subject||"").trim();
  const joinCode=String(body.join_code||"").trim().toUpperCase().replace(/[^A-Z0-9_-]/g,"").slice(0,32);
  const duration=Math.min(240,Math.max(5,Number(body.duration_minutes)||60));
  if(!title)return json({error:"Class title is required."},400);
  if(joinCode.length<5)return json({error:"A valid class code is required."},400);
  const {data:created,error:ce}=await admin.from("online_classes").insert({
    title,subject,join_code:joinCode,teacher_id:user.id,duration_minutes:duration,
    starts_at:new Date().toISOString(),status:"live"
  }).select("id,join_code,title,subject,teacher_id,duration_minutes,starts_at,status,created_at").single();
  if(ce){
    if(ce.code==="23505")return json({error:"That class code is already in use. Generate another code."},409);
    throw ce;
  }
  return json({ok:true,class:created});
}
if(action==="list_classes"){if(!isAdmin)return json({error:"Administrator access required"},403);const {data,error}=await admin.from("online_classes").select("id,join_code,title,subject,teacher_id,duration_minutes,starts_at,status,created_at").order("created_at",{ascending:false});if(error)throw error;return json({classes:data||[]});}
if(action==="start_class"){if(!isAdmin)return json({error:"Administrator access required"},403);const classId=String(body.class_id||"");const duration=Math.min(240,Math.max(5,Number(body.duration_minutes)||60));if(!classId)return json({error:"Class ID is required."},400);const startsAt=new Date().toISOString();const {data,error}=await admin.from("online_classes").update({duration_minutes:duration,status:"live",starts_at:startsAt}).eq("id",classId).select("id,join_code,title,subject,teacher_id,duration_minutes,starts_at,status").maybeSingle();if(error)throw error;if(!data)return json({error:"Class not found."},404);return json({ok:true,class:data});}
if(action==="end_class"){const classId=String(body.class_id||"");if(!classId)return json({error:"Class ID is required."},400);if(!isAdmin){if(!isTeacher)return json({error:"Teacher access required"},403);const {data:owned,error:oe}=await admin.from("online_classes").select("id").eq("id",classId).eq("teacher_id",user.id).maybeSingle();if(oe)throw oe;if(!owned)return json({error:"You can only end your own classes."},403);}const {data,error}=await admin.from("online_classes").update({status:"ended"}).eq("id",classId).select("id,join_code,title,subject,teacher_id,duration_minutes,starts_at,status").maybeSingle();if(error)throw error;if(!data)return json({error:"Class not found."},404);return json({ok:true,class:data});}
if(action==="list"){if(!isAdmin)return json({error:"Administrator access required"},403);const {data,error}=await admin.from("profiles").select("id,email,username,role,full_name,can_register_students,created_at").eq("role","teacher").order("created_at",{ascending:false});if(error)throw error;return json({teachers:data||[]});}
if(action==="unregister_self"){
  if(!isTeacher&&!isStudent&&!isAdmin)return json({error:"Only teacher or student accounts can unregister here."},403);
  if(isAdmin)return json({error:"Administrator accounts cannot be unregistered from this portal."},403);
  const targetId=user.id;
  if(isTeacher)await admin.from("online_classes").update({teacher_id:null}).eq("teacher_id",targetId);
  const {error:profileDeleteError}=await admin.from("profiles").delete().eq("id",targetId);
  if(profileDeleteError)throw profileDeleteError;
  const {error:deleteError}=await admin.auth.admin.deleteUser(targetId);
  if(deleteError)throw deleteError;
  return json({ok:true});
}
if(action==="find_student"){
  if(!isAdmin&&!isTeacher)return json({error:"Teacher access required"},403);
  if(!isAdmin&&!profile?.can_register_students)return json({error:"Student registration permission has not been granted to this teacher."},403);
  const classId=String(body.class_id||"");
  const identifier=String(body.identifier||"").trim().toLowerCase();
  if(!classId||!identifier)return json({error:"Class ID and exact student email or username are required."},400);
  const {data:ownedClass,error:classError}=await admin.from("online_classes").select("id,teacher_id").eq("id",classId).maybeSingle();
  if(classError)throw classError;
  if(!ownedClass)return json({error:"Class not found."},404);
  if(!isAdmin&&ownedClass.teacher_id!==user.id)return json({error:"You can only manage students in your own class."},403);
  let studentQuery=admin.from("profiles").select("id,email,username,full_name,role");
  studentQuery=identifier.includes("@")?studentQuery.eq("email",identifier):studentQuery.eq("username",identifier);
  const {data:student,error:studentError}=await studentQuery.maybeSingle();
  if(studentError)throw studentError;
  if(!student)return json({error:"No existing student account matches that email or username."},404);
  let isStudent=student.role==="student";
  if(!isStudent){
    const {data:studentArea,error:studentAreaError}=await admin.from("user_area_roles").select("area").eq("user_id",student.id).eq("area","student").maybeSingle();
    if(studentAreaError)throw studentAreaError;
    isStudent=studentArea?.area==="student";
  }
  if(!isStudent)return json({error:"The matching account is not registered for student access."},409);
  return json({student:{id:student.id,email:student.email||"",username:student.username||"",full_name:student.full_name||student.username||student.email||"Student"}});
}
if(action==="enroll_student"){
  if(!isAdmin&&!isTeacher)return json({error:"Teacher access required"},403);
  if(!isAdmin&&!profile?.can_register_students)return json({error:"Student registration permission has not been granted to this teacher."},403);
  const classId=String(body.class_id||""),studentId=String(body.student_id||"");
  if(!classId||!studentId)return json({error:"Class ID and student ID are required."},400);
  const {data:ownedClass,error:classError}=await admin.from("online_classes").select("id,teacher_id").eq("id",classId).maybeSingle();
  if(classError)throw classError;
  if(!ownedClass)return json({error:"Class not found."},404);
  if(!isAdmin&&ownedClass.teacher_id!==user.id)return json({error:"You can only enrol students in your own classes."},403);
  const {data:student,error:studentError}=await admin.from("profiles").select("id,role").eq("id",studentId).maybeSingle();
  if(studentError)throw studentError;
  if(!student)return json({error:"Student account not found."},404);
  let isStudent=student.role==="student";
  if(!isStudent){
    const {data:studentArea,error:studentAreaError}=await admin.from("user_area_roles").select("area").eq("user_id",studentId).eq("area","student").maybeSingle();
    if(studentAreaError)throw studentAreaError;
    isStudent=studentArea?.area==="student";
  }
  if(!isStudent)return json({error:"The selected account is not registered for student access."},409);
  const {data:enrollment,error:enrollmentError}=await admin.from("online_class_enrollments").upsert({
    class_id:classId,student_id:studentId,status:"active",invited_by:user.id,updated_by:user.id,updated_at:new Date().toISOString()
  },{onConflict:"class_id,student_id"}).select("id,status").single();
  if(enrollmentError)throw enrollmentError;
  return json({ok:true,enrollment});
}
if(action==="set_enrollment_status"){
  if(!isAdmin&&!isTeacher)return json({error:"Teacher access required"},403);
  if(!isAdmin&&!profile?.can_register_students)return json({error:"Student registration permission has not been granted to this teacher."},403);
  const classId=String(body.class_id||""),studentId=String(body.student_id||""),status=String(body.status||"");
  if(!classId||!studentId||!["suspended","removed"].includes(status))return json({error:"Class, student and a valid membership status are required."},400);
  const {data:ownedClass,error:classError}=await admin.from("online_classes").select("id,teacher_id").eq("id",classId).maybeSingle();
  if(classError)throw classError;
  if(!ownedClass)return json({error:"Class not found."},404);
  if(!isAdmin&&ownedClass.teacher_id!==user.id)return json({error:"You can only manage students in your own classes."},403);
  const {data:updated,error:updateError}=await admin.from("online_class_enrollments").update({status,updated_by:user.id,updated_at:new Date().toISOString()}).eq("class_id",classId).eq("student_id",studentId).select("id").maybeSingle();
  if(updateError)throw updateError;
  if(!updated)return json({error:"Student is not enrolled in this class."},404);
  return json({ok:true});
}
if(action==="list_class_students"){
  const classId=String(body.class_id||"");
  if(!classId)return json({error:"Class ID is required."},400);
  if(!isAdmin){
    if(!isTeacher)return json({error:"Teacher access required"},403);
    const {data:ownedClass,error:ownedClassError}=await admin.from("online_classes").select("id").eq("id",classId).eq("teacher_id",user.id).maybeSingle();
    if(ownedClassError)throw ownedClassError;
    if(!ownedClass)return json({error:"You can only view students enrolled in your own class."},403);
  }
  const {data:enrollments,error:ee}=await admin.from("online_class_enrollments").select("student_id,joined_at,status").eq("class_id",classId).order("joined_at",{ascending:true});
  if(ee)throw ee;
  const ids=(enrollments||[]).map((x:any)=>x.student_id).filter(Boolean);
  if(!ids.length)return json({students:[]});
  const {data:profiles,error:pe2}=await admin.from("profiles").select("id,email,username,full_name,role").in("id",ids);
  if(pe2)throw pe2;
  const byId=new Map((profiles||[]).map((p:any)=>[p.id,p]));
  const students=(enrollments||[]).map((e:any)=>{const p=byId.get(e.student_id);return {id:e.student_id,name:p?.full_name||p?.username||p?.email||"Student",email:p?.email||"",username:p?.username||"",joined_at:e.joined_at,status:e.status||"active"};}).filter((x:any)=>x.id);
  return json({students});
}
if(action==="list_students"){
  if(!isAdmin)return json({error:"Administrator access required"},403);
  const {data,error}=await admin.from("profiles").select("id,email,username,role,full_name,created_at").eq("role","student").order("created_at",{ascending:false});
  if(error)throw error;
  return json({students:data||[]});
}
if(action==="unregister_user"){
  if(!isAdmin)return json({error:"Administrator access required"},403);
  const targetId=String(body.user_id||"");
  const targetRole=String(body.role||"");
  if(!targetId||!["student","teacher"].includes(targetRole))return json({error:"Student or teacher account is required."},400);
  const {data:target,error:targetError}=await admin.from("profiles").select("id,role").eq("id",targetId).maybeSingle();
  if(targetError)throw targetError;
  if(!target||target.role!==targetRole)return json({error:"Account not found or role has changed."},404);
  if(targetRole==="teacher")await admin.from("online_classes").update({teacher_id:null}).eq("teacher_id",targetId);
  const {error:profileDeleteError}=await admin.from("profiles").delete().eq("id",targetId);
  if(profileDeleteError)throw profileDeleteError;
  const {error:deleteError}=await admin.auth.admin.deleteUser(targetId);
  if(deleteError)throw deleteError;
  return json({ok:true});
}
if(action==="register_teacher"){if(!isAdmin)return json({error:"Administrator access required"},403);const email=String(body.email||"").trim().toLowerCase(),password=String(body.password||""),name=String(body.name||"").trim();if(!email.includes("@"))return json({error:"Enter a valid teacher email."},400);if(password.length<8)return json({error:"Teacher password must be at least 8 characters."},400);const {data,error}=await admin.auth.admin.listUsers({page:1,perPage:1000});if(error)throw error;const found=(data.users||[]).find(u=>(u.email||"").toLowerCase()===email);if(found){const {data:existingProfile,error:ep}=await admin.from("profiles").select("role,full_name").eq("id",found.id).maybeSingle();if(ep)throw ep;const demoteAdminToTeacher=existingProfile?.role==="admin"&&email==="rasheedfoster05@gmail.com";if(existingProfile?.role==="admin"&&!demoteAdminToTeacher)return json({error:"Administrator accounts cannot be registered as teachers unless the administrator has specifically approved this account conversion."},409);const {error:e}=await admin.auth.admin.updateUserById(found.id,{password,user_metadata:{...(found.user_metadata||{}),full_name:name||existingProfile?.full_name||email,role:"teacher"}});if(e)throw e;if(demoteAdminToTeacher){const {error:roleError}=await admin.from("profiles").update({role:"teacher",full_name:name||existingProfile?.full_name||email,email}).eq("id",found.id);if(roleError)throw roleError;const {error:adminAreaError}=await admin.from("user_area_roles").delete().eq("user_id",found.id).eq("area","admin");if(adminAreaError)throw adminAreaError;}const {error:areaError}=await admin.from("user_area_roles").upsert({user_id:found.id,area:"teacher",display_name:name||existingProfile?.full_name||email},{onConflict:"user_id,area"});if(areaError)throw areaError;if(existingProfile?.role==="teacher")await admin.from("profiles").update({full_name:name||existingProfile.full_name||email}).eq("id",found.id);return json({ok:true,teacher:{id:found.id,email,role:"teacher",name:name||existingProfile?.full_name||email},existing:true,multi_area:!demoteAdminToTeacher&&existingProfile?.role!=="teacher",converted_from_admin:demoteAdminToTeacher});}const {data:created,error:ce}=await admin.auth.admin.createUser({email,password,email_confirm:true,user_metadata:{full_name:name||email}});if(ce||!created.user)throw ce||new Error("Could not create teacher account");const {error:pe3}=await admin.from("profiles").upsert({id:created.user.id,email,role:"teacher",full_name:name||email},{onConflict:"id"});if(pe3)throw pe3;return json({ok:true,teacher:{id:created.user.id,email,role:"teacher",name:name||email},existing:false});}
if(action==="set_student_registration"){if(!isAdmin)return json({error:"Administrator access required"},403);const teacherId=String(body.teacher_id||"");if(!teacherId)return json({error:"Teacher ID is required."},400);const {error}=await admin.from("profiles").update({can_register_students:Boolean(body.allowed)}).eq("id",teacherId).eq("role","teacher");if(error)throw error;return json({ok:true});}
if(action==="remove"){if(!isAdmin)return json({error:"Administrator access required"},403);const teacherId=String(body.teacher_id||"");if(!teacherId)return json({error:"Teacher ID is required."},400);await admin.from("online_classes").update({teacher_id:null}).eq("teacher_id",teacherId);const {error:profileDeleteError}=await admin.from("profiles").delete().eq("id",teacherId).eq("role","teacher");if(profileDeleteError)throw profileDeleteError;const {error:deleteError}=await admin.auth.admin.deleteUser(teacherId);if(deleteError)throw deleteError;return json({ok:true});}

if(action==="invite_student"){
  if(!isAdmin&&!isTeacher)return json({error:"Teacher access required"},403);
  if(!isAdmin&&!profile?.can_register_students)return json({error:"Student registration permission has not been granted to this teacher."},403);
  const classId=String(body.class_id||"").trim();
  const email=String(body.email||"").trim().toLowerCase();
  const fullName=String(body.full_name||"").trim();
  if(!classId||!/^\S+@\S+\.\S+$/.test(email))return json({error:"A class and valid student email are required."},400);
  if(fullName.length<2||fullName.length>120)return json({error:"Enter the student's full name (2–120 characters)."},400);
  const {data:ownedClass,error:classError}=await admin.from("online_classes").select("id,teacher_id,title").eq("id",classId).maybeSingle();
  if(classError)throw classError;
  if(!ownedClass)return json({error:"Class not found."},404);
  if(!isAdmin&&ownedClass.teacher_id!==user.id)return json({error:"You can only invite students to your own classes."},403);
  const {data:existingProfile,error:profileLookupError}=await admin.from("profiles").select("id,role").eq("email",email).maybeSingle();
  if(profileLookupError)throw profileLookupError;
  if(existingProfile)return json({error:"A MalawiHub account already uses this email. Use Add Existing Student instead."},409);
  const {data:authUsers,error:authUsersError}=await admin.auth.admin.listUsers({page:1,perPage:1000});
  if(authUsersError)throw authUsersError;
  if((authUsers.users||[]).some((u:any)=>(u.email||"").toLowerCase()===email))return json({error:"An account already exists for this email. Ask the student to use their existing login, then add them to the class."},409);
  const raw=new Uint8Array(32);crypto.getRandomValues(raw);
  const token=Array.from(raw).map((b)=>b.toString(16).padStart(2,"0")).join("");
  const digest=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(token));
  const tokenHash=Array.from(new Uint8Array(digest)).map((b)=>b.toString(16).padStart(2,"0")).join("");
  const {error:clearError}=await admin.from("online_class_student_invitations").delete().eq("class_id",classId).eq("email",email).eq("status","pending");
  if(clearError)throw clearError;
  const {data:invitation,error:insertError}=await admin.from("online_class_student_invitations").insert({
    class_id:classId,email,full_name:fullName,invited_by:user.id,token_hash:tokenHash,
    expires_at:new Date(Date.now()+7*24*60*60*1000).toISOString(),status:"pending"
  }).select("id").single();
  if(insertError)throw insertError;
  const redirectTo="https://malawihub.pages.dev/online-class/student-activate.html?token="+encodeURIComponent(token);
  const {data:invited,error:inviteError}=await admin.auth.admin.inviteUserByEmail(email,{
    data:{full_name:fullName,invitation_id:invitation.id},
    redirectTo
  });
  if(inviteError||!invited.user){
    await admin.from("online_class_student_invitations").delete().eq("id",invitation.id);
    return json({error:inviteError?.message||"Could not send the student invitation email."},400);
  }
  return json({ok:true,expires_in_days:7,message:"Invitation sent. The student must open the email and verify the address before classroom access is activated."});
}
if(action==="redeem_student_invitation"){
  const token=String(body.token||"").trim().toLowerCase();
  if(!user.email||!user.email_confirmed_at)return json({error:"Verify your email address using the invitation email before activating student access."},403);
  if(!/^[a-f0-9]{64}$/.test(token))return json({error:"The invitation link is invalid. Ask your teacher to send a new one."},400);
  const digest=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(token));
  const tokenHash=Array.from(new Uint8Array(digest)).map((b)=>b.toString(16).padStart(2,"0")).join("");
  const {data:invitation,error:invitationError}=await admin.from("online_class_student_invitations")
    .select("id,class_id,email,full_name,invited_by,expires_at,status")
    .eq("token_hash",tokenHash).maybeSingle();
  if(invitationError)throw invitationError;
  if(!invitation||invitation.email.toLowerCase()!==(user.email||"").toLowerCase())return json({error:"This invitation does not belong to the signed-in email address."},403);
  if(invitation.status==="accepted")return json({ok:true,already_activated:true});
  if(invitation.status!=="pending"||new Date(invitation.expires_at).getTime()<Date.now())return json({error:"This invitation has expired or has already been cancelled. Ask your teacher to send a new one."},410);
  const {data:existingProfile,error:existingProfileError}=await admin.from("profiles").select("role").eq("id",user.id).maybeSingle();
  if(existingProfileError)throw existingProfileError;
  if(existingProfile&&["admin","teacher"].includes(existingProfile.role||""))return json({error:"This account already has a different portal role. Contact MalawiHub support."},409);
  const {error:profileUpsertError}=await admin.from("profiles").upsert({
    id:user.id,email:user.email,role:"student",full_name:invitation.full_name
  },{onConflict:"id"});
  if(profileUpsertError)throw profileUpsertError;
  const {error:areaUpsertError}=await admin.from("user_area_roles").upsert({
    user_id:user.id,area:"student",display_name:invitation.full_name
  },{onConflict:"user_id,area"});
  if(areaUpsertError)throw areaUpsertError;
  const {error:enrollmentError}=await admin.from("online_class_enrollments").upsert({
    class_id:invitation.class_id,student_id:user.id,status:"active",invited_by:invitation.invited_by,
    updated_by:user.id,updated_at:new Date().toISOString()
  },{onConflict:"class_id,student_id"});
  if(enrollmentError)throw enrollmentError;
  const {error:acceptedError}=await admin.from("online_class_student_invitations").update({
    status:"accepted",accepted_by:user.id,accepted_at:new Date().toISOString()
  }).eq("id",invitation.id).eq("status","pending");
  if(acceptedError)throw acceptedError;
  return json({ok:true,class_id:invitation.class_id,message:"Student access is active. You can now sign in to Online Class."});
}

if(action==="register_student"){return json({error:"Direct student account creation is disabled. Add an existing student from the class management page. New-student invitations will use a verified activation process."},410);}
if(action==="delete_class"){return json({error:"Permanent class deletion is disabled to protect attendance, submissions and learning records. End the class instead."},410);}
return json({error:"Unknown action"},400);}catch(e){console.error("online-class-teacher-admin",e);return json({error:e instanceof Error?e.message:"Server error"},500)}});