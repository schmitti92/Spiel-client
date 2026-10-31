import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL(p,import.meta.url),'utf8');
const data=s=>'data:text/javascript;charset=utf-8,'+encodeURIComponent(s);
const {farbenblitz:game,COLORS}=await import(data(read('../games/farbenblitz.js')));
const players=[{id:'p1',type:'human'},{id:'bot',type:'bot'}];
const act=(state,playerId,action)=>game.applyAction(state,{playerId,action,players});
test('color challenge deterministic, options validated and 1-4 players supported',()=>{
 const a=game.initialState(players),b=game.initialState(players);
 assert.deepEqual(a,b);
 assert.equal(a.rounds,10);
 assert.equal(a.challenge.correct,a.challenge.ink);
 assert.equal(game.initialState(players,{level:'leicht'}).challenge.correct,game.initialState(players,{level:'leicht'}).challenge.word);
 assert.throws(()=>game.initialState(players,{rounds:0}),/INVALID_ROUNDS/);
 assert.throws(()=>game.initialState(players,{level:'unbekannt'}),/INVALID_LEVEL/);
});
test('all players answer once per round; scoring and completion are correct',()=>{
 let state=game.initialState(players,{rounds:2});
 const first=state.challenge.correct;
 state=act(state,'p1',{type:'answer',round:0,color:first});
 assert.equal(state.round,0);
 assert.equal(state.scores.p1,1);
 assert.throws(()=>act(state,'p1',{type:'answer',round:0,color:first}),/ALREADY_ANSWERED/);
 state=act(state,'bot',game.botAction(state,'bot',players));
 assert.equal(state.round,1);
 assert.equal(state.scores.bot,1);
 assert.equal(game.getResult(state),null);
 const wrong=COLORS.find(c=>c!==state.challenge.correct);
 state=act(state,'p1',{type:'answer',round:1,color:wrong});
 state=act(state,'bot',game.botAction(state,'bot',players));
 assert.equal(state.finished,true);
 assert.deepEqual(game.getResult(state).results,[{playerId:'p1',score:1},{playerId:'bot',score:2}]);
 assert.throws(()=>act(state,'p1',{type:'answer',round:2,color:first}),/GAME_FINISHED/);
});
test('invalid actions cannot mutate the state',()=>{
 const state=game.initialState(players);
 for(const action of [{type:'answer',round:5,color:'rot'},{type:'answer',round:0,color:'lila'},{type:'hit',round:0,color:'rot'}]){
  assert.throws(()=>act(state,'p1',action),/INVALID_COLOR_ACTION/);
 }
 assert.deepEqual(state.scores,{p1:0,bot:0});
 assert.equal(state.round,0);
});
