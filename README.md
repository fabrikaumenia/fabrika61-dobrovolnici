# Fabrika 61 – Dobrovoľníci

Aplikácia pre dobrovoľníkov Fabriky 61: registrácia (vstupný dotazník), šichty a podujatia,
benefity s vouchermi potvrdzovanými PINom partnera, novinky, push upozornenia a evidencia
dobrovoľníkov pre adminov (náhrada Raynetu).

## Ako to funguje

- **Stránka** je statická (HTML + JavaScript bez build nástrojov). Beží na GitHub Pages
  z priečinka `docs/`, neskôr môže bežať na ľubovoľnom webhostingu (napr. Websupport).
- **Dáta, prihlasovanie a fotky** sú v Supabase (región Frankfurt).
  Prístupové práva rieši databáza (Row Level Security), nie stránka.
- **Push upozornenia** posiela funkcia `supabase/functions/send-push`.

## Štruktúra

| Priečinok / súbor | Čo obsahuje |
|---|---|
| `src/` | Zdrojový kód aplikácie po častiach (jadro, dáta, dobrovoľník, formulár a evidencia, admin, akcie) |
| `public/` | Service worker, manifest a ikony |
| `styles.html`, `logo-symbols.html` | Štýly a logo |
| `build.py` | Zloží aplikáciu do `docs/` |
| `supabase/migrations/` | Databáza, oprávnenia a funkcie |
| `supabase/functions/send-push/` | Odosielanie push upozornení |

## Zmena a nasadenie

1. Uprav súbory v `src/` (prípadne `styles.html`).
2. `python3 build.py config.json` vytvorí `dist/`, ktorý sa skopíruje do `docs/`.
3. Commit a push do vetvy `main`. GitHub Pages zverejní novú verziu do minúty.

`config.json` obsahuje len verejné hodnoty (adresa Supabase, verejný kľúč, verejný VAPID kľúč).
Tajné kľúče sú uložené iba v Supabase ako „secrets“.
