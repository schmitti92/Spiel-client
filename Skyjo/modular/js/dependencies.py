#!/usr/bin/env python3
"""Read-only dependency report for the classic SKYJO IIFE."""
from pathlib import Path
import re, json
root=Path(__file__).resolve().parent
src=(root/"legacy.js").read_text(encoding="utf-8")
decl=list(re.finditer(r"(?m)^\s*(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(",src))
names=[m.group(1) for m in decl]
if len(set(names))!=len(names):
 raise SystemExit("Duplicate function declarations; stop before refactoring")
report=[]
for m in decl:
 name=m.group(1)
 start=m.start()
 line=src.count("\n",0,start)+1
 # Reference counts are intentionally conservative and include strings/comments.
 references=len(re.findall(r"\b"+re.escape(name)+r"\s*\(",src))
 report.append({"name":name,"line":line,"approximate_calls":max(0,references-1)})
groups={
 "online":r"cloud|room|hub|online|sync|poll|remote",
 "cards":r"card|draw|deck|discard|row|column|joker",
 "turns":r"turn|round|score|finish|win|action",
 "ui":r"render|modal|toast|ui|layout|board",
}
classified={}
for group,pattern in groups.items():
 classified[group]=[x for x in report if re.search(pattern,x["name"],re.I)]
classified["unclassified"]=[x for x in report if not any(re.search(p,x["name"],re.I) for p in groups.values())]
payload={"total_functions":len(report),"note":"Heuristic name-based categories and approximate calls, not a full JavaScript AST or a verified call graph.","groups":classified}
(root/"dependencies.json").write_text(json.dumps(payload,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
print("Indexed",len(report),"functions; no runtime changes")
