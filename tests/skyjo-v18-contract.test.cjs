 'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),dir=path.join(root,'Skyjo');
const manifest=JSON.parse(fs.readFileSync(path.join(dir,'skyjo_action-manifest.json')));
assert.equal(manifest.version,19);assert.equal(Object.keys(manifest.parts).length,35);
let source='';for(const [name,hash] of Object.entries(manifest.parts)){
 assert.ok(!name.includes('..')&&!path.isAbsolute(name));
 const bytes=fs.readFileSync(path.join(dir,name));assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),hash);source+=bytes.toString('utf8');
}
new vm.Script(source);
const loader=fs.readFileSync(path.join(dir,'skyjo_action-loader.js'),'utf8');new vm.Script(loader);
assert.match(loader,/manifest\.version\s*!==\s*19/);
assert.match(loader,/crypto\.subtle/);
const main=fs.readFileSync(path.join(dir,'skyjo_action.html'),'utf8');
assert.match(main,/skyjo_action-loader\.js/);
for(const ref of main.matchAll(/(?:src|href)=["']([^"']+)["']/g)){
 const url=ref[1];if(/^(?:https?:|data:|#|\/\/)/.test(url))continue;
 const rel=url.split(/[?#]/)[0];if(!rel)continue;
 assert.ok(fs.existsSync(path.resolve(dir,rel)),`Missing local asset: ${rel}`);
}
const nested=fs.readFileSync(path.join(dir,'Skyjo','skyjo_action.html'),'utf8');
assert.match(nested,/\.\.\/skyjo_action\.html/);
assert.match(source,/skyjo-room-v2/);
for(const key of ['applyCloudDoc','scheduleCloudApply','finishTurn','isMyActorDevice','isHostDevice'])assert.ok(source.includes('function '+key+'('),`Missing ${key}`);
console.log('SKYJO V18: manifest, hashes, loader, local assets, nested redirect and cloud entry points passed.');
