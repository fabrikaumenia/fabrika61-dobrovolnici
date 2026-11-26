/* Fabrika 61 – aplikácia pre dobrovoľníkov
   Jeden ES modul bez build kroku. Dáta sú v Supabase, stránka je statická. */
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm";
import { CFG } from "./config.js?v=5646789b";

const sb = createClient(CFG.supabaseUrl, CFG.supabaseKey, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: "implicit" },
});

/* ---------- constants & helpers ---------- */
const now0 = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
let TODAY = now0();
const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
let TODAY_ISO = iso(TODAY), YEAR = TODAY.getFullYear(), MONTH = TODAY.getMonth();
const DAYS = ["ne","po","ut","st","št","pi","so"];
const MONTHS = ["jan","feb","mar","apr","máj","jún","júl","aug","sep","okt","nov","dec"];
const MONTHS_LOC = ["januári","februári","marci","apríli","máji","júni","júli","auguste","septembri","októbri","novembri","decembri"];
const THRESH = [0,3,5,7,9];

const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const D = s => new Date(String(s).slice(0, 10) + "T00:00:00");
const fmtShort = d => `${DAYS[d.getDay()]} ${d.getDate()}. ${MONTHS[d.getMonth()]}`;
const fmtNum = d => `${d.getDate()}. ${d.getMonth()+1}. ${d.getFullYear()}`;
const pl = (n, one, few, many) => n === 1 ? one : (n >= 2 && n <= 4 ? few : many);
const sichty = n => `${n} ${pl(n,"šichta","šichty","šichiet")}`;
const initials = v => ((v.first || "")[0] || "") + ((v.last || "")[0] || "");
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };

const I = {
  home:'<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
  cal:'<rect x="3" y="5" width="18" height="16" rx="2.5"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  gift:'<rect x="3" y="8" width="18" height="4" rx="1"/><path d="M12 8v13M5 12v8a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-8M7.5 8a2.5 2.5 0 0 1 0-5C10 3 12 8 12 8s2-5 4.5-5a2.5 2.5 0 0 1 0 5"/>',
  user:'<circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/>',
  check:'<path d="M5 12.5 10 17 19 7"/>',
  x:'<path d="M6 6l12 12M18 6 6 18"/>',
  plus:'<path d="M12 5v14M5 12h14"/>',
  trash:'<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13M9 7V4h6v3"/>',
  camera:'<path d="M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z"/><circle cx="12" cy="13.5" r="3.5"/>',
  scan:'<path d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3M4 12h16"/>',
  chev:'<path d="m9 6 6 6-6 6"/>',
  out:'<path d="M15 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4M10 8l-4 4 4 4M6 12h10"/>',
  grid:'<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  people:'<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c1-3.5 3.5-5.5 6.5-5.5s5.5 2 6.5 5.5M16 4.5a3.5 3.5 0 0 1 0 7M18 14.5c1.8.7 3 2.6 3.5 5.5"/>',
  news:'<rect x="3" y="4" width="18" height="16" rx="2.5"/><path d="M7 9h10M7 13h10M7 17h6"/>',
  bell:'<path d="M6 16v-5a6 6 0 1 1 12 0v5l2 2H4z"/><path d="M10 21h4"/>',
  shield:'<path d="M12 3 4 6v6c0 4.5 3.4 8.3 8 9 4.6-.7 8-4.5 8-9V6z"/>',
};
const ico = (n, cls = "ico") => `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true">${I[n]}</svg>`;
const logo = (variant = "outline") => `<svg viewBox="${variant === "outline" ? "0 0 260 110" : "0 0 258 106"}" role="img" aria-label="Fabrika 61"><use href="#logo-${variant}"/></svg>`;

/* ---------- state ---------- */
const DB = {vols:[], terms:[], parts:[], partners:[], benefits:[], uses:[], news:[], counts:{}, vom:[]};
const S = {
  screen:"loading", authMode:"login", authMsg:null, authErr:null, me:null, isAdmin:false,
  vtab:"home", termView:"upcoming", termFilter:"all",
  atab:"overview", openTerm:null, confirmDel:null, selVol:null, peopleQ:"",
  scanVol:null, scanTerm:null, newsKind:"info", newTermType:"shift", draftPhotos:[],
  pushOn:false, pushAsk:false, pushIosHint:false, toast:null, busy:0, tgt:{mode:"all", help:[], when:[]},
  form:null, flt:null, sort:{k:"year", dir:-1}, showFilters:false, exportOpen:false, exportKind:"vols", exportCols:null, copyText:null,
  voucher:null, pin:"", pinErr:null, lockUntil:{}, justUsed:null, showPins:{}, editPin:null, editTerm:null,
};

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
  if (/v deň termínu/i.test(m)) return "Účasť sa dá potvrdiť až v deň termínu.";
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

/* ---------- domain logic ---------- */
const vol = id => DB.vols.find(v => v.id === id);
const me = () => vol(S.me);
const term = id => DB.terms.find(t => t.id === id);
const partDate = p => p.termId ? D(term(p.termId).date) : D(p.date);
const confirmed = vId => DB.parts.filter(p => p.vId === vId && p.status === "confirmed" && (p.termId ? term(p.termId) : true));
const yearCount = vId => confirmed(vId).filter(p => partDate(p).getFullYear() === YEAR).length;
const monthCount = vId => confirmed(vId).filter(p => { const d = partDate(p); return d.getFullYear() === YEAR && d.getMonth() === MONTH; }).length;
const totalCount = vId => (vol(vId)?.prior || 0) + confirmed(vId).length;
const tierOf = n => n >= 9 ? 4 : n >= 7 ? 3 : n >= 5 ? 2 : n >= 3 ? 1 : 0;
const isPast = t => D(t.date) < TODAY;
const signedList = t => DB.parts.filter(p => p.termId === t.id && p.status !== "cancelled");
const signedCount = t => S.isAdmin ? signedList(t).length : (DB.counts[t.id] || 0);
const myPart = (vId, tId) => DB.parts.find(p => p.vId === vId && p.termId === tId);
function volunteersOfMonth(){
  if (!S.isAdmin) return {max:DB.vom[0]?.n || 0, winners:DB.vom.map(x => x.v), ranking:[]};
  const counts = DB.vols.map(v => ({v, n:monthCount(v.id)})).sort((a, b) => b.n - a.n);
  const max = counts[0]?.n || 0;
  return {max, winners:max > 0 ? counts.filter(c => c.n === max).map(c => c.v) : [], ranking:counts};
}
const genPin = () => String(Math.floor(Math.random() * 10000)).padStart(4, "0");
const partner = id => DB.partners.find(p => p.id === id);
const pname = b => partner(b.pid)?.name || "";
function useOf(vId, bId){ return DB.uses.find(u => u.vId === vId && u.bId === bId && u.year === YEAR); }
function benefitState(vId, b){
  if (useOf(vId, b.id)) return "used";
  return yearCount(vId) >= THRESH[b.tier] ? "available" : "locked";
}
function progressText(n){
  const t = tierOf(n);
  if (t === 4) return "Máš najvyššiu úroveň. Všetky benefity sú odomknuté.";
  const miss = THRESH[t + 1] - n;
  const verb = miss === 1 ? "chýba" : miss <= 4 ? "chýbajú" : "chýba";
  return (t ? `Úroveň ${t}. ` : "") + `Do úrovne ${t + 1} ti ${verb} ${sichty(miss)}.`;
}
const avatar = (v, cls = "") => `<span class="avatar ${cls}">${v.photo ? `<img src="${esc(v.photo)}" alt="">` : esc(initials(v))}</span>`;
function benefitPill(state, u){
  if (state === "available") return `<span class="pill p-accent">Dostupný voucher</span>`;
  if (state === "used") return `<span class="pill p-good">${ico("check")} Použité ${fmtNum(D(u.at))} · ${esc(partner(u.pid)?.name || "")}</span>`;
  return "";
}
function attPill(p){
  if (p.status === "confirmed") return `<span class="pill p-good">${ico("check")} Bol tu${p.source === "manual" ? " · ručne" : ""}</span>`;
  if (p.status === "cancelled") return `<span class="pill p-bad">Neprišiel</span>`;
  return `<span class="pill p-muted">Prihlásený</span>`;
}
const typeLabel = t => `<span class="type ${t.type}">${t.type === "shift" ? "Šichta" : "Podujatie"}</span>`;

/* ---------- auth screens ---------- */
function renderAuth(){
  if (S.authMode === "register" && S.form) return `<div class="wrap" style="padding-block:28px 0"><div class="logo" style="width:120px;margin-bottom:28px">${logo("solid")}</div>${S.authErr ? `<p class="ferr" role="alert" style="margin-bottom:16px">${esc(S.authErr)}</p>` : ""}${renderForm()}</div>`;
  const head = `<div class="logo">${logo("solid")}</div>`;
  const err = S.authErr ? `<p class="ferr" role="alert">${esc(S.authErr)}</p>` : "";
  if (S.authMsg) return `<div class="wrap auth">${head}<div class="stack-lg"><div class="stack"><h1>${esc(S.authMsg.title)}</h1><p class="muted">${esc(S.authMsg.body)}</p></div>
    <button class="btn btn-ghost btn-block" data-a="authBack">Späť na prihlásenie</button></div></div>`;
  if (S.authMode === "newpass") return `<div class="wrap auth">${head}<div class="stack-lg"><div class="stack"><h1>Nové heslo</h1><p class="muted">Zadaj nové heslo do aplikácie.</p></div>
    <form class="stack" data-f="newpass"><div class="field"><label for="np-pass">Nové heslo</label><input class="input" id="np-pass" name="pass" type="password" minlength="8" autocomplete="new-password" placeholder="Aspoň 8 znakov" required></div>${err}
    <button class="btn btn-primary btn-block" type="submit">Uložiť heslo</button></form></div></div>`;
  if (S.authMode === "forgot") return `<div class="wrap auth">${head}<div class="stack-lg"><div class="stack"><h1>Zabudnuté heslo</h1><p class="muted">Pošleme ti e-mail s odkazom na nastavenie nového hesla.</p></div>
    <form class="stack" data-f="forgot"><div class="field"><label for="fg-email">E-mail</label><input class="input" id="fg-email" name="email" type="email" autocomplete="email" required></div>${err}
    <button class="btn btn-primary btn-block" type="submit">Poslať odkaz</button></form><button class="linkbtn" style="align-self:center" data-a="authBack">Späť na prihlásenie</button></div></div>`;
  return `<div class="wrap auth">${head}
    <div class="stack-lg">
      <div class="stack"><h1>Dobrovoľníci Fabriky&nbsp;61</h1>
      <p class="muted">Sleduj svoje šichty, prihlasuj sa na podujatia a uplatňuj benefity.</p></div>
      <div class="seg" role="tablist"><button class="on" data-a="authMode" data-v="login">Prihlásenie</button><button data-a="authMode" data-v="register">Registrácia</button></div>
      <form class="stack" data-f="login">
        <div class="field"><label for="a-email">E-mail</label><input class="input" id="a-email" name="email" type="email" autocomplete="email" required></div>
        <div class="field"><label for="a-pass">Heslo</label><input class="input" id="a-pass" name="pass" type="password" autocomplete="current-password" required></div>
        ${err}
        <button class="btn btn-primary btn-block" type="submit">Prihlásiť sa</button>
        <button class="linkbtn" type="button" style="align-self:flex-start" data-a="authMode" data-v="forgot">Zabudnuté heslo?</button>
      </form>
      <div class="divider">alebo</div>
      <button class="btn btn-ghost btn-block" data-a="magic">Poslať prihlasovací odkaz e-mailom</button>
      <p class="muted fs13" style="text-align:center">Vypĺňal/a si už náš dotazník? Stačí sa prihlásiť odkazom na ten istý e-mail.</p>
    </div></div>`;
}

/* ---------- volunteer screens ---------- */
function renderVol(){
  const m = me();
  const views = {home:vHome, terms:vTerms, benefits:vBenefits, profile:vProfile};
  const tabs = [["home","Domov","home"],["terms","Termíny","cal"],["benefits","Benefity","gift"],["profile","Profil","user"]];
  return `<div class="wrap">
      <div class="topbar"><div class="logo">${logo("outline")}</div>
        <div class="row" style="gap:8px">${S.isAdmin ? `<button class="btn btn-ghost btn-xs" data-a="toAdmin">${ico("shield")} Administrácia</button>` : ""}
        <button data-a="vtab" data-v="profile" aria-label="Profil">${avatar(m, "sm")}</button></div></div>
      ${views[S.vtab](m)}
    </div>
    <nav class="tabbar" aria-label="Hlavné menu"><div class="in">${tabs.map(([k, l, i]) =>
      `<button class="${S.vtab === k ? "on" : ""}" data-a="vtab" data-v="${k}" ${S.vtab === k ? 'aria-current="page"' : ""}>${ico(i)}${l}</button>`).join("")}</div></nav>`;
}

function vHome(m){
  const n = yearCount(m.id), {winners, max} = volunteersOfMonth();
  const next = DB.terms.filter(t => !isPast(t) && myPart(m.id, t.id)?.status === "rsvp").sort((a, b) => D(a.date) - D(b.date))[0];
  const cells = Array.from({length:9}, (_, i) => `<i class="${i < n ? "on" : ""}"></i>`).join("");
  const labs = Array.from({length:9}, (_, i) => `<span>${[3,5,7,9].includes(i + 1) ? "Ú" + ([3,5,7,9].indexOf(i + 1) + 1) : ""}</span>`).join("");
  const iWin = winners.some(w => w.id === m.id);
  let iosLater = false; try { iosLater = localStorage.getItem("f61-ios-later") === "1"; } catch (e){}
  const pushCard = S.pushAsk ? `<section class="card stack" style="gap:10px"><div class="row" style="gap:10px">${ico("bell")}<b>Zapni si upozornenia</b></div>
      <p class="muted fs13">Dáme ti vedieť o nových šichtách a podujatiach a deň vopred ti pripomenieme termín, na ktorý si prihlásený/á. Vypnúť ich môžeš kedykoľvek v profile.</p>
      <div class="row" style="flex-wrap:wrap"><button class="btn btn-primary btn-sm" data-a="pushYes">Zapnúť upozornenia</button><button class="linkbtn" data-a="pushLater">Teraz nie</button></div></section>`
    : S.pushIosHint && m.pushEnabled && !iosLater ? `<section class="card stack" style="gap:10px"><div class="row" style="gap:10px">${ico("bell")}<b>Pridaj si aplikáciu na plochu</b></div>
      <p class="muted fs13">Na iPhone ti upozornenia na nové šichty a pripomienky chodia, len keď aplikáciu otvoríš z plochy. V Safari ťukni na Zdieľať a zvoľ Pridať na plochu.</p>
      <button class="linkbtn" style="align-self:flex-start" data-a="iosLater">Rozumiem</button></section>` : "";
  return `<div class="pagehead"><h1>Ahoj, ${esc(m.nick || m.first)}</h1></div>
  <div class="stack-lg">${pushCard}
    <section class="card">
      <div class="label">Rok ${YEAR}</div>
      <div class="row between" style="align-items:flex-end;margin-top:10px">
        <div class="hero-num num">${n}</div>
        <div style="text-align:right"><div class="muted" style="font-size:13px">${pl(n,"šichta","šichty","šichiet")} tento rok</div><div style="font-size:13px">Spolu <b class="num">${totalCount(m.id)}</b></div></div>
      </div>
      <div class="cells" aria-hidden="true">${cells}</div><div class="cells-lab" aria-hidden="true">${labs}</div>
      <p style="margin-top:14px;font-size:14px">${progressText(n)}</p>
    </section>
    ${winners.length ? `<section class="vom">
      ${winners.length === 1 ? avatar(winners[0]) : `<span class="avatar">${ico("check")}</span>`}
      <div class="grow"><div class="label">Dobrovoľník mesiaca · ${MONTHS[MONTH]}</div>
      <h3>${winners.map(w => esc(w.first + " " + w.last)).join(" a ")}</h3>
      <p>${iWin ? "To si ty! " : ""}${sichty(max)} v ${MONTHS_LOC[MONTH]}</p></div></section>` : ""}
    <section>
      <div class="section-h"><h2>Najbližšie</h2><button class="linkbtn" data-a="vtab" data-v="terms">Všetky termíny</button></div>
      ${next ? `<div class="card">${termRow(next, m, true)}</div>` :
        `<div class="card flat"><p class="muted" style="font-size:14px">Zatiaľ nie si prihlásený na žiadny termín.</p>
         <button class="btn btn-ghost btn-sm" style="margin-top:12px" data-a="vtab" data-v="terms">Pozrieť termíny</button></div>`}
    </section>
    <section class="stack">
      <div class="section-h"><h2>Novinky</h2></div>
      ${DB.news.length ? DB.news.map(postCard).join("") : `<p class="empty">Zatiaľ žiadne novinky.</p>`}
    </section>
  </div>`;
}

