'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const crypto=require('node:crypto');
const dir=path.resolve(__dirname,'../Skyjo');
const manifest=JSON.parse(fs.readFileSync(path.join(dir,'skyjo_action-manifest.json')));
assert.equal(manifest.version,19);
const parts=Object.entries(manifest.parts);
assert.equal(parts.length,35);
const source=parts.map(([file,hash])=>{const content=fs.readFileSync(path.join(dir,file));assert.equal(crypto.createHash('sha256').update(content).digest('hex'),hash,file);return content.toString('utf8')}).join('');
new vm.Script(source);
function extract(name){const start=source.indexOf('function '+name+'(');assert.ok(start>=0,name+' missing');let brace=source.indexOf('{',start),depth=0,quote=null,escape=false;for(let i=brace;i<source.length;i++){const c=source[i];if(quote){if(escape)escape=false;else if(c==='\\')escape=true;else if(c===quote)quote=null;continue;}if(c==='"'||c==="'"||c==='`'){quote=c;continue;}if(c==='{')depth++;if(c==='}'&&!--depth)return source.slice(start,i+1);}throw Error('unbalanced '+name)}
function run(name,ctx,call){vm.createContext(ctx);vm.runInContext(extract(name)+';'+call,ctx)}
let finished=0,notices=[];
const base={finishTurn:()=>finished++,toast:x=>notices.push(x),render:()=>{},save:()=>{},setTimeout:()=>{},showThiefModal:()=>{},showDraw3Modal:()=>{},showReactivationModal:()=>{}};
// Theft without an eligible target must not open a modal and grants the defined extra turn.
let state={currentPlayer:0,extraTurns:0,players:[{actions:[]},{actions:[]}]},ui={};
run('startThief',{...base,state,ui},'startThief()');assert.equal(state.extraTurns,1);assert.equal(finished,1);
// Drawing three cards with an exhausted deck must end the action without creating an empty selection.
finished=0;state={};ui={};run('startDraw3',{...base,state,ui,takePlay:()=>null},'startDraw3()');assert.equal(finished,1);
// Reactivation must not reactivate itself or an empty discard pile.
finished=0;state={actionDiscard:[{id:'self'}]};ui={};run('startReactivation',{...base,state,ui},'startReactivation("self")');assert.equal(finished,1);
// Meteor must skip players whose defense was consumed, keeping eligible targets ordered.
finished=0;state={players:[{},{},{}],currentPlayer:0};ui={};let defended=[];
const ctx={...base,state,ui,consumeDefense:i=>{defended.push(i);return i===1;}};
run('startMeteor',ctx,'startMeteor()');assert.deepEqual(defended,[1,2]);assert.equal(ctx.ui.mode,'meteorSelect');assert.deepEqual(Array.from(ctx.ui.data.targets),[2]);assert.equal(finished,0);
// If all opponents defend, the attack ends without selecting an invalid target.
finished=0;state={players:[{},{},{}],currentPlayer:0};ui={};run('startMeteor',{...base,state,ui,consumeDefense:()=>true},'startMeteor()');assert.equal(finished,1);
console.log('SKYJO V13: 35 SHA-256 checks, JS syntax and 5 ability edge-case scenarios passed.');
