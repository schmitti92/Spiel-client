#!/usr/bin/env python3
"""Create a static function inventory without changing game behavior."""
from pathlib import Path
import re
root=Path(__file__).resolve().parent
src=(root/"legacy.js").read_text(encoding="utf-8")
functions=list(re.finditer(r"(?m)^\s*(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(",src))
patterns={
 "online_and_rooms":r"cloud|room|hub|online|sync|poll|remote",
 "cards_and_jokers":r"card|draw|deck|discard|row|column|joker",
 "turns_and_scoring":r"turn|round|score|finish|win|action",
 "interface":r"render|modal|toast|ui|layout|board",
}
out=["# SKYJO function inventory","",f"Detected named functions: {len(functions)}.","","Categories are heuristic and may overlap.",""]
for category,pattern in patterns.items():
 matches=[(m.group(1),src.count("\n",0,m.start())+1) for m in functions if re.search(pattern,m.group(1),re.I)]
 out.extend(["## "+category+" ("+str(len(matches))+")",""])
 out.extend("- "+name+" (line "+str(line)+")" for name,line in matches)
 out.append("")
other=[m.group(1) for m in functions if not any(re.search(p,m.group(1),re.I) for p in patterns.values())]
out.extend(["## Unclassified ("+str(len(other))+")",""])
out.extend("- "+name for name in other)
out.extend(["","## Migration notes","",
 "- Current shared IIFE must remain intact until lexical dependencies are mapped.",
 "- Keep legacy.js as the runtime file while editing smaller source fragments.",
 "- Browser and multiplayer tests are required before production merge.",""])
(root/"FUNCTION_INVENTORY.md").write_text("\n".join(out),encoding="utf-8")
print("Indexed",len(functions),"functions")
