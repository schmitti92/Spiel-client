import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const contractSource=readFileSync(new URL('../engine/GameContract.js',import.meta.url),'utf8');
const contractUrl='data:text/javascript;charset=utf-8,'+encodeURIComponent(contractSource);
const source=readFileSync(new URL('../engine/MiniGameEngine.js',import.meta.url),'utf8').replace("'./GameContract.js'",JSON.stringify(contractUrl));
const {createSession,validateGame}=await import('data:text/javascript;charset=utf-8,'+encodeURIComponent(source));

const rules={
 id:'contract-result-demo',
 initialState:(players)=>({finished:false,scores:Object.fromEntries(players.map(p=>[p.id,0]))}),
 applyAction:(state,{playerId,action})=>{
  if(state.finished)throw Error('GAME_FINISHED');
  if(action.type==='score'&&Number.isFinite(action.value))state.scores[playerId]+=action.value;
  else if(action.type==='finish')state.finished=true;
  else throw Error('INVALID_ACTION_TYPE');
  return state;
 },
 getResult:state=>state.finished?{
  finished:true,
  results:Object.entries(state.scores).map(([playerId,score])=>({playerId,score}))
 }:null,
 botAction:()=>({type:'score',value:1})
};

test('shared result contract: pending game returns null',()=>{
 const session=createSession(rules,[{id:'p1',type:'human'}]);
 assert.equal(session.snapshot().result,null);
});

test('shared result contract: exactly one finite score per participant',()=>{
 for(let count=1;count<=4;count++){
  const players=Array.from({length:count},(_,i)=>({id:'p'+i,type:i%2?'bot':'human'}));
  const session=createSession(rules,players);
  for(const player of players)session.dispatch(player.id,{type:'score',value:10});
  const result=session.dispatch(players[0].id,{type:'finish'}).result;
  assert.equal(result.finished,true);
  assert.equal(result.results.length,count);
  assert.deepEqual(new Set(result.results.map(x=>x.playerId)),new Set(players.map(x=>x.id)));
  assert.ok(result.results.every(x=>Number.isFinite(x.score)));
 }
});

test('bots use normal actions and restart clears finished result',()=>{
 const session=createSession(rules,[{id:'human',type:'human'},{id:'bot',type:'bot'}]);
 assert.equal(session.botTurn('bot').state.scores.bot,1);
 session.dispatch('human',{type:'finish'});
 assert.equal(session.snapshot().result.finished,true);
 assert.equal(session.restart().result,null);
 assert.equal(session.snapshot().state.scores.bot,0);
});

test('equal scores are preserved for shared ceremony',()=>{
 const session=createSession(rules,[{id:'a',type:'human'},{id:'b',type:'bot'}]);
 session.dispatch('a',{type:'score',value:5});
 session.dispatch('b',{type:'score',value:5});
 const result=session.dispatch('a',{type:'finish'}).result;
 assert.deepEqual(result.results.map(x=>x.score),[5,5]);
});

test('game contract rejects missing mandatory functions',()=>{
 assert.throws(()=>validateGame({id:'missing'}),/GAME_CONTRACT/);
});
