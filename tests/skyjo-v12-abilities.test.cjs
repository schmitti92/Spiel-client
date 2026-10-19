const assert=require('node:assert/strict');
const fs=require('node:fs');const path=require('node:path');const vm=require('node:vm');const crypto=require('node:crypto');
const base=path.resolve(__dirname,'../Skyjo');
const manifest=JSON.parse(fs.readFileSync(path.join(base,'skyjo_action-manifest.json'),'utf8'));
assert.equal(manifest.version,19);
const names=Object.keys(manifest.parts);assert.equal(names.length,35);
const source=names.map(n=>{const b=fs.readFileSync(path.join(base,n));assert.equal(crypto.createHash('sha256').update(b).digest('hex'),manifest.parts[n],n);return b.toString('utf8')}).join('');
new vm.Script(source,{filename:'skyjo-reassembled.js'});
const context={window:{}};vm.runInNewContext(fs.readFileSync(path.join(base,'skyjo_action-actions.js'),'utf8'),context);
const types=['ownswap','double','draw3','enlight','react','defense','swapother','thief','meteor'];
assert.deepEqual(Object.keys(context.window.SKYJO_ACTION_DEFINITIONS).sort(),types.slice().sort());
// Isolate the actual playAction function and run all nine branches with stubs.
const begin=source.indexOf('function playAction(a,reactivated)');assert.ok(begin>=0);
const end=source.indexOf('\nfunction ownSwapOrientation()',begin);assert.ok(end>begin);
const fn=source.slice(begin,end);let checks=0;
for(const type of types){
 let called=[],card={type,id:'action-1'};
 let player={name:'Testspieler'};
 let state={currentPlayer:0,extraTurns:0,actionDiscard:[],heldReacts:[]};
 let ui={};
 const ctx={state,ui,ACTIONS:context.window.SKYJO_ACTION_DEFINITIONS,
 current:()=>player,setWatch:()=>{},log:()=>{},toast:()=>{},render:()=>{called.push('render')},
 finishTurn:()=>{called.push('finishTurn')},startDraw3:()=>called.push('draw3'),
 startEnlightenment:()=>called.push('enlight'),startReactivation:()=>called.push('react'),
 startOtherSwap:()=>called.push('swapother'),startThief:()=>called.push('thief'),
 startMeteor:()=>called.push('meteor')};
 vm.createContext(ctx);vm.runInContext(fn+';playAction({type:'+JSON.stringify(type)+',id:"action-1"},false);',ctx);
 const expected={ownswap:'render',double:'finishTurn',draw3:'draw3',enlight:'enlight',react:'react',defense:'finishTurn',swapother:'swapother',thief:'thief',meteor:'meteor'}[type];
 assert.ok(called.includes(expected),`${type} dispatch failed`);
 assert.equal(state.extraTurns,type==='double'?2:type==='defense'?1:0);
 assert.equal(state.actionDiscard.length,type==='react'?0:1);
 assert.equal(state.heldReacts.length,type==='react'?1:0);
 checks++;
}
// Guard against executing action twice / unauthorized remote actor.
for(const name of ['resolveActionConfirm','reactivate','thiefPick','beginOtherSwapSelection']){
 assert.match(source,new RegExp('function '+name+'\\('));
}
const resolve=source.slice(source.indexOf('function resolveActionConfirm('),source.indexOf('\nfunction confirmDiscardAction('));
let state={players:[{actions:[{id:'one',type:'double',availableOwnTurn:0}],ownTurn:4}],currentPlayer:0};
let ui={mode:'chooseActionTurn'};let cloud={enabled:true};
let ctx={state,ui,cloud,isMyActorDevice:()=>false,current:()=>state.players[0],actionAvailable:()=>true};
vm.createContext(ctx);vm.runInContext(resolve,ctx);
assert.equal(ctx.resolveActionConfirm(0,'one'),null,'remote actor must not consume action');
assert.equal(state.players[0].actions.length,1);
cloud.enabled=false;
assert.equal(ctx.resolveActionConfirm(0,'wrong'),null,'stale action id must not consume action');
assert.equal(state.players[0].actions.length,1);
assert.equal(ctx.resolveActionConfirm(0,'one').id,'one');
assert.equal(state.players[0].actions.length,0);
console.log(`SKYJO V12 OK: ${checks} ability branches, ${names.length} checksums, actor/id guards`);
