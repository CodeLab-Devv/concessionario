import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: { "Content-Type": "application/json" } });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "Missing authorization" }), { status: 401, headers: { "Content-Type": "application/json" } });

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) throw new Error("Supabase service configuration is missing");

    const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
    const token = authHeader.replace(/^Bearer\s+/i, "");
    const { data: { user }, error: userError } = await admin.auth.getUser(token);
    if (userError || !user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });

    const body = await req.json().catch(() => ({}));
    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return new Response(JSON.stringify({ error: "Inserisci un indirizzo email valido." }), { status: 400, headers: { "Content-Type": "application/json" } });
    if (email === (user.email || "").toLowerCase()) return new Response(JSON.stringify({ success: true, email: user.email }), { status: 200, headers: { "Content-Type": "application/json" } });

    const { data: updatedUser, error: authError } = await admin.auth.admin.updateUserById(user.id, { email, email_confirm: true });
    if (authError) return new Response(JSON.stringify({ error: authError.message }), { status: 400, headers: { "Content-Type": "application/json" } });

    const { error: profileError } = await admin.from("users").update({ email }).eq("id", user.id);
    if (profileError) return new Response(JSON.stringify({ error: `Auth aggiornata ma profilo non sincronizzato: ${profileError.message}` }), { status: 500, headers: { "Content-Type": "application/json" } });

    return new Response(JSON.stringify({ success: true, email: updatedUser.user?.email ?? email }), { status: 200, headers: { "Content-Type": "application/json" } });
  } catch (error) {
    console.error("update-own-email error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Errore interno" }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
});
