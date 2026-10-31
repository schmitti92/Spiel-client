import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL(p,import.meta.url),'utf8');
const data=s=>'data:text/javascript;charset=utf-8,'+encodeURIComponent(s);
const contract=data(read('../engine/GameContract.js'));
const engine=data(read('../engine/MiniGameEngine.js').replace("'./GameContract.js'",JSON.stringify(contract)));
const results=data(read('../engine/ResultContract.js'));
const standard=data(read('../engine/StandardSession.js').replace("'./MiniGameEngine.js'",JSON.stringify(engine)).replace("'./ResultContract.js'",JSON.stringify(results)));
const players=data(read('../engine/PlayerManager.js'));
const session=data(read('../engine/SessionManager.js').replace("'./StandardSession.js'",JSON.stringify(standard)).replace("'./PlayerManager.js'",JSON.stringify(players)));
const {createManagedSession}=await import(session);
const roster=[{id:'h',type:'human'},{id:'b',type:'bot'}];
const game=(limit)=>({id:'lifecycle-probe',minPlayers:1,maxPlayers:4,initialState:()=>({actions:0}),applyAction:(state)=>({...state,actions:state.actions+1}),getResult:state=>state.actions>=limit?{finished:true,results:roster.map(p=>({playerId:p.id,score:state.actions}))}:null,botAction:()=>({type:'act'})});
test('game-defined finish condition controls lifecycle without engine round limits',()=>{
 for(const limit of [1,3,7]){
  const s=createManagedSession(game(limit),roster);
  assert.equal(s.snapshot().phase,'ready');
  s.start();
  for(let i=0;i<limit;i++){
   const snap=i%2?s.botTurn('b'):s.dispatch('h',{type:'act'});
   assert.equal(snap.phase,i===limit-1?'finished':'playing');
  }
  assert.throws(()=>s.dispatch('h',{type:'act'}),/SESSION_NOT_PLAYING/);
  assert.equal(s.restart().phase,'ready');
  assert.equal(s.start().phase,'playing');
 }
});
test('failed bot action leaves managed session playing and revision unchanged',()=>{
 const broken={...game(2),botAction:()=>({type:'bad'}),applyAction:(state,{action})=>{if(action.type==='bad')throw Error('BAD_BOT_ACTION');return {...state,actions:state.actions+1};}};
 const s=createManagedSession(broken,roster);
 s.start();const before=s.snapshot();
 assert.throws(()=>s.botTurn('b'),/BAD_BOT_ACTION/);
 assert.deepEqual(s.snapshot(),before);
});

test('a game may finish immediately on start without a round or timer',()=>{
 const instant={...game(1),getResult:()=>({finished:true,results:roster.map(p=>({playerId:p.id,score:0}))})};
 const s=createManagedSession(instant,roster);
 assert.equal(s.start().phase,'finished');
 assert.throws(()=>s.botTurn('b'),/SESSION_NOT_PLAYING/);
 assert.equal(s.restart().phase,'ready');
 assert.equal(s.start().phase,'finished');
});
test('duplicate human requests do not advance a game twice',()=>{
 const s=createManagedSession(game(3),roster);
 s.start();
 const first=s.dispatch('h',{type:'act'},{requestId:'same',expectedRevision:0});
 const repeat=s.dispatch('h',{type:'act'},{requestId:'same',expectedRevision:0});
 assert.equal(repeat.revision,first.revision);
 assert.equal(repeat.state.actions,1);
 assert.throws(()=>s.dispatch('h',{type:'different'},{requestId:'same'}),/REQUEST_ID_CONFLICT/);
 assert.equal(s.snapshot().state.actions,1);
});
test('stale actions are rejected without changing lifecycle state',()=>{
 const s=createManagedSession(game(2),roster);
 s.start();
 const before=s.snapshot();
 assert.throws(()=>s.dispatch('h',{type:'act'},{expectedRevision:99}),/STALE_REVISION/);
 assert.deepEqual(s.snapshot(),before);
});

test('invalid game result rolls back human action and keeps session playing',()=>{
 const invalid={...game(2),getResult:state=>state.actions===1?{finished:true,results:[]} : null};
 const s=createManagedSession(invalid,roster);
 s.start();const before=s.snapshot();
 assert.throws(()=>s.dispatch('h',{type:'act'},{requestId:'retry'}),/INVALID_RESULT_COUNT/);
 assert.deepEqual(s.snapshot(),before);
 assert.throws(()=>s.dispatch('h',{type:'act'},{requestId:'retry'}),/INVALID_RESULT_COUNT/);
 assert.deepEqual(s.snapshot(),before);
});
test('failed restart preserves finished session and allows retry',()=>{
 let starts=0;
 const probe={...game(1),initialState:()=>++starts===2?null:{actions:0}};
 const s=createManagedSession(probe,roster);
 s.start();s.dispatch('h',{type:'act'});
 const before=s.snapshot();
 assert.equal(before.phase,'finished');
 assert.throws(()=>s.restart(),/INVALID_INITIAL_STATE/);
 assert.deepEqual(s.snapshot(),before);
 const restarted=s.restart();
 assert.equal(restarted.phase,'ready');
 assert.equal(restarted.generation,before.generation+1);
 assert.equal(restarted.state.actions,0);
});
test('request ids are scoped to a generation after restart',()=>{
 const s=createManagedSession(game(1),roster);
 s.start();
 assert.equal(s.dispatch('h',{type:'act'},{requestId:'one'}).phase,'finished');
 s.restart();s.start();
 assert.equal(s.dispatch('h',{type:'act'},{requestId:'one'}).phase,'finished');
 assert.equal(s.snapshot().generation,1);
});

