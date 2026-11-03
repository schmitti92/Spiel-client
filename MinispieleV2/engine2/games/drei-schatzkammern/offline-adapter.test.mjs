import test from 'node:test';
import assert from 'node:assert/strict';
import {createTreasureSession} from './offline-adapter.js';
test('engine2 coordinates three doors with two humans and one bot',()=>{
 const s=createTreasureSession({players:['human:1','human:2'],botPreset:1,lockedDoors:[2]});
 assert.deepEqual(s.room.match.roster,['human:1','human:2','bot:offline-treasure:0']);
 assert.equal(s.acknowledge('human:1'),'instructions');
 assert.equal(s.acknowledge('human:2'),'countdown');
 s.start();
 s.choose('human:1',0);s.choose('human:2',2);s.botChoose('bot:offline-treasure:0',7);
 assert.equal(s.game.phase,'revealing');
 s.reveal();s.reveal();s.reveal();
 const completed=s.finish();
 assert.equal(completed.room.match.phase,'finished');
 assert.equal(completed.room.archive.length,1);
 assert.equal(completed.result.eliminated.includes('human:2'),true);
});
test('engine2 prevents playing before instructions and all confirmations',()=>{
 const s=createTreasureSession({players:['human:1','human:2'],lockedDoors:[0]});
 assert.throws(()=>s.start(),/NOT_READY/);
 assert.throws(()=>s.choose('human:1',1),/NOT_PLAYING/);
 s.acknowledge('human:1');
 assert.throws(()=>s.start(),/NOT_READY/);
});

test('three consecutive chambers complete with one human and no bots',()=>{
 const s=createTreasureSession({players:['human:1'],lockedDoors:[2,2,2]});
 s.acknowledge('human:1');s.start();
 for(let round=0;round<3;round++){
  s.choose('human:1',0);
  for(let door=0;door<3;door++)s.reveal();
  if(round<2){
   assert.equal(s.game.phase,'choosing');
   assert.equal(s.game.reveals.length,0);
  }
 }
 const result=s.finish();
 assert.equal(result.room.match.phase,'finished');
 assert.deepEqual(result.result.winnerIds,['human:1']);
 assert.equal(result.result.roundsPlayed,3);
});
test('bots continue after all human participants are eliminated',()=>{
 const s=createTreasureSession({players:['human:1'],botPreset:1,lockedDoors:[0,1,2]});
 s.acknowledge('human:1');s.start();
 s.choose('human:1',0);
 s.botChoose('bot:offline-treasure:0',1);
 for(let door=0;door<3;door++)s.reveal();
 if(!s.game.finished){
  for(let round=1;round<3&&!s.game.finished;round++){
   s.botChoose('bot:offline-treasure:0',round);
   for(let door=0;door<3;door++)s.reveal();
  }
 }
 assert.equal(s.game.finished,true);
 assert.equal(s.finish().room.match.phase,'finished');
});
