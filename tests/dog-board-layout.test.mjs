import test from 'node:test';
import assert from 'node:assert/strict';
import {TRACK_POINTS,GOAL_POINTS,HOME_POINTS,START_INDICES,BOARD_LAYOUT_ID,assertBoardLayout,trackPoint,goalPoint,homePoint,isStartField,makeDefaultLayout,currentBoardLayout,validateBoardLayout,setBoardLayout,saveBoardLayout,loadSavedBoardLayout,resetBoardLayout,CUSTOM_BOARD_KEY} from '../DOG/board-layout.js';

test('classic DOG board has sixty-four unique track holes and exactly four start fields',()=>{
  assert.equal(BOARD_LAYOUT_ID,'dog-classic-cross-v3');
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

test('DOG cross course is actually four-armed and not the old rectangular perimeter',()=>{
 const starts=START_INDICES.map(i=>trackPoint(i));
 assert.deepEqual(starts,[{x:95,y:380},{x:380,y:95},{x:665,y:380},{x:380,y:665}]);
 const inner=TRACK_POINTS.filter(p=>p.x>240&&p.x<520&&p.y>240&&p.y<520);
 assert.ok(inner.length>=8,'Track is expected to run into the inner star arms');
});
test('DOG editor rejects overlapping fields and ruptured path sections',()=>{
 const original=makeDefaultLayout();
 const collision=structuredClone(original);
 collision.track[1]={...collision.track[0]};
 assert.ok(validateBoardLayout(collision).some(s=>s.includes('überlappen')));
 const rupture=structuredClone(original);
 rupture.track[2]={x:600,y:300};
 assert.ok(validateBoardLayout(rupture).some(s=>s.includes('Abstand im Laufweg')));
 assert.deepEqual(validateBoardLayout(original),[]);
});
test('DOG editor saves, reloads and resets only local geometry',()=>{
 const data=new Map();
 const storage={
  getItem:key=>data.get(key)||null,
  setItem:(key,value)=>data.set(key,value),
  removeItem:key=>data.delete(key)
 };
 const layout=makeDefaultLayout();
 layout.track[1]={x:127,y:384};
 assert.deepEqual(validateBoardLayout(layout),[]);
 saveBoardLayout(layout,storage);
 assert.equal(JSON.parse(data.get(CUSTOM_BOARD_KEY)).track[1].y,384);
 setBoardLayout(makeDefaultLayout());
 assert.equal(loadSavedBoardLayout(storage),true);
 assert.equal(trackPoint(1).y,384);
 resetBoardLayout(storage);
 assert.equal(trackPoint(1).y,380);
 assert.equal(data.has(CUSTOM_BOARD_KEY),false);
});
