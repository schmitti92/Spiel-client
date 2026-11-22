import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {CHRISTMAS_BUILDING_IDS,christmasUpgradeCost} from '../DOG/christmas-building-costs.js';
import {affordableDogChristmasBuildings,safeChristmasPersonalBadges,initChristmasTabBadges}
 from '../DOG/christmas-tab-badges.js';

const read=path=>readFileSync(new URL('../DOG/'+path,import.meta.url),'utf8');
const baseLevels=()=>Object.fromEntries(CHRISTMAS_BUILDING_IDS.map(id=>[id,1]));

test('number on buildings means how many DIFFERENT upgrades shared balance can buy',()=>{
 const levels=baseLevels(),village=lights=>({levels,lightsTenths:lights*10});
 assert.equal(affordableDogChristmasBuildings(village(0)),0);
 assert.equal(affordableDogChristmasBuildings(village(14)),0);
 assert.equal(affordableDogChristmasBuildings(village(15)),1);
 assert.equal(affordableDogChristmasBuildings(village(30)),2);
 assert.equal(affordableDogChristmasBuildings(village(45)),3);
 assert.equal(affordableDogChristmasBuildings(village(90)),6);
 assert.equal(affordableDogChristmasBuildings(village(200)),6);
 assert.equal(affordableDogChristmasBuildings(village(90),{canUpgrade:false}),0);
 assert.equal(affordableDogChristmasBuildings(null),0);
});
test('building counter selects real next costs (15,45,135,405) and excludes completed houses',()=>{
 const levels={tower:5,workshop:4,bakery:3,inn:2,luckhouse:1,academy:1};
 const village={levels,lightsTenths:210*10};
 // Two 15, one 45, one 135 (sum 210) = four DIFFERENT possible purchases.
 assert.equal(affordableDogChristmasBuildings(village),4);
 assert.equal(christmasUpgradeCost(5),null);
 assert.equal(affordableDogChristmasBuildings({...village,lightsTenths:30*10}),2);
 assert.equal(affordableDogChristmasBuildings({...village,lightsTenths:0}),0);
 assert.equal(affordableDogChristmasBuildings({...village,lightsTenths:-1}),0);
});

test('personal data is accepted only as finite nonnegative integer values',()=>{
 assert.deepEqual(safeChristmasPersonalBadges({scratch:4,research:12,level:2}),{scratch:4,research:12,level:2});
 assert.deepEqual(safeChristmasPersonalBadges({scratch:-1,research:'8',level:Infinity}),{scratch:0,research:0,level:0});
 assert.equal(safeChristmasPersonalBadges(null),null);
});
function fakeSidebar(){
 const eventListeners=new Map();
 const target={
  addEventListener(id,fn){eventListeners.set(id,fn)},
  fire(id,detail){eventListeners.get(id)?.({detail})}
 };
 const tabs={};
 for(const id of ['buildings','scratch','research','level']){
  tabs['tab-'+id]={
   attrs:{},title:'',children:[],classList:{isActive:false,toggle(_class,_enabled){}},
   append(child){this.children.push(child)},
   setAttribute(k,v){this.attrs[k]=v}
  };
 }
 const doc={
  getElementById:id=>tabs[id]||null,
  createElement(tag){return {tagName:tag,hidden:false,textContent:'',attrs:{},
   setAttribute(k,v){this.attrs[k]=v}}}
 };
 return {doc,target,tabs};
}

test('badges are invisible for zero, update after confirmed change, and never trigger reads on village edits',()=>{
 const {doc,target,tabs}=fakeSidebar();
 const user={uid:'alice',getIdToken:async()=> 'token'};
 const ui=initChristmasTabBadges({doc,target,getUser:()=>user,base:'https://dog.invalid'});
 let counts=ui.getCounts();
 assert.deepEqual(counts,{buildings:0,scratch:0,research:0,level:0});
 assert.equal(tabs['tab-scratch'].children[0].hidden,true);
 ui.setVillage({levels:baseLevels(),lightsTenths:450},{allowed:true});
 counts=ui.getCounts();
 assert.equal(counts.buildings,3);
 assert.equal(tabs['tab-buildings'].children[0].textContent,'3');
 assert.equal(tabs['tab-buildings'].children[0].hidden,false);
 target.fire('dog-christmas-badges-update',{scratch:3,research:2,level:1});
 // No prior authenticated server status is known: a random client event
 // cannot create arbitrary unread balances.
 assert.equal(ui.getCounts().scratch,0);
 ui.setVillage(null);
 assert.equal(ui.getCounts().buildings,0);
});

