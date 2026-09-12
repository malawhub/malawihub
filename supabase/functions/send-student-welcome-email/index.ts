import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const out = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return out({ error: "Method not allowed" }, 405);

  try {
    const url = Deno.env.get("SUPABASE_URL") || "";
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const brevoKey = Deno.env.get("BREVO_API_KEY") || "";
    if (!url || !service) return out({ error: "Supabase server configuration is missing" }, 500);
    if (!brevoKey) return out({ error: "Brevo is not configured" }, 503);

    const auth = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "").trim();
    if (!auth || auth !== service) return out({ error: "Unauthorized" }, 401);

    const body = await req.json().catch(() => ({}));
    const userId = String(body.user_id || "").trim();
    const username = String(body.username || "").trim();
    const password = String(body.password || "");
    if (!userId || !username || !password) return out({ error: "user_id, username and password are required" }, 400);

    const admin = createClient(url, service);
    const { data: profile, error: pe } = await admin
      .from("profiles")
      .select("id,email,role,full_name")
      .eq("id", userId)
      .maybeSingle();
    if (pe) throw pe;
    if (!profile || profile.role !== "student" || !profile.email) return out({ error: "Student profile not found" }, 404);

    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: { accept: "application/json", "api-key": brevoKey, "content-type": "application/json" },
      body: JSON.stringify({
        to: [{ email: profile.email, name: profile.full_name || profile.email }],
        templateId: 1,
        params: {
          name: profile.full_name || profile.email,
          full_name: profile.full_name || profile.email,
          username,
          password,
          login_url: "https://malawihub.pages.dev/online-class/login.html",
        },
      }),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      throw new Error(`Brevo email failed (${response.status}). ${detail.slice(0, 250)}`);
    }

    const { error: ie } = await admin.from("welcome_email_log").upsert(
      { user_id: userId, email: profile.email, template_id: 1, sent_at: new Date().toISOString() },
      { onConflict: "user_id" },
    );
    if (ie) throw ie;

    return out({ success: true, templateId: 1 });
  } catch (e) {
    console.error("send-student-welcome-email:", e);
    return out({ error: e instanceof Error ? e.message : "Unexpected server error" }, 500);
  }
});
