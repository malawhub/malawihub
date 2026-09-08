import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

// Subjects exposed by MalawiHub. Each has broader search terms so discovery
// still finds useful external material when the exact subject label is rare.
const SUBJECT_TERMS: Record<string, string> = {
  Chemistry: "chemistry",
  Mathematics: "mathematics math",
  Physics: "physics",
  Biology: "biology life science",
  Education: "education teaching learning pedagogy",
  "Organic Chemistry": "organic chemistry",
  "Study Guides": "study guide education learning"
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" }
  });
}

function clean(value: unknown, max = 160) {
  return String(value ?? "").replace(/[<>]/g, "").trim().slice(0, max);
}

function sourceUrl(work: any): string | null {
  return work?.primary_location?.landing_page_url ||
    work?.best_oa_location?.landing_page_url ||
    work?.doi ||
    (work?.id ? `https://openalex.org/${String(work.id).split("/").pop()}` : null);
}

function pdfUrl(work: any): string | null {
  const locations = Array.isArray(work?.locations) ? work.locations : [];
  const candidates = [work?.best_oa_location, work?.primary_location, ...locations];
  const match = candidates.find((location: any) => location?.pdf_url);
  return match?.pdf_url || null;
}

function licenseOf(work: any): string | null {
  const locations = [work?.best_oa_location, work?.primary_location,
    ...(Array.isArray(work?.locations) ? work.locations : [])];
  const match = locations.find((location: any) => location?.license);
  return match?.license || null;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Only POST requests are allowed." }, 405);

  try {
    const body = await req.json();
    const subject = clean(body.subject);
    const topic = clean(body.topic);
    const query = clean(body.query);

    if (!subject && !topic && !query) {
      return json({ error: "Enter a subject, topic or search term." }, 400);
    }

    const subjectKey = Object.keys(SUBJECT_TERMS).find(
      key => key.toLowerCase() === subject.toLowerCase()
    );
    if (subject && !subjectKey) return json({ error: "Unsupported subject." }, 400);

    const subjectTerms = subjectKey ? SUBJECT_TERMS[subjectKey] : subject;
    const searchQuery = [subjectTerms, topic, query].filter(Boolean).join(" ").trim();

    // Do not require a PDF in the OpenAlex filter. Many valid external sources
    // expose a landing page, repository copy, DOI, or HTML full text instead.
    const url = new URL("https://api.openalex.org/works");
    url.searchParams.set("search", searchQuery);
    url.searchParams.set("filter", "open_access.is_oa:true");
    url.searchParams.set("per-page", "25");
    url.searchParams.set("sort", "relevance_score:desc");

    let response = await fetch(url, {
      headers: { "User-Agent": "MalawiHub/1.0 (resource discovery)" }
    });

    if (response.status === 429) {
      await new Promise(resolve => setTimeout(resolve, 1200));
      response = await fetch(url, {
        headers: { "User-Agent": "MalawiHub/1.0 (resource discovery)" }
      });
    }

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      console.error("OpenAlex error", response.status, detail.slice(0, 500));
      if (response.status === 429) {
        return json({ success: false, error: "OpenAlex rate limit reached. Please try again shortly.", results: [] }, 429);
      }
      return json({ success: false, error: `OpenAlex returned HTTP ${response.status}.`, results: [] }, 502);
    }

    const data = await response.json();
    const results = (Array.isArray(data.results) ? data.results : [])
      .map((work: any) => {
        const externalUrl = sourceUrl(work);
        if (!externalUrl) return null;
        const pdf = pdfUrl(work);
        return {
          title: work.display_name || "Untitled external resource",
          description: work.abstract_inverted_index
            ? "Open-access external scholarly resource."
            : "Open-access external learning resource.",
          subject: subjectKey || subject || "Study Guides",
          topic: topic || null,
          category: "External Open Access",
          year: work.publication_year || null,
          source: "OpenAlex",
          source_url: externalUrl,
          pdf_url: pdf,
          open_access: true,
          license: licenseOf(work),
          type: work.type || null,
          doi: work.doi || null
        };
      })
      .filter(Boolean)
      .slice(0, 20);

    return json({
      success: true,
      subject: subjectKey || subject,
      topic,
      query: searchQuery,
      source: "OpenAlex",
      results,
      count: results.length
    });
  } catch (error) {
    console.error("Resource discovery error:", error);
    return json({
      success: false,
      error: error instanceof Error ? error.message : "Discovery search failed.",
      results: []
    }, 500);
  }
});
