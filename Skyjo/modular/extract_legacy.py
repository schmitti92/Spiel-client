#!/usr/bin/env python3
"""Extract inline SKYJO CSS/JS without reordering execution. Run from repo root."""
from pathlib import Path
import re, sys, hashlib
p=Path("Skyjo/skyjo_action.html")
original=p.read_text(encoding="utf-8")
style=list(re.finditer(r"<style(?:\\s[^>]*)?>(.*?)</style>",original,re.S|re.I))
scripts=list(re.finditer(r"<script(?![^>]*\\bsrc=)[^>]*>(.*?)</script>",original,re.S|re.I))
if len(style)!=1 or not scripts:
    sys.exit(f"Unexpected markup: {len(style)} styles, {len(scripts)} inline scripts")
css=style[0].group(1)
js_candidates=[m for m in scripts if len(m.group(1).strip())>1000]
if len(js_candidates)!=1:
    sys.exit(f"Unexpected large inline scripts: {len(js_candidates)}")
js=js_candidates[0].group(1)
if len(css)<10000 or len(js)<10000: sys.exit("Unexpectedly short source")
out=Path("Skyjo/modular")
(out/"css").mkdir(parents=True,exist_ok=True)
(out/"js").mkdir(parents=True,exist_ok=True)
(out/"css"/"legacy.css").write_text(css,encoding="utf-8")
(out/"js"/"legacy.js").write_text(js,encoding="utf-8")
new=original.replace(style[0].group(0),'<link rel="stylesheet" href="modular/css/legacy.css">',1)
new=new.replace(js_candidates[0].group(0),'<script src="modular/js/legacy.js"></script>',1)
assert new.count('modular/css/legacy.css')==1
assert new.count('modular/js/legacy.js')==1
assert len(re.findall(r'<script',new,re.I))==len(re.findall(r'<script',original,re.I))
p.write_text(new,encoding="utf-8")
print("Extracted CSS",len(css),"JS",len(js),"HTML",len(new))
print("Original SHA256",hashlib.sha256(original.encode()).hexdigest())
