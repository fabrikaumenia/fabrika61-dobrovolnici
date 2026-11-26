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