test('start remains ready when a snapshot fails during start',()=>{
 let reads=0, failAt=Infinity;
 const unstable={...game(2),getResult:()=>{if(++reads===failAt)throw Error('RESULT_READ_FAILED');return null;}};
 const s=createManagedSession(unstable,roster);
 assert.equal(s.snapshot().phase,'ready');
 failAt=reads+1;
 assert.throws(()=>s.start(),/RESULT_READ_FAILED/);
 assert.equal(s.snapshot().phase,'ready');
 assert.equal(s.start().phase,'playing');
});

test('successful action does not re-evaluate result after commit',()=>{
 let calls=0;
 const probe={...game(1),getResult:state=>{calls++;return state.actions?{finished:true,results:roster.map(p=>({playerId:p.id,score:1}))}:null;}};
 const s=createManagedSession(probe,roster);
 s.start();const before=calls;
 const result=s.dispatch('h',{type:'act'});
 assert.equal(result.phase,'finished');
 assert.equal(calls-before,2); // precommit validation and committed snapshot
});
test('restart returns committed snapshot without another result evaluation',()=>{
 let calls=0;
 const probe={...game(1),getResult:state=>{calls++;return state.actions?{finished:true,results:roster.map(p=>({playerId:p.id,score:1}))}:null;}};
 const s=createManagedSession(probe,roster);
 s.start();s.dispatch('h',{type:'act'});
 const before=calls;
 const next=s.restart();
 assert.equal(next.phase,'ready');
 assert.equal(next.state.actions,0);
 assert.equal(calls-before,2);
});

test('lifecycle rejects invalid transitions without advancing revision',()=>{
 const s=createManagedSession(game(2),roster);
 const initial=s.snapshot();
 assert.throws(()=>s.dispatch('h',{type:'act'}),/SESSION_NOT_PLAYING/);
 assert.throws(()=>s.botTurn('b'),/SESSION_NOT_PLAYING/);
 assert.throws(()=>s.restart(),/SESSION_NOT_FINISHED/);
 assert.deepEqual(s.snapshot(),initial);
 s.start();
 assert.throws(()=>s.start(),/SESSION_NOT_READY/);
 assert.throws(()=>s.restart(),/SESSION_NOT_FINISHED/);
 assert.equal(s.snapshot().revision,initial.revision);
 s.dispatch('h',{type:'act'});
 s.botTurn('b');
 const finished=s.snapshot();
 assert.equal(finished.phase,'finished');
 assert.throws(()=>s.start(),/SESSION_NOT_READY/);
 assert.throws(()=>s.botTurn('b'),/SESSION_NOT_PLAYING/);
 assert.deepEqual(s.snapshot(),finished);
});
test('failed bot result validation does not commit a lifecycle transition',()=>{
 const invalid={...game(2),getResult:state=>state.actions===1?{finished:true,results:[]} : null};
 const s=createManagedSession(invalid,roster);
 s.start();const before=s.snapshot();
 assert.throws(()=>s.botTurn('b'),/INVALID_RESULT_COUNT/);
 assert.deepEqual(s.snapshot(),before);
});

test('scoreless v2 results finish and restart cleanly without inventing scores',()=>{
 const scoreless={...game(2),getResult:state=>state.actions>=2?{resultVersion:2,finished:true,results:[{playerId:'h',outcome:'survived'},{playerId:'b',outcome:'eliminated'}],reason:'last-survivor'}:null};
 const s=createManagedSession(scoreless,roster);
 assert.equal(s.start().phase,'playing');
 assert.equal(s.dispatch('h',{type:'act'}).result,null);
 const finished=s.botTurn('b');
 assert.equal(finished.phase,'finished');
 assert.equal(finished.result.reason,'last-survivor');
 assert.deepEqual(finished.result.results.map(x=>x.outcome),['survived','eliminated']);
 assert.deepEqual(s.snapshot().result,finished.result);
 const next=s.restart();
 assert.equal(next.phase,'ready');
 assert.equal(next.result,null);
 assert.equal(next.generation,1);
 assert.equal(s.start().phase,'playing');
});
test('invalid v2 optional score rolls back action and preserves lifecycle',()=>{
 const invalid={...game(1),getResult:state=>state.actions?{resultVersion:2,finished:true,results:[{playerId:'h',score:Infinity},{playerId:'b',outcome:'ok'}]}:null};
 const s=createManagedSession(invalid,roster);
 s.start();const before=s.snapshot();
 assert.throws(()=>s.dispatch('h',{type:'act'}),/INVALID_RESULT_SCORE/);
 assert.deepEqual(s.snapshot(),before);
});
