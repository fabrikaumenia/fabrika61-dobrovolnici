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
      ${kv([["Súhlas GDPR", v.gdprAt ? `udelený ${fmtNum(D(v.gdprAt))}` : "chýba"], ["Fotky z podujatí", v.photoOk ? "súhlasí" : "nesúhlasí"]])}
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
      <div class="list">${bdays.map(({v, b}) => `<div class="row" style="cursor:pointer" data-a="openVol" data-v="${v.id}"><span class="mono num" style="width:44px">${b.d}. ${b.m}.</span>${avatar(v,"sm")}<div class="grow">${esc(v.first)} ${esc(v.last)}</div>${b.d === TODAY.getDate() ? '<span class="pill p-accent">Dnes</span>' : b.d < TODAY.getDate() ? '<span class="pill p-muted">Bolo</span>' : ""}</div>`).join("") || `<div class="empty">Tento mesiac nikto.</div>`}</div></section>`;
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
