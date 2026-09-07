const MH_SUPABASE_URL = "https://cdqrdovgdidzxmyygoee.supabase.co";
const MH_SUPABASE_KEY = "sb_publishable_XHAK368Bg4dirFmtl229bQ_xzjCyqbv";
const supabaseClient = window.supabase.createClient(
    MH_SUPABASE_URL,
    MH_SUPABASE_KEY
);

window.supabaseClient = supabaseClient;

/* MalawiHub Business invite-link compatibility.
   Business originally used #invite=TOKEN. Normalize that fragment to
   ?invite=TOKEN before business/index.html reads the URL, so invite links
   work reliably across browsers and sharing apps. */
(function normalizeBusinessInviteUrl() {
    if (!location.pathname.includes("/business")) return;
    const hash = location.hash || "";
    if (!hash.startsWith("#invite=")) return;

    const token = hash.slice("#invite=".length);
    if (!token) return;

    const url = new URL(location.href);
    url.hash = "";
    url.searchParams.set("invite", token);
    history.replaceState(null, document.title, url.pathname + url.search);
})();

/* MalawiHub user activity heartbeat */
async function updateMalawiHubLastSeen() {
    try {
        const { data: { user } } = await supabaseClient.auth.getUser();
        if (!user) return;
        await supabaseClient.from("profiles").upsert({
            id: user.id,
            email: user.email,
            last_seen: new Date().toISOString(),
            is_online: true
        });
    } catch (error) {
        console.error("MalawiHub activity tracking error:", error);
    }
}

function fillOnlineClassCode() {
    if (!location.pathname.endsWith("/online-class/index.html")) return;
    const params = new URLSearchParams(location.search);
    const code = params.get("code");
    const input = document.getElementById("code");
    if (code && input) input.value = code.trim().toUpperCase();

    /* Teacher dashboard links already include teacher=1. Previously the
       live-class page only filled the code and still waited for the teacher
       to press the Teacher button. Auto-enter teacher mode for those trusted
       teacher links so a teacher can open their class directly. */
    if (params.get("teacher") === "1") {
        const teacherButton = document.getElementById("teacherBtn");
        if (teacherButton) teacherButton.click();
    }
}

window.updateMalawiHubLastSeen = updateMalawiHubLastSeen;
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", fillOnlineClassCode);
} else {
    fillOnlineClassCode();
}
