#!/usr/bin/env python3
"""Generate compact WebP display artwork from the 32 large Hammer-Bingo PNGs.
The canonical uploads remain untouched; prize and card IDs never change.
"""
from __future__ import annotations
import re
from pathlib import Path
from PIL import Image, ImageOps

root = Path(__file__).resolve().parents[1]
source = (root / "weihnachten.html").read_text(encoding="utf-8")
start = source.index("const hammerBingoArtwork=[[")
end = source.index("function renderHammerCardPreviews()", start)
files = re.findall(r'\["(file_[^"]+\.png)","[^"]*"\]', source[start:end])
if len(files) != 32 or len(set(files)) != 32:
    raise SystemExit(f"Expected exactly 32 unique card sources, found {len(files)}")
folder = root / "Weihnachtsevent2" / "Weihnachtsbilder"
for index, name in enumerate(files, start=33):
    original = folder / name
    output = folder / f"card-{index:02d}.webp"
    with Image.open(original) as source_img:
        im = ImageOps.exif_transpose(source_img)
        im.thumbnail((900, 900), Image.Resampling.LANCZOS)
        if im.mode not in ("RGBA", "RGB"):
            im = im.convert("RGBA" if "A" in im.getbands() else "RGB")
        im.save(output, "WEBP", quality=77, method=6)
    print(f"Card {index}: {original.stat().st_size:,} -> {output.stat().st_size:,} bytes")
print("Created all 32 low-bandwidth Christmas card illustrations.")
