import test from 'node:test';
import assert from 'node:assert/strict';
import {TRACK_POINTS,GOAL_POINTS,HOME_POINTS,START_INDICES,BOARD_LAYOUT_ID,assertBoardLayout,trackPoint,goalPoint,homePoint,isStartField} from '../DOG/board-layout.js';

test('classic DOG board has sixty-four unique track holes and exactly four start fields',()=>{
  assert.equal(BOARD_LAYOUT_ID,'classic-corner-board-v2');
  assert.equal(assertBoardLayout(),true);
  assert.equal(TRACK_POINTS.length,64);
  assert.deepEqual(START_INDICES,[0,16,32,48]);
  assert.equal(new Set(TRACK_POINTS.map(p=>p.x+','+p.y)).size,64);
  for(let i=0;i<64;i++)assert.equal(isStartField(i),i%16===0);
});
test('every DOG corner has a 4-space goal and a 4-piece reserve',()=>{
  for(let seat=0;seat<4;seat++){
    assert.equal(GOAL_POINTS[seat].length,4);
    assert.equal(HOME_POINTS[seat].length,4);
    for(let pos=0;pos<4;pos++){
      assert.deepEqual(goalPoint(seat,pos),GOAL_POINTS[seat][pos]);
      assert.deepEqual(homePoint(seat,pos),HOME_POINTS[seat][pos]);
    }
  }
});
test('DOG board route follows adjacent continuous fields, including the corner crossing',()=>{
  for(let i=0;i<64;i++){
    const a=trackPoint(i),b=trackPoint((i+1)%64);
    const distance=Math.hypot(a.x-b.x,a.y-b.y);
    assert.ok(distance>=20&&distance<=42,'Field '+i+' unexpectedly distant: '+distance);
  }
});
test('every private goal and reserve hole is separate from main circuit',()=>{
  const outer=new Set(TRACK_POINTS.map(p=>p.x+','+p.y));
  const inner=[...GOAL_POINTS.flat(),...HOME_POINTS.flat()];
  assert.equal(new Set(inner.map(p=>p.x+','+p.y)).size,32);
  for(const p of inner)assert.equal(outer.has(p.x+','+p.y),false);
});
