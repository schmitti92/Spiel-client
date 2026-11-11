import test from 'node:test';
import assert from 'node:assert/strict';
import {TRACK_POINTS,GOAL_POINTS,HOME_POINTS,START_INDICES,BOARD_LAYOUT_ID,assertBoardLayout,trackPoint,goalPoint,homePoint,isStartField,makeDefaultLayout,currentBoardLayout,validateBoardLayout,setBoardLayout,saveBoardLayout,loadSavedBoardLayout,resetBoardLayout,CUSTOM_BOARD_KEY} from '../DOG/board-layout.js';

test('classic DOG board has sixty-four unique track holes and exactly four start fields',()=>{
  assert.equal(BOARD_LAYOUT_ID,'dog-approved-board-v1');
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

test('approved DOG course uses exact uploaded field positions on all four sides',()=>{
 const starts=START_INDICES.map(i=>trackPoint(i));
 assert.deepEqual(starts,[{x:315.4,y:663.1},{x:97,y:316.7},{x:443.4,y:98.3},{x:661.8,y:444.7}]);
 const inner=TRACK_POINTS.filter(p=>p.x>240&&p.x<520&&p.y>240&&p.y<520);
 assert.ok(inner.length>=8,'The inner cross arms must remain intact');
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
 layout.track[1]={x:315.4,y:627.1};
 assert.deepEqual(validateBoardLayout(layout),[]);
 saveBoardLayout(layout,storage);
 assert.equal(JSON.parse(data.get(CUSTOM_BOARD_KEY)).track[1].y,627.1);
 setBoardLayout(makeDefaultLayout());
 assert.equal(loadSavedBoardLayout(storage),true);
 assert.equal(trackPoint(1).y,627.1);
 resetBoardLayout(storage);
 assert.equal(trackPoint(1).y,631.1);
 assert.equal(data.has(CUSTOM_BOARD_KEY),false);
});


test('approved DOG has the exact four coloured private goal lanes and reserve homes',()=>{
  const approved=makeDefaultLayout();
  assert.deepEqual(approved.goals.map(row=>row[0]),[
    {x:380,y:604},{x:156,y:380},{x:380,y:156},{x:604,y:380}
  ]);
  assert.deepEqual(approved.homes.map(row=>row[0]),[
    {x:252,y:668},{x:92,y:252},{x:508,y:92},{x:668,y:508}
  ]);
  assert.deepEqual(approved.goals.map(row=>row.length),[4,4,4,4]);
  assert.deepEqual(approved.homes.map(row=>row.length),[4,4,4,4]);
  assert.equal(approved.track.length,64);
  assert.deepEqual(validateBoardLayout(approved),[]);
});
