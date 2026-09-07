import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const ALLOWED_SUBJECTS = [
  "Chemistry",
  "Mathematics",
  "Physics",
  "Biology",
  "Education",
  "Organic Chemistry",
  "Study Guides"
];

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json"
    }
  });
}

function clean(value: unknown, max = 120) {
  return String(value ?? "")
    .replace(/[<>]/g, "")
    .trim()
    .slice(0, max);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ error: "Only POST requests are allowed." }, 405);
  }

  try {
    const body = await req.json();

    const subject = clean(body.subject);
    const topic = clean(body.topic);
    const query = clean(body.query);

    if (!subject && !topic && !query) {
      return json({
        error: "Enter a subject, topic or search term."
      }, 400);
    }

    if (
      subject &&
      !ALLOWED_SUBJECTS.some(
        item => item.toLowerCase() === subject.toLowerCase()
      )
    ) {
      return json({ error: "Unsupported subject." }, 400);
    }

    const searchQuery = [subject, topic, query]
      .filter(Boolean)
      .join(" ");

    const url = new URL("https://api.openalex.org/works");
    url.searchParams.set("search", searchQuery);
    url.searchParams.set(
      "filter",
      "open_access.is_oa:true,has_content.pdf:true"
    );
    url.searchParams.set("per_page", "20");
    url.searchParams.set("sort", "-relevance_score");

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`OpenAlex returned HTTP ${response.status}`);
    }

    const data = await response.json();

    const results = (data.results ?? [])
      .map((work: any) => {
        const locations = Array.isArray(work.locations)
          ? work.locations
          : [];

        const pdfLocation =
          locations.find(
            (location: any) =>
              location?.pdf_url &&
              location?.is_oa !== false
          ) ??
          locations.find(
            (location: any) => location?.pdf_url
          );

        const pdfUrl = pdfLocation?.pdf_url ?? null;

        if (!pdfUrl) return null;

        return {
          title: work.display_name ?? "Untitled resource",
          description:
            work.abstract_inverted_index
              ? "Open-access scholarly learning resource."
              : "Open-access learning resource.",
          subject: subject || "Study Guides",
          category: "External Open Access",
          year: work.publication_year ?? null,
          source: "OpenAlex",
          source_url: work.id ?? null,
          pdf_url: pdfUrl,
          open_access: true,
          license: pdfLocation?.license ?? null,
          type: work.type ?? null
        };
      })
      .filter(Boolean)
      .slice(0, 20);

    return json({
      success: true,
      subject,
      topic,
      query: searchQuery,
      source: "OpenAlex",
      results,
      count: results.length
    });
  } catch (error) {
    console.error("Resource discovery error:", error);

    return json({
      error: error instanceof Error
        ? error.message
        : "Discovery search failed."
    }, 500);
  }
});
