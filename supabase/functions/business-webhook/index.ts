import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-business-webhook-secret",
};

async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function base64Url(bytes: Uint8Array) {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

async function importRsaPublicKey(jwk: JsonWebKey) {
  return crypto.subtle.importKey(
    "jwk",
    jwk,
    { name: "RSA-OAEP", hash: "SHA-256" },
    false,
    ["encrypt"],
  );
}

async function encryptForCustomer(publicKeyJwk: JsonWebKey, value: unknown) {
  const key = await importRsaPublicKey(publicKeyJwk);
  const data = new TextEncoder().encode(JSON.stringify(value));
  const encrypted = await crypto.subtle.encrypt({ name: "RSA-OAEP" }, key, data);
  return base64Url(new Uint8Array(encrypted));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: cors });

  try {
    const body = await req.json();
    const workspaceId = String(body.workspace_id || "");
    const provider = String(body.provider || "");
    const secret = req.headers.get("x-business-webhook-secret") || "";
    if (!workspaceId || !secret || !["airtel_money", "mpamba"].includes(provider)) {
      return new Response(JSON.stringify({ error: "Invalid webhook request" }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: integration, error: integrationError } = await supabase
      .from("business_integrations")
      .select("workspace_id, public_key, webhook_secret_hash, status")
      .eq("workspace_id", workspaceId)
      .eq("provider", provider)
      .maybeSingle();

    if (integrationError || !integration || integration.status === "paused") {
      return new Response(JSON.stringify({ error: "Integration unavailable" }), { status: 403, headers: { ...cors, "Content-Type": "application/json" } });
    }

    if ((await sha256(secret)) !== integration.webhook_secret_hash) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...cors, "Content-Type": "application/json" } });
    }

    const transaction = {
      provider,
      transaction_type: String(body.transaction_type || "other"),
      amount: String(body.amount || ""),
      external_reference: body.external_reference ? String(body.external_reference) : null,
      occurred_at: body.occurred_at || new Date().toISOString(),
      employee_id: body.employee_id || null,
      reference: body.reference || null,
    };

    if (!transaction.amount) {
      return new Response(JSON.stringify({ error: "Amount required" }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
    }

    const encrypted = await encryptForCustomer(JSON.parse(integration.public_key), transaction);
    const { data, error } = await supabase
      .from("business_transactions")
      .insert({
        workspace_id: workspaceId,
        employee_id: transaction.employee_id,
        provider,
        transaction_type: transaction.transaction_type,
        amount_encrypted: encrypted,
        payload_encrypted: encrypted,
        external_reference: transaction.external_reference,
        occurred_at: transaction.occurred_at,
      })
      .select("id")
      .single();

    if (error) throw error;
    return new Response(JSON.stringify({ ok: true, transaction_id: data.id }), { status: 201, headers: { ...cors, "Content-Type": "application/json" } });
  } catch (error) {
    console.error("business-webhook error", error instanceof Error ? error.message : "unknown");
    return new Response(JSON.stringify({ error: "Webhook processing failed" }), { status: 500, headers: { ...cors, "Content-Type": "application/json" } });
  }
});
