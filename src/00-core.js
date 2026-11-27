/* Fabrika 61 – aplikácia pre dobrovoľníkov
   Jeden ES modul bez build kroku. Dáta sú v Supabase, stránka je statická. */
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm";
import { CFG } from "./config.js";

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
  voucher:null, pin:"", pinErr:null, lockUntil:{}, justUsed:null, showPins:{}, editPin:null, editTerm:null, editBenefit:null,
};
