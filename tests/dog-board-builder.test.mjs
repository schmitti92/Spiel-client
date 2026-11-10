import test from 'node:test';
import assert from 'node:assert/strict';
import {
 EDITOR_DRAFT_KEY,emptyDraft,fromCrossPreset,fromLayout,placedCount,fieldOf,
 snapXY,putField,eraseField,nextSlot,inspectDraft,asGameLayout,guidedPoint,directedPoint,previousTrackField,measureStepDistances,EIGHT_DIRECTIONS
} from '../DOG/editor-model.js';
import {makeDefaultLayout,currentBoardLayout,resetBoardLayout} from '../DOG/board-layout.js';

test('DOG board builder starts with a genuinely empty 96-position work area',()=>{
 const draft=emptyDraft();
 assert.equal(draft.track.length,64);
 assert.equal(draft.track.every(p=>p===null),true);
 assert.equal(draft.goals.flat().every(p=>p===null),true);
 assert.equal(draft.homes.flat().every(p=>p===null),true);
 assert.deepEqual(placedCount(draft),{track:0,goals:0,homes:0,total:0,complete:false});
 assert.equal(inspectDraft(draft).ready,false);
 assert.throws(()=>asGameLayout(draft),/alle 64 Lauffelder/);
});
test('grid snapping aligns fields on identical rows and columns',()=>{
 assert.deepEqual(snapXY({x:383,y:414},32,true),{x:380,y:412});
 assert.deepEqual(snapXY({x:448,y:413},32,true),{x:444,y:412});
 assert.deepEqual(snapXY({x:383,y:414},32,false),{x:383,y:414});
 assert.deepEqual(snapXY({x:385,y:420},40,true),{x:380,y:420});
});
test('clicking the blank canvas creates the next numbered field',()=>{
 let d=emptyDraft(),sel={kind:'track',index:0,owner:0};
 d=putField(d,sel,{x:100,y:220},{spacing:32,snap:true});
 assert.deepEqual(d.track[0],snapXY({x:100,y:220},32,true));
 assert.equal(d.track[1],null);
 sel=nextSlot(d,sel);
 assert.equal(sel.index,1);
 d=putField(d,sel,{x:132,y:220},{spacing:32,snap:true});
 assert.equal(d.track[0].y,d.track[1].y);
 assert.equal(placedCount(d).track,2);
});
test('fourfold symmetry places four matching sectors with a single click',()=>{
 const d=putField(emptyDraft(),{kind:'track',index:3,owner:0},{x:300,y:150},{symmetry:true,spacing:32,snap:true});
 assert.equal(placedCount(d).track,4);
 assert.deepEqual(d.track[3],{x:316,y:156});
 assert.deepEqual(d.track[19],{x:604,y:316});
 assert.deepEqual(d.track[35],{x:444,y:604});
 assert.deepEqual(d.track[51],{x:156,y:444});
 assert.equal(nextSlot(d,{kind:'track',index:3,owner:0},{symmetry:true}).index,4);
});
test('goals and home slots are separate, clickable, color-owned positions',()=>{
 let d=emptyDraft();
 d=putField(d,{kind:'goals',index:2,owner:3},{x:120,y:200},{snap:false});
 d=putField(d,{kind:'homes',index:0,owner:1},{x:300,y:220},{snap:false});
 assert.deepEqual(fieldOf(d,'goals',2,3),{x:120,y:200});
 assert.deepEqual(fieldOf(d,'homes',0,1),{x:300,y:220});
 assert.equal(d.track.every(p=>p===null),true);
 assert.equal(placedCount(d).total,2);
});
test('eraser removes only selected field, or four paired fields with symmetry',()=>{
 let d=putField(emptyDraft(),{kind:'track',index:0,owner:0},{x:100,y:380},{symmetry:true,snap:false});
 assert.equal(placedCount(d).track,4);
 d=eraseField(d,{kind:'track',index:16,owner:1},{symmetry:false});
 assert.equal(placedCount(d).track,3);
 d=eraseField(d,{kind:'track',index:0,owner:0},{symmetry:true});
 assert.equal(placedCount(d).track,0);
});
test('incomplete board drafts roundtrip through JSON without touching game board',()=>{
 const original=currentBoardLayout();
 let d=putField(emptyDraft(),{kind:'track',index:0,owner:0},{x:100,y:100},{snap:false});
 d=fromLayout(JSON.parse(JSON.stringify(d)));
 assert.equal(placedCount(d).total,1);
 assert.equal(d.track[0].x,100);
 assert.deepEqual(currentBoardLayout(),original);
});
test('game preset completes all 96 spots and passes engine geometry validation',()=>{
 const d=fromCrossPreset();
 const status=inspectDraft(d);
 assert.deepEqual(status.count,{track:64,goals:16,homes:16,total:96,complete:true});
 assert.deepEqual(status.errors,[]);
 assert.deepEqual(status.warnings,[]);
 assert.equal(status.ready,true);
 assert.equal(asGameLayout(d).schemaVersion,1);
});
test('illegal overlaps and broken paths block use in live DOG games',()=>{
 const preset=fromCrossPreset();
 const overlap=structuredClone(preset);
 overlap.track[4]={...overlap.track[3]};
 assert.ok(inspectDraft(overlap).errors.some(x=>x.includes('überlappen')));
 assert.equal(inspectDraft(overlap).ready,false);
 const far=structuredClone(preset);
 far.track[4]={x:700,y:340};
 assert.equal(inspectDraft(far).ready,false);
});
test('editor refuses malformed imports rather than silently scrambling field order',()=>{
 assert.throws(()=>fromLayout({track:[],goals:[],homes:[]}),/gültige Struktur/);
 const broken=emptyDraft();broken.track[0]={x:'oops',y:10};
 assert.throws(()=>fromLayout(broken),/ungültige/);
});

