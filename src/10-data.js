/* ---------- data layer: Supabase rows <-> app objects ---------- */
const FORM_MAP = [["first","first_name"],["last","last_name"],["nick","nick"],["bday","birthday"],["city","city"],["phone","phone"],["age","age_group"],
  ["when","avail_days"],["whenOther","avail_days_other"],["part","day_parts"],["partOther","day_parts_other"],["freq","contact_freq"],["freqOther","contact_freq_other"],
  ["channel","channels"],["channelOther","channels_other"],["social","social_link"],["help","help_forms"],["helpOther","help_other"],["hobby","hobbies"],
  ["hobbyOther","hobbies_other"],["ideas","benefit_ideas"],["source","sources"],["sourceOther","sources_other"],["photoOk","photo_consent"]];
const ARR_FIELDS = new Set(["when","part","freq","channel","help","hobby","source"]);

function vFromRow(r){
  const v = {id:r.id, uid:r.user_id, code:r.code, email:r.email, photo:r.photo_url || null, status:r.status, role:r.role, prior:r.prior_count || 0,
    origin:r.origin || "", registered:(r.created_at || "").slice(0, 10), since:+(r.created_at || "0").slice(0, 4),
    gdprAt:r.gdpr_consent_at ? r.gdpr_consent_at.slice(0, 10) : "", tags:[], notes:"", pushEnabled:r.push_enabled !== false};
  for (const [a, b] of FORM_MAP) v[a] = ARR_FIELDS.has(a) ? (r[b] || []) : a === "photoOk" ? !!r[b] : (r[b] ?? "");
  return v;
}
const toRow = d => Object.fromEntries(FORM_MAP.map(([a, b]) => [b, ARR_FIELDS.has(a) ? (d[a] || []) : a === "photoOk" ? !!d[a] : (String(d[a] ?? "").trim() || (a === "last" ? "" : null))]));
const tFromRow = r => ({id:r.id, type:r.kind, title:r.title, date:r.date, time:r.time_label, desc:r.description, cap:r.capacity});
const pFromRow = r => ({id:r.id, vId:r.volunteer_id, termId:r.term_id, label:r.label, date:r.date, status:r.status, source:r.source});
const uFromRow = r => ({id:r.id, vId:r.volunteer_id, bId:r.benefit_id, pid:r.partner_id, at:r.used_at.slice(0, 10), time:new Date(r.used_at).toTimeString().slice(0, 5), year:r.year});
const nFromRow = r => ({id:r.id, kind:r.kind, title:r.title, body:r.body, date:r.created_at.slice(0, 10), photos:r.photos || [], termId:r.term_id});

function must(res){ if (res.error) throw res.error; return res.data; }

async function loadMe(){
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return null;
  const row = must(await sb.from("volunteers").select("*").eq("user_id", user.id).maybeSingle());
  return row ? vFromRow(row) : null;
}

let lastLoad = 0;
async function loadData(){
  const admin = S.isAdmin;
  const q = await Promise.all([
    sb.from("terms").select("*").order("date"),
    sb.from("participations").select("*"),
    sb.from("partners").select("id,name,place").order("created_at"),
    sb.from("benefits").select("*").eq("active", true).order("tier").order("created_at"),
    sb.from("benefit_uses").select("*"),
    sb.from("news").select("*").order("created_at", {ascending:false}).limit(60),
    admin ? sb.from("volunteers").select("*").order("last_name") : sb.from("volunteers").select("*").eq("id", S.me),
    admin ? sb.from("volunteer_admin").select("*") : Promise.resolve({data:[]}),
    admin ? sb.from("partner_pins").select("*") : Promise.resolve({data:[]}),
    sb.rpc("term_counts"),
    sb.rpc("month_leaders"),
    admin ? sb.from("push_subscriptions").select("volunteer_id") : Promise.resolve({data:[]}),
  ]);
  const [terms, parts, partners, benefits, uses, news, vols, vadmin, pins, counts, vom, subs] = q.map(must);
  DB.subs = subs.reduce((m, s) => (m[s.volunteer_id] = (m[s.volunteer_id] || 0) + 1, m), {});
  DB.terms = terms.map(tFromRow);
  DB.parts = parts.map(pFromRow);
  const pinMap = Object.fromEntries(pins.map(p => [p.partner_id, p.pin]));
  DB.partners = partners.map(p => ({id:p.id, name:p.name, where:p.place, pin:pinMap[p.id] || ""}));
  DB.benefits = benefits.map(b => ({id:b.id, tier:b.tier, pid:b.partner_id, what:b.title}));
  DB.uses = uses.map(uFromRow);
  DB.news = news.map(nFromRow);
  const vaMap = Object.fromEntries(vadmin.map(a => [a.volunteer_id, a]));
  DB.vols = vols.map(r => { const v = vFromRow(r); const a = vaMap[v.id]; if (a){ v.tags = a.tags || []; v.notes = a.notes || ""; } return v; });
  DB.counts = Object.fromEntries(counts.map(c => [c.term_id, c.signed]));
  DB.vom = vom.map(r => ({v:{id:r.volunteer_id, first:r.first_name, last:r.last_name, nick:r.nick, photo:r.photo_url}, n:r.n}));
  lastLoad = Date.now();
}

async function refresh(){ TODAY = now0(); TODAY_ISO = iso(TODAY); YEAR = TODAY.getFullYear(); MONTH = TODAY.getMonth(); await loadData(); }

