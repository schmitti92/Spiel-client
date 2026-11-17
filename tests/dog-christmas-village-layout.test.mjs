import test from 'node:test';
import assert from 'node:assert/strict';
import {sceneLayouts,villageSpriteBounds,villageSpriteClearance,verifyVillageSpriteLayout,VILLAGE_MIN_CLEARANCE} from '../DOG/christmas-village-layout.mjs';
test('all eight Lichtertal structures stay separate at every mixed stage',()=>{
 const errors=verifyVillageSpriteLayout();
 assert.deepEqual(errors,[],errors.join('\n'));
 assert.equal(Object.keys(sceneLayouts).length,8);
 assert.equal(VILLAGE_MIN_CLEARANCE,16);
});
test('the Grinch cave shrinks from full power to a defeated cave without changing its ground',()=>{
 const first=villageSpriteBounds('grinch',1),last=villageSpriteBounds('grinch',5);
 assert.ok(first.right-first.left>last.right-last.left);
 assert.equal(first.bottom,last.bottom);
});
test('collision guard detects an intentionally invalid required clearance',()=>{
 const errors=verifyVillageSpriteLayout(50);
 assert.ok(errors.length>0,'invalid clearance must be rejected');
});
test('sprite bounds reject unknown stages and names',()=>{
 assert.throws(()=>villageSpriteBounds('grinch',6),RangeError);
 assert.throws(()=>villageSpriteBounds('academy',0),RangeError);
 assert.throws(()=>villageSpriteBounds('not-a-building',1),RangeError);
});
test('all worst-case envelopes have at least 16px of separation',()=>{
 const ids=Object.keys(sceneLayouts);
 let minimum=Infinity;
 for(let i=0;i<ids.length;i++)for(let j=i+1;j<ids.length;j++){
  for(let x=1;x<=sceneLayouts[ids[i]].growth.length;x++)
   for(let y=1;y<=sceneLayouts[ids[j]].growth.length;y++)
    minimum=Math.min(minimum,villageSpriteClearance(villageSpriteBounds(ids[i],x),villageSpriteBounds(ids[j],y)));
 }
 assert.ok(minimum>=16-1e-8,'minimum reserved spacing: '+minimum.toFixed(2));
});
