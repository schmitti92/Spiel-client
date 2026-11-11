import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyDraft,fromCrossPreset,translateTrackGroup,trackGroupBounds,placedCount} from '../DOG/editor-model.js';

test('DOG selected entire track translates rigidly while goals and homes stay put',()=>{
 const original=emptyDraft();
 original.track[0]={x:100,y:150};
 original.track[1]={x:128,y:150};
 original.track[18]={x:300,y:300};
 original.goals[0][0]={x:540,y:420};
 original.homes[2][1]={x:500,y:560};
 const updated=translateTrackGroup(original,{dx:23,dy:-17});
 assert.deepEqual(updated.track[0],{x:123,y:133});
 assert.deepEqual(updated.track[1],{x:151,y:133});
 assert.deepEqual(updated.track[18],{x:323,y:283});
 assert.equal(updated.track[2],null);
 assert.deepEqual(updated.goals,original.goals);
 assert.deepEqual(updated.homes,original.homes);
 assert.equal(placedCount(updated).track,3);
 assert.deepEqual(original.track[0],{x:100,y:150},'undo must retain untouched baseline');
 assert.equal(Math.hypot(updated.track[0].x-updated.track[1].x,updated.track[0].y-updated.track[1].y),28);
});
test('DOG group translation snaps only a shared offset to grid and preserves diagonals',()=>{
 const d=emptyDraft();
 d.track[0]={x:200,y:200};d.track[1]={x:219.8,y:219.8};
 const changed=translateTrackGroup(d,{dx:34,dy:-29,snapToGrid:true,gridSpacing:28});
 assert.deepEqual(changed.track[0],{x:228,y:172});
 assert.deepEqual(changed.track[1],{x:247.8,y:191.8});
 assert.ok(Math.abs(Math.hypot(changed.track[1].x-changed.track[0].x,changed.track[1].y-changed.track[0].y)-Math.hypot(19.8,19.8))<.01);
});
test('DOG group movement rejects move off the board atomically',()=>{
 const d=emptyDraft();d.track[0]={x:44,y:50};d.track[47]={x:400,y:700};
 assert.throws(()=>translateTrackGroup(d,{dx:-20,dy:0}),/Brettrand/);
 assert.throws(()=>translateTrackGroup(d,{dx:0,dy:40}),/Brettrand/);
 assert.deepEqual(d.track[0],{x:44,y:50});
 assert.deepEqual(d.track[47],{x:400,y:700});
});
test('DOG group movement checks overlap with fixed house and goal circles',()=>{
 const d=emptyDraft();
 d.track[0]={x:100,y:100};
 d.goals[0][0]={x:180,y:100};
 assert.throws(()=>translateTrackGroup(d,{dx:80,dy:0}),/überlappen/);
 assert.deepEqual(d.track[0],{x:100,y:100});
 assert.deepEqual(d.goals[0][0],{x:180,y:100});
});
test('DOG group selection covers incomplete 48-field drafts, preserving numbers and all geometry',()=>{
 const d=fromCrossPreset();
 for(let i=48;i<64;i++)d.track[i]=null;
 const bounds=trackGroupBounds(d);
 assert.equal(bounds.count,48);
 const moved=translateTrackGroup(d,{dx:2,dy:1});
 assert.equal(placedCount(moved).track,48);
 for(let i=0;i<48;i++){
  assert.equal(moved.track[i].x-d.track[i].x,2);
  assert.equal(moved.track[i].y-d.track[i].y,1);
 }
 assert.ok(moved.track.slice(48).every(p=>p===null));
 assert.deepEqual(moved.goals,d.goals);
 assert.deepEqual(moved.homes,d.homes);
});
test('DOG selecting an empty track returns no bounds and cannot move',()=>{
 const d=emptyDraft();
 assert.equal(trackGroupBounds(d),null);
 assert.throws(()=>translateTrackGroup(d,{dx:10,dy:10}),/mindestens ein Lauffeld/);
});
