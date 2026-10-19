#!/usr/bin/env python3
"""Verify current SKYJO manifest, part hashes, loader and JavaScript syntax."""
from pathlib import Path
import json,hashlib,subprocess,re
root=Path(__file__).resolve().parents[1]
folder=root/'Skyjo'
manifest=json.loads((folder/'skyjo_action-manifest.json').read_text())
assert manifest['version']==13
parts=manifest['parts']
assert len(parts)==35 and len(parts)==len(set(parts))
source=b''
for name,sha in parts.items():
    p=folder/name
    assert p.is_file(),f'Missing {name}'
    data=p.read_bytes()
    assert hashlib.sha256(data).hexdigest()==sha,f'Changed {name}'
    source+=data
check=subprocess.run(['node','--check','-'],input=source,capture_output=True)
assert check.returncode==0,check.stderr.decode()
loader=(folder/'skyjo_action-loader.js').read_text()
assert 'manifest.version!==13' in loader
html=(folder/'skyjo_action.html').read_text()
assert 'skyjo_action-loader.js' in html
nested=(folder/'Skyjo'/'skyjo_action.html').read_text()
assert 'skyjo_action.html' in nested
print('SKYJO V13 integrity OK:',len(parts),'parts,',len(source),'bytes, syntax and entrypoints')
