import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../games/mole-arena.js',import.meta.url),'utf8');
const {moleArena:game}=await import('data:text/javascript;charset=utf-8,'+encodeURIComponent(source));
const players=[{id:'a',type:'human'},{id:'b',type:'bot'}];
const act=(s,playerId,action)=>game.applyAction(s,{playerId,action,players});
test('initial state is deterministic and supports human and bot',()=>{
 const a=game.initialState(players);
 assert.equal(a.target,0);
 assert.equal(a.elapsedMs,0);
 assert.deepEqual(a.scores,{a:0,b:0});
 assert.deepEqual(game.botAction(a,'b'),{type:'hit',hole:0});
});
test('one hit per player per second, misses score zero, 30 seconds finishes',()=>{
 let state=game.initialState(players);
 state=act(state,'a',{type:'hit',hole:0});
 state=act(state,'a',{type:'hit',hole:0});
 state=act(state,'b',{type:'hit',hole:8});
 assert.deepEqual(state.scores,{a:1,b:0});
 state=act(state,'a',{type:'tick',ms:1000});
 assert.equal(state.target,1);
 state=act(state,'b',game.botAction(state,'b'));
 assert.equal(state.scores.b,1);
 state=act(state,'a',{type:'tick',ms:29000});
 assert.equal(state.finished,true);
 assert.deepEqual(game.getResult(state).results,[{playerId:'a',score:1},{playerId:'b',score:1}]);
 assert.throws(()=>act(state,'a',{type:'hit',hole:0}),/GAME_FINISHED/);
});
test('invalid ticks and hits do not mutate state',()=>{
 const s=game.initialState(players);
 for(const action of [{type:'tick',ms:-1},{type:'tick',ms:1.5},{type:'hit',hole:9},{type:'hit',hole:-1}])
  assert.throws(()=>act(s,'a',action),/INVALID_/);
 assert.deepEqual(s.scores,{a:0,b:0});
});
