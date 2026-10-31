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
    for(let i=1;i<n;i++){
     if(participants[i].type==='bot')s.botTurn('p'+i);
     else s.dispatch('p'+i,scenario.human);
    }
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

test('complex nested game state and actions are isolated from callers',()=>{
 const participants=roster(2);
 const game={
  id:'nested-state-probe',
  initialState:()=>({board:{cells:[{occupants:['p0']}]},events:[]}),
  applyAction:(state,{action,playerId})=>{
   state.board.cells[0].occupants.push(playerId);
   state.events.push({kind:action.kind,payload:action.payload});
   return state;
  },
  getResult:()=>null,
  botAction:()=>({kind:'move',payload:{distance:2}})
 };
 const s=createManagedSession(game,participants);
 s.start();
 const action={kind:'move',payload:{distance:3}};
 const next=s.dispatch('p0',action);
 action.payload.distance=99;
 next.state.board.cells[0].occupants.push('intruder');
 next.state.events[0].payload.distance=500;
 const stable=s.snapshot();
 assert.deepEqual(stable.state.board.cells[0].occupants,['p0','p0']);
 assert.equal(stable.state.events[0].payload.distance,3);
 assert.equal(s.botTurn('p1').state.events[1].payload.distance,2);
});
test('simultaneous games decide when pending actions resolve',()=>{
 const participants=roster(4);
 const game={
  id:'simultaneous-probe',capabilities:['simultaneous'],
  initialState:()=>({pending:{},round:1}),
  applyAction:(state,{playerId,action})=>{
   if(Object.hasOwn(state.pending,playerId))throw Error('ALREADY_SUBMITTED');
   const pending={...state.pending,[playerId]:action.choice};
   return Object.keys(pending).length===participants.length?{pending:{},round:state.round+1}:{...state,pending};
  },
  getResult:state=>state.round===2?finish(participants,p=>({playerId:p.id,outcome:'completed'})):null,
  botAction:()=>({choice:'bot'})
 };
 const s=createManagedSession(game,participants);
 s.start();
 assert.equal(s.dispatch('p0',{choice:'left'}).phase,'playing');
 assert.equal(s.botTurn('p1').phase,'playing');
 assert.equal(s.dispatch('p2',{choice:'right'}).phase,'playing');
 assert.throws(()=>s.dispatch('p2',{choice:'again'}),/ALREADY_SUBMITTED/);
 assert.equal(s.snapshot().state.round,1);
 assert.equal(s.botTurn('p3').phase,'finished');
 assert.equal(s.snapshot().state.round,2);
});
test('multi-stage game controls its own transitions and finishing rule',()=>{
 const participants=roster(1);
 const game={
  id:'multi-stage-probe',
  initialState:()=>({stage:'prepare',attempts:0}),
  applyAction:(state,{action})=>{
   if(state.stage==='prepare'&&action.type==='begin')return {...state,stage:'challenge'};
   if(state.stage==='challenge'&&action.type==='try')return {...state,attempts:state.attempts+1,stage:'review'};
   if(state.stage==='review'&&action.type==='confirm')return {...state,stage:'done'};
   throw Error('INVALID_STAGE_ACTION');
  },
  getResult:state=>state.stage==='done'?finish(participants,p=>({playerId:p.id,outcome:'complete'})):null,
  botAction:()=>({type:'begin'})
 };
 const s=createManagedSession(game,participants);
 s.start();
 assert.equal(s.dispatch('p0',{type:'begin'}).state.stage,'challenge');
 const before=s.snapshot();
 assert.throws(()=>s.dispatch('p0',{type:'begin'}),/INVALID_STAGE_ACTION/);
 assert.deepEqual(s.snapshot(),before);
 assert.equal(s.dispatch('p0',{type:'try'}).state.stage,'review');
 assert.equal(s.dispatch('p0',{type:'confirm'}).phase,'finished');
});

test('elimination game supports players leaving active play without changing roster',()=>{
 const participants=roster(4);
 const game={
  id:'elimination-probe',
  initialState:()=>({alive:participants.map(p=>p.id)}),
  applyAction:(state,{action})=>{
   if(!state.alive.includes(action.target))throw Error('ALREADY_ELIMINATED');
   return {...state,alive:state.alive.filter(id=>id!==action.target)};
  },
  getResult:state=>state.alive.length===1?finish(participants,p=>({playerId:p.id,outcome:state.alive.includes(p.id)?'survivor':'eliminated'})):null,
  botAction:()=>({target:'p2'})
 };
 const s=createManagedSession(game,participants);
 s.start();
 assert.equal(s.dispatch('p0',{target:'p1'}).phase,'playing');
 assert.equal(s.dispatch('p2',{target:'p3'}).phase,'playing');
 assert.equal(s.dispatch('p0',{target:'p2'}).phase,'finished');
 assert.equal(s.snapshot().players.length,4);
 assert.equal(s.snapshot().result.results.find(p=>p.playerId==='p0').outcome,'survivor');
});
test('asymmetric roles and custom turn rules remain game-owned',()=>{
 const participants=roster(2);
 const game={
  id:'asymmetric-probe',
  initialState:()=>({turn:'p0',roles:{p0:'hunter',p1:'runner'},moves:0}),
  applyAction:(state,{playerId,action})=>{
   if(playerId!==state.turn)throw Error('OUT_OF_TURN');
   if(action.role!==state.roles[playerId])throw Error('WRONG_ROLE');
   return {...state,moves:state.moves+1,turn:playerId==='p0'?'p1':'p0'};
  },
  getResult:state=>state.moves===2?finish(participants,p=>({playerId:p.id,role:state.roles[p.id]})):null,
  botAction:state=>({role:state.roles.p1})
 };
 const s=createManagedSession(game,participants);
 s.start();
 const before=s.snapshot();
 assert.throws(()=>s.botTurn('p1'),/OUT_OF_TURN/);
 assert.deepEqual(s.snapshot(),before);
 assert.equal(s.dispatch('p0',{role:'hunter'}).phase,'playing');
 assert.equal(s.botTurn('p1').phase,'finished');
 assert.deepEqual(s.snapshot().result.results.map(p=>p.role),['hunter','runner']);
});
test('nonlinear progression and sudden-death conditions are game-owned',()=>{
 const participants=roster(1);
 const game={
  id:'sudden-death-probe',
  initialState:()=>({level:1,health:3,history:[]}),
  applyAction:(state,{action})=>({
   ...state,level:action.skipTo??state.level+1,health:state.health-action.damage,
   history:[...state.history,action]
  }),
  getResult:state=>state.health<=0?finish(participants,p=>({playerId:p.id,outcome:'defeated'}),{reason:'health-depleted'}):null,
  botAction:()=>({damage:0})
 };
 const s=createManagedSession(game,participants);
 s.start();
 assert.equal(s.dispatch('p0',{skipTo:50,damage:1}).state.level,50);
 const final=s.dispatch('p0',{skipTo:3,damage:2});
 assert.equal(final.phase,'finished');
 assert.equal(final.state.level,3);
 assert.equal(final.result.reason,'health-depleted');
});
