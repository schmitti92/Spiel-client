import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const gameContractSource=readFileSync(new URL('../engine/GameContract.js',import.meta.url),'utf8');
const gameContractUrl='data:text/javascript;charset=utf-8,'+encodeURIComponent(gameContractSource);
const source=readFileSync(new URL('../engine/MiniGameEngine.js',import.meta.url),'utf8');
const {createSession,validateGame}=await import('data:text/javascript;charset=utf-8,'+encodeURIComponent(source.replace("'./GameContract.js'",JSON.stringify(gameContractUrl))));
const game={
 id:'contract-demo',
 initialState:(players)=>({turn:0,score:Object.fromEntries(players.map(p=>[p.id,0]))}),
 applyAction:(state,{playerId,action})=>{if(action.type!=='score')throw Error('INVALID_ACTION_TYPE');state.score[playerId]+=action.value;state.turn++;return state;},
 getResult:(state)=>state.turn>=3?{scores:state.score}:null,
 botAction:()=>({type:'score',value:1})
};
test('contract rejects missing functions',()=>assert.throws(()=>validateGame({id:'x'}),/GAME_CONTRACT/));
test('supports 1–4 human/bot participants',()=>{
 for(let n=1;n<=4;n++)assert.equal(createSession(game,Array.from({length:n},(_,i)=>({id:'p'+i,type:i%2?'bot':'human'}))).snapshot().players.length,n);
 assert.throws(()=>createSession(game,[]),/PLAYER_COUNT/);
 assert.throws(()=>createSession(game,Array.from({length:5},(_,i)=>({id:'p'+i,type:'human'}))),/PLAYER_COUNT/);
});
test('snapshot is isolated from internal state',()=>{
 const s=createSession(game,[{id:'a',type:'human'}]);
 const snap=s.snapshot();snap.state.score.a=999;
 assert.equal(s.snapshot().state.score.a,0);
});
test('dispatch, result and restart share one interface',()=>{
 const s=createSession(game,[{id:'a',type:'human'}]);
 s.dispatch('a',{type:'score',value:2});s.dispatch('a',{type:'score',value:3});
 assert.equal(s.snapshot().result,null);
 assert.equal(s.dispatch('a',{type:'score',value:4}).result.scores.a,9);
 assert.equal(s.restart().state.score.a,0);
});
test('bots use the same action pipeline',()=>{
 const s=createSession(game,[{id:'bot',type:'bot'}]);
 assert.equal(s.botTurn('bot').state.score.bot,1);
 assert.throws(()=>s.dispatch('missing',{type:'score',value:1}),/UNKNOWN_PLAYER/);
});

test('rejects invalid initial state without creating a session',()=>{
 for (const invalid of [null, 0, 'bad']) {
  const broken={...game,initialState:()=>invalid};
  assert.throws(()=>createSession(broken,[{id:'a',type:'human'}]),/INVALID_INITIAL_STATE/);
 }
});
test('invalid restarted state preserves prior state and revision',()=>{
 let starts=0;
 const broken={...game,initialState:ps=>++starts===1?game.initialState(ps):null};
 const session=createSession(broken,[{id:'a',type:'human'}]);
 session.dispatch('a',{type:'score',value:3});
 const before=session.snapshot();
 assert.throws(()=>session.restart(),/INVALID_INITIAL_STATE/);
 assert.deepEqual(session.snapshot(),before);
});

test('enforces declared game-specific player limits',()=>{
 const restricted={...game,minPlayers:2,maxPlayers:3};
 const roster=n=>Array.from({length:n},(_,i)=>({id:'p'+i,type:'human'}));
 assert.throws(()=>createSession(restricted,roster(1)),/GAME_PLAYER_LIMITS/);
 assert.equal(createSession(restricted,roster(2)).snapshot().players.length,2);
 assert.equal(createSession(restricted,roster(3)).snapshot().players.length,3);
 assert.throws(()=>createSession(restricted,roster(4)),/GAME_PLAYER_LIMITS/);
});
test('rejects unsupported contract versions before starting a game',()=>{
 assert.throws(()=>createSession({...game,contractVersion:2},[{id:'a',type:'human'}]),/UNSUPPORTED_GAME_CONTRACT_VERSION/);
});
test('rejects invalid game capabilities and malformed configuration limits',()=>{
 const roster=[{id:'a',type:'human'}];
 assert.throws(()=>createSession({...game,capabilities:['network']},roster),/INVALID_GAME_CAPABILITIES/);
 assert.throws(()=>createSession({...game,minPlayers:0},roster),/INVALID_GAME_PLAYER_LIMITS/);
 assert.throws(()=>createSession({...game,maxPlayers:1.5},roster),/INVALID_GAME_PLAYER_LIMITS/);
});

test('rejects malformed game options without calling initialState',()=>{
 let calls=0;
 const probe={...game,initialState:ps=>{calls++;return game.initialState(ps);}};
 const players=[{id:'a',type:'human'}];
 for(const options of [null,[],false,'invalid',42]){
  assert.throws(()=>createSession(probe,players,options),/INVALID_GAME_OPTIONS/);
 }
 assert.equal(calls,0);
});
test('passes independent configuration snapshots to initialState and restart',()=>{
 const options={difficulty:{level:2}};
 const probe={...game,initialState:(ps,config)=>{
  config.difficulty.level=99;
  return game.initialState(ps);
 }};
 const session=createSession(probe,[{id:'a',type:'human'}],options);
 assert.equal(options.difficulty.level,2);
 session.restart();
 assert.equal(options.difficulty.level,2);
});

test('failed result evaluation rolls back action and revision',()=>{
 const probe={...game,getResult:state=>{if(state.turn===1)throw Error('RESULT_EVALUATION_FAILED');return null;}};
 const session=createSession(probe,[{id:'a',type:'human'}]);
 const before=session.snapshot();
 assert.throws(()=>session.dispatch('a',{type:'score',value:2}),/RESULT_EVALUATION_FAILED/);
 assert.deepEqual(session.snapshot(),before);
});
test('failed result evaluation during restart preserves prior session',()=>{
 let starts=0;
 const probe={...game,initialState:ps=>({ ...game.initialState(ps),restartMarker:starts++ }),getResult:state=>{
  if(state.restartMarker===1)throw Error('RESTART_RESULT_FAILED');
  return null;
 }};
 const session=createSession(probe,[{id:'a',type:'human'}]);
 session.dispatch('a',{type:'score',value:2});
 const before=session.snapshot();
 assert.throws(()=>session.restart(),/RESTART_RESULT_FAILED/);
 assert.deepEqual(session.snapshot(),before);
});
