#!/usr/bin/env python3
"""Check SKYJO manifest integrity, entrypoint dependencies and JS syntax."""
from pathlib import Path
import hashlib
from html.parser import HTMLParser
import json
import re
import subprocess
from urllib.parse import urlsplit

root = Path(__file__).resolve().parents[1]
folder = root / "Skyjo"
manifest = json.loads((folder / "skyjo_action-manifest.json").read_text(encoding="utf-8"))
assert isinstance(manifest.get("version"), int) and manifest["version"] >= 19
parts = manifest["parts"]
assert len(parts) == 35 and len(parts) == len(set(parts)), "Expected 35 unique logic parts"
source = b""
for name, sha in parts.items():
    assert re.fullmatch(r"skyjo_action-logic-part-\d{2}\.txt", name), name
    path = folder / name
    assert path.is_file(), f"Missing {name}"
    data = path.read_bytes()
    assert hashlib.sha256(data).hexdigest() == sha, f"SHA-256 mismatch: {name}"
    source += data

def node_check(data, label):
    result = subprocess.run(["node", "--check", "-"], input=data, capture_output=True)
    assert result.returncode == 0, f"{label}: {result.stderr.decode(errors='replace')}"

node_check(source, "Concatenated SKYJO logic")
loader = (folder / "skyjo_action-loader.js").read_text(encoding="utf-8")
assert "skyjo_action-manifest.json" in loader
assert "manifest.version<19" in loader, "Update test when loader validation changes"

class Dependencies(HTMLParser):
    def __init__(self):
        super().__init__()
        self.assets = []
        self.inline_style = 0
        self.inline_script = 0

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == "style":
            self.inline_style += 1
        if tag == "script":
            if "src" in attrs:
                self.assets.append(attrs["src"])
            else:
                self.inline_script += 1
        if tag == "link" and attrs.get("rel") == "stylesheet":
            self.assets.append(attrs["href"])

js_paths = {folder / "skyjo_action-loader.js"}
for entry in ("skyjo_action_local.html", "skyjo_action.html"):
    html = (folder / entry).read_text(encoding="utf-8")
    parser = Dependencies()
    parser.feed(html)
    assert parser.inline_style == 0, f"{entry}: inline CSS reintroduced"
    assert parser.inline_script == 0, f"{entry}: inline JS reintroduced"
    assert "skyjo_action-loader.js" in html, f"{entry}: loader missing"
    assert len(parser.assets) == len(set(parser.assets)), f"{entry}: duplicate dependency URL"
    for asset in parser.assets:
        url = urlsplit(asset)
        assert not url.scheme and not url.netloc, f"{entry}: unexpected remote asset {asset}"
        resolved = (folder / url.path).resolve()
        assert resolved.is_relative_to(root.resolve()), f"{entry}: asset escapes repository: {asset}"
        assert resolved.is_file(), f"{entry}: missing asset: {asset}"
        if resolved.suffix == ".js":
            js_paths.add(resolved)
    print(f"{entry}: {len(parser.assets)} dependencies, 0 inline CSS/JS")

for path in sorted(js_paths):
    node_check(path.read_bytes(), str(path.relative_to(root)))
nested = folder / "Skyjo" / "skyjo_action.html"
assert nested.is_file() and "skyjo_action.html" in nested.read_text(encoding="utf-8")
print(f"SKYJO integrity OK: manifest v{manifest['version']}, {len(parts)} logic parts, "
      f"{len(source)} logic bytes, {len(js_paths)} JS syntax checks")


# User-provided layout is local-only: validate all nine blocks and wiring.
layout = json.loads((folder / "skyjo_layout_local_v3.json").read_text(encoding="utf-8"))
assert layout["version"] == 3
expected = {"stats", "player1", "hand", "deck", "player2", "player3", "status", "reactions", "pause"}
blocks = layout["blocks"]
assert len(blocks) == len(expected) and {b["id"] for b in blocks} == expected
for block in blocks:
    assert block["visible"] is True
    assert all(isinstance(block[key], (int, float)) and not isinstance(block[key], bool)
               for key in ("x", "y", "w", "h", "z"))
    assert block["w"] > 0 and block["h"] > 0
local_html = (folder / "skyjo_action_local.html").read_text(encoding="utf-8")
online_html = (folder / "skyjo_action.html").read_text(encoding="utf-8")
assert "skyjo_local_layout_v3.js" in local_html and "skyjo_local_layout_v3.css" in local_html
assert "skyjo_local_layout_v3.js" not in online_html and "skyjo_local_layout_v3.css" not in online_html
print("SKYJO local layout v3: nine validated blocks, local-only wiring OK")


# Ensure bundled CSS is byte-for-byte equivalent to its source sequence.
visual_sources = [
    "skyjo_royal_realism.css", "skyjo_royal_detail.css",
    "skyjo_reference_finish.css", "skyjo_photo_backdrop.css"
]
visual = (folder / "skyjo_royal_visual_bundle.css").read_text(encoding="utf-8")
for name in visual_sources:
    content = (folder / name).read_text(encoding="utf-8")
    assert content in visual, f"Royal CSS source changed during bundling: {name}"
