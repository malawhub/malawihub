import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" }
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Only POST is allowed." }, 405);

  try {
    const auth = req.headers.get("Authorization");
    if (!auth?.startsWith("Bearer ")) return json({ error: "Authentication required." }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const db = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: auth } } });
    const { data: { user }, error: userError } = await db.auth.getUser();
    if (userError || !user) return json({ error: "Authentication required." }, 401);

    const body = await req.json();
    const classId = String(body.class_id ?? "").trim();
    const question = String(body.question ?? "").trim().slice(0, 4000);
    const documentText = String(body.document_text ?? "").trim().slice(0, 60000);
    const documentName = String(body.document_name ?? "Teacher document").trim().slice(0, 200);
    if (!classId || !question || !documentText) return json({ error: "Class, question and document are required." }, 400);

    const { data: cls, error: classError } = await db
      .from("online_classes")
      .select("id,teacher_id,title,subject")
      .eq("id", classId)
      .maybeSingle();
    if (classError || !cls) return json({ error: "Class not found." }, 404);

    const { data: admin } = await db.rpc("is_online_class_admin");
    if (cls.teacher_id !== user.id && admin !== true) return json({ error: "Teacher or administrator access required." }, 403);

    const apiKey = Deno.env.get("OPENAI_API_KEY");
    if (!apiKey) return json({ error: "Teacher AI is not configured yet. Add the OPENAI_API_KEY secret to the Supabase project." }, 503);

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: Deno.env.get("OPENAI_MODEL") || "gpt-5-mini",
        input: [
          { role: "system", content: "You are a private teaching assistant for a MalawiHub teacher. Help the teacher understand, explain, summarize, question, or teach from the supplied document. Do not address students directly unless asked. Be accurate and clearly say when the document does not contain enough information. Keep answers practical for classroom teaching." },
          { role: "user", content: `Class subject: ${cls.subject || "General"}\nDocument: ${documentName}\n\nDOCUMENT TEXT:\n${documentText}\n\nTEACHER QUESTION:\n${question}` }
        ],
        max_output_tokens: 1800
      })
    });

    const result = await response.json();
    if (!response.ok) return json({ error: result?.error?.message || "AI provider request failed." }, 502);
    const answer = result.output_text || result.output?.flatMap((x: any) => x.content || []).map((x: any) => x.text || "").join("\n") || "No answer returned.";
    return json({ answer });
  } catch (error) {
    console.error("teacher-ai error", error);
    return json({ error: error instanceof Error ? error.message : "Teacher AI failed." }, 500);
  }
});
