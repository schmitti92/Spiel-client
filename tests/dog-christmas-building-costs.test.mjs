import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {CHRISTMAS_BUILDING_IDS,CHRISTMAS_BUILDING_MIN_LEVEL,CHRISTMAS_BUILDING_MAX_LEVEL,
 CHRISTMAS_BASE_UPGRADE_COST,christmasUpgradeCost,christmasBuildingTotalCost,
 christmasVillageTotalCost,christmasUpgradeQuote} from '../DOG/christmas-building-costs.js';

test('every Christmas building uses the same doubled upgrade costs',()=>{
 assert.deepEqual(CHRISTMAS_BUILDING_IDS,['tower','workshop','bakery','inn','luckhouse','academy']);
 assert.equal(CHRISTMAS_BUILDING_MIN_LEVEL,1);
 assert.equal(CHRISTMAS_BUILDING_MAX_LEVEL,5);
 assert.equal(CHRISTMAS_BASE_UPGRADE_COST,15);
 assert.deepEqual([1,2,3,4].map(christmasUpgradeCost),[15,30,60,120]);
 assert.deepEqual([1,2,3,4,5].map(christmasBuildingTotalCost),[0,15,45,105,225]);
 assert.equal(christmasVillageTotalCost({tower:5,workshop:5,bakery:5,inn:5,luckhouse:5,academy:5}),1350);
 assert.equal(christmasVillageTotalCost({tower:2,workshop:3,bakery:4,inn:1,luckhouse:1,academy:1}),165);
});

test('no upgrades past maximum level or invalid numeric inputs',()=>{
 for(const invalid of [0,5,6,-1,1.2,Infinity,NaN,'2',null,undefined]){
  assert.equal(christmasUpgradeCost(invalid),null);
 }
 for(const invalid of [0,6,-5,2.5,'5',NaN,Infinity]){
  assert.equal(christmasBuildingTotalCost(invalid),null);
 }
 assert.equal(christmasVillageTotalCost({tower:5,workshop:5,bakery:5}),null);
 assert.equal(christmasVillageTotalCost({tower:5,workshop:6,bakery:5,inn:5}),null);
 assert.equal(christmasVillageTotalCost(null),null);
});

test('quote only reports affordability; it never spends or grants lights',()=>{
 assert.deepEqual(christmasUpgradeQuote(2,29),{
  fromLevel:2,toLevel:3,cost:30,affordable:false,remainingLights:29
 });
 assert.deepEqual(christmasUpgradeQuote(2,30),{
  fromLevel:2,toLevel:3,cost:30,affordable:true,remainingLights:0
 });
 assert.equal(christmasUpgradeQuote(5,1000),null);
 assert.equal(christmasUpgradeQuote(1,-1),null);
 assert.equal(christmasUpgradeQuote(1,1.5),null);
});

test('DOG event visibly quotes costs but still does not impersonate live purchases',()=>{
 const html=readFileSync(new URL('../DOG/christmas-event.html',import.meta.url),'utf8');
 const script=readFileSync(new URL('../DOG/christmas-event.js',import.meta.url),'utf8');
 assert.match(html,/id="building-price-overview"/);
 assert.ok(html.includes('src="./christmas-event.js?v='));
 assert.match(script,/christmasUpgradeCost\(level\)/);
 assert.match(script,/data-building-upgrade-price/);
 assert.doesNotMatch(html,/id="panel-gifts"|id="tab-gifts"/,'obsolete gifts information tab stays removed');
 assert.match(script,/villageRequest\('village\/upgrade','POST'/);
 assert.doesNotMatch(script,/firebase\.firestore|localStorage\.setItem/);
});

test('six clickable buildings share the same SVG landscape without a separate district',()=>{
 const html=readFileSync(new URL('../DOG/christmas-event.html',import.meta.url),'utf8');
 const script=readFileSync(new URL('../DOG/christmas-event.js',import.meta.url),'utf8');
 const styles=readFileSync(new URL('../DOG/christmas-expansion.css',import.meta.url),'utf8');
 const layouts=readFileSync(new URL('../DOG/christmas-village-layout.mjs',import.meta.url),'utf8');
 for(const id of ['tower','workshop','luckhouse','academy','bakery','inn']){
  assert.match(html,new RegExp('id="'+id+'-stage-image"'));
  assert.match(html,new RegExp('data-open-building="'+id+'"'));
 }
 for(const id of ['luckhouse','academy']){
  assert.match(html,new RegExp('id="'+id+'-ground-shadow"'));
  assert.match(html,new RegExp('class="building-hotspot hotspot-'+id+'"'));
  assert.match(layouts,new RegExp(id+':\\s*\\{cx:'),'Each building has a fixed reserved footprint');
  assert.match(styles,new RegExp('\\.hit-'+id));
 }
 assert.doesNotMatch(html,/class="village-expansion"/);
 assert.doesNotMatch(html,/class="village-expansion-building"/);
 assert.doesNotMatch(script,/village-expansion-img-/);
});
