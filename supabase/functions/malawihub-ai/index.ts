import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const ALLOWED_ORIGIN = "https://malawihub.pages.dev";
const WINDOW_MS = 10 * 60 * 1000;
const MAX_REQUESTS = 12;
const requestLog = new Map<string, number[]>();

const SYSTEM_PROMPT = `You are MalawiHub AI, an independent university-level learning assistant.

Scope:
- Answer university-level academic questions across disciplines.
- Do not assume or depend on any specific university, institution, programme, course code, or institution-specific syllabus.
- Do not target secondary-school curricula.
- If a question is outside university-level learning, briefly redirect it to a suitable university-level framing.

Teaching:
- Give the direct answer first.
- Then explain clearly in simple English.
- Define important terms before using them.
- For mathematics, statistics, chemistry, physics and calculations, show working step by step.
- Use examples when useful.
- Identify common mistakes when useful.
- Encourage deeper learning without making the response unnecessarily long.
- Never invent facts, references, experimental results or citations.
- If uncertain, say what is uncertain rather than guessing.
- The goal is learning, not merely producing an answer.`;

function json(data: unknown, status = 200, origin = ALLOWED_ORIGIN) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders,
      "Access-Control-Allow-Origin": origin,
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
}

function clientIp(req: Request) {
  return req.headers.get("cf-connecting-ip") ||
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown";
}

function allowedOrigin(req: Request) {
  const origin = req.headers.get("origin");
  return !origin || origin === ALLOWED_ORIGIN ? ALLOWED_ORIGIN : null;
}

Deno.serve(async (req: Request) => {
  const origin = allowedOrigin(req);
  if (!origin) return json({ error: "Origin not allowed." }, 403);

  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        ...corsHeaders,
        "Access-Control-Allow-Origin": origin,
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      },
    });
  }

  if (req.method !== "POST") {
    return json({ error: "Only POST is allowed." }, 405, origin);
  }

  try {
    const ip = clientIp(req);
    const now = Date.now();
    const recent = (requestLog.get(ip) || []).filter(t => now - t < WINDOW_MS);

    if (recent.length >= MAX_REQUESTS) {
      requestLog.set(ip, recent);
      return json({ error: "Too many questions. Please wait a few minutes and try again." }, 429, origin);
    }

    recent.push(now);
    requestLog.set(ip, recent);

    const engineUrl = Deno.env.get("AI_ENGINE_URL")?.trim();
    const engineKey = Deno.env.get("AI_ENGINE_API_KEY")?.trim() || "";
    const engineModel = Deno.env.get("AI_ENGINE_MODEL")?.trim();

    if (!engineUrl || !engineModel) {
      return json({
        error: "MalawiHub AI Engine is being prepared. Please try again shortly."
      }, 503, origin);
    }

    const body = await req.json();
    const question = String(body?.question || "").trim();
    const followUp = String(body?.follow_up || "").trim();

    if (!question) return json({ error: "Please enter a question." }, 400, origin);
    if (question.length > 4000) return json({ error: "Please keep the question under 4,000 characters." }, 413, origin);
    if (followUp.length > 1200) return json({ error: "The follow-up request is too long." }, 413, origin);

    const userMessage = followUp
      ? `Original question:
${question}

Student follow-up:
${followUp}`
      : question;

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (engineKey) headers.Authorization = `Bearer ${engineKey}`;

    const upstream = await fetch(engineUrl.replace(/\/$/, "") + "/v1/chat/completions", {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: engineModel,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userMessage },
        ],
        temperature: 0.2,
        max_tokens: 1400,
      }),
    });

    const result = await upstream.json().catch(() => ({}));

    if (!upstream.ok) {
      console.error("MalawiHub AI engine error", {
        status: upstream.status,
        message: result?.error?.message || result?.message || "upstream failure",
      });
      return json({ error: "MalawiHub AI could not answer right now. Please try again." }, 502, origin);
    }

    const answer = String(result?.choices?.[0]?.message?.content || "").trim();

    if (!answer) {
      return json({ error: "MalawiHub AI returned an empty answer. Please try again." }, 502, origin);
    }

    return json({
      answer,
      model: result?.model || engineModel,
      provider: "malawihub-ai-engine",
    }, 200, origin);
  } catch (error) {
    console.error("malawihub-ai error", error);
    return json({
      error: "MalawiHub AI is temporarily unavailable. Please try again.",
    }, 500, origin);
  }
});
