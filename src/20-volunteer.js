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
const usesOf = (vId, bId) => DB.uses.filter(u => u.vId === vId && u.bId === bId && u.year === YEAR).sort((a, b) => b.at.localeCompare(a.at));
function useOf(vId, bId){ return usesOf(vId, bId)[0]; }
function supersededBy(vId, b){ if (!b.group) return null; const n = yearCount(vId); return DB.benefits.filter(h => h.group === b.group && h.tier > b.tier && n >= THRESH[h.tier]).sort((a, c) => c.tier - a.tier)[0] || null; }
function benefitState(vId, b){
  if (yearCount(vId) < THRESH[b.tier]) return "locked";
  if (supersededBy(vId, b)) return "superseded";
  if (b.max && usesOf(vId, b.id).length >= b.max) return "used";
  return "available";
}
const limitText = b => b.url ? "Online zľava s kódom" : b.max ? (b.max === 1 ? "Raz za rok" : `${b.max}× za rok`) : "Opakovane počas roka";
function progressText(n){
  const t = tierOf(n);
  if (t === 4) return "Máš najvyššiu úroveň. Všetky benefity sú odomknuté.";
  const miss = THRESH[t + 1] - n;
  const verb = miss === 1 ? "chýba" : miss <= 4 ? "chýbajú" : "chýba";
  return (t ? `Úroveň ${t}. ` : "") + `Do úrovne ${t + 1} ti ${verb} ${sichty(miss)}.`;
}
const avatar = (v, cls = "") => `<span class="avatar ${cls}">${v.photo ? `<img src="${esc(v.photo)}" alt="">` : esc(initials(v))}</span>`;
function benefitPill(state, u, b, vId){
  const n = b && vId ? usesOf(vId, b.id).length : 0;
  if (state === "available") return `<span class="pill p-accent">${b?.url ? "Online zľava" : "Dostupné"}</span>${n ? `<span class="pill p-muted">Použité ${n}× tento rok${b.max ? ` · zostáva ${b.max - n}×` : ""}</span>` : ""}`;
  if (state === "used") return `<span class="pill p-good">${ico("check")} Použité ${fmtNum(D(u.at))}${b?.max > 1 ? ` · ${b.max}× z ${b.max}` : ""}</span>`;
  if (state === "superseded") return `<span class="pill p-muted">Nahradené vyššou úrovňou</span>`;
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
  return `<div class="pagehead"><h1>Benefity</h1><p>Odomykajú sa podľa počtu šichiet v roku ${YEAR} a platia aj na všetkých vyšších úrovniach. Počítadlo sa 1. januára vynuluje, celkový počet ti zostáva v profile. Pri použití ukážeš voucher a pokladník ho potvrdí svojím PINom. Keď dosiahneš vyššiu úroveň, väčšia zľava nahradí tú menšiu.</p></div>
  <div class="stack-lg">${[1,2,3,4].map(tier => {
    const open = n >= THRESH[tier], miss = THRESH[tier] - n, list = DB.benefits.filter(b => b.tier === tier);
    return `<section><div class="tier-head"><h2>Úroveň ${tier}</h2>
      <span class="label">${open ? "Odomknuté" : `Od ${THRESH[tier]} šichiet · ${pl(miss,"chýba","chýbajú","chýba")} ${miss}`}</span></div>
      <div class="list">${list.map(b => {
        const st = benefitState(m.id, b), u = useOf(m.id, b.id);
        return `<div class="benefit ${st === "superseded" ? "locked" : st}"><div><div class="partner">${esc(pname(b))} · ${limitText(b)}</div><div class="what">${esc(b.what)}</div></div>
          ${st === "locked" ? "" : `<div class="state">${benefitPill(st, u, b, m.id)}${st === "available" ? `<button class="btn btn-primary btn-xs" data-a="openVoucher" data-v="${b.id}">${b.url ? "Zobraziť kód" : "Použiť"}</button>` : ""}</div>`}</div>`;
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
  const p = partner(b.pid), lock = (S.lockUntil[b.id] || 0) - Date.now(), u = S.justUsed, online = !!b.url;
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
        <p class="muted" style="font-size:13px">Záznam je uložený. ${b.max && usesOf(m.id, b.id).length >= b.max ? "Tento rok sa už použiť nedá." : "Zľavu môžeš použiť aj nabudúce."}</p></div>`
    : online ? `<div class="stack" style="align-items:center;text-align:center;padding-block:28px">
        ${b.code ? `<div class="label">Zľavový kód</div><div class="mono" style="font-size:28px;letter-spacing:.08em;user-select:all">${esc(b.code)}</div>
          <button class="btn btn-ghost btn-sm" data-a="copy" data-v="${esc(b.code)}">Kopírovať kód</button>`
          : `<p class="muted">Kód zatiaľ nie je zadaný. Napíš nám a pošleme ti ho.</p>`}
        <a class="btn btn-primary" href="${esc(b.url)}" target="_blank" rel="noopener">Otvoriť e-shop</a>
        <p class="muted fs13">Kód zadáš pri objednávke na e-shope.</p></div>`
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