/* image helpers */
function readFiles(files, cb){
  const list = Array.from(files || []).slice(0, 8); if (!list.length) return;
  Promise.all(list.map(f => new Promise(res => {
    const r = new FileReader();
    r.onload = () => { const img = new Image(); img.onload = () => {
      const s = Math.min(1, 1600 / Math.max(img.width, img.height)), c = document.createElement("canvas");
      c.width = Math.round(img.width * s); c.height = Math.round(img.height * s); c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      res(c.toDataURL("image/jpeg", .85)); }; img.onerror = () => res(null); img.src = r.result; };
    r.onerror = () => res(null);
    r.readAsDataURL(f); }))).then(arr => cb(arr.filter(Boolean)));
}
const dataUrlToBlob = u => fetch(u).then(r => r.blob());
async function uploadImage(bucket, path, dataUrl){
  const blob = await dataUrlToBlob(dataUrl);
  must(await sb.storage.from(bucket).upload(path, blob, {contentType:"image/jpeg", upsert:false}));
  return sb.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}
const rid = () => (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2));

/* push notifications */
const b64ToU8 = s => { const p = "=".repeat((4 - s.length % 4) % 4), b = atob((s + p).replace(/-/g, "+").replace(/_/g, "/")); return Uint8Array.from(b, c => c.charCodeAt(0)); };
const isIOS = /iP(hone|ad|od)/.test(navigator.userAgent);
const isStandalone = () => window.matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
let swReg = null;
async function initPush(){
  if (!("serviceWorker" in navigator)) return;
  try {
    swReg = await navigator.serviceWorker.register("./sw.js");
    const sub = await swReg.pushManager?.getSubscription();
    S.pushOn = !!sub;
  } catch (e) { console.warn("SW", e); }
}
const pushSupported = () => !!swReg && "PushManager" in window && "Notification" in window;
async function subscribeDevice(){
  let sub = await swReg.pushManager.getSubscription();
  if (!sub) sub = await swReg.pushManager.subscribe({userVisibleOnly:true, applicationServerKey:b64ToU8(CFG.vapidPublicKey)});
  const j = sub.toJSON();
  must(await sb.from("push_subscriptions").upsert({volunteer_id:S.me, endpoint:j.endpoint, p256dh:j.keys.p256dh, auth:j.keys.auth}, {onConflict:"endpoint"}));
  S.pushOn = true; S.pushAsk = false;
}
// Po prihlásení: upozornenia sú predvolene zapnuté. Ak už prehliadač dovolil, prihlási zariadenie potichu; inak ponúkne tlačidlo.
async function autoPush(){
  const m = vol(S.me); S.pushAsk = false;
  if (!m || !m.pushEnabled) { S.pushOn = false; return; }
  if (!pushSupported()){ S.pushIosHint = isIOS && !isStandalone(); return; }
  if (Notification.permission === "granted"){ try { await subscribeDevice(); } catch (e){ console.warn(e); } return; }
  if (Notification.permission === "default"){ let dismissed = false; try { dismissed = localStorage.getItem("f61-push-later") === "1"; } catch (e){} S.pushAsk = !dismissed; }
}
async function enablePush(){
  if (!pushSupported()){
    throw new Error(isIOS && !isStandalone() ? "ios-home" : "unsupported");
  }
  if (!vol(S.me).pushEnabled){ must(await sb.from("volunteers").update({push_enabled:true}).eq("id", S.me)); vol(S.me).pushEnabled = true; }
  const perm = await Notification.requestPermission();
  if (perm !== "granted") throw new Error("denied");
  await subscribeDevice();
}
async function disablePush(){
  must(await sb.from("volunteers").update({push_enabled:false}).eq("id", S.me)); vol(S.me).pushEnabled = false;
  const sub = await swReg?.pushManager?.getSubscription();
  if (sub){ await sb.from("push_subscriptions").delete().eq("endpoint", sub.endpoint); await sub.unsubscribe(); }
  S.pushOn = false;
}
async function sendPush(title, body, opts = {}){
  const { data, error } = await sb.functions.invoke("send-push", {body:{title, body, ...opts}});
  if (error) throw error;
  return data?.sent ?? 0;
}

function errText(e){
  const m = String(e?.message || e || "");
  if (/Invalid login credentials/i.test(m)) return "Nesprávny e-mail alebo heslo.";
  if (/already registered|already been registered/i.test(m)) return "Tento e-mail už je registrovaný. Prihlás sa, alebo si obnov heslo.";
  if (/Email not confirmed/i.test(m)) return "E-mail ešte nie je potvrdený. Klikni na odkaz, ktorý sme ti poslali.";
  if (/rate limit|too many/i.test(m)) return "Príliš veľa pokusov. Skús to o pár minút.";
  if (/Password should be/i.test(m)) return "Heslo musí mať aspoň 8 znakov.";
  if (/Failed to fetch|NetworkError|network/i.test(m)) return "Chýba pripojenie na internet. Skús to znova.";
  if (/duplicate key/i.test(m)) return "Taký záznam už existuje.";
  if (/row-level security|permission denied|forbidden/i.test(m)) return "Na túto akciu nemáš oprávnenie.";
  if (m === "ios-home") return "Na iPhone najprv pridaj aplikáciu na plochu: v Safari ťukni na Zdieľať a zvoľ Pridať na plochu. Potom ju otvor z plochy.";
  if (m === "unsupported") return "Tento prehliadač upozornenia nepodporuje.";
  if (m === "denied") return "Upozornenia sú v nastaveniach prehliadača zakázané.";
  return "Niečo sa nepodarilo: " + m;
}
