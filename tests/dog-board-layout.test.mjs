import test from 'node:test';
import assert from 'node:assert/strict';
import {TRACK_POINTS,GOAL_POINTS,HOME_POINTS,START_INDICES,BOARD_LAYOUT_ID,assertBoardLayout,trackPoint,goalPoint,homePoint,isStartField,makeDefaultLayout,currentBoardLayout,validateBoardLayout,setBoardLayout,saveBoardLayout,loadSavedBoardLayout,resetBoardLayout,CUSTOM_BOARD_KEY} from '../DOG/board-layout.js';

test('classic DOG board has sixty-four unique track holes and exactly four start fields',()=>{
  assert.equal(BOARD_LAYOUT_ID,'dog-approved-board-v2-spaced');
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
 assert.deepEqual(starts,[{x:305.06,y:708.4},{x:51.72,y:306.57},{x:453.54,y:53.23},{x:706.89,y:455.05}]);
 // The expanded v2 cross reaches beyond the original 240..520 box.
 const inner=TRACK_POINTS.filter(p=>p.x>220&&p.x<540&&p.y>220&&p.y<540);
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
 const defaultY=layout.track[1].y;
 layout.track[1]={...layout.track[1],y:defaultY-4};
 assert.deepEqual(validateBoardLayout(layout),[]);
 saveBoardLayout(layout,storage);
 assert.equal(JSON.parse(data.get(CUSTOM_BOARD_KEY)).track[1].y,defaultY-4);
 setBoardLayout(makeDefaultLayout());
 assert.equal(loadSavedBoardLayout(storage),true);
 assert.equal(trackPoint(1).y,defaultY-4);
 resetBoardLayout(storage);
 assert.equal(trackPoint(1).y,defaultY);
 assert.equal(data.has(CUSTOM_BOARD_KEY),false);
});


test('approved DOG has the exact four coloured private goal lanes and reserve homes',()=>{
  const approved=makeDefaultLayout();
  assert.deepEqual(approved.goals.map(row=>row[0]),[
    {x:380,y:639.84},{x:120.16,y:380},{x:380,y:120.16},{x:639.84,y:380}
  ]);
  assert.deepEqual(approved.homes.map(row=>row[0]),[
    {x:254.56,y:670.56},{x:89.44,y:254.56},{x:505.44,y:89.44},{x:670.56,y:505.44}
  ]);
  assert.deepEqual(approved.goals.map(row=>row.length),[4,4,4,4]);
  assert.deepEqual(approved.homes.map(row=>row.length),[4,4,4,4]);
  assert.equal(approved.track.length,64);
  assert.deepEqual(validateBoardLayout(approved),[]);
});

test('visible DOG holes have a small but measurable gap in every section',()=>{
 const places=[...TRACK_POINTS,...GOAL_POINTS.flat(),...HOME_POINTS.flat()];
 let closest=Infinity;
 for(let i=0;i<places.length;i++)for(let j=i+1;j<places.length;j++){
  closest=Math.min(closest,Math.hypot(places[i].x-places[j].x,places[i].y-places[j].y));
 }
 assert.ok(closest>=37,'Centres must separate enough for about 1.5 units of clear space');
 // The largest standard visible circle incl. its outline is under 36 units
 // in diameter. That leaves the artwork visible between adjacent holes.
 assert.ok(closest-35.5>=1.4);
 assert.deepEqual(validateBoardLayout(makeDefaultLayout()),[]);
});
test('legacy player-made layout migrates once without deleting old geometry on failure',()=>{
 const old={...makeDefaultLayout(),preset:'dog-approved-board-v1'};
 // Reverse the standard expansion to simulate a saved pre-change board.
 const oldPoint=p=>({x:Math.round((380+(p.x-380)/1.16)*100)/100,y:Math.round((380+(p.y-380)/1.16)*100)/100});
 old.track=old.track.map(oldPoint);
 old.goals=old.goals.map(group=>group.map(oldPoint));
 old.homes=old.homes.map(group=>{
  const cx=group.reduce((n,p)=>n+p.x,0)/4,cy=group.reduce((n,p)=>n+p.y,0)/4;
  return group.map(p=>({x:Math.round((cx+(p.x-cx)/1.16)*100)/100,y:Math.round((cy+(p.y-cy)/1.16)*100)/100}));
 });
 const data=new Map([[CUSTOM_BOARD_KEY,JSON.stringify(old)]]);
 const storage={getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)};
 assert.equal(loadSavedBoardLayout(storage),true);
 assert.equal(JSON.parse(data.get(CUSTOM_BOARD_KEY)).preset,BOARD_LAYOUT_ID);
 assert.ok(Math.abs(trackPoint(0).x-305.06)<.02);
 assert.equal(loadSavedBoardLayout(storage),true,'reload does not expand twice');
 resetBoardLayout(storage);
});