test('one authenticated GET populates personal counters; local updates need no new API requests',async()=>{
 const {doc,target,tabs}=fakeSidebar();
 const original=globalThis.fetch;
 const user={uid:'alice',getIdToken:async()=> 'verified'};
 const calls=[];
 globalThis.fetch=async(url,options)=>{
  calls.push({url,options});
  return {ok:true,json:async()=>({ok:true,badges:{scratch:4,research:6,level:2}})};
 };
 try{
  const ui=initChristmasTabBadges({doc,target,getUser:()=>user,base:'https://dog.invalid'});
  await ui.load();
  assert.equal(calls.length,1);
  assert.match(calls[0].url,/\/api\/hub\/dog\/christmas-tab-badges$/);
  assert.equal(calls[0].options.headers.Authorization,'Bearer verified');
  assert.equal(ui.getCounts().scratch,4);
  assert.equal(tabs['tab-research'].children[0].textContent,'6');
  assert.match(tabs['tab-level'].attrs['aria-label'],/2 Levelbelohnungen/);
  ui.setVillage({levels:baseLevels(),lightsTenths:150},{allowed:true});
  target.fire('dog-christmas-badges-update',{scratch:3,research:1});
  assert.deepEqual(ui.getCounts(),{buildings:1,scratch:3,research:1,level:2});
  assert.equal(calls.length,1,'local updates and tab rendering never re-read');
  await ui.load();
  target.fire('spielonline-change');
  await Promise.resolve();
  assert.equal(calls.length,1,'same-profile auth refresh cannot restart the badge GET');
 }finally{globalThis.fetch=original}
});
test('switching players clears old personal rewards immediately',async()=>{
 const {doc,target}=fakeSidebar();
 let user={uid:'alice',getIdToken:async()=> 'alice'};
 const original=globalThis.fetch;
 globalThis.fetch=async(_url,opts)=>({ok:true,json:async()=>({
  ok:true,badges:opts.headers.Authorization==='Bearer alice'?
   {scratch:5,research:8,level:1}:{scratch:0,research:0,level:0}
 })});
 try{
  const ui=initChristmasTabBadges({doc,target,getUser:()=>user,base:'https://dog.invalid'});
  await ui.load();
  assert.equal(ui.getCounts().scratch,5);
  user={uid:'bob',getIdToken:async()=> 'bob'};
  target.fire('spielonline-change');
  assert.equal(ui.getCounts().scratch,0);
  await ui.load();
  assert.equal(ui.getCounts().research,0);
 }finally{globalThis.fetch=original}
});
test('a synchronously failing auth token does not crash the event menu',async()=>{
 const {doc,target}=fakeSidebar();
 const ui=initChristmasTabBadges({doc,target,base:'https://dog.invalid',
  getUser:()=>({uid:'alice',getIdToken(){throw Error('TOKEN_NOT_READY')}})});
 assert.equal(await ui.load(),null);
 assert.equal(ui.getCounts().scratch,0);
});
test('Lichtertal menu remains navigable; no background Firebase reads or badges in Grinch tab',()=>{
 const html=read('christmas-event.html'),event=read('christmas-event.js');
 const badge=read('christmas-tab-badges.js'),css=read('christmas-tab-badges.css');
 assert.match(html,/id="tab-buildings"/);
 assert.match(html,/id="tab-scratch"/);
 assert.match(html,/id="tab-research"/);
 assert.match(html,/id="tab-level"/);
 assert.match(event,/tabBadges=initChristmasTabBadges/);
 assert.match(event,/tabBadges\?\.setVillage\(v/);
 assert.match(html,/christmas-tab-badges\.css\?v=/);
 assert.match(css,/christmas-tab-badge\[hidden\]/);
 assert.doesNotMatch(badge,/setInterval|setTimeout|onSnapshot|firebase|firestore\.collection/);
 assert.doesNotMatch(event,/\bwindow\.location\.assign\(.+badges/);
});
