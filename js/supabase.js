const SUPABASE_URL = "https://cdqrdovgdidzxmyygoee.supabase.co";
const SUPABASE_KEY = "sb_publishable_XHAK368Bg4dirFmtl229bQ_xzjCyqbv";
const supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);

/* MalawiHub user activity heartbeat */
async function updateMalawiHubLastSeen() {
    try {
        const { data: { user } } = await supabaseClient.auth.getUser();

        if (!user) return;

        await supabaseClient
            .from("profiles")
            .upsert({
                id: user.id,
                email: user.email,
                last_seen: new Date().toISOString(),
                is_online: true
            });
    } catch (error) {
        console.error("MalawiHub activity tracking error:", error);
    }
}

window.updateMalawiHubLastSeen = updateMalawiHubLastSeen;