function postCard(n){
  const kinds = {help:'<span class="pill p-accent">Hľadáme pomoc</span>', photos:'<span class="label">Fotky</span>', info:'<span class="label">Novinka</span>'};
  const t = n.termId && term(n.termId);
  return `<article class="card post">
    <div class="row between">${kinds[n.kind] || kinds.info}<span class="label">${fmtShort(D(n.date))}</span></div>
    <h3>${esc(n.title)}</h3><p style="white-space:pre-line">${esc(n.body)}</p>
    ${t && !isPast(t) ? `<button class="btn btn-ghost btn-sm" style="margin-top:14px" data-a="gotoTerm" data-v="${t.id}">Prihlásiť sa: ${esc(t.title)} ${ico("chev")}</button>` : ""}
    ${n.photos.length ? `<div class="photos ${n.photos.length === 1 ? "n1" : ""}" style="--n:${Math.min(n.photos.length, 3)}">${n.photos.slice(0, 3).map(p => `<img src="${esc(p)}" alt="Fotka k príspevku ${esc(n.title)}" loading="lazy">`).join("")}</div>` : ""}
  </article>`;
}

function termRow(t, m, compact = false){
  const d = D(t.date), p = myPart(m.id, t.id), n = signedCount(t), past = isPast(t);
  let act = "";
  if (!past){
    if (p && p.status === "rsvp") act = `<span class="pill p-good">${ico("check")} Prihlásený</span><button class="linkbtn" data-a="unrsvp" data-v="${t.id}">Zrušiť</button>`;
    else if (p && p.status === "confirmed") act = `<span class="pill p-good">${ico("check")} Účasť potvrdená</span>`;
    else if (p && p.status === "cancelled") act = `<span class="pill p-muted">Účasť zrušená organizátorom</span>`;
    else act = `<button class="btn btn-primary btn-sm" data-a="rsvp" data-v="${t.id}" ${n >= t.cap ? "disabled" : ""}>${n >= t.cap ? "Obsadené" : "Prihlásiť sa"}</button>`;
  }
  return `<div class="term" id="term-${t.id}">
    <div class="datebox"><b class="num">${d.getDate()}</b><span>${MONTHS[d.getMonth()]}</span></div>
    <div class="grow">${typeLabel(t)}<h3 style="margin-top:4px">${esc(t.title)}</h3>
      <div class="meta">${DAYS[d.getDay()]} · ${esc(t.time)}${past ? "" : ` · <span class="num">${n}/${t.cap}</span> prihlásených`}</div>
      ${t.desc && !compact ? `<p class="desc" style="white-space:pre-line">${esc(t.desc)}</p>` : ""}
      ${act ? `<div class="acts">${act}</div>` : ""}</div></div>`;
}

function vTerms(m){
  const f = S.termFilter, ok = t => f === "all" || t.type === f;
  let body;
  if (S.termView === "upcoming"){
    const list = DB.terms.filter(t => !isPast(t) && ok(t)).sort((a, b) => D(a.date) - D(b.date));
    body = list.length ? `<div class="list">${list.map(t => `<div>${termRow(t, m)}</div>`).join("")}</div>` : `<p class="empty">Zatiaľ nie sú vypísané žiadne termíny.</p>`;
  } else {
    const mine = confirmed(m.id).filter(p => !p.termId || ok(term(p.termId))).sort((a, b) => partDate(b) - partDate(a));
    body = mine.length ? `<div class="list">${mine.map(p => { const t = p.termId ? term(p.termId) : null, d = partDate(p);
      return `<div class="term"><div class="datebox"><b class="num">${d.getDate()}</b><span>${MONTHS[d.getMonth()]}</span></div>
        <div class="grow">${t ? typeLabel(t) : '<span class="type shift">Šichta</span>'}<h3 style="margin-top:4px">${esc(t ? t.title : p.label)}</h3>
        <div class="meta">${d.getFullYear()} · započítané${p.source === "manual" ? " ručne" : ""}</div></div></div>`; }).join("")}</div>`
      : `<p class="empty">Zatiaľ tu nič nie je. Po prvej šichte sa tu objaví.</p>`;
  }
  return `<div class="pagehead"><h1>Termíny</h1><p>Šichty sú brigády na oprave a upratovaní Fabriky. Na podujatiach pomáhaš pri bare, vstupe alebo šatni. Obe sa započítavajú do benefitov.</p></div>
  <div class="stack">
    <div class="seg"><button class="${S.termView === "upcoming" ? "on" : ""}" data-a="termView" data-v="upcoming">Nadchádzajúce</button><button class="${S.termView === "history" ? "on" : ""}" data-a="termView" data-v="history">Moja história</button></div>
    <div class="chips">${[["all","Všetko"],["shift","Šichty"],["event","Podujatia"]].map(([k, l]) => `<button class="chip ${f === k ? "on" : ""}" data-a="termFilter" data-v="${k}">${l}</button>`).join("")}</div>
    ${body}
  </div>`;
}

function vBenefits(m){
  const n = yearCount(m.id);
  return `<div class="pagehead"><h1>Benefity</h1><p>Odomykajú sa podľa počtu šichiet v roku ${YEAR}. Počítadlo sa 1. januára vynuluje, celkový počet ti zostáva v profile. Každý benefit môžeš za rok použiť raz. Pri použití ukážeš voucher a pokladník ho potvrdí svojím PINom.</p></div>
  <div class="stack-lg">${[1,2,3,4].map(tier => {
    const open = n >= THRESH[tier], miss = THRESH[tier] - n, list = DB.benefits.filter(b => b.tier === tier);
    return `<section><div class="tier-head"><h2>Úroveň ${tier}</h2>
      <span class="label">${open ? "Odomknuté" : `Od ${THRESH[tier]} šichiet · ${pl(miss,"chýba","chýbajú","chýba")} ${miss}`}</span></div>
      <div class="list">${list.map(b => {
        const st = benefitState(m.id, b), u = useOf(m.id, b.id);
        return `<div class="benefit ${st}"><div><div class="partner">${esc(pname(b))}</div><div class="what">${esc(b.what)}</div></div>
          ${st === "locked" ? "" : `<div class="state">${benefitPill(st, u)}${st === "available" ? `<button class="btn btn-primary btn-xs" data-a="openVoucher" data-v="${b.id}">Použiť</button>` : ""}</div>`}</div>`;
      }).join("") || `<div class="empty">Na tejto úrovni zatiaľ nie je žiadny benefit.</div>`}</div></section>`;
  }).join("")}</div>`;
}

function vProfile(m){
  const pushHint = isIOS && !isStandalone()
    ? "Na iPhone fungujú upozornenia, keď si aplikáciu pridáš na plochu: v Safari ťukni na Zdieľať a zvoľ Pridať na plochu. Potom ju otvor z plochy."
    : "Nové šichty, podujatia, výzvy o pomoc, pripomienka deň pred termínom a potvrdenie účasti.";
  return `<div class="pagehead"><h1>Profil</h1></div>
  <div class="stack-lg">
    <section class="stack" style="align-items:center;text-align:center">
      <label style="position:relative;display:inline-block;cursor:pointer" for="photo-in" title="Zmeniť fotku">
        <span class="avatar lg">${m.photo ? `<img src="${esc(m.photo)}" alt="">` : esc(initials(m))}</span>
        <span style="position:absolute;right:-2px;bottom:-2px;width:32px;height:32px;border-radius:50%;background:var(--fg);color:var(--bg);display:grid;place-items:center;border:3px solid var(--bg)">${ico("camera")}</span>
      </label>
      <input type="file" id="photo-in" accept="image/*" hidden data-c="photo">
      <div><h2 style="font-size:24px">${esc(m.first)} ${esc(m.last)}</h2><p class="muted" style="font-size:14px">${esc(m.email)} · dobrovoľník od ${m.since}</p></div>
    </section>
    <div class="stats">
      <div><b class="num">${yearCount(m.id)}</b><span>Rok ${YEAR}</span></div>
      <div><b class="num">${monthCount(m.id)}</b><span>V ${MONTHS_LOC[MONTH]}</span></div>
      <div><b class="num">${totalCount(m.id)}</b><span>Spolu</span></div>
    </div>
    <section><div class="section-h"><h2>Moje údaje</h2><button class="linkbtn" data-a="editSelf">Upraviť</button></div>
      <div class="card">${kv(infoRows(m))}</div></section>
    <section class="card" style="text-align:center">
      <div class="label">Môj kód</div>
      <div class="qr" style="margin-top:14px">${qrSvg(m.code)}</div>
      <p class="qr-code">${esc(m.code)}</p>
      <p class="muted" style="font-size:13px;margin-top:10px">Ukáž ho pri príchode na šichtu alebo podujatie. Naskenovaním sa ti započíta účasť.</p>
    </section>
    <section class="list">
      <div class="row between"><div class="grow"><div style="font-weight:500">Upozornenia</div><div class="muted" style="font-size:13px">Nové šichty, podujatia a výzvy o pomoc</div></div>
        <button class="switch ${S.pushOn && m.pushEnabled ? "on" : ""}" role="switch" aria-checked="${S.pushOn && m.pushEnabled}" aria-label="Upozornenia" data-a="togglePush"></button></div>
      <div class="muted" style="font-size:13px">${pushHint}</div>
    </section>
    <button class="btn btn-ghost btn-block" data-a="logout">${ico("out")} Odhlásiť sa</button>
  </div>`;
}

function qrSvg(text){
  try {
    if (typeof qrcode === "undefined") throw 0;
    const q = qrcode(0, "M"); q.addData(text); q.make();
    return q.createSvgTag({cellSize:4, margin:0, scalable:true});
  } catch (e){ return `<div style="aspect-ratio:1;display:grid;place-items:center;color:#6C6B65;font-family:var(--mono);font-size:12px">${esc(text)}</div>`; }
}

