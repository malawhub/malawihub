import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" },
});

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "POST required" }, 405);

  const auth = req.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) return json({ error: "Authentication required" }, 401);

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: auth } } },
    );
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) return json({ error: "Invalid session" }, 401);

    const { data: profile, error: profileError } = await supabase
      .from("profiles").select("role").eq("id", user.id).maybeSingle();
    if (profileError) {
      console.error("TURN profile lookup failed:", profileError.message);
      return json({ error: "Could not verify Online Class access" }, 500);
    }
    if (!profile || !["student", "teacher", "admin"].includes(profile.role)) {
      return json({ error: "Online Class access required" }, 403);
    }

    const keyId = Deno.env.get("CLOUDFLARE_TURN_KEY_ID");
    const apiToken = Deno.env.get("CLOUDFLARE_TURN_API_TOKEN");
    if (!keyId || !apiToken) {
      console.warn("TURN credentials are not configured; client should continue with STUN.");
      return json({ iceServers: [], relayAvailable: false, fallback: "stun" });
    }

    try {
      const response = await fetch(
        `https://rtc.live.cloudflare.com/v1/turn/keys/${encodeURIComponent(keyId)}/credentials/generate-ice-servers`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${apiToken}`, "Content-Type": "application/json" },
          body: JSON.stringify({ ttl: 7200 }),
          signal: AbortSignal.timeout(8000),
        },
      );
      if (!response.ok) {
        console.error("Cloudflare TURN credential endpoint returned HTTP", response.status);
        return json({ iceServers: [], relayAvailable: false, fallback: "stun" });
      }
      const data = await response.json();
      const iceServers = (data.iceServers || []).map((s: any) => ({
        ...s,
        urls: Array.isArray(s.urls) ? s.urls.filter((u: string) => !u.includes(":53")) : s.urls,
      }));
      if (!iceServers.length) {
        console.warn("Cloudflare TURN returned no usable ICE servers; client should continue with STUN.");
        return json({ iceServers: [], relayAvailable: false, fallback: "stun" });
      }
      return json({ iceServers, relayAvailable: true, expires_in: 7200 });
    } catch (error) {
      console.error("Cloudflare TURN request failed:", error instanceof Error ? error.message : "unknown error");
      return json({ iceServers: [], relayAvailable: false, fallback: "stun" });
    }
  } catch (error) {
    console.error("TURN function request failed:", error instanceof Error ? error.message : "unknown error");
    return json({ error: "Could not prepare classroom connection" }, 500);
  }
});