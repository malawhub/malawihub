import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) throw new Error("Supabase server configuration is missing");

    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace(/^Bearer\s+/i, "").trim();

    if (!token) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const { data: { user }, error: userError } = await adminClient.auth.getUser(token);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid session" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Allow any account whose profile has the admin role.
    // This keeps the dashboard working for all authorized administrators
    // instead of depending on one hard-coded administrator UUID.
    const { data: profile, error: profileError } = await adminClient
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) throw profileError;

    if (profile?.role !== "admin") {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Count every registered account, not only the first 1,000 users.
    let registeredUsers = 0;
    let page = 1;
    const perPage = 1000;

    while (true) {
      const { data, error } = await adminClient.auth.admin.listUsers({ page, perPage });
      if (error) throw error;
      const users = data?.users || [];
      registeredUsers += users.length;
      if (users.length < perPage) break;
      page += 1;
    }

    // A user is active only when the activity heartbeat was seen in the last 5 minutes.
    // Do not trust is_online by itself because a closed browser cannot update it to false.
    const cutoff = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const { data: profiles, error: profilesError } = await adminClient
      .from("profiles")
      .select("id,last_seen")
      .gte("last_seen", cutoff);

    if (profilesError) throw profilesError;

    const activeUsers = (profiles || []).filter(profile => Boolean(profile.last_seen)).length;

    return new Response(JSON.stringify({
      registeredUsers,
      activeUsers,
      updatedAt: new Date().toISOString()
    }), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  } catch (error) {
    console.error("admin-user-stats error:", error);
    return new Response(JSON.stringify({
      error: "Unable to load user statistics"
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  }
});