/* ---------- voucher sheet ---------- */
function renderVoucher(){
  const m = me(), b = DB.benefits.find(x => x.id === S.voucher); if (!b) return "";
  const p = partner(b.pid), lock = (S.lockUntil[b.id] || 0) - Date.now(), u = S.justUsed;
  const keys = ["1","2","3","4","5","6","7","8","9","","0","del"];
  return `<div class="sheet" role="dialog" aria-modal="true" aria-label="Voucher"><div class="wrap">
    <div class="row between" style="padding-block:16px 8px"><span class="label">Voucher</span><button class="btn btn-ghost btn-sm" data-a="closeVoucher">${u ? "Hotovo" : "Zavrieť"}</button></div>
    <div class="ticket ${u ? "used" : ""}">
      <div class="row between"><span class="tlogo">${logo("outline")}</span><span class="label">Úroveň ${b.tier}</span></div>
      <div><div class="label" style="margin-top:22px">${esc(p?.name)}</div><div class="twhat">${esc(b.what)}</div></div>
      <div class="row" style="margin-top:20px">${avatar(m, "sm")}<div class="grow"><div style="font-weight:600;font-size:14px">${esc(m.first)} ${esc(m.last)}</div><div style="font-size:12px;opacity:.7">Platí do 31. 12. ${YEAR}</div></div>
        ${u ? "" : `<div style="text-align:right"><div class="mono num" id="vclock" style="font-size:15px">${new Date().toTimeString().slice(0, 8)}</div><div style="font-size:10.5px;opacity:.65">živý voucher</div></div>`}</div>
      ${u ? "" : '<div class="shimmer" aria-hidden="true"></div>'}
    </div>
    ${u ? `<div class="stack" style="align-items:center;text-align:center;padding-block:32px">
        <span class="okmark">${ico("check")}</span><h2 style="font-size:24px">Použité</h2>
        <p class="muted">${fmtNum(D(u.at))} o ${u.time} · ${esc(p?.name)}</p>
        <p class="muted" style="font-size:13px">Záznam je uložený. Voucher sa už nedá použiť znova.</p></div>`
    : lock > 0 ? `<div class="stack" style="align-items:center;text-align:center;padding-block:32px">
        <h2 style="font-size:20px">Voucher je dočasne zablokovaný</h2>
        <p class="muted">Trikrát nesprávny PIN. Skús znova o <b class="mono num" id="lockcd">${fmtCd(lock)}</b>.</p></div>`
    : `<div class="stack" style="align-items:center;padding-block:24px 8px">
        <p style="font-weight:600">Podaj mobil pokladníkovi</p>
        <p class="muted" style="font-size:13px;text-align:center;margin-top:-6px">Zadá PIN partnera ${esc(p?.name)} a voucher sa označí ako použitý.</p>
        <div class="dots ${S.pinErr ? "err" : ""}" aria-label="Zadané číslice: ${S.pin.length} zo 4">${[0,1,2,3].map(i => `<i class="${i < S.pin.length ? "on" : ""}"></i>`).join("")}</div>
        <p class="pinerr" role="alert">${S.pinErr ? esc(S.pinErr) : "&nbsp;"}</p>
        <div class="keypad">${keys.map(k => k === "" ? "<span></span>" : `<button data-a="pinKey" data-v="${k}" aria-label="${k === "del" ? "Zmazať" : k}">${k === "del" ? ico("x") : k}</button>`).join("")}</div>
      </div>`}
  </div></div>`;
}
const fmtCd = ms => { const s = Math.ceil(ms / 1000); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`; };
setInterval(() => {
  if (!S.voucher) return;
  const c = document.getElementById("vclock"); if (c) c.textContent = new Date().toTimeString().slice(0, 8);
  const lock = (S.lockUntil[S.voucher] || 0) - Date.now(), cd = document.getElementById("lockcd");
  if (cd){ if (lock > 0) cd.textContent = fmtCd(lock); else { S.pinErr = null; render(); } }
}, 1000);

/* ---------- intake form (same questions as the Google form) ---------- */
const OPT = {
  age:["15 – 18","19 – 25","26 – 30","31 – 45","46 – 60","60 +"],
  when:["Pracovné dni","Víkendy"],
  part:["Doobeda","Poobede","Večer","Celý deň"],
  freq:["Vždy, keď budete potrebovať pomoc","Iba keď je urgentná potreba","Raz za mesiac","Iba na veľké projekty"],
  channel:["E-mail","SMS","Facebook","Instagram","TikTok"],
  help:["Manuálne práce","Technika (svetlá, zvuk)","Grafika","Foto / video","Produkcia","Práca s ľuďmi","Sociálne siete / marketing","Finančne cez zbierky","Fundraising","Remeslá"],
  hobby:["Umenie a kultúra","Šport a pohyb","Vzdelávanie a osobný rozvoj","Aktivizmus a komunitné aktivity","Tvorivé handmade hobby","Priatelia, zábava","Cestovanie"],
  source:["Kamaráti, rodina, známi","Škola","Facebook","TikTok","Instagram"],
  status:["Nový","Aktívny","Neaktívny","Bývalý"],
};
const LONG = {"Manuálne práce":"Manuálne práce: zametanie, upratovanie, vynášanie vecí, čistenie"};
const STATUS_PILL = {"Nový":"p-accent","Aktívny":"p-good","Neaktívny":"p-muted","Bývalý":"p-bad"};
const MULTI = ["when","part","freq","channel","help","hobby","source"];
const STEPS = [
  {t:"Osobné údaje", req:["first","last","bday","city","email","phone","age"]},
  {t:"Dostupnosť", req:["when","part","freq","channel"]},
  {t:"Ako pomôžeš", req:["help"]},
  {t:"Záujmy a súhlas", req:["hobby","source"]},
];
const GDPR_TEXT = "Súhlasím so spracovaním svojich osobných údajov uvedených v tomto dotazníku pre účely evidencie dobrovoľníkov a komunikácie v rámci občianskeho združenia Fabrika Umenia, v súlade s GDPR.";
const blankVol = () => ({first:"",last:"",nick:"",bday:"",city:"",email:"",phone:"",age:"",when:[],whenOther:"",part:[],partOther:"",freq:[],freqOther:"",
  channel:[],social:"",channelOther:"",help:[],helpOther:"",hobby:[],hobbyOther:"",ideas:"",source:[],sourceOther:"",photoOk:false,gdpr:false,pass:""});
const withOther = (v, k) => [...(v[k] || []), ...(v[k + "Other"] ? [v[k + "Other"]] : [])];
const channelText = v => [...withOther(v,"channel"), v.social].filter(Boolean).join(", ");
const needsSocial = d => d.channel.some(c => ["Facebook","Instagram","TikTok"].includes(c));

function openForm(mode, vId){
  const src = vId ? vol(vId) : null;
  S.form = {mode, step:0, vId:vId || null, err:{}, data:Object.assign(blankVol(), src ? JSON.parse(JSON.stringify(src)) : {})};
}
function validateStep(i){
  const F = S.form, d = F.data, err = {};
  const lax = F.mode.startsWith("admin");
  for (const k of STEPS[i].req){
    if (lax && !["first","last","email"].includes(k)) continue;
    if (MULTI.includes(k)){ if (!d[k].length && !String(d[k + "Other"] || "").trim()) err[k] = "Vyber aspoň jednu možnosť."; }
    else if (!String(d[k] || "").trim()) err[k] = "Toto pole je povinné.";
  }
  if (i === 0){
    if (d.email && !/^\S+@\S+\.\S+$/.test(d.email.trim())) err.email = "Skontroluj e-mailovú adresu.";
    if (d.bday && !/^\s*\d{1,2}\s*\.\s*\d{1,2}\s*\.?\s*$/.test(d.bday)) err.bday = "Napíš deň a mesiac, napríklad 21. 7.";
    if (d.phone && d.phone.replace(/\D/g,"").length < 9) err.phone = "Skontroluj telefónne číslo.";
    if (F.mode === "register" && String(d.pass || "").length < 8) err.pass = "Heslo musí mať aspoň 8 znakov.";
  }
  if (i === 3 && ["register","admin-new","complete"].includes(F.mode) && !d.gdpr) err.gdpr = "Bez súhlasu nemôžeme údaje evidovať.";
  F.err = err;
  return !Object.keys(err).length;
}
const fErr = k => S.form.err[k] ? `<p class="ferr" role="alert">${esc(S.form.err[k])}</p>` : "";
function fText(k, label, o = {}){
  const v = S.form.data[k] ?? "";
  const attrs = `id="f-${k}" data-fk="${k}" ${o.dis ? "disabled" : ""} ${o.type ? `type="${o.type}"` : ""} ${o.ph ? `placeholder="${esc(o.ph)}"` : ""} ${o.ac ? `autocomplete="${o.ac}"` : ""} ${o.im ? `inputmode="${o.im}"` : ""}`;
  return `<div class="field"><label for="f-${k}">${label}${o.req ? ' <span aria-hidden="true">*</span>' : ""}</label>
    ${o.area ? `<textarea class="input" ${attrs}>${esc(v)}</textarea>` : `<input class="input" ${attrs} value="${esc(v)}">`}${fErr(k)}</div>`;
}
function fChips(k, label, opts, o = {}){
  const d = S.form.data, multi = MULTI.includes(k);
  return `<fieldset class="fset"><legend>${label}${o.req ? ' <span aria-hidden="true">*</span>' : ""}</legend>
    ${multi ? `<p class="muted fs13">Môžeš vybrať viac možností.</p>` : ""}
    <div class="chips">${opts.map(x => { const on = multi ? d[k].includes(x) : d[k] === x;
      return `<button type="button" class="chip ${on ? "on" : ""}" aria-pressed="${on}" data-a="fchip" data-k="${k}" data-v="${esc(x)}">${on ? ico("check") : ""}${esc(LONG[x] || x)}</button>`; }).join("")}</div>
    ${multi ? `<input class="input" id="f-${k}Other" data-fk="${k}Other" value="${esc(d[k + "Other"])}" placeholder="${esc(o.otherPh || "Iné")}" aria-label="${esc(label)}: iné">` : ""}
    ${o.extra || ""}${fErr(k)}</fieldset>`;
}

function renderForm(){
  const F = S.form, d = F.data, i = F.step, last = i === STEPS.length - 1, reg = F.mode === "register";
  const heads = {register:"Registrácia dobrovoľníka", self:"Moje údaje", complete:"Doplň svoje údaje", "admin-new":"Nový dobrovoľník", "admin-edit":`Upraviť: ${esc(d.first)} ${esc(d.last)}`};
  let body = "";
  if (i === 0) body = `
    ${reg ? `<p class="muted">Vitaj! Ak si sa dostal/a až sem, chceš nám pomôcť so starou baťovskou fabrikou č. 61 a to nás veľmi teší. Dotazník vyplníš len raz a zaberie asi 5 minút.</p>` : ""}
    ${F.mode === "admin-new" ? `<p class="muted">Na prepis papierového formulára alebo pre niekoho, kto nemá smartfón. Ak sa neskôr prihlási odkazom na tento e-mail, záznam sa mu automaticky priradí.</p>` : ""}
    ${F.mode === "complete" ? `<p class="muted">Vitaj! Kým začneš, doplň nám prosím pár údajov. Dotazník vyplníš len raz a zaberie asi 5 minút.</p>` : ""}
    <div class="grid2">${fText("first","Meno",{req:1, ac:"given-name"})}${fText("last","Priezvisko",{req:1, ac:"family-name"})}</div>
    ${fText("nick","Prezývka alebo preferované oslovenie",{ph:"Nepovinné"})}
    <div class="grid2">${fText("bday","Dátum narodenia",{req:1, ph:"Stačí deň a mesiac, napr. 21. 7."})}${fText("city","Mesto, kde bývaš",{req:1, ac:"address-level2"})}</div>
    ${fText("email","E-mail, cez ktorý ti môžeme písať",{req:1, type:"email", ac:"email", dis:["self","complete"].includes(F.mode) || (F.mode === "admin-edit" && !!vol(F.vId)?.uid)})}
    ${fText("phone","Telefónne číslo",{req:1, type:"tel", ac:"tel", im:"tel"})}
    ${fChips("age","Veková kategória",OPT.age,{req:1})}
    ${reg ? fText("pass","Heslo do aplikácie",{req:1, type:"password", ph:"Aspoň 8 znakov", ac:"new-password"}) : ""}`;
  if (i === 1) body = `
    ${fChips("when","Kedy nám vieš pomáhať?",OPT.when,{req:1})}
    ${fChips("part","V tie dni môžeš skôr",OPT.part,{req:1})}
    ${fChips("freq","Ako často chceš byť oslovený/á?",OPT.freq,{req:1})}
    ${fChips("channel","Aká forma komunikácie ti vyhovuje?",OPT.channel,{req:1, extra: needsSocial(d) ? `<div style="margin-top:4px">${fText("social","Odkaz na tvoj profil",{ph:"napr. instagram.com/tvojemeno"})}</div>` : ""})}`;
  if (i === 2) body = `
    ${fChips("help","Akou formou nám vieš alebo chceš pomáhať?",OPT.help,{req:1, otherPh:"Iné, alebo aké remeslo (napr. tesár, krajčírka)"})}`;
  if (i === 3){
    const fresh = reg || F.mode === "admin-new" || F.mode === "complete";
    body = `
    ${fChips("hobby","Čomu sa rád/rada venuješ vo voľnom čase?",OPT.hobby,{req:1})}
    ${fText("ideas","Aké benefity alebo motivácie by ťa potešili?",{area:1, ph:"Nepovinné"})}
    ${fChips("source","Ako si sa o nás dozvedel/a?",OPT.source,{req:1})}
    <div class="stack" style="gap:10px">
      ${fresh ? `<label class="check"><input type="checkbox" id="f-gdpr" data-fk="gdpr" ${d.gdpr ? "checked" : ""}><span>${F.mode === "admin-new" ? "Dobrovoľník udelil súhlas so spracovaním osobných údajov, napríklad podpisom papierového formulára." : esc(GDPR_TEXT)} *</span></label>${fErr("gdpr")}`
        : `<p class="muted fs13">Súhlas so spracovaním údajov udelený ${d.gdprAt ? fmtNum(D(d.gdprAt)) : ""}.</p>`}
      <label class="check"><input type="checkbox" id="f-photoOk" data-fk="photoOk" ${d.photoOk ? "checked" : ""}><span>Súhlasím, že ma Fabrika môže zachytiť na fotkách z podujatí. Nepovinné.</span></label>
    </div>`;
  }
  const doneLabel = reg ? "Vytvoriť účet" : F.mode === "admin-new" ? "Pridať dobrovoľníka" : F.mode === "complete" ? "Hotovo" : "Uložiť zmeny";
  return `<div class="stack-lg" id="form-top">
    <div class="stack" style="gap:10px">
      <div class="row between"><span class="label">Krok ${i + 1} / ${STEPS.length} · ${STEPS[i].t}</span>
        ${reg || F.mode === "complete" ? "" : `<button class="iconbtn" aria-label="Zavrieť" data-a="fclose">${ico("x")}</button>`}</div>
      <div class="steps" aria-hidden="true">${STEPS.map((_, j) => `<i class="${j <= i ? "on" : ""}"></i>`).join("")}</div>
      <h1 style="font-size:28px">${heads[F.mode]}</h1>
    </div>
    <div class="stack-lg">${body}</div>
    <div class="formfoot">
      ${i === 0 && F.mode === "complete" ? `<button class="btn btn-ghost" data-a="logout">Odhlásiť</button>` : `<button class="btn btn-ghost" data-a="fback">${i === 0 ? (reg ? "Späť na prihlásenie" : "Zrušiť") : "Späť"}</button>`}
      <button class="btn btn-primary grow" data-a="${last ? "fsave" : "fnext"}">${last ? doneLabel : "Pokračovať"}</button>
    </div>
  </div>`;
}

async function commitForm(){
  const F = S.form, d = F.data, row = toRow(d), email = String(d.email || "").trim().toLowerCase();
  const base = location.origin + location.pathname;
  if (F.mode === "register"){
    const { data, error } = await sb.auth.signUp({email, password:d.pass, options:{emailRedirectTo:base, data:{...row, gdpr:!!d.gdpr}}});
    if (error) throw error;
    S.form = null;
    if (!data.session) S.authMsg = {title:"Skontroluj si e-mail", body:`Poslali sme ti odkaz na ${email}. Kliknutím naň potvrdíš registráciu a prihlásiš sa.`};
    return;
  }
  if (F.mode === "admin-new"){
    must(await sb.from("volunteers").insert({...row, email, status:"Nový", origin:"Zadal admin", gdpr_consent_at:d.gdpr ? new Date().toISOString() : null}).select().single());
    toast("Dobrovoľník pridaný");
  } else if (F.mode === "admin-edit"){
    const v = vol(F.vId), patch = {...row};
    if (!v.uid && email) patch.email = email;
    must(await sb.from("volunteers").update(patch).eq("id", F.vId));
    toast("Údaje uložené");
  } else {
    const patch = {...row};
    if (F.mode === "complete") patch.gdpr_consent_at = new Date().toISOString();
    must(await sb.from("volunteers").update(patch).eq("id", S.me));
    toast(F.mode === "complete" ? "Ďakujeme, vitaj vo Fabrike!" : "Údaje uložené");
  }
  S.form = null; S.panelTop = true;
  await refresh();
}

/* ---------- profile: my details ---------- */
function infoRows(v){
  return [
    ["Prezývka", v.nick], ["Telefón", v.phone], ["Mesto", v.city], ["Narodeniny", v.bday], ["Veková kategória", v.age],
    ["Kedy môžem", [...withOther(v,"when"), ...withOther(v,"part")].join(", ")],
    ["Ako často ma osloviť", withOther(v,"freq").join(", ")],
    ["Komunikácia", channelText(v)],
    ["Ako pomáham", withOther(v,"help").join(", ")],
    ["Záujmy", withOther(v,"hobby").join(", ")],
  ].filter(r => r[1]);
}
const kv = rows => `<dl class="kv">${rows.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join("")}</dl>`;

/* ---------- admin CRM ---------- */
const F0 = () => ({status:"", age:"", when:"", part:"", city:"", channel:"", source:"", help:[], hobby:[]});
const lastPart = vId => confirmed(vId).map(partDate).sort((a, b) => b - a)[0] || null;
const bdayMonth = v => { const m = /(\d{1,2})\s*\.\s*(\d{1,2})/.exec(v.bday || ""); return m ? {d:+m[1], m:+m[2]} : null; };
const FLT_LABELS = {status:"Stav", age:"Vek", when:"Kedy", part:"Časť dňa", city:"Mesto", channel:"Komunikácia", source:"Zdroj"};

function matches(v){
  const f = S.flt, q = S.peopleQ.toLowerCase().trim();
  if (q && ![v.first, v.last, v.nick, v.email, v.phone, v.city, (v.tags || []).join(" "), v.notes, v.helpOther].join(" ").toLowerCase().includes(q)) return false;
  if (f.status && v.status !== f.status) return false;
  if (f.age && v.age !== f.age) return false;
  if (f.city && v.city !== f.city) return false;
  for (const k of ["when","part","channel","source"]) if (f[k] && !v[k].includes(f[k])) return false;
  if (f.help.length && !f.help.some(h => v.help.includes(h))) return false;
  if (f.hobby.length && !f.hobby.some(h => v.hobby.includes(h))) return false;
  return true;
}
function sortedRows(){
  const {k, dir} = S.sort;
  const key = {name: v => (v.last + " " + v.first).toLowerCase(), year: v => yearCount(v.id), total: v => totalCount(v.id),
    last: v => lastPart(v.id)?.getTime() || 0, reg: v => v.registered}[k];
  return DB.vols.filter(matches).sort((a, b) => { const x = key(a), y = key(b); return (x > y ? 1 : x < y ? -1 : 0) * dir; });
}
const activeFilters = () => Object.entries(S.flt).filter(([k, v]) => Array.isArray(v) ? v.length : v);

function aPeople(){
  const rows = sortedRows(), f = S.flt, nf = activeFilters().length;
  const cities = [...new Set(DB.vols.map(v => v.city))].sort((a, b) => a.localeCompare(b, "sk"));
  const sel = (k, opts) => `<div class="field"><label for="flt-${k}">${FLT_LABELS[k]}</label><select class="input" id="flt-${k}" data-c="flt" data-k="${k}"><option value="">Všetko</option>${opts.map(o => `<option ${f[k] === o ? "selected" : ""}>${esc(o)}</option>`).join("")}</select></div>`;
  const chipF = (k, opts) => `<div class="chips">${opts.map(o => `<button class="chip ${f[k].includes(o) ? "on" : ""}" aria-pressed="${f[k].includes(o)}" data-a="fltChip" data-k="${k}" data-v="${esc(o)}">${esc(o)}</button>`).join("")}</div>`;
  const th = (k, l, cls = "") => `<th class="${cls}"><button class="sortbtn" data-a="sort" data-v="${k}">${l}${S.sort.k === k ? (S.sort.dir > 0 ? " ↑" : " ↓") : ""}</button></th>`;
  const counts = Object.fromEntries(OPT.status.map(s => [s, DB.vols.filter(v => v.status === s).length]));
  return `<div class="stack-lg">
    <div class="row" style="flex-wrap:wrap">
      <input class="input grow" style="min-width:220px" id="people-q" placeholder="Hľadať meno, telefón, štítok, poznámku…" value="${esc(S.peopleQ)}" data-c="peopleQ" aria-label="Hľadať dobrovoľníka">
      <button class="btn btn-ghost btn-sm" data-a="toggleFilters" aria-expanded="${S.showFilters}">Filtre${nf ? ` <span class="count">${nf}</span>` : ""}</button>
      <button class="btn btn-ghost btn-sm" data-a="openExport">Export</button>
      <button class="btn btn-primary btn-sm" data-a="newVol">${ico("plus")} Pridať dobrovoľníka</button>
    </div>
    <div class="chips">
      <button class="chip ${!f.status ? "on" : ""}" data-a="fltStatus" data-v="">Všetci ${DB.vols.length}</button>
      ${OPT.status.map(s => `<button class="chip ${f.status === s ? "on" : ""}" data-a="fltStatus" data-v="${s}">${s} ${counts[s]}</button>`).join("")}
    </div>
    ${S.showFilters ? `<section class="card stack-lg">
      <div class="fgrid">${sel("age", OPT.age)}${sel("when", OPT.when)}${sel("part", OPT.part)}${sel("city", cities)}${sel("channel", OPT.channel)}${sel("source", OPT.source)}</div>
      <div class="stack" style="gap:8px"><div class="label">Ako pomáha · aspoň jedno z</div>${chipF("help", OPT.help)}</div>
      <div class="stack" style="gap:8px"><div class="label">Záujmy · aspoň jedno z</div>${chipF("hobby", OPT.hobby)}</div>
      <div class="row between"><span class="muted fs13">Filtre sa použijú aj pri exporte.</span>${nf ? `<button class="linkbtn" data-a="fltReset">Zrušiť všetky filtre</button>` : ""}</div>
    </section>` : ""}
    <div class="row between" style="flex-wrap:wrap"><span class="muted fs13">Zobrazených <b class="num">${rows.length}</b> z ${DB.vols.length} dobrovoľníkov</span>
      ${rows.length ? `<button class="linkbtn" data-a="copyEmails">Kopírovať e-maily zobrazených</button>` : ""}</div>
    <div class="tablewrap"><table class="crm"><thead><tr>
      ${th("name","Meno")}<th>Stav</th><th>Kontakt</th><th>Mesto · vek</th><th>Ako pomáha</th><th>Kedy</th>${th("year", YEAR, "n")}${th("total","Spolu","n")}${th("last","Posledná účasť","n")}
    </tr></thead><tbody>${rows.map(v => { const lp = lastPart(v.id);
      return `<tr class="${v.id === S.selVol ? "sel" : ""}" data-a="selVol" data-v="${v.id}" tabindex="0">
        <td><div class="row" style="gap:10px">${avatar(v,"sm")}<div><div style="font-weight:500">${esc(v.first)} ${esc(v.last)}</div><div class="sub">${esc(v.nick || "")}${(v.tags || []).length ? `${v.nick ? " · " : ""}${esc(v.tags.join(", "))}` : ""}</div></div></div></td>
        <td><span class="pill ${STATUS_PILL[v.status]}">${esc(v.status)}</span></td>
        <td><div style="white-space:nowrap">${esc(v.phone)}</div><div class="sub">${esc(v.email)}</div></td>
        <td><div>${esc(v.city)}</div><div class="sub">${esc(v.age)}</div></td>
        <td class="wrapcell">${esc(withOther(v,"help").join(", "))}</td>
        <td class="wrapcell">${esc([...v.when, ...v.part].join(", "))}</td>
        <td class="n">${yearCount(v.id)}</td><td class="n">${totalCount(v.id)}</td><td class="n">${lp ? fmtNum(lp) : "–"}</td></tr>`; }).join("") ||
      `<tr><td colspan="9" class="empty" style="cursor:default">Nikto nevyhovuje filtrom.</td></tr>`}</tbody></table></div>
  </div>`;
}

function renderDrawer(){
  const v = vol(S.selVol); if (!v) return "";
  const all = DB.parts.filter(p => p.vId === v.id).sort((a, b) => partDate(b) - partDate(a));
  const uses = DB.uses.filter(u => u.vId === v.id && D(u.at).getFullYear() === YEAR);
  const lp = lastPart(v.id), delKey = "vol:" + v.id;
  const chipList = list => list.length ? `<div class="chips">${list.map(x => `<span class="pill p-muted">${esc(x)}</span>`).join("")}</div>` : `<span class="muted">–</span>`;
  return `<div class="drawer-bg" data-a="closeDrawer"></div>
  <aside class="drawer" role="dialog" aria-modal="true" aria-label="Karta dobrovoľníka">
    <div class="row between"><span class="label">Karta dobrovoľníka</span><button class="iconbtn" aria-label="Zavrieť" data-a="closeDrawer">${ico("x")}</button></div>
    <div class="row" style="margin-top:14px">${avatar(v)}<div class="grow"><h2 style="font-size:22px">${esc(v.first)} ${esc(v.last)}</h2>
      <div class="muted fs13">${v.nick ? `Oslovovať: ${esc(v.nick)} · ` : ""}registrácia ${fmtNum(D(v.registered))} · ${esc(v.origin)} · kód ${esc(v.code)}</div>
      ${v.uid ? "" : `<div class="muted fs13">Do aplikácie sa ešte neprihlásil/a.</div>`}${v.gdprAt ? "" : `<div class="fs13" style="color:var(--warn)">Chýbajú údaje z dotazníka a súhlas GDPR. Doplní ich pri prvom prihlásení.</div>`}</div></div>
    <div class="row" style="margin-top:14px;flex-wrap:wrap">
      <select class="input" style="width:auto;height:38px" data-c="vstatus" aria-label="Stav">${OPT.status.map(s => `<option ${v.status === s ? "selected" : ""}>${s}</option>`).join("")}</select>
      <button class="btn btn-ghost btn-sm" data-a="editVol">Upraviť údaje</button>
    </div>
    <div class="stats" style="margin-top:18px"><div><b class="num">${yearCount(v.id)}</b><span>Rok ${YEAR}</span></div><div><b class="num">${totalCount(v.id)}</b><span>Spolu</span></div><div><b class="num" style="font-size:18px;line-height:1.9">${lp ? fmtNum(lp) : "–"}</b><span>Posledná účasť</span></div></div>

    <section class="dsec"><h3>Kontakt</h3>
      <dl class="kv"><dt>E-mail</dt><dd>${esc(v.email)} <button class="linkbtn" data-a="copy" data-v="${esc(v.email)}">Kopírovať</button></dd>
      <dt>Telefón</dt><dd>${esc(v.phone)} <button class="linkbtn" data-a="copy" data-v="${esc(v.phone)}">Kopírovať</button></dd>
      <dt>Mesto</dt><dd>${esc(v.city)}</dd><dt>Narodeniny</dt><dd>${esc(v.bday)}</dd><dt>Veková kategória</dt><dd>${esc(v.age)}</dd></dl></section>
    <section class="dsec"><h3>Dostupnosť a komunikácia</h3>
      ${kv([["Kedy", withOther(v,"when").join(", ")], ["Časť dňa", withOther(v,"part").join(", ")], ["Ako často osloviť", withOther(v,"freq").join(", ")], ["Komunikácia", channelText(v)]])}</section>
    <section class="dsec"><h3>Ako pomáha</h3>${chipList(withOther(v,"help"))}</section>
    <section class="dsec"><h3>Záujmy</h3>${chipList(withOther(v,"hobby"))}</section>
    <section class="dsec"><h3>Z dotazníka</h3>${kv([["Nápady na benefity", v.ideas || "–"], ["Ako sa o nás dozvedel/a", withOther(v,"source").join(", ")]])}</section>

    <section class="dsec"><h3>Štítky</h3>
      <div class="chips">${(v.tags || []).map((t, i) => `<span class="pill p-ink">${esc(t)}<button class="tagx" aria-label="Odstrániť štítok ${esc(t)}" data-a="delTag" data-v="${i}">${ico("x")}</button></span>`).join("")}</div>
      <form class="row" data-f="addTag" style="margin-top:10px"><input class="input grow" style="height:38px" id="tag-in" name="tag" placeholder="Nový štítok, napr. Vodičák B" required><button class="btn btn-ghost btn-sm" type="submit">Pridať</button></form></section>
    <section class="dsec"><h3>Interné poznámky</h3>
      <textarea class="input" id="notes-${v.id}" data-vn="notes" placeholder="Vidia ich len admini">${esc(v.notes)}</textarea>
      <p class="muted fs13" id="notes-state">Ukladá sa automaticky. Dobrovoľník poznámky nevidí.</p></section>

    <section class="dsec"><h3>Účasť na šichtách a podujatiach</h3>
      ${all.map(p => { const t = p.termId && term(p.termId); if (p.termId && !t) return ""; const key = "part:" + p.id;
        return `<div class="att"><div class="grow"><div style="font-weight:500">${esc(t ? t.title : p.label)}</div><div class="muted" style="font-size:12px">${fmtNum(partDate(p))} · ${t ? (t.type === "shift" ? "šichta" : "podujatie") : "pridané ručne"}</div></div>${attPill(p)}
        ${p.status === "confirmed" ? (S.confirmDel === key ? `<button class="btn btn-xs" style="background:var(--bad);color:#fff" data-a="delPart" data-v="${p.id}">Zmazať</button><button class="btn btn-ghost btn-xs" data-a="cancelDel">Nechať</button>`
          : `<button class="iconbtn" aria-label="Zmazať záznam" data-a="askDel" data-v="${key}">${ico("trash")}</button>`) : ""}</div>`; }).join("") || `<p class="empty">Zatiaľ žiadna účasť.</p>`}
      <form class="stack" data-f="manualPart" style="margin-top:12px"><div class="label">Pridať účasť ručne</div>
        <div class="row" style="flex-wrap:wrap"><input class="input grow" style="min-width:160px" id="mp-label" name="label" placeholder="Napr. Pomoc s inventúrou" required><input class="input" style="width:170px" id="mp-date" name="date" type="date" value="${TODAY_ISO}" required></div>
        <button class="btn btn-ghost btn-sm" type="submit" style="align-self:flex-start">${ico("plus")} Pridať</button></form></section>

    <section class="dsec"><h3>Použité benefity ${YEAR}</h3>
      ${uses.map(u => { const b = DB.benefits.find(x => x.id === u.bId); return b ? `<div class="att"><div class="grow">${esc(b.what)}<div class="muted" style="font-size:12px">${esc(partner(u.pid)?.name)}</div></div><span class="mono muted" style="font-size:12px">${fmtNum(D(u.at))}</span></div>` : ""; }).join("") || `<p class="empty">Zatiaľ žiadny.</p>`}</section>

    <section class="dsec"><h3>Nastavenia a súhlasy</h3>
      <div class="row"><label for="role-sel" class="grow">Rola v aplikácii</label><select class="input" id="role-sel" style="width:auto;height:38px" data-c="role"><option value="volunteer" ${v.role === "volunteer" ? "selected" : ""}>Dobrovoľník</option><option value="admin" ${v.role === "admin" ? "selected" : ""}>Admin</option></select></div>
      <div class="row" style="margin-top:10px"><label for="prior" class="grow">Šichty z minulých rokov</label><input class="input num" id="prior" type="number" min="0" style="width:90px;height:38px" value="${v.prior}" data-c="prior"></div>
      ${kv([["Súhlas GDPR", v.gdprAt ? `udelený ${fmtNum(D(v.gdprAt))}` : "chýba"], ["Fotky z podujatí", v.photoOk ? "súhlasí" : "nesúhlasí"],
        ["Upozornenia", !v.pushEnabled ? "vypnul/a si ich" : DB.subs?.[v.id] ? `zapnuté (${DB.subs[v.id]} ${pl(DB.subs[v.id],"zariadenie","zariadenia","zariadení")})` : "ešte ich nepovolil/a v telefóne"]])}
      <div style="margin-top:16px">${S.confirmDel === delKey ? `<p class="fs13" style="margin-bottom:8px">Vymazať ${esc(v.first)} ${esc(v.last)} aj všetky jeho údaje? Počty účastí na termínoch sa zachovajú bez mena. Nedá sa to vrátiť.</p>
        <div class="row"><button class="btn btn-sm" style="background:var(--bad);color:#fff" data-a="delVol" data-v="${v.id}">Vymazať natrvalo</button><button class="btn btn-ghost btn-sm" data-a="cancelDel">Nechať</button></div>`
        : `<button class="btn btn-ghost btn-sm" style="color:var(--bad)" data-a="askDel" data-v="${delKey}">${ico("trash")} Vymazať údaje (žiadosť podľa GDPR)</button>`}</div></section>
  </aside>`;
}

/* ---------- export ---------- */
const EXP = [
  ["name","Meno a priezvisko", v => `${v.first} ${v.last}`, 1], ["nick","Prezývka", v => v.nick, 0],
  ["email","E-mail", v => v.email, 1], ["phone","Telefón", v => v.phone, 1], ["city","Mesto", v => v.city, 1],
  ["bday","Narodeniny", v => v.bday, 0], ["age","Veková kategória", v => v.age, 1], ["status","Stav", v => v.status, 1],
  ["when","Kedy môže", v => withOther(v,"when").join(", "), 0], ["part","Časť dňa", v => withOther(v,"part").join(", "), 0],
  ["freq","Ako často osloviť", v => withOther(v,"freq").join(", "), 0], ["channel","Komunikácia", channelText, 0],
  ["help","Ako pomáha", v => withOther(v,"help").join(", "), 1], ["hobby","Záujmy", v => withOther(v,"hobby").join(", "), 0],
  ["ideas","Nápady na benefity", v => v.ideas, 0], ["source","Ako sa dozvedel/a", v => withOther(v,"source").join(", "), 0],
  ["year",`Účasť ${YEAR}`, v => yearCount(v.id), 1], ["total","Účasť spolu", v => totalCount(v.id), 1],
  ["last","Posledná účasť", v => { const d = lastPart(v.id); return d ? fmtNum(d) : ""; }, 0],
  ["tags","Štítky", v => (v.tags || []).join(", "), 0], ["notes","Interné poznámky", v => v.notes, 0],
  ["registered","Registrácia", v => fmtNum(D(v.registered)), 0], ["origin","Zdroj záznamu", v => v.origin, 0],
  ["gdpr","Súhlas GDPR", v => v.gdprAt ? fmtNum(D(v.gdprAt)) : "", 0], ["photoOk","Súhlas s fotkami", v => v.photoOk ? "áno" : "nie", 0],
];
const ATT_STATUS = {confirmed:"zúčastnil sa", rsvp:"prihlásený", cancelled:"neprišiel"};
function exportTable(){
  const rows = sortedRows();
  if (S.exportKind === "vols"){
    const cols = EXP.filter(c => S.exportCols.has(c[0]));
    return {head: cols.map(c => c[1]), rows: rows.map(v => cols.map(c => String(c[2](v) ?? "")))};
  }
  const ids = new Set(rows.map(v => v.id));
  const list = DB.parts.filter(p => ids.has(p.vId) && (!p.termId || term(p.termId)) && partDate(p).getFullYear() === YEAR).sort((a, b) => partDate(a) - partDate(b));
  return {head:["Dátum","Termín","Typ","Meno a priezvisko","Stav","Zapísané"], rows: list.map(p => { const t = p.termId && term(p.termId), v = vol(p.vId);
    return [fmtNum(partDate(p)), t ? t.title : p.label, t ? (t.type === "shift" ? "Šichta" : "Podujatie") : "Šichta", `${v.first} ${v.last}`, ATT_STATUS[p.status], p.source === "manual" ? "ručne" : p.source === "qr" ? "QR kód" : "aplikácia"]; })};
}
const toTSV = t => [t.head, ...t.rows].map(r => r.map(c => String(c).replace(/[\t\r\n]+/g, " ")).join("\t")).join("\n");

function renderExport(){
  const t = exportTable(), nv = sortedRows().length, nf = activeFilters().length + (S.peopleQ ? 1 : 0);
  return `<div class="drawer-bg" data-a="closeExport"></div>
  <aside class="drawer wide" role="dialog" aria-modal="true" aria-label="Export">
    <div class="row between"><h2 style="font-size:22px">Export</h2><button class="iconbtn" aria-label="Zavrieť" data-a="closeExport">${ico("x")}</button></div>
    <div class="stack-lg" style="margin-top:16px">
      <div class="seg"><button class="${S.exportKind === "vols" ? "on" : ""}" data-a="exportKind" data-v="vols">Dobrovoľníci</button><button class="${S.exportKind === "att" ? "on" : ""}" data-a="exportKind" data-v="att">Účasť ${YEAR}</button></div>
      <p class="muted fs13">${S.exportKind === "vols" ? `Exportuje sa <b>${nv}</b> dobrovoľníkov` : `Exportuje sa <b>${t.rows.length}</b> záznamov o účasti ${nv} dobrovoľníkov`}${nf ? " podľa aktuálneho vyhľadávania a filtrov" : ""}.</p>
      ${S.exportKind === "vols" ? `<div><div class="row between" style="margin-bottom:8px"><span class="label">Stĺpce</span><span class="row" style="gap:12px"><button class="linkbtn" data-a="expPreset" data-v="all">Všetky</button><button class="linkbtn" data-a="expPreset" data-v="basic">Základné</button></span></div>
        <div class="colgrid">${EXP.map(c => `<label class="check"><input type="checkbox" data-c="expCol" data-k="${c[0]}" ${S.exportCols.has(c[0]) ? "checked" : ""}><span>${esc(c[1])}</span></label>`).join("")}</div></div>` : ""}
      <div><div class="label" style="margin-bottom:8px">Náhľad${t.rows.length > 6 ? `, prvých 6 z ${t.rows.length} riadkov` : ""}</div>
        <div class="tablewrap"><table class="preview"><thead><tr>${t.head.map(h => `<th>${esc(h)}</th>`).join("")}</tr></thead>
        <tbody>${t.rows.slice(0, 6).map(r => `<tr>${r.map(c => `<td>${esc(c)}</td>`).join("")}</tr>`).join("") || `<tr><td class="empty">Nič na export.</td></tr>`}</tbody></table></div></div>
      <div class="row" style="flex-wrap:wrap"><button class="btn btn-primary" data-a="downloadXlsx" ${t.rows.length && t.head.length ? "" : "disabled"}>Stiahnuť Excel (.xlsx)</button>
        <button class="btn btn-ghost" data-a="copyExport" ${t.rows.length && t.head.length ? "" : "disabled"}>Kopírovať</button>
        ${S.exportKind === "vols" ? `<button class="btn btn-ghost" data-a="copyEmails">Kopírovať len e-maily</button>` : ""}</div>
      ${S.copyText != null ? `<div class="field"><label for="copy-fallback">Kopírovanie nie je povolené. Označ text a skopíruj ho ručne (Ctrl+C):</label><textarea class="input mono" id="copy-fallback" readonly style="min-height:140px;font-size:12px">${esc(S.copyText)}</textarea></div>` : ""}
    </div>
  </aside>`;
}

/* ---------- admin overview extras ---------- */
function overviewPeople(){
  const bdays = DB.vols.map(v => ({v, b:bdayMonth(v)})).filter(x => x.b && x.b.m === MONTH + 1 && x.v.status !== "Bývalý").sort((a, b) => a.b.d - b.b.d);
  const fresh = DB.vols.filter(v => v.status === "Nový").sort((a, b) => b.registered.localeCompare(a.registered));
  return `<section><div class="section-h"><h2>Noví dobrovoľníci</h2><button class="linkbtn" data-a="peopleStatus" data-v="Nový">Všetci noví</button></div>
      <div class="list">${fresh.map(v => `<div class="row" style="cursor:pointer" data-a="openVol" data-v="${v.id}">${avatar(v,"sm")}<div class="grow"><div style="font-weight:500">${esc(v.first)} ${esc(v.last)}</div><div class="muted" style="font-size:13px">${esc(withOther(v,"help").slice(0,2).join(", "))}</div></div><span class="mono muted" style="font-size:12px">${fmtNum(D(v.registered))}</span></div>`).join("") || `<div class="empty">Žiadni noví.</div>`}</div>
      <p class="note" style="margin-top:10px">Ešte nemali prvú účasť. Oplatí sa ich osobne osloviť.</p></section>
    <section><div class="section-h"><h2>Narodeniny v ${MONTHS_LOC[MONTH]}</h2></div>
      <div class="list">${bdays.map(({v, b}) => `<div class="row" style="cursor:pointer" data-a="openVol" data-v="${v.id}"><span class="mono num" style="flex:none;min-width:64px;white-space:nowrap">${b.d}. ${b.m}.</span>${avatar(v,"sm")}<div class="grow">${esc(v.first)} ${esc(v.last)}</div>${b.d === TODAY.getDate() ? '<span class="pill p-accent">Dnes</span>' : b.d < TODAY.getDate() ? '<span class="pill p-muted">Bolo</span>' : ""}</div>`).join("") || `<div class="empty">Tento mesiac nikto.</div>`}</div></section>`;
}

let xlsxLoading = null;
function loadXlsx(){
  if (window.XLSX) return Promise.resolve();
  return xlsxLoading ||= new Promise((res, rej) => { const sc = document.createElement("script");
    sc.src = "https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js"; sc.onload = res; sc.onerror = () => rej(new Error("Nepodarilo sa načítať Excel knižnicu."));
    document.head.appendChild(sc); });
}
async function downloadXlsx(){
  await loadXlsx();
  const t = exportTable(), ws = XLSX.utils.aoa_to_sheet([t.head, ...t.rows]), wb = XLSX.utils.book_new();
  ws["!cols"] = t.head.map((h, i) => ({wch:Math.min(40, Math.max(h.length, ...t.rows.map(r => String(r[i]).length)) + 2)}));
  XLSX.utils.book_append_sheet(wb, ws, S.exportKind === "vols" ? "Dobrovoľníci" : "Účasť");
  XLSX.writeFile(wb, `fabrika61-${S.exportKind === "vols" ? "dobrovolnici" : "ucast"}-${TODAY_ISO}.xlsx`);
  toast(`Stiahnutých ${t.rows.length} riadkov`);
}

function renderAdmin(){
  const tabs = [["overview","Prehľad","grid"],["scan","Skener","scan"],["terms","Termíny","cal"],["people","Dobrovoľníci","people"],["partners","Partneri a benefity","gift"],["news","Novinky","news"]];
  const views = {overview:aOverview, scan:aScan, terms:aTerms, people:aPeople, partners:aPartners, news:aNews};
  return `<div class="wrap wide">
    <div class="ahead"><div class="row" style="gap:14px"><div class="logo">${logo("outline")}</div><span class="label">Administrácia</span></div>
      <div class="row" style="gap:8px"><button class="btn btn-ghost btn-sm" data-a="toVol">${ico("user")} Môj profil</button><button class="btn btn-ghost btn-sm" data-a="logout">${ico("out")} Odhlásiť</button></div></div>
    <nav class="anav" aria-label="Administrácia">${tabs.map(([k,l,i]) => `<button class="${S.atab===k?"on":""}" data-a="atab" data-v="${k}">${ico(i)}${l}</button>`).join("")}</nav>
    ${views[S.atab]()}
    <div style="height:48px"></div></div>`;
}

function useRow(u){
  const v = vol(u.vId), b = DB.benefits.find(x => x.id === u.bId);
  if (!v || !b) return "";
  return `<div class="row">${avatar(v,"sm")}<div class="grow"><div style="font-weight:500">${esc(v.first)} ${esc(v.last)}</div><div class="muted" style="font-size:13px">${esc(b.what)} · ${esc(partner(u.pid)?.name)}</div></div><span class="mono muted" style="font-size:12px">${fmtNum(D(u.at))}</span></div>`;
}
function aOverview(){
  const active = DB.vols.filter(v => yearCount(v.id) > 0).length;
  const monthShifts = DB.parts.filter(p => p.status === "confirmed" && (() => { const d = partDate(p); return d.getFullYear() === YEAR && d.getMonth() === MONTH; })()).length;
  const {ranking, winners} = volunteersOfMonth();
  const upcoming = DB.terms.filter(t => !isPast(t)).sort((a,b) => D(a.date) - D(b.date)).slice(0,4);
  const usedYear = DB.uses.filter(u => D(u.at).getFullYear() === YEAR);
  const usedMonth = usedYear.filter(u => D(u.at).getMonth() === MONTH);
  const recent = usedYear.slice().sort((a,b) => D(b.at) - D(a.at)).slice(0,6);
  return `<div class="stack-lg">
    <div class="kpis">
      <div class="kpi"><b class="num">${active}</b><span>aktívnych dobrovoľníkov v roku ${YEAR}</span></div>
      <div class="kpi"><b class="num">${monthShifts}</b><span>odpracovaných účastí v ${MONTHS_LOC[MONTH]}</span></div>
      <div class="kpi"><b class="num">${usedMonth.length}</b><span>benefitov použitých v ${MONTHS_LOC[MONTH]}</span></div>
      <div class="kpi"><b class="num">${usedYear.length}</b><span>benefitov použitých v roku ${YEAR}</span></div>
    </div>
    <div class="cols">
      <div class="stack-lg">
        <section><div class="section-h"><h2>Naposledy použité benefity</h2><button class="linkbtn" data-a="atab" data-v="partners">Partneri</button></div>
          <div class="list">${recent.map(useRow).join("") || `<div class="empty">Zatiaľ nikto nepoužil benefit.</div>`}</div>
          <p class="note" style="margin-top:10px">Benefity sa udeľujú automaticky. Použitie potvrdzuje partner svojím PINom, takže tu nič neschvaľujete.</p></section>
        ${overviewPeople()}
      </div>
      <div class="stack-lg">
        <section><div class="section-h"><h2>Dobrovoľník mesiaca</h2><span class="label">${MONTHS[MONTH]} ${YEAR}</span></div>
          <div class="list">${ranking.filter(r => r.n > 0).slice(0,6).map((r,i) => `<div class="row"><span class="mono muted" style="width:18px">${i+1}</span>${avatar(r.v,"sm")}<div class="grow">${esc(r.v.first)} ${esc(r.v.last)}</div>
            ${winners.includes(r.v) ? '<span class="pill p-accent">Mesiaca</span>' : ""}<span class="num" style="width:28px;text-align:right">${r.n}</span></div>`).join("") || `<div class="empty">Tento mesiac zatiaľ nikto.</div>`}</div>
          <p class="note" style="margin-top:10px">Pri rovnakom počte dostanú titul všetci s najvyšším počtom.</p></section>
        <section><div class="section-h"><h2>Najbližšie termíny</h2><button class="linkbtn" data-a="atab" data-v="terms">Spravovať</button></div>
          <div class="list">${upcoming.map(t => `<div class="row"><div class="grow">${typeLabel(t)}<div style="font-weight:500">${esc(t.title)}</div><div class="muted" style="font-size:13px">${fmtShort(D(t.date))} · ${esc(t.time)}</div></div><span class="num">${signedCount(t)}/${t.cap}</span></div>`).join("")}</div></section>
      </div>
    </div></div>`;
}

function aScan(){
  const v = S.scanVol && vol(S.scanVol);
  const opts = DB.terms.filter(t => D(t.date) <= TODAY).sort((a, b) => D(b.date) - D(a.date)).slice(0, 30);
  if (!opts.some(t => t.id === S.scanTerm)) S.scanTerm = opts[0]?.id || null;
  let detail = "";
  if (v){
    const p = S.scanTerm && myPart(v.id, S.scanTerm);
    detail = `<section class="card stack-lg">
      <div class="row">${avatar(v)}<div class="grow"><h2 style="font-size:20px">${esc(v.first)} ${esc(v.last)}</h2><div class="muted" style="font-size:13px"><span class="num">${yearCount(v.id)}</span> tento rok · <span class="num">${totalCount(v.id)}</span> spolu · úroveň ${tierOf(yearCount(v.id)) || "–"}</div></div></div>
      ${opts.length ? `<div class="stack"><div class="field"><label for="scan-term">Účasť na termíne</label>
        <select class="input" id="scan-term" data-c="scanTerm">${opts.map(o => `<option value="${o.id}" ${o.id === S.scanTerm ? "selected" : ""}>${fmtShort(D(o.date))} · ${esc(o.title)}</option>`).join("")}</select></div>
        ${p?.status === "confirmed" ? `<div class="row"><span class="pill p-good">${ico("check")} Účasť už je započítaná</span></div>`
          : `<button class="btn btn-accent btn-block" data-a="scanConfirm">${ico("check")} Potvrdiť účasť${p?.status === "rsvp" ? " (bol prihlásený)" : ""}</button>`}</div>`
        : `<p class="muted">Dnes ani v minulosti nie je žiadny termín. Účasť sa dá potvrdiť v deň termínu.</p>`}
      <button class="btn btn-ghost btn-block" data-a="startScan">${ico("scan")} Naskenovať ďalšieho</button>
    </section>`;
  }
  return `<div class="cols side">
    <section class="card stack">
      <button class="scanbox" data-a="startScan" style="border:0;cursor:pointer;color:#F2F1EC;font:inherit">${ico("camera", "ico big")}<span>Spustiť kameru</span></button>
      <p class="muted" style="font-size:13px;text-align:center">Namier kameru na QR kód v profile dobrovoľníka.</p>
      <div class="field"><label for="scan-vol">Alebo vyber ručne</label>
      <select class="input" id="scan-vol" data-c="scanVol"><option value="">Vyber dobrovoľníka…</option>${DB.vols.filter(x => x.status !== "Bývalý").sort((a, b) => a.last.localeCompare(b.last, "sk")).map(x => `<option value="${x.id}" ${x.id === S.scanVol ? "selected" : ""}>${esc(x.last)} ${esc(x.first)} · ${esc(x.code)}</option>`).join("")}</select></div>
    </section>
    ${detail || `<section class="card flat"><p class="muted">Po naskenovaní tu uvidíš dobrovoľníka. Jedným ťuknutím mu potvrdíš účasť na šichte alebo podujatí.</p></section>`}
  </div>`;
}

function aTerms(){
  const et = S.editTerm && term(S.editTerm), etN = et ? signedList(et).length : 0;
  const sorted = DB.terms.slice().sort((a,b) => D(a.date) - D(b.date));
  const up = sorted.filter(t => !isPast(t)), past = sorted.filter(isPast).reverse();
  const card = t => {
    const open = S.openTerm === t.id, list = DB.parts.filter(p => p.termId === t.id);
    const confirmedN = list.filter(p => p.status === "confirmed").length;
    const others = DB.vols.filter(v => v.status !== "Bývalý" && !list.some(p => p.vId === v.id)).sort((a, b) => a.last.localeCompare(b.last, "sk"));
    const del = S.confirmDel === "term:" + t.id;
    const future = D(t.date) > TODAY;
    return `<div><div class="row" style="cursor:pointer" data-a="openTerm" data-v="${t.id}">
        <div class="datebox"><b class="num">${D(t.date).getDate()}</b><span>${MONTHS[D(t.date).getMonth()]}</span></div>
        <div class="grow">${typeLabel(t)}<div style="font-weight:600">${esc(t.title)}</div><div class="muted" style="font-size:13px">${esc(t.time)} · ${signedCount(t)}/${t.cap} prihlásených · ${confirmedN} potvrdených</div></div>
        <span style="transform:rotate(${open?90:0}deg);transition:transform .2s;color:var(--faint)">${ico("chev")}</span></div>
      ${open ? `<div style="margin:14px 0 0 64px">
        ${t.desc ? `<p class="muted" style="font-size:14px;margin-bottom:10px;white-space:pre-line">${esc(t.desc)}</p>` : ""}
        <div class="label" style="margin-bottom:4px">Prihlásení dobrovoľníci</div>
        ${list.length ? list.map(p => { const v = vol(p.vId); if (!v) return ""; return `<div class="att">${avatar(v,"sm")}<div class="grow" style="font-weight:500">${esc(v.first)} ${esc(v.last)}</div>${attPill(p)}
          ${future ? "" : `${p.status !== "confirmed" ? `<button class="btn btn-primary btn-xs" data-a="attConfirm" data-v="${p.id}">${ico("check")} Bol tu</button>` : ""}
          ${p.status !== "cancelled" ? `<button class="btn btn-ghost btn-xs" data-a="attCancel" data-v="${p.id}">Neprišiel</button>` : `<button class="btn btn-ghost btn-xs" data-a="attReset" data-v="${p.id}">Vrátiť</button>`}`}</div>`; }).join("")
          : `<p class="empty">Zatiaľ sa nikto neprihlásil.</p>`}
        ${future ? `<p class="muted" style="font-size:12px;margin-top:12px">Účasť potvrdíte a neprihlásených pridáte v deň termínu (${fmtNum(D(t.date))}) alebo neskôr.</p>` : ""}
        ${others.length && !future ? `<div class="row" style="margin-top:12px;flex-wrap:wrap"><select class="input grow" style="height:38px;min-width:180px" id="add-${t.id}" aria-label="Pridať účastníka">${others.map(v => `<option value="${v.id}">${esc(v.first)} ${esc(v.last)}</option>`).join("")}</select>
          <button class="btn btn-ghost btn-sm" data-a="attAdd" data-v="${t.id}">${ico("plus")} Pridať účastníka</button></div>
          <p class="muted" style="font-size:12px;margin-top:6px">Pre ľudí, ktorí prišli, ale neprihlásili sa cez aplikáciu. Účasť sa im rovno započíta.</p>` : ""}
        <div class="row" style="margin-top:16px">${del ? `<span style="font-size:13px">Zmazať termín aj všetky prihlásenia?</span><button class="btn btn-xs" style="background:var(--bad);color:#fff" data-a="delTerm" data-v="${t.id}">Zmazať</button><button class="btn btn-ghost btn-xs" data-a="cancelDel">Nechať</button>`
          : `<button class="btn btn-ghost btn-xs" data-a="editTerm" data-v="${t.id}">Upraviť</button><button class="btn btn-ghost btn-xs" style="color:var(--bad)" data-a="askDel" data-v="term:${t.id}">${ico("trash")} Zmazať termín</button>`}</div>
      </div>` : ""}</div>`;
  };
  return `<div class="cols side">
    <section class="card" id="term-form"><h2 style="font-size:18px;margin-bottom:16px">${et ? "Upraviť termín" : "Nový termín"}</h2>
      <form class="stack" data-f="${et ? "editTerm" : "newTerm"}">
        <div class="seg"><button type="button" class="${S.newTermType==="shift"?"on":""}" data-a="newTermType" data-v="shift">Šichta</button><button type="button" class="${S.newTermType==="event"?"on":""}" data-a="newTermType" data-v="event">Podujatie</button></div>
        <div class="field"><label for="nt-title">Názov</label><input class="input" id="nt-title" name="title" value="${esc(et?.title || "")}" placeholder="${S.newTermType==="shift" ? "Napr. Upratovanie skladu" : "Napr. Zimný koncert"}" required></div>
        <div class="row"><div class="field grow"><label for="nt-date">Dátum</label><input class="input" id="nt-date" name="date" type="date" ${et ? "" : `min="${TODAY_ISO}"`} value="${et ? et.date : iso(addDays(TODAY, 7))}" required></div>
          <div class="field grow"><label for="nt-time">Čas</label><input class="input" id="nt-time" name="time" value="${esc(et ? et.time : "9:00 – 13:00")}" required></div></div>
        <div class="field"><label for="nt-cap">Počet ľudí</label><input class="input" id="nt-cap" name="cap" type="number" min="1" value="${et ? et.cap : 10}" required></div>
        <div class="field"><label for="nt-desc">Popis</label><textarea class="input" id="nt-desc" name="desc" placeholder="Čo sa bude robiť, čo si priniesť">${esc(et?.desc || "")}</textarea></div>
        ${et ? `<label class="check"><input type="checkbox" id="nt-notify" name="notify" ${etN ? "checked" : "disabled"}><span>Upozorniť prihlásených na zmenu${etN ? ` (${etN})` : " (nikto nie je prihlásený)"}</span></label>`
          : `<label class="check"><input type="checkbox" id="nt-push" name="push" checked><span>Poslať dobrovoľníkom upozornenie</span></label>
        ${targetPicker()}`}
        <button class="btn btn-primary btn-block" type="submit">${et ? "Uložiť zmeny" : "Zverejniť termín"}</button>
        ${et ? `<button class="btn btn-ghost btn-block" type="button" data-a="cancelEditTerm">Zrušiť úpravu</button>` : ""}
      </form></section>
    <div class="stack-lg">
      <section><div class="section-h"><h2>Nadchádzajúce</h2></div><div class="list">${up.map(card).join("") || `<div class="empty">Žiadne.</div>`}</div></section>
      <section><div class="section-h"><h2>Uskutočnené</h2></div><div class="list">${past.map(card).join("") || `<div class="empty">Zatiaľ žiadne.</div>`}</div></section>
    </div></div>`;
}

function aPartners(){
  const usedYear = DB.uses.filter(u => D(u.at).getFullYear() === YEAR);
  const card = p => {
    const bs = DB.benefits.filter(b => b.pid === p.id), n = usedYear.filter(u => u.pid === p.id).length, shown = S.showPins[p.id];
    const editing = S.editPin === p.id, delKey = "benefit:";
    return `<section class="card stack">
      <div class="row between" style="align-items:flex-start"><div class="grow"><h2 style="font-size:18px">${esc(p.name)}</h2><div class="muted" style="font-size:13px">${esc(p.where)}</div></div>
        <div style="text-align:right"><div class="num" style="font-size:24px;font-weight:300">${n}</div><div class="muted" style="font-size:12px">použití v ${YEAR}</div></div></div>
      <div class="row" style="flex-wrap:wrap;border-top:1px solid var(--line);padding-top:12px"><span class="label grow">PIN pre pokladníka</span>
        ${editing ? `<form class="row" data-f="setPin" style="gap:6px"><input class="input mono num" style="width:96px;height:34px;text-align:center;letter-spacing:.3em" id="pin-${p.id}" name="pin" inputmode="numeric" pattern="[0-9]{4}" maxlength="4" value="${p.pin}" required aria-label="Nový PIN"><button class="btn btn-primary btn-xs" type="submit">Uložiť</button><button class="btn btn-ghost btn-xs" type="button" data-a="editPin" data-v="">Zrušiť</button></form>`
          : `<span class="mono num" style="font-size:18px;letter-spacing:.3em">${shown ? p.pin : "••••"}</span>
             <button class="linkbtn" data-a="showPin" data-v="${p.id}">${shown ? "Skryť" : "Zobraziť"}</button>
             <button class="linkbtn" data-a="editPin" data-v="${p.id}">Zmeniť</button>
             <button class="linkbtn" data-a="newPin" data-v="${p.id}">Vygenerovať nový</button>`}</div>
      <div><div class="label" style="margin:4px 0 2px">Benefity</div>
        ${bs.map(b => { const k = delKey + b.id, cnt = usedYear.filter(u => u.bId === b.id).length;
          return `<div class="att"><span class="pill p-muted">Ú${b.tier}</span><div class="grow">${esc(b.what)}</div><span class="muted num" style="font-size:13px">${cnt}×</span>
          ${S.confirmDel === k ? `<button class="btn btn-xs" style="background:var(--bad);color:#fff" data-a="delBenefit" data-v="${b.id}">Zmazať</button><button class="btn btn-ghost btn-xs" data-a="cancelDel">Nechať</button>`
            : `<button class="iconbtn" aria-label="Zmazať benefit" data-a="askDel" data-v="${k}">${ico("trash")}</button>`}</div>`; }).join("") || `<p class="empty">Zatiaľ žiadny benefit.</p>`}</div>
    </section>`;
  };
  return `<div class="cols side">
    <div class="stack-lg">
      <section class="card"><h2 style="font-size:18px;margin-bottom:16px">Nový benefit</h2>
        <form class="stack" data-f="newBenefit">
          <div class="field"><label for="nb-pid">Partner</label><select class="input" id="nb-pid" name="pid">${DB.partners.map(p => `<option value="${p.id}">${esc(p.name)}</option>`).join("")}</select></div>
          <div class="field"><label for="nb-tier">Úroveň</label><select class="input" id="nb-tier" name="tier">${[1,2,3,4].map(t => `<option value="${t}">Úroveň ${t} · od ${THRESH[t]} šichiet</option>`).join("")}</select></div>
          <div class="field"><label for="nb-what">Čo dobrovoľník dostane</label><input class="input" id="nb-what" name="what" placeholder="Napr. Zľava 15 % na nákup" required></div>
          <button class="btn btn-primary btn-block" type="submit">Pridať benefit</button>
        </form></section>
      <section class="card"><h2 style="font-size:18px;margin-bottom:16px">Nový partner</h2>
        <form class="stack" data-f="newPartner">
          <div class="field"><label for="npa-name">Názov</label><input class="input" id="npa-name" name="name" required></div>
          <div class="field"><label for="npa-where">Kde / poznámka</label><input class="input" id="npa-where" name="where" placeholder="Adresa alebo čo ponúka"></div>
          <p class="muted" style="font-size:13px">PIN sa vygeneruje automaticky. Odovzdajte ho partnerovi osobne.</p>
          <button class="btn btn-ghost btn-block" type="submit">${ico("plus")} Pridať partnera</button>
        </form></section>
    </div>
    <div class="stack">${DB.partners.map(card).join("")}
      <p class="note">Ako to funguje: dobrovoľník ukáže voucher v aplikácii a pokladník doň zadá PIN. Po troch nesprávnych pokusoch sa voucher na 5 minút zablokuje.</p></div>
  </div>`;
}

function aNews(){
  return `<div class="cols side">
    <section class="card"><h2 style="font-size:18px;margin-bottom:16px">Nový príspevok</h2>
      <form class="stack" data-f="newPost">
        <div class="seg">${[["info","Novinka"],["help","Hľadáme pomoc"],["photos","Fotky"]].map(([k,l]) => `<button type="button" class="${S.newsKind===k?"on":""}" data-a="newsKind" data-v="${k}">${l}</button>`).join("")}</div>
        <div class="field"><label for="np-title">Nadpis</label><input class="input" id="np-title" name="title" required></div>
        <div class="field"><label for="np-body">Text</label><textarea class="input" id="np-body" name="body" required></textarea></div>
        <div class="field"><label for="np-term">Pripojiť termín na prihlásenie</label><select class="input" id="np-term" name="term"><option value="">Bez termínu</option>${DB.terms.filter(t => !isPast(t)).map(t => `<option value="${t.id}">${fmtShort(D(t.date))} · ${esc(t.title)}</option>`).join("")}</select></div>
        <div class="field"><label>Fotky</label>
          <label class="btn btn-ghost btn-sm" for="np-photos" style="align-self:flex-start">${ico("camera")} Pridať fotky</label>
          <input type="file" id="np-photos" accept="image/*" multiple hidden data-c="draftPhotos">
          ${S.draftPhotos.length ? `<div class="photos" style="--n:${Math.min(S.draftPhotos.length,4)};margin:6px 0 0">${S.draftPhotos.map(p => `<img src="${p}" alt="" style="border-radius:8px">`).join("")}</div>` : ""}</div>
        <label class="check"><input type="checkbox" id="np-push" name="push" ${S.newsKind==="help"?"checked":""}><span>Poslať dobrovoľníkom upozornenie</span></label>
        ${targetPicker()}
        <button class="btn btn-primary btn-block" type="submit">Zverejniť</button>
      </form></section>
    <section><div class="section-h"><h2>Zverejnené</h2></div><div class="stack">${DB.news.map(n => { const key = "news:" + n.id;
      return `<div class="card"><div class="row between"><span class="label">${fmtShort(D(n.date))} · ${({info:"Novinka",help:"Hľadáme pomoc",photos:"Fotky"})[n.kind]}${n.photos.length ? ` · ${n.photos.length} ${pl(n.photos.length,"fotka","fotky","fotiek")}` : ""}</span>
        ${S.confirmDel === key ? `<span class="row" style="gap:6px"><button class="btn btn-xs" style="background:var(--bad);color:#fff" data-a="delNews" data-v="${n.id}">Zmazať</button><button class="btn btn-ghost btn-xs" data-a="cancelDel">Nechať</button></span>`
          : `<button class="iconbtn" aria-label="Zmazať príspevok" data-a="askDel" data-v="${key}">${ico("trash")}</button>`}</div>
        <div style="font-weight:600;margin-top:6px">${esc(n.title)}</div><p class="muted" style="font-size:14px;margin-top:4px">${esc(n.body)}</p></div>`; }).join("") || `<p class="empty">Zatiaľ nič.</p>`}</div></section>
  </div>`;
}


/* komu poslať upozornenie */
function targetCount(){
  const t = S.tgt;
  const match = DB.vols.filter(v => v.status !== "Bývalý" && v.pushEnabled && (t.mode === "all" ||
    ((!t.help.length || t.help.some(h => v.help.includes(h))) && (!t.when.length || t.when.some(w => v.when.includes(w))))));
  return {match:match.length, dev:match.filter(v => DB.subs?.[v.id]).length};
}
function targetPicker(){
  const t = S.tgt, n = targetCount();
  const chip = (k, o) => `<button type="button" class="chip ${t[k].includes(o) ? "on" : ""}" aria-pressed="${t[k].includes(o)}" data-a="tgtChip" data-k="${k}" data-v="${esc(o)}">${esc(o)}</button>`;
  return `<div class="stack" style="gap:8px;padding-left:28px">
    <div class="seg"><button type="button" class="${t.mode === "all" ? "on" : ""}" data-a="tgtMode" data-v="all">Všetkým</button><button type="button" class="${t.mode === "sel" ? "on" : ""}" data-a="tgtMode" data-v="sel">Vybraným</button></div>
    ${t.mode === "sel" ? `<div class="label">Ako pomáhajú · aspoň jedno z</div><div class="chips">${OPT.help.map(o => chip("help", o)).join("")}</div>
      <div class="label">Kedy môžu</div><div class="chips">${OPT.when.map(o => chip("when", o)).join("")}</div>` : ""}
    <p class="muted fs13">Upozornenie dostane <b>${n.dev}</b> ${pl(n.dev,"dobrovoľník","dobrovoľníci","dobrovoľníkov")} so zapnutými upozorneniami.${n.match > n.dev ? ` Ďalší ${n.match - n.dev} by sa hodili, ale upozornenia si ešte nezapli.` : ""}</p>
  </div>`;
}
const targetOpts = kind => ({kind, ...(S.tgt.mode === "sel" ? {filter:{help:S.tgt.help, when:S.tgt.when}} : {})});

/* ---------- render ---------- */
const root = document.getElementById("root");
function renderLoading(){ return `<div class="wrap auth"><div class="logo">${logo("solid")}</div><p class="muted">Načítavam…</p></div>`; }
function render(keepScroll = true){
  const y = window.scrollY;
  const kindOf = el => el ? (el.classList.contains("wide") ? "export" : el.classList.contains("drawer") ? "drawer:" + S.selVol : "sheet") : null;
  const oldPanel = document.querySelector(".drawer, .sheet"), panelKind = kindOf(oldPanel), panelY = oldPanel?.scrollTop || 0;
  const focusId = document.activeElement?.id, selStart = document.activeElement?.selectionStart;
  let main = "";
  if (S.screen === "loading") main = renderLoading();
  else if (S.screen === "auth") main = renderAuth();
  else if (S.screen === "admin") main = renderAdmin();
  else main = renderVol();
  let sheet = "";
  if (S.screen === "vol" && S.voucher) sheet = renderVoucher();
  else if (S.form && S.form.mode !== "register") sheet = `<div class="sheet" role="dialog" aria-modal="true"><div class="wrap" style="max-width:640px;padding-block:20px 0">${renderForm()}</div></div>`;
  else if (S.screen === "admin" && S.exportOpen) sheet = renderExport();
  else if (S.screen === "admin" && S.atab === "people" && S.selVol && vol(S.selVol)) sheet = renderDrawer();
  document.body.classList.toggle("sheet-open", !!sheet);
  const keep = {};
  if (!S.formReset) document.querySelectorAll("#root form[data-f] [id]:not([data-fk]):not([data-c])").forEach(el => { keep[el.id] = el.type === "checkbox" ? el.checked : el.value; });
  S.formReset = false;
  root.innerHTML = main + sheet + (S.busy ? `<div class="busybar" aria-hidden="true"></div>` : "") + (S.toast ? `<div class="toast" role="status">${esc(S.toast)}</div>` : "");
  document.body.classList.toggle("has-tabs", S.screen === "vol" && !sheet);
  for (const [id, val] of Object.entries(keep)){ const el = document.getElementById(id); if (!el || el.type === "file") continue; if (el.type === "checkbox") el.checked = val; else el.value = val; }
  const panel = document.querySelector(".drawer, .sheet");
  if (S.panelTop){ S.panelTop = false; if (panel) panel.scrollTop = 0; else window.scrollTo(0, 0); }
  else { if (keepScroll) window.scrollTo(0, y); if (panel && kindOf(panel) === panelKind) panel.scrollTop = panelY; }
  if (panel && kindOf(panel) !== panelKind && panel.classList.contains("drawer")) panel.classList.add("in");
  if (focusId === "people-q"){ const i = document.getElementById("people-q"); if (i){ i.focus(); try { i.setSelectionRange(selStart, selStart); } catch (e){} } }
  if (S.focusErr){ S.focusErr = false; document.querySelector(".ferr")?.scrollIntoView({block:"center"}); }
}
let toastT;
function toast(msg){ S.toast = msg; clearTimeout(toastT); toastT = setTimeout(() => { S.toast = null; render(); }, 3200); }
const toTop = () => { S.panelTop = true; };
function copyText(text, okMsg){
  S.copyText = null;
  try {
    navigator.clipboard.writeText(text).then(() => toast(okMsg), () => { S.copyText = text; S.exportOpen = true; render(); });
  } catch (e){ S.copyText = text; S.exportOpen = true; }
}

/* ---------- QR scanner overlay (outside the re-rendered root) ---------- */
let scanner = null;
async function startScan(){
  const ov = document.getElementById("scan-overlay");
  ov.hidden = false; document.body.classList.add("sheet-open");
  document.getElementById("scan-msg").textContent = "Namier kameru na QR kód dobrovoľníka.";
  try {
    if (typeof Html5Qrcode === "undefined") throw new Error("Skener sa nenačítal. Skontroluj pripojenie.");
    scanner = new Html5Qrcode("scan-reader", {verbose:false});
    await scanner.start({facingMode:"environment"}, {fps:10, qrbox:{width:240, height:240}}, async text => {
      const code = text.trim().toUpperCase(), v = DB.vols.find(x => x.code === code);
      if (!v){ document.getElementById("scan-msg").textContent = `Kód ${code} nepoznáme.`; return; }
      await stopScan(); S.scanVol = v.id; S.atab = "scan"; render();
      if (navigator.vibrate) navigator.vibrate(60);
    }, () => {});
  } catch (e){
    document.getElementById("scan-msg").textContent = /Permission|NotAllowed/i.test(String(e)) ? "Prístup ku kamere je zakázaný. Povoľ ho v nastaveniach prehliadača." : String(e.message || e);
  }
}
async function stopScan(){
  try { if (scanner){ await scanner.stop(); scanner.clear(); } } catch (e){}
  scanner = null;
  document.getElementById("scan-overlay").hidden = true; document.body.classList.remove("sheet-open");
}
document.getElementById("scan-close").addEventListener("click", () => { stopScan(); });

/* ---------- actions ---------- */
const A = {
  // auth
  authMode: el => { S.authErr = null; S.authMode = el.dataset.v; if (S.authMode === "register") openForm("register"); },
  authBack: () => { S.authMsg = null; S.authErr = null; S.authMode = "login"; },
  magic: async () => {
    const email = (document.getElementById("a-email")?.value || "").trim();
    if (!/^\S+@\S+\.\S+$/.test(email)){ S.authErr = "Najprv napíš svoj e-mail."; return; }
    const { error } = await sb.auth.signInWithOtp({email, options:{emailRedirectTo:location.origin + location.pathname}});
    if (error) throw error;
    S.authMsg = {title:"Skontroluj si e-mail", body:`Poslali sme prihlasovací odkaz na ${email}. Otvor ho v tomto prehliadači.`};
  },
  logout: async () => { await stopScan(); await sb.auth.signOut(); },
  toAdmin: () => { S.screen = "admin"; toTop(); },
  toVol: () => { S.screen = "vol"; S.vtab = "home"; toTop(); },

  // registration / profile form
  fchip: el => { const F = S.form, k = el.dataset.k, v = el.dataset.v;
    if (MULTI.includes(k)){ const a = F.data[k]; const i = a.indexOf(v); if (i >= 0) a.splice(i, 1); else a.push(v); }
    else F.data[k] = F.data[k] === v ? "" : v;
    delete F.err[k]; },
  fnext: () => { if (validateStep(S.form.step)){ S.form.step++; toTop(); } else S.focusErr = true; },
  fback: () => { const F = S.form; if (F.step > 0){ F.step--; F.err = {}; toTop(); } else { if (F.mode === "register") S.authMode = "login"; S.form = null; } },
  fclose: () => { S.form = null; },
  fsave: () => { if (!validateStep(S.form.step)){ S.focusErr = true; return; } return commitForm(); },
  editSelf: () => { openForm("self", S.me); },

  // volunteer
  vtab: el => { S.vtab = el.dataset.v; toTop(); },
  termView: el => { S.termView = el.dataset.v; },
  termFilter: el => { S.termFilter = el.dataset.v; },
  gotoTerm: el => { S.vtab = "terms"; S.termView = "upcoming"; S.termFilter = "all"; render(); document.getElementById("term-" + el.dataset.v)?.scrollIntoView({block:"center"}); return "skip"; },
  rsvp: async el => { const t = term(el.dataset.v);
    must(await sb.from("participations").insert({volunteer_id:S.me, term_id:t.id, status:"rsvp", source:"app"}));
    await refresh(); toast(`Si prihlásený: ${t.title}`); },
  unrsvp: async el => { must(await sb.from("participations").delete().eq("volunteer_id", S.me).eq("term_id", el.dataset.v).eq("status", "rsvp")); await refresh(); toast("Prihlásenie zrušené"); },
  togglePush: async () => { if (S.pushOn && me().pushEnabled){ await disablePush(); toast("Upozornenia vypnuté"); } else { await enablePush(); toast("Upozornenia zapnuté"); } },
  pushYes: async () => { await enablePush(); toast("Upozornenia zapnuté"); },
  pushLater: () => { S.pushAsk = false; try { localStorage.setItem("f61-push-later", "1"); } catch (e){} },
  iosLater: () => { try { localStorage.setItem("f61-ios-later", "1"); } catch (e){} },
  tgtMode: el => { S.tgt.mode = el.dataset.v; },
  tgtChip: el => { const a = S.tgt[el.dataset.k], i = a.indexOf(el.dataset.v); if (i >= 0) a.splice(i, 1); else a.push(el.dataset.v); },
  openVoucher: el => { S.voucher = el.dataset.v; S.pin = ""; S.pinErr = null; S.justUsed = null; },
  closeVoucher: () => { S.voucher = null; S.pin = ""; S.pinErr = null; S.justUsed = null; },
  pinKey: el => {
    if ((S.lockUntil[S.voucher] || 0) > Date.now() || S.justUsed || S.pinBusy) return;
    if (el.dataset.v === "del"){ S.pin = S.pin.slice(0, -1); return; }
    if (S.pin.length >= 4) return;
    S.pin += el.dataset.v; S.pinErr = null;
    if (S.pin.length < 4) return;
    return (async () => {
      S.pinBusy = true;
      try {
        const r = must(await sb.rpc("redeem_voucher", {p_benefit:S.voucher, p_pin:S.pin}));
        S.pin = "";
        if (r.ok){ await refresh(); S.justUsed = useOf(S.me, S.voucher) || {at:TODAY_ISO, time:new Date().toTimeString().slice(0, 5), pid:DB.benefits.find(b => b.id === S.voucher)?.pid}; }
        else if (r.error === "wrong_pin") S.pinErr = `Nesprávny PIN. ${r.left === 1 ? "Zostáva 1 pokus" : `Zostávajú ${r.left} pokusy`}.`;
        else if (r.error === "locked") S.lockUntil[S.voucher] = new Date(r.locked_until).getTime();
        else if (r.error === "used"){ await refresh(); S.pinErr = "Tento benefit si už tento rok použil/a."; }
        else if (r.error === "tier") S.pinErr = "Na tento benefit ešte nemáš dosť šichiet.";
        else S.pinErr = "Voucher sa nepodarilo overiť.";
      } finally { S.pinBusy = false; S.pin = ""; }
    })();
  },

  // admin navigation
  atab: el => { S.atab = el.dataset.v; S.confirmDel = null; toTop(); },
  askDel: el => { S.confirmDel = el.dataset.v; },
  cancelDel: () => { S.confirmDel = null; },
  newTermType: el => { S.newTermType = el.dataset.v; },
  editTerm: el => { const x = term(el.dataset.v); S.editTerm = x.id; S.newTermType = x.type; S.formReset = true; S.confirmDel = null; render(); document.getElementById("term-form")?.scrollIntoView({block:"start", behavior:"smooth"}); return "skip"; },
  cancelEditTerm: () => { S.editTerm = null; S.newTermType = "shift"; S.formReset = true; },
  newsKind: el => { S.newsKind = el.dataset.v; },
  openTerm: el => { S.openTerm = S.openTerm === el.dataset.v ? null : el.dataset.v; S.confirmDel = null; },

  // scanner & attendance
  startScan: () => { S.scanVol = null; render(); startScan(); return "skip"; },
  scanConfirm: async () => {
    const p = myPart(S.scanVol, S.scanTerm), before = yearCount(S.scanVol);
    if (p) must(await sb.from("participations").update({status:"confirmed", source:p.source === "app" ? "app" : "qr", decided_at:new Date().toISOString()}).eq("id", p.id));
    else must(await sb.from("participations").insert({volunteer_id:S.scanVol, term_id:S.scanTerm, status:"confirmed", source:"qr", decided_at:new Date().toISOString()}));
    await refresh(); toast(`Účasť započítaná. ${vol(S.scanVol).first} má ${sichty(yearCount(S.scanVol))} tento rok.`);
    notifyConfirm(S.scanVol, term(S.scanTerm)?.title, before); },
  attConfirm: async el => { const p = DB.parts.find(x => x.id === el.dataset.v), before = yearCount(p.vId);
    must(await sb.from("participations").update({status:"confirmed", decided_at:new Date().toISOString()}).eq("id", p.id)); await refresh();
    notifyConfirm(p.vId, term(p.termId)?.title, before); },
  attCancel: async el => { must(await sb.from("participations").update({status:"cancelled", decided_at:new Date().toISOString()}).eq("id", el.dataset.v)); await refresh(); },
  attReset: async el => { must(await sb.from("participations").update({status:"rsvp", decided_at:null}).eq("id", el.dataset.v)); await refresh(); },
  attAdd: async el => { const sel = document.getElementById("add-" + el.dataset.v); if (!sel) return; const before = yearCount(sel.value);
    must(await sb.from("participations").insert({volunteer_id:sel.value, term_id:el.dataset.v, status:"confirmed", source:"manual", decided_at:new Date().toISOString()}));
    await refresh(); toast(`${vol(sel.value).first} pridaný ako účastník`); notifyConfirm(sel.value, term(el.dataset.v)?.title, before); },
  delTerm: async el => { const t = term(el.dataset.v); must(await sb.from("terms").delete().eq("id", t.id)); S.confirmDel = null; await refresh(); toast(`Termín „${t.title}“ zmazaný`); },
  delPart: async el => { must(await sb.from("participations").delete().eq("id", el.dataset.v)); S.confirmDel = null; await refresh(); toast("Záznam zmazaný"); },
  delNews: async el => { must(await sb.from("news").delete().eq("id", el.dataset.v)); S.confirmDel = null; await refresh(); toast("Príspevok zmazaný"); },

  // partners & benefits
  showPin: el => { S.showPins[el.dataset.v] = !S.showPins[el.dataset.v]; },
  editPin: el => { S.editPin = el.dataset.v || null; },
  newPin: async el => { const p = partner(el.dataset.v), pin = genPin();
    must(await sb.from("partner_pins").upsert({partner_id:p.id, pin})); await refresh(); S.showPins[p.id] = true; toast(`Nový PIN pre ${p.name}: ${pin}`); },
  delBenefit: async el => { must(await sb.from("benefits").update({active:false}).eq("id", el.dataset.v)); S.confirmDel = null; await refresh(); toast("Benefit odstránený z ponuky"); },

  // CRM
  newVol: () => { openForm("admin-new"); },
  editVol: () => { openForm("admin-edit", S.selVol); },
  selVol: el => { S.selVol = el.dataset.v; S.confirmDel = null; },
  openVol: el => { S.atab = "people"; S.selVol = el.dataset.v; },
  peopleStatus: el => { S.atab = "people"; S.flt = F0(); S.flt.status = el.dataset.v; S.selVol = null; toTop(); },
  closeDrawer: () => { S.selVol = null; S.confirmDel = null; },
  toggleFilters: () => { S.showFilters = !S.showFilters; },
  fltChip: el => { const a = S.flt[el.dataset.k], i = a.indexOf(el.dataset.v); if (i >= 0) a.splice(i, 1); else a.push(el.dataset.v); },
  fltStatus: el => { S.flt.status = el.dataset.v; },
  fltReset: () => { S.flt = F0(); },
  sort: el => { const k = el.dataset.v; S.sort = S.sort.k === k ? {k, dir:-S.sort.dir} : {k, dir:k === "name" ? 1 : -1}; },
  openExport: () => { S.exportOpen = true; S.copyText = null; toTop(); },
  closeExport: () => { S.exportOpen = false; S.copyText = null; },
  exportKind: el => { S.exportKind = el.dataset.v; },
  expPreset: el => { S.exportCols = new Set(EXP.filter(c => el.dataset.v === "all" || c[3]).map(c => c[0])); },
  downloadXlsx: () => downloadXlsx(),
  copyExport: () => { const t = exportTable(); copyText(toTSV(t), `Skopírovaných ${t.rows.length} riadkov. Vlož ich do Excelu cez Ctrl+V.`); },
  copyEmails: () => { const r = sortedRows(); copyText(r.map(v => v.email).join(", "), `Skopírovaných ${r.length} e-mailových adries`); },
  copy: el => { copyText(el.dataset.v, "Skopírované"); },
  delTag: async el => { const v = vol(S.selVol), tags = v.tags.filter((_, i) => i !== +el.dataset.v); await saveAdminInfo(v, {tags}); },
  delVol: async el => { const v = vol(el.dataset.v);
    must(await sb.rpc("admin_delete_volunteer", {p:v.id}));
    if (S.scanVol === v.id) S.scanVol = null;
    S.selVol = null; S.confirmDel = null; await refresh(); toast(`Údaje o ${v.first} ${v.last} sú vymazané`); },
};

async function notifyConfirm(vId, title, before){
  try {
    const after = yearCount(vId), tb = tierOf(before), ta = tierOf(after);
    if (after <= before) return;
    const up = ta > tb;
    await sendPush(up ? `Odomkla sa ti úroveň ${ta}!` : `Účasť potvrdená: ${title || "šichta"}`,
      up ? `Máš ${sichty(after)} tento rok. Pozri si nové benefity v aplikácii.` : `Máš ${sichty(after)} tento rok. Ďakujeme!`, {to:[vId], kind:"confirm"});
  } catch (e){ console.warn("notify", e); }
}

async function saveAdminInfo(v, patch){
  const row = {volunteer_id:v.id, tags:patch.tags ?? v.tags, notes:patch.notes ?? v.notes, updated_at:new Date().toISOString()};
  must(await sb.from("volunteer_admin").upsert(row));
  v.tags = row.tags; v.notes = row.notes;
}

document.addEventListener("click", e => {
  const el = e.target.closest("[data-a]"); if (!el) return;
  const fn = A[el.dataset.a]; if (!fn) return;
  e.preventDefault();
  if (S.busy && el.dataset.a !== "vtab") return;
  run(() => fn(el, e));
});
document.addEventListener("keydown", e => {
  if (e.key === "Enter" && e.target.matches("tr[data-a]")) e.target.click();
});
function run(fn){
  let r;
  try { r = fn(); } catch (err){ toast(errText(err)); render(); return; }
  if (r && typeof r.then === "function"){
    S.busy++; render();
    r.then(() => {}, err => { console.error(err); if (S.screen === "auth") S.authErr = errText(err); else toast(errText(err)); })
     .finally(() => { S.busy--; render(); });
  } else if (r !== "skip") render();
}

document.addEventListener("change", e => {
  const el = e.target;
  if (el.dataset.fk && S.form && el.type === "checkbox"){ S.form.data[el.dataset.fk] = el.checked; delete S.form.err[el.dataset.fk]; return; }
  const c = el.dataset.c; if (!c) return;
  if (c === "photo") return readFiles(el.files, a => run(async () => {
    const url = await uploadImage("avatars", `${me().uid}/${rid()}.jpg`, a[0]);
    must(await sb.from("volunteers").update({photo_url:url}).eq("id", S.me));
    await refresh(); toast("Fotka uložená");
  }));
  if (c === "draftPhotos") return readFiles(el.files, a => { S.draftPhotos = S.draftPhotos.concat(a).slice(0, 8); render(); });
  if (c === "scanVol"){ S.scanVol = el.value || null; }
  if (c === "scanTerm"){ S.scanTerm = el.value; }
  if (c === "flt"){ S.flt[el.dataset.k] = el.value; }
  if (c === "expCol"){ const k = el.dataset.k; if (S.exportCols.has(k)) S.exportCols.delete(k); else S.exportCols.add(k); }
  if (c === "vstatus") return run(async () => { must(await sb.from("volunteers").update({status:el.value}).eq("id", S.selVol)); await refresh(); toast(`Stav zmenený na ${el.value}`); });
  if (c === "role") return run(async () => { must(await sb.from("volunteers").update({role:el.value}).eq("id", S.selVol)); await refresh(); toast(el.value === "admin" ? "Má teraz prístup do administrácie" : "Rola zmenená na dobrovoľníka"); });
  if (c === "prior") return run(async () => { must(await sb.from("volunteers").update({prior_count:Math.max(0, parseInt(el.value, 10) || 0)}).eq("id", S.selVol)); await refresh(); });
  render();
});

let notesT;
document.addEventListener("input", e => {
  const fk = e.target.dataset.fk;
  if (fk && S.form){ S.form.data[fk] = e.target.type === "checkbox" ? e.target.checked : e.target.value; delete S.form.err[fk]; return; }
  if (e.target.dataset.vn === "notes" && S.selVol){
    const v = vol(S.selVol), val = e.target.value; v.notes = val;
    const st = document.getElementById("notes-state"); if (st) st.textContent = "Ukladám…";
    clearTimeout(notesT); notesT = setTimeout(async () => {
      try { await saveAdminInfo(v, {notes:val}); const s2 = document.getElementById("notes-state"); if (s2) s2.textContent = "Uložené. Dobrovoľník poznámky nevidí."; }
      catch (err){ toast(errText(err)); }
    }, 700);
    return;
  }
  if (e.target.dataset.c === "peopleQ"){ S.peopleQ = e.target.value; render(); }
});

document.addEventListener("submit", e => {
  const f = e.target, kind = f.dataset.f; if (!kind) return;
  e.preventDefault();
  const fd = Object.fromEntries(new FormData(f));
  run(async () => {
    await handleSubmit(kind, fd, f);
    S.formReset = true;
  });
});
async function handleSubmit(kind, fd, f){
  {
    if (kind === "login"){
      S.authErr = null;
      const { error } = await sb.auth.signInWithPassword({email:fd.email.trim().toLowerCase(), password:fd.pass});
      if (error) throw error;
    }
    if (kind === "forgot"){
      const { error } = await sb.auth.resetPasswordForEmail(fd.email.trim().toLowerCase(), {redirectTo:location.origin + location.pathname});
      if (error) throw error;
      S.authMsg = {title:"Skontroluj si e-mail", body:`Ak u nás máš účet, poslali sme odkaz na nastavenie hesla na ${fd.email.trim()}.`};
    }
    if (kind === "newpass"){
      const { error } = await sb.auth.updateUser({password:fd.pass});
      if (error) throw error;
      S.authMode = "login"; await enterApp(); toast("Heslo zmenené");
    }
    if (kind === "newTerm"){
      const row = must(await sb.from("terms").insert({kind:S.newTermType, title:fd.title.trim(), date:fd.date, time_label:fd.time.trim(), description:fd.desc.trim(), capacity:parseInt(fd.cap, 10) || 10, created_by:S.me}).select().single());
      S.openTerm = row.id; f.reset(); await refresh();
      if (fd.push){ const n = await sendPush((row.kind === "shift" ? "Nová šichta: " : "Nové podujatie: ") + row.title, `${fmtShort(D(row.date))} · ${row.time_label}. Prihlás sa v aplikácii.`, targetOpts("term")); S.tgt = {mode:"all", help:[], when:[]}; toast(`Zverejnené. Upozornenie odišlo na ${n} ${pl(n,"zariadenie","zariadenia","zariadení")}.`); }
      else toast("Termín zverejnený");
    }
    if (kind === "editTerm"){
      const id = S.editTerm, people = [...new Set(signedList(term(id)).map(p => p.vId))];
      must(await sb.from("terms").update({kind:S.newTermType, title:fd.title.trim(), date:fd.date, time_label:fd.time.trim(), description:fd.desc.trim(), capacity:parseInt(fd.cap, 10) || 10}).eq("id", id));
      S.editTerm = null; S.newTermType = "shift"; S.openTerm = id; await refresh();
      if (fd.notify && people.length){ const n = await sendPush(`Zmena: ${fd.title.trim()}`, `${fmtShort(D(fd.date))} · ${fd.time.trim()}. Pozri si podrobnosti v aplikácii.`, {to:people, kind:"term-change"}); toast(`Zmeny uložené. Upozornenie odišlo na ${n} ${pl(n,"zariadenie","zariadenia","zariadení")}.`); }
      else toast("Zmeny uložené");
    }
    if (kind === "newPost"){
      const photos = [];
      for (const ph of S.draftPhotos) photos.push(await uploadImage("news", `${YEAR}/${rid()}.jpg`, ph));
      must(await sb.from("news").insert({kind:S.newsKind, title:fd.title.trim(), body:fd.body.trim(), term_id:fd.term || null, photos, created_by:S.me}));
      S.draftPhotos = []; f.reset(); await refresh();
      if (fd.push){ const n = await sendPush(fd.title.trim(), fd.body.trim().slice(0, 120), targetOpts("news")); S.tgt = {mode:"all", help:[], when:[]}; toast(`Zverejnené. Upozornenie odišlo na ${n} ${pl(n,"zariadenie","zariadenia","zariadení")}.`); }
      else toast("Príspevok zverejnený");
    }
    if (kind === "setPin"){ const p = partner(S.editPin); must(await sb.from("partner_pins").upsert({partner_id:p.id, pin:fd.pin})); S.editPin = null; S.showPins[p.id] = true; await refresh(); toast(`PIN pre ${p.name} zmenený`); }
    if (kind === "newBenefit"){ must(await sb.from("benefits").insert({tier:parseInt(fd.tier, 10), partner_id:fd.pid, title:fd.what.trim()})); f.reset(); await refresh(); toast("Benefit pridaný. Dobrovoľníci ho uvidia hneď."); }
    if (kind === "newPartner"){
      const p = must(await sb.from("partners").insert({name:fd.name.trim(), place:(fd.where || "").trim()}).select().single()), pin = genPin();
      must(await sb.from("partner_pins").insert({partner_id:p.id, pin})); f.reset(); await refresh(); S.showPins[p.id] = true; toast(`Partner pridaný. PIN: ${pin}`);
    }
    if (kind === "addTag"){ const v = vol(S.selVol), t = fd.tag.trim(); if (t && !v.tags.includes(t)) await saveAdminInfo(v, {tags:[...v.tags, t]}); }
    if (kind === "manualPart"){
      const before = yearCount(S.selVol);
      must(await sb.from("participations").insert({volunteer_id:S.selVol, term_id:null, label:fd.label.trim(), date:fd.date, status:"confirmed", source:"manual", decided_at:new Date().toISOString()}));
      await refresh(); toast("Účasť pridaná"); notifyConfirm(S.selVol, fd.label.trim(), before);
    }
  }
}

/* ---------- boot ---------- */
S.flt = F0();
S.exportCols = new Set(EXP.filter(c => c[3]).map(c => c[0]));

async function enterApp(){
  const m = await loadMe();
  if (!m){ S.screen = "auth"; S.authErr = "K tomuto účtu sme nenašli profil dobrovoľníka. Napíš nám prosím."; await sb.auth.signOut(); return; }
  S.me = m.id; S.isAdmin = m.role === "admin";
  await refresh();
  await swReady; await autoPush();
  if (S.screen !== "vol" && S.screen !== "admin") S.screen = S.isAdmin && location.hash === "#admin" ? "admin" : "vol";
  if (!me().gdprAt) openForm("complete", S.me);
}

let booted = false;
sb.auth.onAuthStateChange((event, session) => {
  if (event === "PASSWORD_RECOVERY"){ S.screen = "auth"; S.authMode = "newpass"; render(); return; }
  if (event === "SIGNED_OUT" || !session){
    Object.assign(S, {screen:"auth", authMode:"login", me:null, isAdmin:false, form:null, selVol:null, exportOpen:false, voucher:null});
    render(); return;
  }
  if ((event === "SIGNED_IN" || event === "INITIAL_SESSION") && S.authMode !== "newpass" && (!booted || !S.me)){
    booted = true;
    setTimeout(() => run(async () => { await enterApp(); }), 0);
  }
});
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible" && S.me && Date.now() - lastLoad > 60000 && !S.busy) run(() => refresh());
});
const swReady = initPush(); swReady.then(() => render());
render();
