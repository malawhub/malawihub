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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const token = authHeader.replace("Bearer ", "");

    const {
      data: { user },
      error: userError
    } = await adminClient.auth.getUser(token);

    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid session" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const ADMIN_UUID = "759a11e5-6166-4fc0-8979-352ba589e88d";

    if (user.id !== ADMIN_UUID) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const { data, error } = await adminClient.auth.admin.listUsers({
      page: 1,
      perPage: 1000
    });

    if (error) throw error;

    const registeredUsers = data.users.length;

    const cutoff = Date.now() - (5 * 60 * 1000);

    const { data: profiles, error: profilesError } =
      await adminClient
        .from("profiles")
        .select("id,last_seen,is_online");

    if (profilesError) throw profilesError;

    const activeUsers = (profiles || []).filter(profile => {
      if (profile.is_online === true) return true;
      if (!profile.last_seen) return false;

      return new Date(profile.last_seen).getTime() >= cutoff;
    }).length;

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
