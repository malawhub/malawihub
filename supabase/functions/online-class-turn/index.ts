import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return new Response(JSON.stringify({ error: "POST required" }), { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  const auth = req.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) return new Response(JSON.stringify({ error: "Authentication required" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } } });
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) return new Response(JSON.stringify({ error: "Invalid session" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (!profile || !["student", "teacher", "admin"].includes(profile.role)) return new Response(JSON.stringify({ error: "Online Class access required" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  const keyId = Deno.env.get("CLOUDFLARE_TURN_KEY_ID");
  const apiToken = Deno.env.get("CLOUDFLARE_TURN_API_TOKEN");
  if (!keyId || !apiToken) return new Response(JSON.stringify({ error: "TURN service is not configured" }), { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  const response = await fetch(`https://rtc.live.cloudflare.com/v1/turn/keys/${encodeURIComponent(keyId)}/credentials/generate-ice-servers`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ ttl: 7200 }),
  });
  if (!response.ok) return new Response(JSON.stringify({ error: "TURN credential generation failed" }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  const data = await response.json();
  const iceServers = (data.iceServers || []).map((s: any) => ({ ...s, urls: Array.isArray(s.urls) ? s.urls.filter((u: string) => !u.includes(":53")) : s.urls }));
  return new Response(JSON.stringify({ iceServers, expires_in: 7200 }), { headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" } });
});