import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {CHRISTMAS_BUILDING_IDS,CHRISTMAS_TREE_BUILDING_IDS,CHRISTMAS_BUILDING_MAX_LEVEL}
 from '../DOG/christmas-building-costs.js';
import {CHRISTMAS_TREE_THRESHOLDS,CHRISTMAS_TREE_BASE_POINTS,CHRISTMAS_TREE_MAX_POINTS,
 CHRISTMAS_TREE_MAX_UPGRADES,christmasTreeBuildingPoints,christmasTreeLevelFromLevels,
 christmasTreeRemainingUpgrades} from '../DOG/christmas-tree-progression.js';

const read=path=>readFileSync(new URL('../DOG/'+path,import.meta.url),'utf8');
const base=()=>Object.fromEntries(CHRISTMAS_BUILDING_IDS.map(id=>[id,1]));
const full=()=>Object.fromEntries(CHRISTMAS_BUILDING_IDS.map(id=>[id,5]));

test('all six village buildings contribute to 24 upgrades and ten evenly spaced tree levels',()=>{
 assert.equal(CHRISTMAS_BUILDING_IDS.length,6);
 assert.deepEqual(CHRISTMAS_TREE_BUILDING_IDS,CHRISTMAS_BUILDING_IDS);
 assert.equal(CHRISTMAS_BUILDING_MAX_LEVEL,5);
 assert.equal(CHRISTMAS_TREE_BASE_POINTS,6);
 assert.equal(CHRISTMAS_TREE_MAX_POINTS,30);
 assert.equal(CHRISTMAS_TREE_MAX_UPGRADES,24);
 assert.deepEqual(CHRISTMAS_TREE_THRESHOLDS,[6,9,12,14,17,20,22,25,28,30]);
 const gaps=CHRISTMAS_TREE_THRESHOLDS.slice(1).map((n,i)=>n-CHRISTMAS_TREE_THRESHOLDS[i]);
 assert.ok(gaps.every(gap=>gap===2||gap===3),'tree advances every two or three building upgrades');
});

test('Christmas tree rises from 1 to 10 only after all 24 real upgrades',()=>{
 const levels=base();
 for(let upgrades=0;upgrades<=24;upgrades++){
  assert.equal(christmasTreeBuildingPoints(levels),6+upgrades);
  assert.equal(christmasTreeLevelFromLevels(levels),1+Math.floor(9*upgrades/24),
   'completed upgrades '+upgrades);
  assert.equal(christmasTreeRemainingUpgrades(levels),
   upgrades===24?0:Math.ceil((1+Math.floor(9*upgrades/24))*24/9)-upgrades);
  if(upgrades<24)levels[CHRISTMAS_BUILDING_IDS[upgrades%6]]++;
 }
 assert.deepEqual(levels,full());
 assert.equal(christmasTreeLevelFromLevels({levels}),10);
});

test('tree 10 is impossible if ANY one of the six buildings is below level five',()=>{
 const max=full();
 assert.equal(christmasTreeLevelFromLevels(max),10);
 for(const id of CHRISTMAS_BUILDING_IDS)
  for(let n=1;n<5;n++){
   assert.ok(christmasTreeLevelFromLevels({...max,[id]:n})<10,
    id+' at '+n+' must keep the last reward and Grinch gate locked');
  }
 assert.equal(christmasTreeLevelFromLevels({tower:5,workshop:5,bakery:5,inn:5}),7,
  'old original four-house completion no longer ends the event');
 assert.equal(christmasTreeLevelFromLevels({...base(),luckhouse:50}),1,
  'invalid local preview cannot elevate the real tree');
});

test('event UI uses the six-building shared calculation everywhere, with no obsolete four-house copy',()=>{
 const event=read('christmas-event.js'),html=read('christmas-event.html');
 assert.match(event,/christmas-tree-progression\.js\?v=/);
 assert.match(event,/originalTreePoints\(preview\)/);
 assert.match(event,/christmasTreeLevelFromLevels\(v\.levels\)/);
 assert.match(event,/christmasTreeLevelFromLevels\(villageLive\.levels\)/);
 assert.match(event,/CHRISTMAS_TREE_MAX_UPGRADES/);
 assert.match(event,/Alle sechs Gebäude haben Stufe 5 erreicht/);
 assert.doesNotMatch(event,/TREE_THRESHOLDS=\[4,5,7/);
 assert.doesNotMatch(event,/vier Häuser|vier Gebäude|\/ 20 Baum-Gebäudestufen/);
 assert.doesNotMatch(html,/vier ursprünglichen Gebäude/);
 assert.match(html,/Alle sechs Gebäude zählen gleichmäßig/);
});

test('only the verified village may unlock real tree films, rewards and Grinch',()=>{
 const event=read('christmas-event.js');
 assert.match(event,/onClose:\(\)=>treeFilms\.sync\(!devMode\.isActive\(\)&&villageLive\?treeLevel\(\):0\)/);
 assert.match(event,/if\(!deferTreeFilms\)treeFilms\.sync\(newTreeLevel\)/);
 assert.match(event,/verifiedTreeLevel:\(\)=>villageLive\?treeLevel\(\):0/);
 const story=read('christmas-story.js');
 assert.match(story,/isVerified/);
});
