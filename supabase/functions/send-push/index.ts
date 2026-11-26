// Pošle push upozornenie všetkým dobrovoľníkom, ktorí ho majú zapnuté.
// Volať ho môže len admin (overí sa cez funkciu is_admin v databáze).
import webpush from "npm:web-push@3.6.7";
import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const userClient = createClient(url, anon, {
      global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
    });
    const { data: isAdmin, error } = await userClient.rpc("is_admin");
    if (error || !isAdmin) return json({ error: "forbidden" }, 403);

    const { title, body, link } = await req.json();
    if (!title) return json({ error: "missing title" }, 400);

    webpush.setVapidDetails(
      "mailto:" + (Deno.env.get("VAPID_CONTACT") ?? "info@example.com"),
      Deno.env.get("VAPID_PUBLIC_KEY")!,
      Deno.env.get("VAPID_PRIVATE_KEY")!,
    );
    const admin = createClient(url, service);
    const { data: subs, error: e2 } = await admin.from("push_subscriptions").select("id, endpoint, p256dh, auth");
    if (e2) return json({ error: e2.message }, 500);

    const payload = JSON.stringify({ title, body: body ?? "", link: link ?? "" });
    const gone: string[] = [];
    let sent = 0;
    await Promise.all((subs ?? []).map(async (s) => {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, { TTL: 86400 });
        sent++;
      } catch (err) {
        const code = (err as { statusCode?: number }).statusCode;
        if (code === 404 || code === 410) gone.push(s.id);
      }
    }));
    if (gone.length) await admin.from("push_subscriptions").delete().in("id", gone);
    return json({ sent, removed: gone.length });
  } catch (err) {
    return json({ error: String(err) }, 500);
  }
});
