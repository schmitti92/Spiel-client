import test from 'node:test';
import assert from 'node:assert/strict';
import {createGameLaunchFlow} from '../engine/GameLaunchFlow.js';
function stub(){
 let stage='selection',starts=0;
 return {select(){assert.equal(stage,'selection');stage='ready';},start(){assert.equal(stage,'ready');stage='playing';starts++;},
 snapshot(){return {stage,starts};},dispatch(){},botTurn(){},returnToSelection(){stage='selection';}};
}
for(let n=1;n<=4;n++)test('shared tile-to-countdown flow works for '+n+' humans',()=>{
 const flow=stub(),launch=createGameLaunchFlow(flow);
 const players=Array.from({length:n},(_,i)=>({id:'p'+i,type:'human'}));
 assert.equal(launch.select({players},'Choose the correct color').phase,'instructions');
 assert.throws(()=>launch.start(4000),/LAUNCH_COUNTDOWN_ACTIVE/);
 for(let i=0;i<n;i++)launch.acknowledge(players[i].id,1000+i);
 assert.equal(launch.snapshot().phase,'countdown');
 assert.throws(()=>launch.start(3999+n),/LAUNCH_COUNTDOWN_ACTIVE/);
 assert.equal(launch.start(3999+n).phase,'playing');
 assert.equal(flow.snapshot().starts,1);
});
test('bots auto-ready and instructions are required',()=>{
 const flow=stub(),launch=createGameLaunchFlow(flow);
 assert.throws(()=>launch.select({players:[{id:'a',type:'human'}]},''),/GAME_INSTRUCTIONS_REQUIRED/);
 launch.select({players:[{id:'a',type:'human'},{id:'bot',type:'bot'}]},'Instructions');
 assert.equal(launch.snapshot().readiness.ready,1);
 launch.acknowledge('a',0);
 assert.equal(launch.start(3000).phase,'playing');
});
