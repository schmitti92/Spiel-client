import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyDraft,placedCount} from '../DOG/editor-model.js';
import {
  EXIT_INDICES,GOAL_ENTRY_INDICES,referencePoints,buildGoalLane,buildHomeGroup,
  validateGroupPlacement,getTrackConnections,straightGaps,connectStraightGap
} from '../DOG/board-assistants.js';

test('each DOG colour has a protected start on the track and a preceding goal entry',()=>{
 assert.deepEqual(EXIT_INDICES,[0,16,32,48]);
 assert.deepEqual(GOAL_ENTRY_INDICES,[63,15,31,47]);
 const d=emptyDraft();d.track[0]={x:200,y:200};d.track[63]={x:180,y:200};
 assert.deepEqual(referencePoints(d,0),{exitIndex:0,exit:{x:200,y:200},goalEntryIndex:63,goalEntry:{x:180,y:200}});
});
test('goal generator creates four exact equally spaced positions from preceding circuit field',()=>{
 const d=emptyDraft();d.track[63]={x:200,y:200};
 const next=buildGoalLane(d,0,{dx:1,dy:0,spacing:28});
 assert.deepEqual(next.goals[0],[{x:228,y:200},{x:256,y:200},{x:284,y:200},{x:312,y:200}]);
 assert.equal(d.goals[0].every(p=>p===null),true);
 assert.equal(placedCount(next).goals,4);
});
test('goal generator keeps manually positioned first goal and aligns other three from it',()=>{
 const d=emptyDraft();d.goals[2][0]={x:370,y:400};
 const next=buildGoalLane(d,2,{dx:0,dy:-1,spacing:32});
 assert.deepEqual(next.goals[2],[{x:370,y:400},{x:370,y:368},{x:370,y:336},{x:370,y:304}]);
 assert.equal(d.goals[2][1],null);
});
test('home generator places precise 2-by-2 blocks relative to chosen exit',()=>{
 const d=emptyDraft();d.track[0]={x:300,y:300};
 const next=buildHomeGroup(d,0,{layout:'square',dx:0,dy:1,spacing:28,distance:100});
 assert.deepEqual(next.homes[0],[{x:286,y:386},{x:314,y:386},{x:286,y:414},{x:314,y:414}]);
 assert.equal(placedCount(next).homes,4);
});
test('home generator respects first manually placed reserve and supports rows',()=>{
 const d=emptyDraft();d.homes[3][0]={x:130,y:560};
 const next=buildHomeGroup(d,3,{layout:'row',spacing:28});
 assert.deepEqual(next.homes[3],[{x:130,y:560},{x:158,y:560},{x:186,y:560},{x:214,y:560}]);
});
test('generators prevent collisions or placement outside gameboard without modifying draft',()=>{
 const d=emptyDraft();d.track[63]={x:200,y:200};d.track[20]={x:228,y:200};
 const previous=structuredClone(d);
 assert.throws(()=>buildGoalLane(d,0,{dx:1,dy:0,spacing:28}),/überlappen/);
 assert.deepEqual(d,previous);
 d.track[0]={x:710,y:710};
 assert.throws(()=>buildHomeGroup(d,0,{dx:1,dy:0,layout:'row',distance:100,spacing:28}),/außerhalb/);
});
test('path report marks open or broken track steps and recognizes a closed ring',()=>{
 const d=emptyDraft();d.track[0]={x:100,y:100};d.track[1]={x:128,y:100};
 const a=getTrackConnections(d);
 assert.equal(a.occupied,2);
 assert.equal(a.links.length,1);
 assert.equal(a.missing.length,63);
 assert.equal(a.closed,false);
 assert.equal(a.broken.length,0);
 d.track[1]={x:400,y:100};
 assert.equal(getTrackConnections(d).broken.length,1);
});
test('straight gaps of up to six empty cells can be connected without changing existing ends',()=>{
 const d=emptyDraft();d.track[0]={x:100,y:100};d.track[3]={x:184,y:100};
 const gaps=straightGaps(d);
 assert.deepEqual(gaps.find(g=>g.from===0),{from:0,to:3,missing:2});
 const result=connectStraightGap(d,0,{step:28});
 assert.equal(result.added,2);
 assert.deepEqual(result.draft.track.slice(0,4),[
   {x:100,y:100},{x:128,y:100},{x:156,y:100},{x:184,y:100}
 ]);
 assert.equal(d.track[1],null);
 assert.equal(getTrackConnections(result.draft).links.length,3);
});
test('track gap can wrap from 63 to 0 without skipping numeric order',()=>{
 const d=emptyDraft();d.track[62]={x:200,y:200};d.track[0]={x:256,y:200};
 const result=connectStraightGap(d,62,{step:28});
 assert.deepEqual(result.draft.track[63],{x:228,y:200});
 assert.equal(result.to,0);
});
test('turns and long missing sections require intentional field-by-field layout',()=>{
 const d=emptyDraft();d.track[0]={x:100,y:100};d.track[3]={x:160,y:195};
 assert.throws(()=>connectStraightGap(d,0,{step:28}),/Kurve|Abstand/);
 const long=emptyDraft();long.track[0]={x:100,y:100};long.track[15]={x:500,y:100};
 assert.equal(straightGaps(long).some(x=>x.from===0),false);
});
