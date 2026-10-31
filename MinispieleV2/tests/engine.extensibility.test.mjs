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
const manager=data(read('../engine/SessionManager.js').replace("'./StandardSession.js'",JSON.stringify(standard)).replace("'./PlayerManager.js'",JSON.stringify(players)));
const {createManagedSession}=await import(manager);
const roster=n=>Array.from({length:n},(_,i)=>({id:'p'+i,type:i%2?'bot':'human'}));
const finish=(players,entry,extra={})=>({resultVersion:2,finished:true,results:players.map(entry),...extra});
const cases=[
 {name:'point competition with negative scores and ties',create:players=>({
  id:'point-probe',initialState:()=>({scores:Object.fromEntries(players.map(p=>[p.id,0]))}),
  applyAction:(state,{playerId,action})=>({...state,scores:{...state.scores,[playerId]:action.score}}),
  getResult:state=>Object.values(state.scores).every(s=>s!==0)?finish(players,p=>({playerId:p.id,score:state.scores[p.id]})):null,
  botAction:()=>({score:-2})
 }),human:{score:-2},expected:'score'},
 {name:'scoreless survival outcome',create:players=>({
  id:'survival-probe',initialState:()=>({turns:0}),
  applyAction:state=>({...state,turns:state.turns+1}),
  getResult:state=>state.turns>=1?finish(players,p=>({playerId:p.id,outcome:p.id==='p0'?'survived':'eliminated'}),{reason:'survival'}):null,
  botAction:()=>({type:'survive'})
 }),human:{type:'survive'},expected:'outcome'},
 {name:'cooperative shared success',create:players=>({
  id:'cooperative-probe',initialState:()=>({completed:false}),
  applyAction:state=>({...state,completed:true}),
  getResult:state=>state.completed?finish(players,p=>({playerId:p.id,outcome:'success'}),{teamOutcome:'success'}):null,
  botAction:()=>({type:'cooperate'})
 }),human:{type:'cooperate'},expected:'outcome'},
 {name:'game-controlled elapsed time without engine timer',create:players=>({
  id:'time-probe',capabilities:['timed'],timeLimitMs:10000,
  initialState:()=>({elapsed:0}),
  applyAction:(state,{action})=>({...state,elapsed:action.elapsed}),
  getResult:state=>state.elapsed>=10000?finish(players,p=>({playerId:p.id,detail:{elapsed:state.elapsed}}),{reason:'time-limit'}):null,
  botAction:()=>({elapsed:10000})
 }),human:{elapsed:10000},expected:'detail'}
];
for(const scenario of cases){
 test('different game types share engine unchanged: '+scenario.name,()=>{
  for(let n=1;n<=4;n++){
   const participants=roster(n);
   const s=createManagedSession(scenario.create(participants),participants);
   assert.equal(s.start().phase,'playing');
   const finished=s.dispatch('p0',scenario.human);
   if(scenario.expected==='score'&&n>1){
    assert.equal(finished.phase,'playing');
    for(let i=1;i<n;i++)s.botTurn('p'+i);
   }else assert.equal(finished.phase,'finished');
   const result=s.snapshot().result;
   assert.equal(result.results.length,n);
   assert.ok(result.results.every(entry=>Object.hasOwn(entry,scenario.expected)));
   assert.equal(s.snapshot().phase,'finished');
   assert.equal(s.restart().phase,'ready');
   assert.equal(s.start().phase,'playing');
  }
 });
}
