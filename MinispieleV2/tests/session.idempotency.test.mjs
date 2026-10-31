import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const url=source=>'data:text/javascript;charset=utf-8,'+encodeURIComponent(source);
const gameContractUrl=url(read('../engine/GameContract.js'));
const engine=url(read('../engine/MiniGameEngine.js').replace("'./GameContract.js'",JSON.stringify(gameContractUrl)));
const result=url(read('../engine/ResultContract.js'));
const playersUrl=url(read('../engine/PlayerManager.js'));
const standard=url(read('../engine/StandardSession.js').replace("'./MiniGameEngine.js'",JSON.stringify(engine)).replace("'./ResultContract.js'",JSON.stringify(result)));
const managed=url(read('../engine/SessionManager.js').replace("'./StandardSession.js'",JSON.stringify(standard)).replace("'./PlayerManager.js'",JSON.stringify(playersUrl)));
const {createManagedSession}=await import(managed);
const players=[{id:'a',type:'human'},{id:'b',type:'bot'}];
const game={id:'dedupe-test',initialState:ps=>({done:false,scores:Object.fromEntries(ps.map(p=>[p.id,0]))}),applyAction:(s,{playerId,action})=>{if(action.type==='finish')s.done=true;else if(action.type==='score')s.scores[playerId]++;else throw Error('INVALID_ACTION');return s;},getResult:s=>s.done?{finished:true,results:Object.entries(s.scores).map(([playerId,score])=>({playerId,score}))}:null,botAction:()=>({type:'score'})};
test('repeated request id does not score twice',()=>{
 const s=createManagedSession(game,players);s.start();
 const first=s.dispatch('a',{type:'score'},{requestId:'one',expectedRevision:0});
 const repeat=s.dispatch('a',{type:'score'},{requestId:'one',expectedRevision:0});
 assert.equal(first.revision,1);
 assert.equal(repeat.revision,1);
 assert.equal(repeat.state.scores.a,1);
});
test('request id reused with different action is rejected',()=>{
 const s=createManagedSession(game,players);s.start();
 s.dispatch('a',{type:'score'},{requestId:'one'});
 assert.throws(()=>s.dispatch('a',{type:'finish'},{requestId:'one'}),/REQUEST_ID_CONFLICT/);
 assert.equal(s.snapshot().phase,'playing');
});
test('stale revision is rejected without mutating state',()=>{
 const s=createManagedSession(game,players);s.start();
 s.dispatch('a',{type:'score'},{requestId:'first',expectedRevision:0});
 assert.throws(()=>s.dispatch('a',{type:'score'},{requestId:'second',expectedRevision:0}),/STALE_REVISION/);
 assert.equal(s.snapshot().state.scores.a,1);
});
test('retransmitted finishing request stays idempotent',()=>{
 const s=createManagedSession(game,players);s.start();
 const first=s.dispatch('a',{type:'finish'},{requestId:'finish'});
 const again=s.dispatch('a',{type:'finish'},{requestId:'finish'});
 assert.equal(first.phase,'finished');
 assert.equal(again.revision,first.revision);
});
test('restart creates fresh request generation',()=>{
 const s=createManagedSession(game,players);s.start();
 s.dispatch('a',{type:'finish'},{requestId:'same'});
 assert.equal(s.restart().generation,1);
 s.start();
 assert.equal(s.dispatch('a',{type:'score'},{requestId:'same'}).state.scores.a,1);
});
