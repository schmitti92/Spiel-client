import test from 'node:test';
import assert from 'node:assert/strict';
import {farbenblitz,COLORS} from '../games/farbenblitz.js';

const players=n=>Array.from({length:n},(_,i)=>({id:'p'+i,type:i?'bot':'human'}));
test('Farbenblitz supports one to four participants and all rounds',()=>{
 for(let n=1;n<=4;n++){
  const roster=players(n);
  let state=farbenblitz.initialState(roster,{rounds:10,level:'mittel'});
  for(let round=0;round<10;round++){
   assert.equal(state.round,round);
   assert.equal(state.answered.length,0);
   for(const p of roster)state=farbenblitz.applyAction(state,{playerId:p.id,players:roster,action:{type:'answer',round,color:state.challenge.correct}});
  }
  assert.equal(state.finished,true);
  assert.deepEqual(farbenblitz.getResult(state).results.map(r=>r.score),Array(n).fill(10));
 }
});
test('correct colors are balanced in every four-round cycle',()=>{
 for(const level of ['leicht','mittel','schwer']){
  let state=farbenblitz.initialState(players(1),{rounds:20,level});
  const answers=[];
  for(let round=0;round<20;round++){
   answers.push(state.challenge.correct);
   state=farbenblitz.applyAction(state,{playerId:'p0',players:players(1),action:{type:'answer',round,color:state.challenge.correct}});
  }
  for(let i=0;i<answers.length;i+=4)assert.deepEqual(new Set(answers.slice(i,i+4)),new Set(COLORS));
  for(let i=1;i<answers.length;i++)assert.notEqual(answers[i],answers[i-1]);
 }
});
test('answers stay hidden until completion; duplicate answers rejected',()=>{
 const roster=players(2);
 let state=farbenblitz.initialState(roster,{rounds:1});
 state=farbenblitz.applyAction(state,{playerId:'p0',players:roster,action:{type:'answer',round:0,color:'rot'}});
 assert.equal(farbenblitz.getResult(state),null);
 assert.throws(()=>farbenblitz.applyAction(state,{playerId:'p0',players:roster,action:{type:'answer',round:0,color:'rot'}}),/ALREADY_ANSWERED/);
 assert.deepEqual(state.answered,['p0']);
});
