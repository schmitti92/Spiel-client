import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {summarizeDogEventOverview} from '../DOG/christmas-event-overview.js';

const read=f=>readFileSync(new URL('../'+f,import.meta.url),'utf8');
const players=[
 {seat:0,name:'Chris',bot:false},
 {seat:1,name:'Vanessa',bot:false},
 {seat:2,name:'🤖 DOG Bot',bot:true},
 {seat:3,name:'David',bot:false}
];
const snapshot={
 enabled:true,round:3,giftFieldCount:15,scratchFieldCount:8,goldFieldCount:4,
 roundGiftCollected:2,roundScratchCollected:2,
 foundGoldFields:[{field:7,amount:500},{field:21,amount:2000}],
 roundFinds:[
  {id:1,type:'gift',field:14,seat:0,earnedTenths:10},
  {id:2,type:'scratch',field:30,seat:1,tier:'medium'},
  {id:3,type:'gift',field:18,seat:3,earnedTenths:25},
  {id:4,type:'scratch',field:23,seat:0,tier:'premium'}
 ],
 goldFinds:[
  {id:5,type:'gold',field:7,seat:3,amount:500},
  {id:6,type:'gold',field:21,seat:1,amount:2000}
 ]
};
test('the live panel counts current phase and match-long gold separately',()=>{
 const v=summarizeDogEventOverview(snapshot,players);
 assert.equal(v.round,3);
 assert.deepEqual(v.types.map(x=>[x.type,x.found,x.total,x.remaining]),
  [['gift',2,15,13],['scratch',2,8,6],['gold',2,4,2]]);
 assert.equal(v.unknown,0);
 assert.deepEqual(v.finds.map(f=>f.player),['Vanessa','David','Chris','David','Vanessa','Chris']);
 assert.equal(v.finds.find(f=>f.id===6).prize,'2.000 Gold');
 assert.equal(v.finds.find(f=>f.id===3).prize,'2,5 ⭐');
 assert.equal(v.finds.find(f=>f.id===2).prize,'Mittleres Los');
 assert.equal(v.finds.find(f=>f.id===4).prize,'Premium-Los');
});

test('a new deal clears light/scratch history but retains gold winners',()=>{
 const next={...snapshot,round:4,roundGiftCollected:0,roundScratchCollected:0,roundFinds:[]};
 const v=summarizeDogEventOverview(next,players);
 assert.equal(v.types[0].found,0);
 assert.equal(v.types[1].remaining,8);
 assert.equal(v.types[2].found,2);
 assert.deepEqual(v.finds.map(f=>f.type),['gold','gold']);
});

test('bots, invalid fields and duplicate server records are ignored',()=>{
 const altered={...snapshot,roundFinds:[
  ...snapshot.roundFinds,
  {id:7,type:'gift',field:11,seat:2,earnedTenths:30},
  {id:7,type:'gold',field:12,seat:0,amount:500},
  {id:8,type:'gift',field:16,seat:0,earnedTenths:30},
  {id:9,type:'scratch',field:64,seat:1,tier:'simple'}
 ]};
 const v=summarizeDogEventOverview(altered,players);
 assert.equal(v.finds.length,6);
 assert.ok(!v.finds.some(x=>x.player.includes('Bot')));
 assert.equal(summarizeDogEventOverview(null,players),null);
 assert.equal(summarizeDogEventOverview({enabled:false},players),null);
});

test('legacy game states show counts honestly when winner history is missing',()=>{
 const old={...snapshot,roundFinds:undefined,goldFinds:undefined};
 const v=summarizeDogEventOverview(old,players);
 assert.equal(v.finds.length,0);
 assert.equal(v.unknown,6);
 assert.equal(v.types[0].remaining,13);
 assert.ok(!v.types.some(x=>'hiddenFields' in x));
});

test('Events button opens the existing dock and full event remains in top menu',()=>{
 const shell=read('DOG/ui-shell.js'),app=read('DOG/app.js'),html=read('DOG/index.html');
 const css=read('DOG/christmas-event-overview.css');
 const module=read('DOG/christmas-event-overview.js');
 assert.match(shell,/setExtension\(button\.dataset\.dogExtra\)/);
 assert.doesNotMatch(shell,/if\(button\.dataset\.dogExtra==='events'\)\{\s*location\.assign/);
 assert.match(shell,/renderDogEventOverview/);
 assert.match(app,/dog-christmas-snapshot/);
 assert.match(html,/id="dog-event-overview"/);
 assert.match(html,/id="dog-christmas-event-link"/);
 assert.match(html,/id="dog-menu-toggle"/);
 assert.match(css,/dog-event-table-scroll/);
 assert.doesNotMatch(module,/\bfetch\(|firebase|indexedDB|localStorage|WebSocket|location\.assign/);
 assert.doesNotMatch(shell,/\/api\/hub\/rooms.*christmas/);
});
