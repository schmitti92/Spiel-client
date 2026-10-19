#!/usr/bin/env python3
"""Check split SKYJO source byte integrity and JS syntax without modifying production."""
from pathlib import Path
import hashlib,json,subprocess,sys
root=Path(__file__).resolve().parent
m=json.loads((root/'skyjo-module-audit.json').read_text(encoding='utf-8'))
for variant,record in m.items():
    data=[]
    for part in record['parts']:
        path=root/part['name']
        if not path.is_file():sys.exit(f'MISSING {path}')
        content=path.read_bytes()
        if len(content)!=part['bytes'] or hashlib.sha256(content).hexdigest()!=part['sha256']:sys.exit(f'CHANGED {path}')
        data.append(content)
    merged=b''.join(data)
    if hashlib.sha256(merged).hexdigest()!=record['combined_sha256']:sys.exit(f'MERGE MISMATCH {variant}')
    test=root/(variant+'-syntax-check.tmp.js')
    try:
        test.write_bytes(merged)
        result=subprocess.run(['node','--check',str(test)],capture_output=True,text=True)
        if result.returncode:sys.exit(result.stderr)
    finally:test.unlink(missing_ok=True)
    print(f'OK {variant}: {len(record["parts"])} parts, {len(merged)} bytes, SHA-256 and syntax verified')
