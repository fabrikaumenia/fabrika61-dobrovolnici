// Push upozornenia pre dobrovoľníkov.
// Volá ho admin z aplikácie (overí sa cez is_admin) alebo plánovaná úloha (hlavička x-cron-secret).
//
// Telo požiadavky:
//   { title, body, link?, to?: [volunteer_id], filter?: { help?: [], when?: [] }, kind? }
//   { mode: "reminders" }  – pripomienka prihláseným na zajtrajšie termíny (len plánovaná úloha)
import webpush from "npm:web-push@3.6.7";
import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

type Sub = { id: string; endpoint: string; p256dh: string; auth: string; volunteer_id: string };
type Msg = { title: string; body: string; link?: string };

const url = Deno.env.get("SUPABASE_URL")!;
const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const admin = createClient(url, service);

webpush.setVapidDetails(
  "mailto:" + (Deno.env.get("VAPID_CONTACT") ?? "info@example.com"),
  Deno.env.get("VAPID_PUBLIC_KEY")!,
  Deno.env.get("VAPID_PRIVATE_KEY")!,
);

async function recipients(to?: string[], filter?: { help?: string[]; when?: string[] }): Promise<Sub[]> {
  let q = admin.from("volunteers").select("id, help_forms, avail_days").eq("push_enabled", true).neq("status", "Bývalý");
  if (to?.length) q = q.in("id", to);
  const { data: vols, error } = await q;
  if (error) throw error;
  const ok = (vols ?? []).filter((v) =>
    (!filter?.help?.length || filter.help.some((h) => (v.help_forms ?? []).includes(h))) &&
    (!filter?.when?.length || filter.when.some((w) => (v.avail_days ?? []).includes(w)))
  ).map((v) => v.id);
  if (!ok.length) return [];
  const { data: subs, error: e2 } = await admin.from("push_subscriptions").select("id, endpoint, p256dh, auth, volunteer_id").in("volunteer_id", ok);
  if (e2) throw e2;
  return subs ?? [];
}

async function deliver(subs: Sub[], msg: (s: Sub) => Msg, kind: string, title: string) {
  const gone: string[] = [], errors: string[] = [];
  let sent = 0;
  await Promise.all(subs.map(async (s) => {
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify(msg(s)), { TTL: 86400, urgency: "high" });
      sent++;
    } catch (err) {
      const e = err as { statusCode?: number; body?: string; message?: string };
      if (e.statusCode === 404 || e.statusCode === 410) gone.push(s.id);
      errors.push(`${e.statusCode ?? ""} ${e.body ?? e.message ?? String(err)}`.slice(0, 300));
    }
  }));
  if (gone.length) await admin.from("push_subscriptions").delete().in("id", gone);
  await admin.from("push_log").insert({ kind, title, recipients: subs.length, sent, failed: subs.length - sent, errors: errors.join("\n").slice(0, 2000) || null });
  return { sent, failed: subs.length - sent, removed: gone.length };
}

async function reminders() {
  const tomorrow = new Date(Date.now() + 86400000).toLocaleDateString("sv-SE", { timeZone: "Europe/Bratislava" });
  const { data: terms } = await admin.from("terms").select("id, title, time_label, kind").eq("date", tomorrow);
  let total = { sent: 0, failed: 0, removed: 0 };
  for (const t of terms ?? []) {
    const { data: parts } = await admin.from("participations").select("volunteer_id").eq("term_id", t.id).eq("status", "rsvp");
    const ids = (parts ?? []).map((p) => p.volunteer_id);
    if (!ids.length) continue;
    const subs = await recipients(ids);
    const r = await deliver(subs, () => ({ title: `Zajtra: ${t.title}`, body: `${t.time_label}. Tešíme sa na teba!` }), "reminder", t.title);
    total = { sent: total.sent + r.sent, failed: total.failed + r.failed, removed: total.removed + r.removed };
  }
  return total;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const payload = await req.json().catch(() => ({}));
    const cronOk = !!Deno.env.get("CRON_SECRET") && req.headers.get("x-cron-secret") === Deno.env.get("CRON_SECRET");
    if (payload.mode === "reminders") {
      if (!cronOk) return json({ error: "forbidden" }, 403);
      return json(await reminders());
    }
    if (!cronOk) {
      const userClient = createClient(url, anon, { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } });
      const { data: isAdmin, error } = await userClient.rpc("is_admin");
      if (error || !isAdmin) return json({ error: "forbidden" }, 403);
    }
    const { title, body, link, to, filter, kind } = payload;
    if (!title) return json({ error: "missing title" }, 400);
    const subs = await recipients(to, filter);
    return json(await deliver(subs, () => ({ title, body: body ?? "", link: link ?? "" }), kind ?? "manual", title));
  } catch (err) {
    return json({ error: (err as { message?: string })?.message ?? JSON.stringify(err) }, 500);
  }
});
