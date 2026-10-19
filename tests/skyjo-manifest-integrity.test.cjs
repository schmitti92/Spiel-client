const assert=require('node:assert/strict'),fs=require('node:fs'),crypto=require('node:crypto');
const manifest=JSON.parse(fs.readFileSync('Skyjo/skyjo_action-manifest.json','utf8'));
const loader=fs.readFileSync('Skyjo/skyjo_action-loader.js','utf8');
assert.equal(manifest.version,19);
const entries=Object.entries(manifest.parts);
assert.equal(entries.length,35);
for(let i=0;i<entries.length;i++){
 const [name,expected]=entries[i];
 assert.equal(name,'skyjo_action-logic-part-'+String(i+1).padStart(2,'0')+'.txt');
 assert.match(expected,/^[a-f0-9]{64}$/);
 const bytes=fs.readFileSync('Skyjo/'+name);
 assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),expected,'SHA256 mismatch '+name);
}
assert.ok(loader.includes("names[i]!==expected"),'loader must verify manifest order');
assert.ok(loader.includes("new URL(name,baseUrl)"),'loader must resolve module URLs relative to itself');
assert.ok(loader.includes("crypto.subtle.digest('SHA-256'"),'loader must verify content integrity');
console.log('SKYJO V19: 35 source parts match exact SHA-256 manifest, loader validates order');
