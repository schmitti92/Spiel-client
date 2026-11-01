import test from 'node:test';
import assert from 'node:assert/strict';
import {createSession} from '../../engine/MiniGameEngine.js';
import {eierChaos,SCHEDULE,MAX_SCORE,DURATION_MS,BASKET_SPEED} from './game.js';
const roster=[{id:'p0',type:'human'},{id:'p1',type:'bot'}];
test('same immutable schedule for all players',()=>{
 assert.equal(SCHEDULE.length,54);
 assert.equal(MAX_SCORE,SCHEDULE.reduce((n,e)=>n+Math.max(0,({normal:1,gold:5,rotten:-3,rainbow:10})[e.type]),0));
 assert.ok(SCHEDULE.every(e=>e.landMs<=DURATION_MS));
 assert.deepEqual(SCHEDULE.map(e=>e.id),Array.from({length:54},(_,i)=>i));
});
test('independent clocks, no score for missed eggs, one result',()=>{
 const s=createSession(eierChaos,roster);
 assert.equal(s.snapshot().result,null);
 s.dispatch('p0',{type:'step',elapsedMs:DURATION_MS,x:.5});
 assert.equal(s.snapshot().result,null);
 assert.equal(s.snapshot().state.participants.p1.elapsedMs,0);
 s.dispatch('p1',{type:'step',elapsedMs:DURATION_MS,x:.5});
 const r=s.snapshot().result;
 assert.equal(r.finished,true);
 assert.equal(r.results.length,2);
 assert.throws(()=>s.dispatch('p0',{type:'step',elapsedMs:DURATION_MS,x:.5}),/INVALID_TIME|GAME_FINISHED/);
});
test('basket cannot teleport, invalid time is rejected',()=>{
 const s=createSession(eierChaos,[roster[0]]);
 s.dispatch('p0',{type:'step',elapsedMs:100,x:1});
 assert.ok(s.snapshot().state.participants.p0.x<=.5+BASKET_SPEED*.1+1e-9);
 assert.throws(()=>s.dispatch('p0',{type:'step',elapsedMs:100,x:1}),/INVALID_TIME/);
 assert.throws(()=>s.dispatch('p0',{type:'step',elapsedMs:200,x:2}),/INVALID_STEP/);
});
test('same inputs yield identical score and restart resets state',()=>{
 const a=createSession(eierChaos,[roster[0]]);
 const b=createSession(eierChaos,[roster[0]]);
 for(let t=50;t<=DURATION_MS;t+=50){
  const action={type:'step',elapsedMs:t,x:.12+((t/50)%8)*.1};
  a.dispatch('p0',action);b.dispatch('p0',action);
 }
 assert.deepEqual(a.snapshot().result,b.snapshot().result);
 a.restart();
 assert.equal(a.snapshot().state.participants.p0.elapsedMs,0);
 assert.equal(a.snapshot().result,null);
});
test('bot can finish via standard bot interface',()=>{
 const s=createSession(eierChaos,[{id:'bot',type:'bot'}]);
 for(let i=0;i<DURATION_MS/50;i++)s.botTurn('bot');
 assert.equal(s.snapshot().result?.finished,true);
});
