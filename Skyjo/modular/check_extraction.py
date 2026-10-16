#!/usr/bin/env python3
"""Check modularized SKYJO entrypoint without requiring a browser."""
from pathlib import Path
import re,sys
root=Path("Skyjo")
html=(root/"skyjo_action.html").read_text(encoding="utf-8")
css=root/"modular/css/legacy.css"
js=root/"modular/js/legacy.js"
checks={
"css link": 'href="modular/css/legacy.css"' in html,
"js script": 'src="modular/js/legacy.js"' in html,
"css file": css.exists() and css.stat().st_size>10000,
"js file": js.exists() and js.stat().st_size>10000,
"inline CSS removed": not re.search(r"<style(?:\\s[^>]*)?>",html,re.I),
"relative online launch": "skyjo_action.html" in (root/"skyjo_start.js").read_text(encoding="utf-8"),
}
for k,v in checks.items():print(("PASS" if v else "FAIL"),k)
sys.exit(0 if all(checks.values()) else 1)