test('guide uses exactly the same centre-to-centre distance in all eight directions',()=>{
 const d=emptyDraft();d.track[0]={x:380,y:380};
 for(const direction of EIGHT_DIRECTIONS){
   const selection={kind:'track',index:1,owner:0};
   const result=directedPoint(d,selection,direction.dx,direction.dy,{step:28});
   assert.ok(result,direction.label+' must fit board');
   const distance=Math.hypot(result.x-380,result.y-380);
   assert.ok(Math.abs(distance-28)<.15,direction.label+' distance='+distance);
   const directionLength=Math.hypot(direction.dx,direction.dy);
   const angle=(result.x-380)*direction.dy-(result.y-380)*direction.dx;
   assert.ok(Math.abs(angle/directionLength)<.15,'45 degree direction '+direction.label);
 }
});
test('guided finger taps choose one of eight directions, not the longer square-grid diagonal',()=>{
 const d=emptyDraft();d.track[0]={x:380,y:380};
 const selection={kind:'track',index:1,owner:0};
 const right=guidedPoint(d,selection,{x:500,y:385},{step:32});
 const diagonal=guidedPoint(d,selection,{x:510,y:250},{step:32});
 assert.deepEqual([right.dx,right.dy],[1,0]);
 assert.deepEqual([diagonal.dx,diagonal.dy],[1,-1]);
 const dr=Math.hypot(right.x-380,right.y-380);
 const dd=Math.hypot(diagonal.x-380,diagonal.y-380);
 assert.ok(Math.abs(dd-dr)<.15);
 assert.ok(Math.abs(Math.hypot(32,32)-32)>10,'square grid diagonal is not equal distance');
});
test('eight-way guide works for replacing a pre-existing field and reports off-distance edges',()=>{
 let d=emptyDraft();d.track[0]={x:380,y:380};
 const selection={kind:'track',index:1,owner:0};
 d=putField(d,selection,{x:412,y:380},{snap:false});
 assert.equal(measureStepDistances(d,32).even,1);
 d=putField(d,selection,{x:412,y:412},{snap:false});
 assert.equal(measureStepDistances(d,32).uneven,1);
 const corrected=guidedPoint(d,selection,{x:500,y:500},{step:32});
 d=putField(d,selection,corrected,{snap:false});
 assert.equal(measureStepDistances(d,32).even,1);
 assert.equal(measureStepDistances(d,32).uneven,0);
 assert.equal(placedCount(d).track,2);
});
test('guide falls back to square grid for the first field and does not place outside the board',()=>{
 const d=emptyDraft(),selection={kind:'track',index:0,owner:0};
 assert.equal(previousTrackField(d,selection),null);
 assert.equal(guidedPoint(d,selection,{x:450,y:450},{step:32}),null);
 d.track[0]={x:720,y:380};
 const next={kind:'track',index:1,owner:0};
 assert.equal(directedPoint(d,next,1,0,{step:32}),null);
 assert.throws(()=>directedPoint(d,next,1,2,{step:32}),/8 Richtungen/);
});
