/* ---------- DEMO: simulovaná databáza namiesto Supabase (len pre prototyp) ---------- */
window.__DEMO = true;
const createClient = (() => {
  const uuid = () => (crypto.randomUUID ? crypto.randomUUID() : String(Math.random()).slice(2));
  const nowIso = () => new Date().toISOString();
  const isoL = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const dd = n => { const x = new Date(); x.setDate(x.getDate() + n); return isoL(x); };
  const YR = new Date().getFullYear();
  function drawPhoto(seed){
  const c = document.createElement("canvas"); c.width = 960; c.height = 640;
  const x = c.getContext("2d");
  let s = seed * 9301 + 49297; const r = () => (s = (s * 9301 + 49297) % 233280) / 233280;
  const g = x.createLinearGradient(0,0,0,640);
  g.addColorStop(0, seed%2 ? "#2a2926" : "#3a3833"); g.addColorStop(1, "#141412");
  x.fillStyle = g; x.fillRect(0,0,960,640);
  // factory windows: tall arched frames with small panes
  const cols = 3 + (seed % 2), w = 960 / cols;
  for (let i = 0; i < cols; i++){
    const left = i*w + w*0.18, ww = w*0.64, top = 90 + r()*30, hh = 380;
    x.fillStyle = "#0d0d0c"; x.fillRect(left-8, top-8, ww+16, hh+16);
    const pc = 4, pr = 7, pw = ww/pc, ph = hh/pr;
    for (let a = 0; a < pc; a++) for (let b = 0; b < pr; b++){
      const lit = r();
      const warm = lit > .55 ? `rgba(234,197,30,${.25 + lit*.5})` : `rgba(230,228,220,${.08 + lit*.25})`;
      x.fillStyle = warm; x.fillRect(left + a*pw + 3, top + b*ph + 3, pw - 6, ph - 6);
    }
  }
  x.fillStyle = "#0b0b0a"; x.fillRect(0, 520, 960, 120);
  for (let i = 0; i < 9; i++){ // silhouettes
    const px = 60 + r()*840, h = 70 + r()*40;
    x.fillStyle = "#050505"; x.beginPath(); x.arc(px, 520 - h, 14, 0, 7); x.fill();
    x.fillRect(px-16, 520-h+12, 32, h);
  }
  x.fillStyle = "rgba(255,255,255,.55)"; x.font = "500 20px ui-monospace, monospace";
  x.fillText("UKÁŽKOVÁ FOTKA", 28, 612);
  return c.toDataURL("image/jpeg", .82);
}

  const T = {volunteers:[], volunteer_admin:[], terms:[], participations:[], partners:[], partner_pins:[], benefits:[], benefit_uses:[], news:[], push_subscriptions:[]};
  const mkVol = o => ({id:uuid(), user_id:null, code:"F61-" + Math.random().toString(16).slice(2, 8).toUpperCase(), first_name:"", last_name:"", nick:null, birthday:null, city:null,
    email:"", phone:null, age_group:null, avail_days:[], avail_days_other:null, day_parts:[], day_parts_other:null, contact_freq:[], contact_freq_other:null, channels:[],
    channels_other:null, social_link:null, help_forms:[], help_other:null, hobbies:[], hobbies_other:null, benefit_ideas:null, sources:[], sources_other:null,
    photo_consent:true, gdpr_consent_at:nowIso(), photo_url:null, status:"Aktívny", role:"volunteer", prior_count:0, origin:"Google formulár", push_enabled:true, created_at:nowIso(), ...o});
  const V = (key, first, last, o) => { const v = mkVol({user_id:"u-" + key, first_name:first, last_name:last, email:`${key}@example.sk`, ...o}); T.volunteers.push(v); return v; };
  const vA = V("spravca", "Správca", "Fabriky", {role:"admin", nick:"Admin", city:"Partizánske", phone:"0911 000 100", age_group:"31 – 45", avail_days:["Víkendy"], help_forms:["Produkcia"], hobbies:["Umenie a kultúra"], sources:["Kamaráti, rodina, známi"], birthday:"10. 10.", created_at:"2024-01-10T10:00:00Z"});
  const v1 = V("zuzana", "Zuzana", "Kováčová", {nick:"Zuzka", birthday:"14. 3.", city:"Partizánske", phone:"0911 000 101", age_group:"26 – 30", avail_days:["Víkendy"], day_parts:["Doobeda","Celý deň"], contact_freq:["Vždy, keď budete potrebovať pomoc"], channels:["E-mail","Instagram"], social_link:"instagram.com/zuzka.ukazka", help_forms:["Manuálne práce","Foto / video"], hobbies:["Umenie a kultúra","Cestovanie"], benefit_ideas:"Workshop fotografie pre dobrovoľníkov", sources:["Kamaráti, rodina, známi"], prior_count:14, created_at:"2024-04-12T10:00:00Z"});
  const v2 = V("lucia", "Lucia", "Nováková", {birthday:`2. ${new Date().getMonth() + 1}.`, city:"Partizánske", phone:"0911 000 102", age_group:"19 – 25", avail_days:["Pracovné dni","Víkendy"], day_parts:["Večer"], contact_freq:["Raz za mesiac"], channels:["Instagram"], help_forms:["Práca s ľuďmi","Produkcia"], hobbies:["Priatelia, zábava"], sources:["Instagram"], prior_count:3, created_at:"2025-05-20T10:00:00Z"});
  const v3 = V("peter", "Peter", "Baláž", {nick:"Peťo", birthday:`28. ${new Date().getMonth() + 1}.`, city:"Bošany", phone:"0911 000 103", age_group:"31 – 45", avail_days:["Víkendy"], day_parts:["Celý deň"], contact_freq:["Iba na veľké projekty"], channels:["SMS"], help_forms:["Manuálne práce","Remeslá"], help_other:"Tesár, opraví strechu", hobbies:["Šport a pohyb"], sources:["Kamaráti, rodina, známi"], origin:"Aplikácia", created_at:"2026-08-30T10:00:00Z"});
  const v4 = V("jana", "Jana", "Šimková", {birthday:"8. 1.", city:"Partizánske", phone:"0911 000 104", age_group:"46 – 60", avail_days:["Pracovné dni","Víkendy"], day_parts:["Doobeda"], contact_freq:["Vždy, keď budete potrebovať pomoc"], channels:["E-mail","SMS"], help_forms:["Manuálne práce","Práca s ľuďmi","Fundraising"], hobbies:["Tvorivé handmade hobby"], benefit_ideas:"Spoločná večera na konci roka", sources:["Facebook"], prior_count:22, origin:"Papierový formulár", created_at:"2023-03-02T10:00:00Z"});
  const v5 = V("tomas", "Tomáš", "Kollár", {birthday:"19. 6.", city:"Partizánske", phone:"0911 000 105", age_group:"15 – 18", avail_days:["Víkendy"], day_parts:["Poobede"], contact_freq:["Iba keď je urgentná potreba"], channels:["Instagram","TikTok"], help_forms:["Technika (svetlá, zvuk)","Sociálne siete / marketing"], hobbies:["Šport a pohyb"], sources:["Škola"], status:"Nový", origin:"Aplikácia", created_at:dd(-20) + "T10:00:00Z"});
  const v6 = V("ema", "Ema", "Vargová", {nick:"Emka", birthday:"26. 2.", city:"Veľké Uherce", phone:"0911 000 106", age_group:"19 – 25", avail_days:["Víkendy"], day_parts:["Večer"], contact_freq:["Raz za mesiac"], channels:["E-mail","Instagram"], help_forms:["Grafika","Sociálne siete / marketing"], hobbies:["Umenie a kultúra","Cestovanie"], sources:["Instagram"], prior_count:6, created_at:"2025-02-14T10:00:00Z"});
  const v7 = V("katarina", "Katarína", "Benková", {birthday:"5. 4.", city:"Partizánske", phone:"0911 000 110", age_group:"60 +", avail_days:["Pracovné dni"], day_parts:["Doobeda"], contact_freq:["Iba keď je urgentná potreba"], channels:["SMS"], help_forms:["Práca s ľuďmi","Finančne cez zbierky"], hobbies:["Vzdelávanie a osobný rozvoj"], sources:["Kamaráti, rodina, známi"], prior_count:11, status:"Neaktívny", origin:"Papierový formulár", created_at:"2023-05-18T10:00:00Z"});
  const vNew = mkVol({first_name:"Ivan", last_name:"Importovaný", email:"ivan@example.sk", gdpr_consent_at:null, status:"Nový", origin:"Raynet", created_at:dd(-3) + "T10:00:00Z"}); T.volunteers.push(vNew);
  T.volunteer_admin.push({volunteer_id:v1.id, tags:["Fotí podujatia"], notes:"Spoľahlivá, vie zastrešiť šatňu."}, {volunteer_id:v3.id, tags:["Vlastné náradie"], notes:"Oslovovať na technické šichty."}, {volunteer_id:v5.id, tags:["Neplnoletý"], notes:"Pred prvou šichtou treba súhlas rodiča."});

  const tm = (kind, title, off, time, desc = "", cap = 10) => { const t = {id:uuid(), kind, title, date:dd(off), time_label:time, description:desc, capacity:cap, created_at:nowIso()}; T.terms.push(t); return t; };
  const past = [tm("shift","Jarné upratovanie dvora",-200,"9:00 – 13:00"), tm("shift","Vypratávanie skladu",-150,"9:00 – 14:00"), tm("event","Koncert na nádvorí",-90,"17:00 – 23:00","Bar a vstup",6),
    tm("shift","Oprava okien v hale B",-40,"9:00 – 14:00"), tm("event","Vernisáž: Fabrika vo fotografii",-16,"18:00 – 22:00","Šatňa a občerstvenie",4),
    tm("shift","Maľovanie veľkej haly",-9,"9:00 – 15:00","",12), tm("shift","Zateplenie dielne",-2,"9:00 – 14:00","",8)];
  const up = [tm("shift","Zazimovanie dvora",3,"9:00 – 13:00","Odpratávame lístie, zakrývame lavičky a záhony. Teplý čaj zabezpečíme.",12),
    tm("event","Mikulášsky trh vo Fabrike",10,"10:00 – 18:00","Hľadáme ľudí na stánky, šatňu a detský kútik.",10),
    tm("shift","Upratovanie veľkej haly",17,"9:00 – 14:00","Príprava haly na koncert.",10), tm("event","Vianočný koncert",23,"18:00 – 23:00","Bar, vstup a šatňa.",8)];
  const P = (v, t, status = "confirmed", source = "qr") => T.participations.push({id:uuid(), volunteer_id:v.id, term_id:t.id, label:null, date:null, status, source, decided_at:nowIso(), created_at:nowIso()});
  past.forEach(t => P(v1, t)); [0,2,4,6].forEach(i => P(v2, past[i])); [3,5,6].forEach(i => P(v3, past[i])); past.forEach(t => P(v4, t)); [2,4].forEach(i => P(v6, past[i]));
  P(v1, up[0], "rsvp", "app"); P(v1, up[1], "rsvp", "app"); P(v2, up[1], "rsvp", "app"); P(v3, up[0], "rsvp", "app"); P(v4, up[2], "rsvp", "app"); P(v5, up[0], "rsvp", "app"); P(v6, up[3], "rsvp", "app");
  P(v3, past[4], "cancelled", "app");

  const partner = (name, place) => { const p = {id:uuid(), name, place, created_at:nowIso()}; T.partners.push(p); T.partner_pins.push({partner_id:p.id, pin:"1234"}); return p; };
  const pF = partner("Fabrika 61","Bar, vstup a podujatia vo Fabrike"), pP = partner("Panička – krajčírstvo","Partizánske"), pH = partner("Hvezdáreň Partizánske","Večerné pozorovania");
  const ben = (p, tier, title) => { const b = {id:uuid(), partner_id:p.id, tier, title, active:true, created_at:nowIso()}; T.benefits.push(b); return b; };
  const b1 = ben(pF, 1, "Zľava 20 % na vstupné na podujatia vo Fabrike 61"); ben(pP, 2, "Zľava 10 % na úpravy oblečenia"); const b3 = ben(pH, 3, "Voľný vstup na večerné pozorovanie");
  [v1, v2, v4, v6].forEach(v => T.push_subscriptions.push({id:uuid(), volunteer_id:v.id, endpoint:"demo-" + v.id, p256dh:"x", auth:"x"}));
  T.benefit_uses.push({id:uuid(), volunteer_id:v4.id, benefit_id:b1.id, partner_id:pF.id, year:YR, used_at:dd(-30) + "T17:20:00Z"}, {id:uuid(), volunteer_id:v4.id, benefit_id:b3.id, partner_id:pH.id, year:YR, used_at:dd(-12) + "T19:05:00Z"});

  const ph = [1,2,3,4].map(drawPhoto);
  T.news.push({id:uuid(), kind:"help", title:"Hľadáme ľudí na zazimovanie", body:"Pripravujeme dvor na zimu. Rukavice a hrable máme, stačí prísť v teplom pracovnom oblečení. Čaj a pagáče sú na nás.", term_id:up[0].id, photos:[], created_at:dd(-1) + "T09:00:00Z"},
    {id:uuid(), kind:"info", title:"Dielňa je zateplená", body:"Za dve šichty sme spolu zateplili celú dielňu. V zime v nej budeme môcť robiť workshopy.", term_id:null, photos:[ph[3]], created_at:dd(-2) + "T18:00:00Z"},
    {id:uuid(), kind:"photos", title:"Vernisáž v obrazoch", body:"Ďakujeme všetkým, ktorí pomáhali so šatňou a občerstvením.", term_id:null, photos:[ph[0],ph[1],ph[2]], created_at:dd(-15) + "T10:00:00Z"});

  let session = null; const subs = []; const files = {};
  const emit = ev => setTimeout(() => subs.forEach(f => f(ev, session)), 0);
  const userOf = uid => ({id:uid, email:T.volunteers.find(v => v.user_id === uid)?.email});
  const myVol = () => T.volunteers.find(v => v.user_id === session?.user.id);
  const isAdm = () => myVol()?.role === "admin";
  const dateOf = p => p.term_id ? T.terms.find(t => t.id === p.term_id)?.date : p.date;
  const yc = vid => T.participations.filter(p => p.volunteer_id === vid && p.status === "confirmed" && String(dateOf(p)).startsWith(String(YR))).length;
  const RLS = {volunteers:r => isAdm() || r.user_id === session?.user.id, participations:r => isAdm() || r.volunteer_id === myVol()?.id,
    benefit_uses:r => isAdm() || r.volunteer_id === myVol()?.id, volunteer_admin:() => isAdm(), partner_pins:() => isAdm(), push_subscriptions:r => isAdm() || r.volunteer_id === myVol()?.id};
  class Q {
    constructor(t){ this.t = t; this.f = []; this.op = "select"; this.one = null; }
    select(){ return this; } order(){ return this; } limit(){ return this; }
    eq(k, v){ this.f.push(r => r[k] === v); return this; } in(k, a){ this.f.push(r => a.includes(r[k])); return this; }
    single(){ this.one = "s"; return this; } maybeSingle(){ this.one = "m"; return this; }
    insert(p){ this.op = "insert"; this.payload = p; return this; } update(p){ this.op = "update"; this.payload = p; return this; }
    upsert(p, o){ this.op = "upsert"; this.payload = p; this.oc = o?.onConflict; return this; } delete(){ this.op = "delete"; return this; }
    then(res, rej){ let r; try { r = this.exec(); } catch (e){ r = {data:null, error:{message:String(e)}}; } return new Promise(ok => setTimeout(() => ok(r), 120)).then(res, rej); }
    exec(){
      const vis = RLS[this.t] || (() => true), tab = T[this.t];
      const def = {participations:{status:"rsvp", source:"app", label:null, date:null, decided_at:null}, benefits:{active:true}, news:{photos:[], term_id:null, body:""}};
      let out;
      if (this.op === "insert"){
        out = [].concat(this.payload).map(r => this.t === "volunteers" ? mkVol({status:"Nový", origin:"Zadal admin", gdpr_consent_at:null, ...r}) : ({id:uuid(), created_at:nowIso(), ...(def[this.t] || {}), ...r}));
        for (const r of out) if (this.t === "participations" && r.term_id && tab.some(x => x.volunteer_id === r.volunteer_id && x.term_id === r.term_id)) return {data:null, error:{message:"duplicate key"}};
        tab.push(...out);
      } else if (this.op === "upsert"){
        const key = this.oc || (this.t === "volunteer_admin" ? "volunteer_id" : this.t === "partner_pins" ? "partner_id" : "id");
        out = [].concat(this.payload).map(r => { const ex = tab.find(x => x[key] === r[key]); if (ex){ Object.assign(ex, r); return ex; } const n = {id:uuid(), ...r}; tab.push(n); return n; });
      } else {
        const rows = tab.filter(r => vis(r) && this.f.every(f => f(r)));
        if (this.op === "update"){
          let p = {...this.payload};
          if (this.t === "volunteers" && !isAdm()){ delete p.role; delete p.status; delete p.prior_count; delete p.email; }
          rows.forEach(r => Object.assign(r, p)); out = rows;
        } else if (this.op === "delete"){
          T[this.t] = tab.filter(r => !rows.includes(r)); out = rows;
          if (this.t === "terms") T.participations = T.participations.filter(p => !rows.some(r => r.id === p.term_id));
        } else out = rows.map(r => ({...r}));
      }
      if (this.one === "s") return out.length ? {data:out[0], error:null} : {data:null, error:{message:"no rows"}};
      if (this.one === "m") return {data:out[0] || null, error:null};
      return {data:out, error:null};
    }
  }
  const rpc = async (fn, a) => {
    await new Promise(r => setTimeout(r, 120));
    if (fn === "term_counts"){ const m = {}; T.participations.filter(p => p.term_id && p.status !== "cancelled").forEach(p => m[p.term_id] = (m[p.term_id] || 0) + 1); return {data:Object.entries(m).map(([term_id, signed]) => ({term_id, signed})), error:null}; }
    if (fn === "month_leaders"){
      const mm = isoL(new Date()).slice(0, 7), c = {};
      T.participations.filter(p => p.status === "confirmed" && String(dateOf(p)).startsWith(mm)).forEach(p => c[p.volunteer_id] = (c[p.volunteer_id] || 0) + 1);
      const max = Math.max(0, ...Object.values(c));
      return {data:Object.entries(c).filter(([, n]) => n === max && max > 0).map(([id, n]) => { const v = T.volunteers.find(x => x.id === id); return {volunteer_id:id, first_name:v.first_name, last_name:v.last_name, nick:v.nick, photo_url:v.photo_url, n}; }), error:null};
    }
    if (fn === "admin_delete_volunteer"){ T.volunteers = T.volunteers.filter(v => v.id !== a.p); T.participations = T.participations.filter(p => p.volunteer_id !== a.p); T.benefit_uses = T.benefit_uses.filter(u => u.volunteer_id !== a.p); return {data:null, error:null}; }
    if (fn === "redeem_voucher"){
      const v = myVol(), b = T.benefits.find(x => x.id === a.p_benefit), pin = T.partner_pins.find(x => x.partner_id === b.partner_id)?.pin;
      if (yc(v.id) < [0,3,5,7,9][b.tier]) return {data:{ok:false, error:"tier"}, error:null};
      if (T.benefit_uses.some(u => u.volunteer_id === v.id && u.benefit_id === b.id && u.year === YR)) return {data:{ok:false, error:"used"}, error:null};
      if (v._lock && v._lock > Date.now()) return {data:{ok:false, error:"locked", locked_until:new Date(v._lock).toISOString()}, error:null};
      if (a.p_pin !== pin){ v._f = (v._f || 0) + 1; if (v._f >= 3){ v._f = 0; v._lock = Date.now() + 300000; return {data:{ok:false, error:"locked", locked_until:new Date(v._lock).toISOString()}, error:null}; } return {data:{ok:false, error:"wrong_pin", left:3 - v._f}, error:null}; }
      v._f = 0; T.benefit_uses.push({id:uuid(), volunteer_id:v.id, benefit_id:b.id, partner_id:b.partner_id, year:YR, used_at:nowIso()});
      return {data:{ok:true}, error:null};
    }
    return {data:null, error:{message:"unknown " + fn}};
  };
  const auth = {
    getUser: async () => ({data:{user:session?.user || null}}),
    onAuthStateChange: f => { subs.push(f); setTimeout(() => f("INITIAL_SESSION", session), 0); return {data:{subscription:{unsubscribe(){}}}}; },
    signInWithPassword: async ({email}) => { const v = T.volunteers.find(x => x.email === email && x.user_id); if (!v) return {error:{message:"Invalid login credentials"}}; session = {user:userOf(v.user_id)}; emit("SIGNED_IN"); return {data:{session}, error:null}; },
    signUp: async ({email, options}) => { if (T.volunteers.some(v => v.email === email)) return {error:{message:"User already registered"}};
      const m = {...options.data}, uid = "u-" + uuid(), g = m.gdpr; delete m.gdpr;
      T.volunteers.push(mkVol({...m, user_id:uid, email, status:"Nový", origin:"Aplikácia", gdpr_consent_at:g ? nowIso() : null}));
      session = {user:{id:uid, email}}; emit("SIGNED_IN"); return {data:{session}, error:null}; },
    signInWithOtp: async ({email}) => { const v = T.volunteers.find(x => x.email === email); if (v && !v.user_id) v.user_id = "u-" + uuid(); return {error:null}; },
    resetPasswordForEmail: async () => ({error:null}), updateUser: async () => ({error:null}),
    signOut: async () => { session = null; emit("SIGNED_OUT"); return {error:null}; },
    _loginAs: async uid => { session = null; subs.forEach(f => f("SIGNED_OUT", null)); await new Promise(r => setTimeout(r, 30)); session = {user:userOf(uid)}; emit("SIGNED_IN"); },
  };
  window.__demo = {T, auth};
  return () => ({
    from: t => new Q(t), rpc, auth,
    storage: {from: () => ({upload: async (path, blob) => { files[path] = URL.createObjectURL(blob); return {data:{}, error:null}; }, getPublicUrl: path => ({data:{publicUrl:files[path] || ""}})})},
    functions: {invoke: async (fn, {body}) => { const ok = T.volunteers.filter(v => v.push_enabled && v.status !== "Bývalý" && (!body.to || body.to.includes(v.id)) && (!body.filter?.help?.length || body.filter.help.some(h => v.help_forms.includes(h))) && (!body.filter?.when?.length || body.filter.when.some(w => v.avail_days.includes(w)))).map(v => v.id); return {data:{sent:T.push_subscriptions.filter(s => ok.includes(s.volunteer_id)).length}, error:null}; }},
  });
})();
const CFG = {supabaseUrl:"demo", supabaseKey:"demo", vapidPublicKey:""};

/* demo bar: prepínanie pohľadov */
function renderDemoBar(){
  const bar = document.getElementById("demo-bar"), T = window.__demo.T;
  const vols = T.volunteers.filter(v => v.user_id).sort((a, b) => (b.role === "admin") - (a.role === "admin"));
  bar.innerHTML = `<div class="wrap wide"><span class="demo-tag">Ukážka</span>
    <label class="row" style="gap:6px"><span class="muted">Prihlásiť ako</span><select id="demo-who" aria-label="Prihlásiť ako"><option value="">Odhlásený</option>
    ${vols.map(v => `<option value="${v.user_id}">${v.role === "admin" ? "Admin: " : ""}${esc(v.first_name)} ${esc(v.last_name)}</option>`).join("")}</select></label>
    <button class="linkbtn" id="demo-reset">Obnoviť údaje</button><span class="muted">Mená a údaje sú vymyslené. PIN partnerov je 1234.</span></div>`;
  bar.querySelector("#demo-who").onchange = e => { e.target.value ? window.__demo.auth._loginAs(e.target.value) : window.__demo.auth.signOut(); window.scrollTo(0, 0); };
  bar.querySelector("#demo-reset").onclick = () => location.reload();
}
setTimeout(renderDemoBar, 0);
