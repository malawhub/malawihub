import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {"Access-Control-Allow-Origin":"*", "Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type"};
const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), {status, headers:{...cors,"Content-Type":"application/json"}});
const str = (v: unknown) => String(v ?? "").trim();
const arr = (v: unknown) => Array.isArray(v) ? v : [];
const num = (v: unknown, d = 0) => Number.isFinite(Number(v)) ? Number(v) : d;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", {headers:cors});
  try {
    const url = Deno.env.get("SUPABASE_URL"), key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !key) return reply({error:"Server configuration is missing."},500);
    const admin = createClient(url,key);
    const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i,"").trim();
    if (!token) return reply({error:"Please sign in."},401);
    const {data:{user},error:authError} = await admin.auth.getUser(token);
    if (authError || !user) return reply({error:"Your session has expired. Please sign in again."},401);
    const {data:profile,error:profileError} = await admin.from("profiles").select("role").eq("id",user.id).maybeSingle();
    if(profileError) throw profileError;
    const {data:teacherArea,error:teacherAreaError}=await admin.from("user_area_roles").select("area").eq("user_id",user.id).eq("area","teacher").maybeSingle();if(teacherAreaError)throw teacherAreaError;
    const role = profile?.role || user.user_metadata?.role || "";
    const body = await req.json().catch(()=>({}));
    const action = str(body.action || "list");
    const assessmentId = str(body.assessment_id);
    const classId = str(body.class_id);
    const code = str(body.join_code).toUpperCase();
    const getClass = async (id:string, joinCode:string) => {
      let q=admin.from("online_classes").select("id,teacher_id,title,subject,join_code,status").limit(1);
      if(id) q=q.eq("id",id); else if(joinCode) q=q.eq("join_code",joinCode); else return null;
      const {data,error}=await q.maybeSingle(); if(error)throw error; return data;
    };
    const cls = (action==="list" || action==="create" || action==="submit" || action==="mark" || action==="close" || action==="get") ? await getClass(classId,code) : null;
    if(["list","create","submit","mark","close","get"].includes(action) && !cls && !assessmentId) return reply({error:"Class not found. Open the class assessment link again."},404);
    const isAdmin = role==="admin";
    const isTeacher = role==="teacher" || teacherArea?.area==="teacher" || isAdmin;
    if(action==="create"){
      if(!isTeacher) return reply({error:"Teacher access required."},403);
      if(!cls || (!isAdmin && cls.teacher_id!==user.id)) return reply({error:"You can only create assessments for your own class."},403);
      const title=str(body.title), type=str(body.assessment_type), questions=arr(body.questions);
      if(title.length<2) return reply({error:"Enter an assessment title."},400);
      if(!["assignment","exam"].includes(type)) return reply({error:"Choose assignment or exam."},400);
      if(!questions.length) return reply({error:"Add at least one question."},400);
      const clean=questions.map((q:any)=>({prompt:str(q.prompt),type:["short","long","mcq","truefalse"].includes(q.type)?q.type:"short",options:arr(q.options).map(str).filter(Boolean).slice(0,8),answer:str(q.answer),marks:Math.max(0,num(q.marks,1))}));
      if(clean.some((q:any)=>!q.prompt||q.marks<=0)) return reply({error:"Every question needs wording and marks greater than zero."},400);
      if(clean.some((q:any)=>q.type==="mcq" && (q.options.length<2 || !q.options.includes(q.answer)))) return reply({error:"For each multiple-choice question, add at least two options and select a correct answer."},400);
      const total=clean.reduce((s:number,q:any)=>s+q.marks,0);
      const due=str(body.due_at);
      const {data,error}=await admin.from("teacher_assessments").insert({teacher_id:user.id,class_id:cls.id,title,subject:str(body.subject)||cls.subject||"",assessment_type:type,instructions:str(body.instructions),questions:clean,total_marks:total,due_at:due||null,duration_minutes:type==="exam"?Math.max(1,Math.min(300,num(body.duration_minutes,60))):null,status:body.status==="draft"?"draft":"published"}).select("*").single();
      if(error)throw error;
      return reply({ok:true,assessment:publicAssessment(data,true)});
    }
    if(action==="list"){
      if(!cls) return reply({error:"Class not found."},404);
      let q=admin.from("teacher_assessments").select("*").eq("class_id",cls.id).order("created_at",{ascending:false});
      if(!isTeacher) {
        if(role!=="student") return reply({error:"Student or teacher access required."},403);
        const {data:enrollment,error}=await admin.from("online_class_enrollments").select("student_id").eq("class_id",cls.id).eq("student_id",user.id).maybeSingle();
        if(error)throw error;
        if(!enrollment) return reply({error:"Join this class with your student account before opening its assessments."},403);
        q=q.eq("status","published");
      } else if(!isAdmin && cls.teacher_id!==user.id) return reply({error:"You can only view assessments for your own class."},403);
      const {data,error}=await q; if(error)throw error;
      const ids=(data||[]).map((a:any)=>a.id);
      let submissions:any[]=[];
      if(isTeacher && ids.length){const {data:s,error:se}=await admin.from("teacher_assessment_submissions").select("assessment_id,student_id,submitted_at,marks_awarded,graded_at").in("assessment_id",ids);if(se)throw se;submissions=s||[];}
      return reply({assessments:(data||[]).map((a:any)=>({...publicAssessment(a,isTeacher),submission_count:submissions.filter((s:any)=>s.assessment_id===a.id).length,graded_count:submissions.filter((s:any)=>s.assessment_id===a.id&&s.graded_at).length}))});
    }
    if(action==="get"){
      let q=admin.from("teacher_assessments").select("*").eq("id",assessmentId||str(body.id));
      const {data:a,error}=await q.maybeSingle();if(error)throw error;if(!a)return reply({error:"Assessment not found."},404);
      const {data:c,error:ce}=await admin.from("online_classes").select("id,teacher_id,title,join_code").eq("id",a.class_id).maybeSingle();if(ce)throw ce;
      if(!c)return reply({error:"Class not found."},404);
      if(isTeacher){if(!isAdmin&&c.teacher_id!==user.id)return reply({error:"Teacher access required for this class."},403);}
      else {if(role!=="student"||a.status!=="published")return reply({error:"This assessment is not available."},403);const {data:e,error:ee}=await admin.from("online_class_enrollments").select("student_id").eq("class_id",c.id).eq("student_id",user.id).maybeSingle();if(ee)throw ee;if(!e)return reply({error:"Join this class before opening its assessment."},403);}
      let submission=null;
      if(role==="student"){const {data:s,error:se}=await admin.from("teacher_assessment_submissions").select("id,answers,submitted_at,marks_awarded,feedback,graded_at,question_marks").eq("assessment_id",a.id).eq("student_id",user.id).maybeSingle();if(se)throw se;submission=s;}
      return reply({assessment:publicAssessment(a,isTeacher),submission});
    }
    if(action==="submit"){
      if(role!=="student")return reply({error:"Student account required."},403);
      if(!cls)return reply({error:"Class not found."},404);
      const {data:a,error:ae}=await admin.from("teacher_assessments").select("*").eq("id",assessmentId).eq("class_id",cls.id).eq("status","published").maybeSingle();if(ae)throw ae;if(!a)return reply({error:"This assessment is not open."},404);
      const {data:e,error:ee}=await admin.from("online_class_enrollments").select("student_id").eq("class_id",cls.id).eq("student_id",user.id).maybeSingle();if(ee)throw ee;if(!e)return reply({error:"Join this class before submitting."},403);
      if(a.due_at && new Date(a.due_at).getTime()<Date.now())return reply({error:"The submission deadline has passed."},403);
      const answers=arr(body.answers);
      if(answers.length!==arr(a.questions).length)return reply({error:"Please answer every question before submitting."},400);
      let earned=0;const qmarks:any[]=[];
      arr(a.questions).forEach((q:any,i:number)=>{const answer=str(answers[i]?.answer);let mark:number|null=null;if(q.type==="mcq"||q.type==="truefalse"){mark=answer.toLowerCase()===str(q.answer).toLowerCase()?num(q.marks):0;earned+=mark;}qmarks.push({question:i,marks:mark});});
      const allAuto=arr(a.questions).every((q:any)=>["mcq","truefalse"].includes(q.type));
      const {data:s,error:se}=await admin.from("teacher_assessment_submissions").upsert({assessment_id:a.id,student_id:user.id,answers:answers.map((x:any)=>({answer:str(x.answer)})),submitted_at:new Date().toISOString(),marks_awarded:allAuto?earned:null,question_marks:qmarks,feedback:"",graded_by:null,graded_at:allAuto?new Date().toISOString():null},{onConflict:"assessment_id,student_id"}).select("id,submitted_at,marks_awarded,graded_at").single();
      if(se)throw se;
      return reply({ok:true,submission:s,auto_marked:allAuto,total_marks:a.total_marks});
    }
    if(action==="submissions"){
      if(!isTeacher)return reply({error:"Teacher access required."},403);
      const aid=assessmentId||str(body.id);const {data:a,error:ae}=await admin.from("teacher_assessments").select("id,class_id,questions,total_marks").eq("id",aid).maybeSingle();if(ae)throw ae;if(!a)return reply({error:"Assessment not found."},404);
      const {data:c,error:ce}=await admin.from("online_classes").select("teacher_id").eq("id",a.class_id).maybeSingle();if(ce)throw ce;if(!c||(!isAdmin&&c.teacher_id!==user.id))return reply({error:"Teacher access required."},403);
      const {data:subs,error:se}=await admin.from("teacher_assessment_submissions").select("id,student_id,answers,submitted_at,marks_awarded,question_marks,feedback,graded_at").eq("assessment_id",a.id).order("submitted_at",{ascending:false});if(se)throw se;
      const ids=(subs||[]).map((s:any)=>s.student_id);let profiles:any[]=[];if(ids.length){const {data:p,error:pe}=await admin.from("profiles").select("id,email,full_name,username").in("id",ids);if(pe)throw pe;profiles=p||[];}
      const byId=new Map(profiles.map((p:any)=>[p.id,p]));
      return reply({submissions:(subs||[]).map((s:any)=>({...s,student:byId.get(s.student_id)||{email:"Student"}})),questions:arr(a.questions).map((q:any)=>({prompt:q.prompt,type:q.type,marks:q.marks,answer:q.answer})),total_marks:a.total_marks});
    }
    if(action==="mark"){
      if(!isTeacher)return reply({error:"Teacher access required."},403);
      const {data:a,error:ae}=await admin.from("teacher_assessments").select("*").eq("id",assessmentId).maybeSingle();if(ae)throw ae;if(!a)return reply({error:"Assessment not found."},404);
      const {data:c,error:ce}=await admin.from("online_classes").select("id,teacher_id").eq("id",a.class_id).maybeSingle();if(ce)throw ce;if(!c||(!isAdmin&&c.teacher_id!==user.id))return reply({error:"You can only mark your own class submissions."},403);
      const submissionId=str(body.submission_id);
      const {data:s,error:se}=await admin.from("teacher_assessment_submissions").select("*").eq("id",submissionId).eq("assessment_id",a.id).maybeSingle();if(se)throw se;if(!s)return reply({error:"Submission not found."},404);
      const questionMarks=arr(body.question_marks).map((m:any)=>({question:Math.max(0,num(m.question)),marks:Math.max(0,num(m.marks))}));
      const maxByIndex=new Map(arr(a.questions).map((q:any,i:number)=>[i,num(q.marks)]));
      for(const m of questionMarks){const max=maxByIndex.get(m.question);if(max===undefined||m.marks>max)return reply({error:"A mark is invalid or exceeds the question maximum."},400);}
      if(questionMarks.length!==arr(a.questions).length)return reply({error:"Enter marks for every question."},400);
      const total=questionMarks.reduce((n:number,m:any)=>n+m.marks,0);
      const {data:updated,error:ue}=await admin.from("teacher_assessment_submissions").update({question_marks:questionMarks,marks_awarded:total,feedback:str(body.feedback),graded_by:user.id,graded_at:new Date().toISOString()}).eq("id",s.id).select("id,marks_awarded,feedback,graded_at,question_marks").single();if(ue)throw ue;
      return reply({ok:true,submission:updated,total_marks:a.total_marks});
    }
    if(action==="close"){
      if(!isTeacher)return reply({error:"Teacher access required."},403);
      const {data:a,error:ae}=await admin.from("teacher_assessments").select("id,class_id").eq("id",assessmentId).maybeSingle();if(ae)throw ae;if(!a)return reply({error:"Assessment not found."},404);
      const {data:c,error:ce}=await admin.from("online_classes").select("teacher_id").eq("id",a.class_id).maybeSingle();if(ce)throw ce;if(!c||(!isAdmin&&c.teacher_id!==user.id))return reply({error:"Teacher access required."},403);
      const {error:ue}=await admin.from("teacher_assessments").update({status:"closed"}).eq("id",assessmentId);if(ue)throw ue;return reply({ok:true});
    }
    return reply({error:"Unknown assessment action."},400);
  } catch(e) { console.error("teacher-assessments",e); return reply({error:e instanceof Error?e.message:"Server error"},500); }
});

function publicAssessment(a:any,teacher:boolean){
 const questions=arr(a.questions).map((q:any)=>teacher?q:{prompt:q.prompt,type:q.type,options:q.options,marks:q.marks});
 return {id:a.id,class_id:a.class_id,title:a.title,subject:a.subject,assessment_type:a.assessment_type,instructions:a.instructions,questions,total_marks:a.total_marks,due_at:a.due_at,duration_minutes:a.duration_minutes,status:a.status,created_at:a.created_at};
}