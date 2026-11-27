import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "https://malawihub.pages.dev",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" }
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "POST required" }, 405);

  const origin = req.headers.get("Origin");
  if (origin && origin !== "https://malawihub.pages.dev") {
    return json({ error: "Invalid application origin." }, 403);
  }

  try {
    const url = Deno.env.get("SUPABASE_URL");
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !service) return json({ error: "Server configuration is missing" }, 500);

    const admin = createClient(url, service);
    const body = await req.json().catch(() => ({}));

    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");
    const name = String(body.name || "").trim();

    if (!email || !email.includes("@")) return json({ error: "Enter a valid teacher email." }, 400);
    if (password.length < 8) return json({ error: "Teacher password must be at least 8 characters." }, 400);
    if (name.length < 2) return json({ error: "Enter your full name." }, 400);

    const { data: existingUsers, error: listError } =
      await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (listError) throw listError;

    const existing = (existingUsers.users || []).find(
      (u) => (u.email || "").toLowerCase() === email
    );

    if (existing) {
      // Existing identities must prove ownership before teacher access is added.
      // Never grant teacher access to an email address based only on its text.
      const authHeader = req.headers.get("Authorization") || "";
      const token = authHeader.replace(/^Bearer\s+/i, "").trim();
      if (!token) {
        return json({
          error: "An account with this email already exists. Log in with that account and password first, then create teacher access."
        }, 409);
      }

      const { data: authData, error: authError } = await admin.auth.getUser(token);
      if (authError || !authData.user || authData.user.id !== existing.id) {
        return json({ error: "Please log in with the existing account for this email before adding teacher access." }, 401);
      }
      if (!authData.user.email_confirmed_at) {
        return json({ error: "Verify your email address before activating Teacher Portal access. Check your inbox for the confirmation message." }, 403);
      }

      const { data: existingProfile, error: profileError } = await admin
        .from("profiles")
        .select("role, full_name")
        .eq("id", existing.id)
        .maybeSingle();
      if (profileError) throw profileError;
      if (existingProfile?.role === "admin") {
        return json({ error: "Administrator accounts cannot be registered as teachers." }, 409);
      }
      if (existingProfile?.role === "teacher") {
        const { error: areaError } = await admin.from("user_area_roles").upsert({
          user_id: existing.id,
          area: "teacher",
          display_name: name || existingProfile.full_name || email
        }, { onConflict: "user_id,area" });
        if (areaError) throw areaError;
        return json({ ok: true, teacher: { id: existing.id, email, role: "teacher", name: name || existingProfile.full_name || email }, existing: true });
      }

      const { error: areaError } = await admin.from("user_area_roles").upsert({
        user_id: existing.id,
        area: "teacher",
        display_name: name || existingProfile?.full_name || email
      }, { onConflict: "user_id,area" });
      if (areaError) throw areaError;

      return json({
        ok: true,
        teacher: { id: existing.id, email, role: "teacher", name: name || existingProfile?.full_name || email },
        existing: true,
        multi_area: true
      });
    }

    // New teacher identities must be created by the public Supabase sign-up flow,
    // which sends the configured email-confirmation message. This function only
    // grants teacher-area access to an already authenticated, verified identity.
    return json({
      error: "No account was found for this email. Create your account through the Teacher Portal sign-up form and verify the email before activating teacher access."
    }, 404);

  } catch (e) {
    console.error("teacher-self-register", e);
    return json({
      error: e instanceof Error ? e.message : "Server error"
    }, 500);
  }
});