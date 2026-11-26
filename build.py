#!/usr/bin/env python3
"""Zostaví statickú aplikáciu do priečinka dist/.
Použitie: python3 build.py [cesta/ku/config.json]"""
import hashlib, json, pathlib, re, shutil, sys

ROOT = pathlib.Path(__file__).parent
SRC, PUB, DIST = ROOT / "src", ROOT / "public", ROOT / "dist"

cfg_path = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / "config.json"
cfg = json.loads(cfg_path.read_text()) if cfg_path.exists() else {
    "supabaseUrl": "https://example.supabase.co", "supabaseKey": "anon", "vapidPublicKey": ""}

if DIST.exists():
    shutil.rmtree(DIST)
shutil.copytree(PUB, DIST, ignore=shutil.ignore_patterns("config.example.js"))

app = "\n".join(p.read_text() for p in sorted(SRC.glob("*.js")))
(DIST / "app.js").write_text(app)
(DIST / "config.js").write_text("export const CFG = " + json.dumps(cfg, ensure_ascii=False, indent=2) + ";\n")
ver = hashlib.sha1((app + json.dumps(cfg)).encode()).hexdigest()[:8]

head = (ROOT / "styles.html").read_text()
logo = (ROOT / "logo-symbols.html").read_text()
html = f"""<!DOCTYPE html>
<html lang="sk">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#1C1B19">
<meta name="description" content="Šichty, podujatia a benefity pre dobrovoľníkov Fabriky 61.">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="Fabrika 61">
<meta name="apple-mobile-web-app-status-bar-style" content="default">
<link rel="manifest" href="manifest.webmanifest">
<link rel="icon" type="image/png" href="icons/favicon.png">
<link rel="apple-touch-icon" href="icons/apple-touch-icon.png">
{head}
</head>
<body>
{logo}
<div id="root"></div>
<div id="scan-overlay" hidden>
  <p id="scan-msg">Namier kameru na QR kód dobrovoľníka.</p>
  <div id="scan-reader"></div>
  <button class="btn btn-ghost" id="scan-close" type="button">Zavrieť kameru</button>
</div>
<script src="https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.js"></script>
<script src="https://cdn.jsdelivr.net/npm/html5-qrcode@2.3.8/html5-qrcode.min.js"></script>
<script type="module" src="app.js?v={ver}"></script>
</body>
</html>
"""
(DIST / "index.html").write_text(html)
(DIST / "404.html").write_text(html)
(DIST / ".nojekyll").write_text("")
# app.js imports config.js; bust cache for it too
(DIST / "app.js").write_text(app.replace('from "./config.js"', f'from "./config.js?v={ver}"'))
print("dist ready, version", ver)
