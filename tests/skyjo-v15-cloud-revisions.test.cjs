 'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
const dir=path.resolve(__dirname,'../Skyjo');const manifest=JSON.parse(fs.readFileSync(path.join(dir,'skyjo_action-manifest.json')));
assert.equal(manifest.version,19);let source='';for(const [name,hash] of Object.entries(manifest.parts)){const b=fs.readFileSync(path.join(dir,name));assert.equal(crypto.createHash('sha256').update(b).digest('hex'),hash);source+=b.toString('utf8')}new vm.Script(source);
function extract(name){let start=source.indexOf('function '+name+'(');assert.ok(start>=0,name);let brace=source.indexOf('{',start),depth=0,quote=null,escape=false;for(let i=brace;i<source.length;i++){let c=source[i];if(quote){if(escape)escape=false;else if(c==='\\')escape=true;else if(c===quote)quote=null;continue}if(c==='"'||c==="'"||c==='`'){quote=c;continue}if(c==='{')depth++;if(c==='}'&&!--depth)return source.slice(start,i+1)}throw Error(name)}
const calls={render:0,save:0,close:0};
const ctx={cloud:{rev:5,doc:{},room:'AB',applying:false,myName:'Alice'},state:{phase:'playing',round:1},ui:{mode:'none',selected:[]},motionBusy:false,motionQueueBusy:false,roundSummarySeen:'',scoreSequenceSeen:'',
 isRoomDoc:d=>!!d&&!!d.lobby,clone:d=>JSON.parse(JSON.stringify(d)),isHostDevice:()=>false,myPlayerIndex:()=>0,saveIdentity:()=>{},migrateState:d=>d,SKYJO_IS_HUB:true,restorePlayUIFromState:()=>({mode:'none',selected:[]}),scheduleLocalSnapshot:()=>{calls.save++},cloudConfigSave:()=>{},render:()=>{calls.render++},closeModal:()=>{calls.close++},document:{querySelectorAll:()=>[]},requestAnimationFrame:fn=>{ctx.raf=fn}};
vm.createContext(ctx);vm.runInContext(extract('applyCloudDoc')+';'+extract('scheduleCloudApply')+';'+extract('flushDeferredCloudApply'),ctx);
const doc=(name,round)=>({lobby:{players:[{name}],status:'playing'},game:{phase:'playing',round,players:[{name}]}});
assert.equal(vm.runInContext('applyCloudDoc('+JSON.stringify(doc('old',1))+',4)',ctx),false,'reject old revision');assert.equal(ctx.cloud.rev,5);assert.equal(calls.render,0);
assert.equal(vm.runInContext('applyCloudDoc('+JSON.stringify(doc('Alice',2))+',6)',ctx),true);assert.equal(ctx.cloud.rev,6);assert.equal(ctx.state.round,2);assert.equal(calls.render,1);assert.equal(ctx.cloud.applying,false);
vm.runInContext('scheduleCloudApply('+JSON.stringify(doc('Alice',3))+',7)',ctx);assert.equal(typeof ctx.raf,'function');assert.equal(ctx.cloud.rev,6);ctx.raf();assert.equal(ctx.cloud.rev,7);assert.equal(ctx.state.round,3);
vm.runInContext('scheduleCloudApply('+JSON.stringify(doc('Alice',4))+',7)',ctx);assert.equal(ctx.cloud.rev,7,'same revision ignored');
ctx.motionBusy=true;vm.runInContext('scheduleCloudApply('+JSON.stringify(doc('Alice',5))+',8)',ctx);assert.equal(ctx.cloud.rev,7);assert.equal(ctx.cloud.deferredRemote.rev,8);ctx.motionBusy=false;vm.runInContext('flushDeferredCloudApply()',ctx);ctx.raf();assert.equal(ctx.cloud.rev,8);assert.equal(ctx.state.round,5);
console.log('SKYJO V15: stale revisions rejected, new game state applied, animation-safe deferred sync passed.');