reaction = (folder / "skyjo_reactions_status_bundle.css").read_text(encoding="utf-8")
for name in ("skyjo_reaction_dock.css", "skyjo_status_touch_fix.css"):
    assert (folder / name).read_text(encoding="utf-8") in reaction, f"Missing bundled CSS: {name}"
for left, right in (("01","02"),("03","04"),("05","06"),("07","08"),("09","10"),("11","12")):
    merged = (folder / f"skyjo_action-style-{left}.css").read_text(encoding="utf-8")
    original = (folder / f"skyjo_action-style-{right}.css").read_text(encoding="utf-8")
    assert original in merged, f"Missing legacy CSS segment {right}"
print("SKYJO CSS consolidation: all six legacy and two design bundles contain original rules")


# Local layout runtime CSS must not contain literal escaped line breaks between selectors.
runtime = (folder / "skyjo_local_layout_runtime.js").read_text(encoding="utf-8")
assert r"\nbody.skyjo-local-layout-ready" not in runtime, "Escaped CSS newline breaks player height rules"
adapter = (folder / "skyjo_local_layout_v3.js").read_text(encoding="utf-8")
assert "layoutPreview" in adapter and "pointer-events:none" in adapter
assert "document.readyState" in adapter, "Preview must handle late JSON load"
assert "requestAnimationFrame" in adapter, "Preview redraws must be throttled"
assert "addEventListener(\'scroll\'" in adapter, "Preview must follow scrolling"
assert "skyjo_layout_local_v3.json" in adapter
print("SKYJO local layout: runtime CSS and non-interactive preview OK")


# Ensure diagnostic overlays never become visible in ordinary local games.
assert "get('layoutPreview')==='1'" in adapter
local_css = (folder / "skyjo_local_layout_v3.css").read_text(encoding="utf-8")
assert "skyjo-local-layout-ready" in local_css
assert "overflow-x:auto" in local_css and "touch" in local_css
print("SKYJO local tablet safety: opt-in preview and scrollable reactions OK")

assert 'hudSelectors' in adapter
assert 'position:absolute!important' not in local_css
print('SKYJO footer layout remains in document flow')

assert "overlay.style.width=window.innerWidth+'px'" in adapter
assert "overlay.style.height=window.innerHeight+'px'" in adapter
assert "pause:'[data-action=\"pause\"], #pauseBtn, .pause-btn'" in adapter
print('SKYJO layout preview uses viewport and pause-specific diagnostics')

editor = (folder / 'skyjo_layout_editor.js').read_text(encoding='utf-8')
assert "params.get('layoutEditor')!=='1'" in editor
assert 'const actualX=rect?' in adapter and 'const actualY=rect?' in adapter
print('SKYJO layout editor opt-in and HUD geometry diagnostics OK')

assert 'deltaX:rect?' in adapter and 'deltaY:rect?' in adapter
assert 'first-status-tile-provisional' in adapter and 'full-status-bar' in adapter
assert 'new MutationObserver(schedule).observe(app' in adapter
print('SKYJO live geometry deltas and shared HUD mapping OK')

assert 'grid-template-columns:repeat(5,minmax(0,1fr))' in local_css
assert 'min-width:40px!important' in local_css
assert 'min-height:40px!important' in local_css
assert 'skyjo_local_layout_v3.css?v=5' in local_html
assert 'skyjo_local_layout_v3.js?v=4' in local_html
print('SKYJO local footer: five status tiles, touch targets and refreshed assets OK')

assert 'margin-bottom:clamp(6px,1vh,14px)' in local_css
assert 'margin-top:clamp(6px,.8vh,12px)' in local_css
assert 'text-overflow:ellipsis' in local_css
assert 'snapshot!==previousReport' in adapter
print('SKYJO local footer spacing and deduplicated diagnostics OK')

assert 'const startPreview=()=>{' in adapter
assert "document.addEventListener('DOMContentLoaded',startPreview,{once:true})" in adapter
assert "document.getElementById('skyjo-v3-preview')?.remove()" in adapter
assert 'visible=!!rect&&rect.width>0&&rect.height>0' in adapter
print('SKYJO preview lifecycle and hidden HUD diagnostics OK')

assert 'section.player.active' in local_css and 'outline:2px solid #fff0a5' in local_css
assert 'max-height:760px' in local_css and 'min-height:min(62vh,560px)' in local_css
print('SKYJO active-player gold frame and compact landscape layout OK')

assert 'body.is-playing:has(.table-area.three-player-layout)' in local_css
assert 'border:5px solid #ffdb57' in local_css
assert 'skyjo_local_layout_v3.css?v=5' in local_html
print('SKYJO screenshot feedback: visible local board styling and cache refresh OK')
