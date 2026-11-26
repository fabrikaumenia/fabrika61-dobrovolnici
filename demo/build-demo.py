#!/usr/bin/env python3
"""Zostaví klikací prototyp (s vymyslenými dátami) zo skutočného kódu aplikácie."""
import pathlib, re
ROOT = pathlib.Path(__file__).resolve().parent.parent
app = "\n".join(p.read_text() for p in sorted((ROOT / "src").glob("*.js")))
app = re.sub(r'^import .*$', '', app, flags=re.M)
def patch(a, b):
    global app
    assert a in app, a[:60]; app = app.replace(a, b, 1)
patch("async function enablePush(){", "async function enablePush(){\n  if (window.__DEMO){ S.pushOn = true; return; }")
patch("async function disablePush(){", "async function disablePush(){\n  if (window.__DEMO){ S.pushOn = false; return; }")
patch("downloadXlsx: () => downloadXlsx(),", 'downloadXlsx: () => { toast("V ukážke sa súbor nesťahuje. Skutočná aplikácia stiahne .xlsx."); },')
patch("async function startScan(){", 'async function startScan(){\n  if (window.__DEMO){ toast("V ukážke kamera nebeží. Vyber dobrovoľníka ručne."); return; }')
mock = (ROOT / "demo" / "mock-demo.js").read_text()
head = (ROOT / "styles.html").read_text().replace("<title>Fabrika 61 – Dobrovoľníci</title>", "<title>Fabrika 61 Dobrovoľníci</title>")
logo = (ROOT / "logo-symbols.html").read_text()
html = f"""<!DOCTYPE html>
<html lang="sk"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
{head}
</head><body>
{logo}
<div id="demo-bar" class="demo"></div>
<div id="root"></div>
<div id="scan-overlay" hidden><p id="scan-msg"></p><div id="scan-reader"></div><button class="btn btn-ghost" id="scan-close" type="button">Zavrieť kameru</button></div>
<script src="https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.js"></script>
<script type="module">
{mock}
{app}
</script>
</body></html>
"""
out = ROOT / "demo" / "index.html"
out.write_text(html)
print("demo built", len(html))
