import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {CHRISTMAS_BUILDING_IDS,CHRISTMAS_BUILDING_MIN_LEVEL,CHRISTMAS_BUILDING_MAX_LEVEL,
 CHRISTMAS_BASE_UPGRADE_COST,christmasUpgradeCost,christmasBuildingTotalCost,
 christmasVillageTotalCost,christmasUpgradeQuote} from '../DOG/christmas-building-costs.js';

test('every Christmas building uses the same doubled upgrade costs',()=>{
 assert.deepEqual(CHRISTMAS_BUILDING_IDS,['tower','workshop','bakery','inn']);
 assert.equal(CHRISTMAS_BUILDING_MIN_LEVEL,1);
 assert.equal(CHRISTMAS_BUILDING_MAX_LEVEL,5);
 assert.equal(CHRISTMAS_BASE_UPGRADE_COST,15);
 assert.deepEqual([1,2,3,4].map(christmasUpgradeCost),[15,30,60,120]);
 assert.deepEqual([1,2,3,4,5].map(christmasBuildingTotalCost),[0,15,45,105,225]);
 assert.equal(christmasVillageTotalCost({tower:5,workshop:5,bakery:5,inn:5}),900);
 assert.equal(christmasVillageTotalCost({tower:2,workshop:3,bakery:4,inn:1}),165);
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
