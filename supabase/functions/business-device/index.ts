import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const url = Deno.env.get("SUPABASE_URL")!;
const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
const admin = createClient(url, service);
const json = (x: unknown, status = 200) => new Response(JSON.stringify(x), { status, headers: { "content-type": "application/json" } });

const hash = async (s: string) => {
  const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, "0")).join("");
};
const bearer = (r: Request) => r.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || "";

async function user(r: Request) {
  const t = bearer(r);
  if (!t) return null;
  const c = createClient(url, anon);
  const { data: { user } } = await c.auth.getUser(t);
  return user || null;
}

Deno.serve(async r => {
  try {
    if (r.method !== "POST") return json({ error: "POST required" }, 405);
    const b = await r.json();

    if (b.action === "start") {
      const u = await user(r);
      if (!u) return json({ error: "Unauthorized" }, 401);
      const { data: m, error: memberError } = await admin
        .from("business_members")
        .select("id,workspace_id")
        .eq("user_id", u.id)
        .eq("role", "employee")
        .limit(1);
      if (memberError) return json({ error: memberError.message }, 500);
      if (!m?.[0]) return json({ error: "Business employee access is not registered." }, 403);

      const code = String(Math.floor(100000 + Math.random() * 900000));
      const { error: revokeError } = await admin
        .from("business_device_connections")
        .update({ status: "revoked", updated_at: new Date().toISOString() })
        .eq("member_id", m[0].id)
        .eq("status", "pairing");
      if (revokeError) return json({ error: revokeError.message }, 500);

      const { data, error } = await admin.from("business_device_connections").insert({
        workspace_id: m[0].workspace_id,
        member_id: m[0].id,
        pairing_code_hash: await hash(code),
        pairing_expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
        status: "pairing"
      }).select("id,pairing_expires_at").single();
      if (error) return json({ error: error.message }, 500);
      return json({ pairing_code: code, expires_at: data.pairing_expires_at });
    }

    if (b.action === "claim") {
      const code = String(b.pairing_code || "").trim();
      if (!/^\d{6}$/.test(code)) return json({ error: "Invalid pairing code" }, 400);
      const codeHash = await hash(code);
      const { data: d, error: lookupError } = await admin
        .from("business_device_connections")
        .select("id,member_id,workspace_id,pairing_expires_at")
        .eq("pairing_code_hash", codeHash)
        .eq("status", "pairing")
        .maybeSingle();
      if (lookupError) return json({ error: lookupError.message }, 500);
      if (!d || !d.pairing_expires_at || Date.parse(d.pairing_expires_at) < Date.now()) {
        return json({ error: "Pairing code expired or invalid" }, 400);
      }

      const token = crypto.randomUUID() + crypto.randomUUID().replaceAll("-", "");
      const { data: claimed, error } = await admin
        .from("business_device_connections")
        .update({
          device_name: String(b.device_name || "Android phone").slice(0, 80),
          device_token_hash: await hash(token),
          pairing_code_hash: null,
          pairing_expires_at: null,
          status: "connected",
          connected_at: new Date().toISOString(),
          last_seen_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq("id", d.id)
        .eq("status", "pairing")
        .select("id")
        .maybeSingle();
      if (error) return json({ error: error.message }, 500);
      if (!claimed) return json({ error: "Pairing code has already been used" }, 409);
      return json({ device_token: token, device_id: d.id });
    }

    if (b.action === "ingest") {
      const t = bearer(r);
      if (!t) return json({ error: "Missing device token" }, 401);
      const { data: d, error: deviceError } = await admin
        .from("business_device_connections")
        .select("id,member_id,workspace_id")
        .eq("device_token_hash", await hash(t))
        .eq("status", "connected")
        .maybeSingle();
      if (deviceError) return json({ error: deviceError.message }, 500);
      if (!d) return json({ error: "Device is not connected" }, 401);

      const provider = b.provider === "airtel_money" ? "airtel_money" : b.provider === "mpamba" ? "mpamba" : null;
      if (!provider) return json({ error: "Unsupported provider" }, 400);

      const numeric = (value: unknown) => typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : null;
      const amount = numeric(b.amount);
      const balance = numeric(b.balance);
      const reference = b.reference ? String(b.reference).slice(0, 120) : null;
      const type = String(b.transaction_type || "transaction").slice(0, 40);
      const eventAt = b.event_at && !Number.isNaN(Date.parse(b.event_at)) ? new Date(b.event_at).toISOString() : new Date().toISOString();
      const message = String(b.message || `${type}${amount !== null ? ` — MWK ${amount}` : ""}${balance !== null ? ` — displayed balance: MWK ${balance}` : ""}`).slice(0, 1000);
      const rawHash = String(b.raw_hash || await hash(`${provider}|${eventAt}|${reference || ""}|${amount ?? ""}|${balance ?? ""}|${message}`)).slice(0, 128);

      const { data: existing, error: duplicateError } = await admin
        .from("business_wallet_messages")
        .select("id")
        .eq("device_id", d.id)
        .eq("raw_hash", rawHash)
        .maybeSingle();
      if (duplicateError) return json({ error: duplicateError.message }, 500);

      if (!existing) {
        const { error } = await admin.from("business_wallet_messages").insert({
          workspace_id: d.workspace_id,
          member_id: d.member_id,
          provider,
          message,
          transaction_type: type,
          amount,
          balance,
          reference,
          event_at: eventAt,
          source: "android_sms",
          device_id: d.id,
          raw_hash: rawHash
        });
        if (error) return json({ error: error.message }, 500);
      }

      await admin.from("business_device_connections").update({
        last_seen_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }).eq("id", d.id);

      if (balance !== null) {
        const { error } = await admin.from("business_wallet_balances").upsert({
          workspace_id: d.workspace_id,
          member_id: d.member_id,
          provider,
          balance,
          currency: "MWK",
          status: "connected",
          last_sync_at: new Date().toISOString(),
          last_error: null,
          updated_at: new Date().toISOString()
        }, { onConflict: "member_id,provider" });
        if (error) return json({ error: error.message }, 500);
      }
      return json({ ok: true, duplicate: Boolean(existing) });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Unexpected error" }, 500);
  }
});
