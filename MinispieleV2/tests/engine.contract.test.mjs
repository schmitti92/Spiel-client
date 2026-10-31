import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../engine/MiniGameEngine.js',import.meta.url),'utf8');
const {createSession,validateGame}=await import('data:text/javascript;charset=utf-8,'+encodeURIComponent(source));
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
