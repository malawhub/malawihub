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
      const { data: profile, error: profileError } = await admin
        .from("profiles")
        .select("role")
        .eq("id", existing.id)
        .maybeSingle();

      if (profileError) throw profileError;

      if (profile?.role === "teacher") {
        return json({
          error: "A teacher account with this email already exists. Please use Log in instead."
        }, 409);
      }

      return json({
        error: "This email already belongs to another MalawiHub user area. Please use a different email."
      }, 409);
    }

    // Match Admin-created teachers:
    // server-side Auth creation + confirmed email + explicit teacher profile.
    const { data: created, error: createError } =
      await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          full_name: name,
          role: "teacher"
        }
      });

    if (createError || !created.user) {
      return json({
        error: createError?.message || "Could not create teacher account."
      }, 400);
    }

    const { error: profileError } = await admin
      .from("profiles")
      .upsert({
        id: created.user.id,
        email,
        role: "teacher",
        full_name: name
      }, { onConflict: "id" });

    if (profileError) {
      await admin.auth.admin.deleteUser(created.user.id).catch(() => {});
      throw profileError;
    }

    return json({
      ok: true,
      teacher: {
        id: created.user.id,
        email,
        role: "teacher",
        name
      }
    });
  } catch (e) {
    console.error("teacher-self-register", e);
    return json({
      error: e instanceof Error ? e.message : "Server error"
    }, 500);
  }
});