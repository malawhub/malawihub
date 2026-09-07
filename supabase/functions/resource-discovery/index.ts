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

function cleanQuery(value: unknown) {
    return String(value ?? "")
        .replace(/[<>]/g, "")
        .trim()
        .slice(0, 120);
}

export default {
    async fetch(req: Request) {
        if (req.method === "OPTIONS") {
            return new Response("ok", {
                headers: corsHeaders
            });
        }

        if (req.method !== "POST") {
            return json({
                error: "Only POST requests are allowed."
            }, 405);
        }

        try {
            const body = await req.json();

            const subject = cleanQuery(body.subject);
            const topic = cleanQuery(body.topic);
            const query = cleanQuery(body.query);

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
                return json({
                    error: "Unsupported subject."
                }, 400);
            }

            const searchTerms = [
                subject,
                topic,
                query,
                "Malawi students PDF learning resources"
            ].filter(Boolean);

            const searchQuery = searchTerms.join(" ");

            return json({
                success: true,
                subject,
                topic,
                query: searchQuery,
                results: [],
                message:
                    "Discovery search endpoint is ready. External source connectors will be added next."
            });

        } catch (error) {
            console.error("Resource discovery error:", error);

            return json({
                error: "Invalid request."
            }, 400);
        }
    }
};
