import test from 'node:test';
import assert from 'node:assert/strict';
import {createScoreRace,SCORE_RACE_DURATION_MS} from '../engine/ScoreRace.js';
const players=[{playerId:'a',name:'A',score:20},{playerId:'b',name:'B',score:40},{playerId:'c',name:'C',score:-2}];
test('scores stay hidden until all bars finish together',()=>{
 const race=createScoreRace(players);
 const start=race.frame(0),mid=race.frame(SCORE_RACE_DURATION_MS/2),end=race.frame(SCORE_RACE_DURATION_MS);
 assert.equal(start.finished,false);assert.ok(start.lanes.every(p=>p.score===null));
 assert.ok(mid.lanes.every(p=>p.score===null));assert.ok(mid.lanes[1].fillPercent>mid.lanes[0].fillPercent);
 assert.equal(end.finished,true);assert.deepEqual(end.winners,['b']);assert.deepEqual(end.lanes.map(p=>p.score),[20,40,-2]);
});
test('ties and negative scores are supported',()=>{
 const race=createScoreRace([{playerId:'a',name:'A',score:-1},{playerId:'b',name:'B',score:-1}]);
 assert.deepEqual(race.frame(9000).winners,['a','b']);assert.equal(race.frame(9000).lanes[0].fillPercent,0);
});
test('rejects malformed players and time',()=>{
 assert.throws(()=>createScoreRace([]),/PLAYER_COUNT/);
 assert.throws(()=>createScoreRace([{playerId:'a',name:'A',score:1},{playerId:'a',name:'B',score:2}]),/INVALID_RACE_RESULT/);
 assert.throws(()=>createScoreRace(players).frame(-1),/INVALID_RACE_TIME/);
});
