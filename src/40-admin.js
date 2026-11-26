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
          ${future ? `<button class="btn btn-xs btn-off" disabled title="Dá sa až v deň termínu">${ico("check")} Bol tu</button><button class="btn btn-xs btn-off" disabled title="Dá sa až v deň termínu">Neprišiel</button>` : `${p.status !== "confirmed" ? `<button class="btn btn-primary btn-xs" data-a="attConfirm" data-v="${p.id}">${ico("check")} Bol tu</button>` : ""}
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
