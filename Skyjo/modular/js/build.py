#!/usr/bin/env python3
"""Rebuild SKYJO's classic script without altering its shared lexical scope."""
from pathlib import Path
import sys
base=Path(__file__).resolve().parent
parts=sorted((base/"parts").glob("part-*.jsfrag"))
if not parts: sys.exit("Missing JS source fragments")
joined="".join(p.read_text(encoding="utf-8") for p in parts)
target=base/"legacy.js"
if "--check" in sys.argv:
    if not target.exists() or target.read_text(encoding="utf-8")!=joined:
        sys.exit("FAIL: legacy.js differs from source fragments")
    print(f"PASS: {len(parts)} source fragments exactly reproduce {len(joined)} characters")
else:
    target.write_text(joined,encoding="utf-8")
    print(f"Built {target} from {len(parts)} source fragments")
