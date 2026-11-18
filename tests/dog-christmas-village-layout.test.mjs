import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {sceneLayouts,grinchSkyLayout,villageSpriteBounds,villageSpriteClearance,verifyVillageSpriteLayout,VILLAGE_MIN_CLEARANCE} from '../DOG/christmas-village-layout.mjs';
test('all seven foreground structures stay separate at every mixed stage',()=>{
 const errors=verifyVillageSpriteLayout();
 assert.deepEqual(errors,[],errors.join('\n'));
 assert.equal(Object.keys(sceneLayouts).length,7);
 assert.equal(VILLAGE_MIN_CLEARANCE,16);
});
test('the Grinch cave is a large upper backdrop, separate from the building collision grid',()=>{
 assert.equal(Object.hasOwn(sceneLayouts,'grinch'),false);
 assert.ok(grinchSkyLayout.w>=500);
 assert.ok(grinchSkyLayout.w>sceneLayouts.tower.w*2);
 assert.equal(grinchSkyLayout.growth.length,5);
 assert.equal(grinchSkyLayout.ground,270);
 const levelOneTree=villageSpriteBounds('tree',1);
 assert.ok(grinchSkyLayout.ground<levelOneTree.top,'Sky cave must end before level-one tree starts');
});
test('collision guard detects an intentionally invalid required clearance',()=>{
 const errors=verifyVillageSpriteLayout(50);
 assert.ok(errors.length>0,'invalid clearance must be rejected');
});
test('sprite bounds reject unknown stages and names',()=>{
 assert.throws(()=>villageSpriteBounds('tree',11),RangeError);
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

test('the Grinch scene only changes visual tree level and uses a separate skyline layer',()=>{
 const html=readFileSync(new URL('../DOG/christmas-event.html',import.meta.url),'utf8');
 const script=readFileSync(new URL('../DOG/christmas-event.js',import.meta.url),'utf8');
 const css=readFileSync(new URL('../DOG/christmas-grinch-cave.css',import.meta.url),'utf8');
 for(const id of ['grinch-sky-scene','grinch-sky-image','grinch-scene-toggle','grinch-cave-dialog']){
  assert.ok(html.includes('id="'+id+'"'),id+' element exists');
 }
 assert.doesNotMatch(html,/id="grinch-stage-image"|hotspot-grinch"/,'old lower-left cave must be gone');
 assert.match(script,/const visualTreeStage=villageMode==='grinch'\?1:sceneTree/);
 assert.match(script,/showStageImage\('tree',visualTreeStage\)/);
 assert.match(script,/view\.dataset\.mode=villageMode/);
 assert.match(script,/grinch-scene-toggle.*addEventListener\('click'/);
 assert.match(script,/grinchSkyLayout/);
 assert.match(css,/\[data-mode="grinch"\] #grinch-sky-scene/);
 assert.match(script,/stat-tree-level'\)\.textContent=tree/,'real tree status still uses the real level');
});
