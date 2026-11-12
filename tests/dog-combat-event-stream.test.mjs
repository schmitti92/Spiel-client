import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

const read=name=>readFileSync(new URL('../'+name,import.meta.url),'utf8');
function load(name,global){const window={};
 runInNewContext(read(name),{window},{timeout:1000});return window[global];}

test('S-01 replay statistics select authoritative event stream over legacy strikes',()=>{
 const {model}=load('dog-boss-result-report.js','DogBossResultReport');
 const start=1900000000000;
 const event={
  fightId:'g10-t1900000000000-a2',eventId:'g10-t1900000000000-a2:1',
  sequence:1,uid:'a',heroId:'a',slot:0,round:0,
  kind:'hero-strike',targetId:'boss',amount:250,damage:250,
  hpBefore:1000,hpAfter:750,atMs:13500,impactAt:start+13500
 };
 const view={gate:10,phase:'cooldown',name:'Boss',startedAt:start,endsAt:start+135000,
  attempt:2,roster:[{uid:'a',weaponLevel:1,armorLevel:1}],
  members:[{uid:'a',name:'Hero'}],teamHealth:{heroes:[{uid:'a',hp:100,maxHp:145}]},
  result:{win:false,damage:250,bossHp:1000,hpRemaining:750},
  combat:{version:1,fightId:event.fightId,events:[event]},
  miniGames:{version:14,rounds:[{round:0,kind:'math'}],
   exchange:{stages:[{round:0,kind:'math',completed:true,
    playerResults:[{uid:'a',correct:1,max:8}]}],
    strikes:[{uid:'a',round:0,slot:0,kind:'hero-strike',amount:999,atMs:13500}]}}
 };
 const result=model(view);
 assert.equal(result.rows[0].attack,250);
 assert.equal(result.stages[0].damage,250);
 assert.equal(result.replay[0].eventId,event.eventId);
 assert.equal(result.replay[0].seq,1);
 assert.equal(result.replay[0].hpBefore,1000);
 assert.equal(result.replay[0].hpAfter,750);
});
test('S-01 timeline and personal LP consume official events, preserve old-state fallback',()=>{
 const arena=read('dog-boss-battle-v3.js');
 const live=read('dog-boss-live-ui.js');
 assert.match(arena,/view\.combat\.events:view\?\.miniGames\?\.exchange\?\.strikes/);
 assert.match(arena,/Number\(view\?\.miniGames\?\.version\)>=11/);
 assert.match(live,/Number\(view\?\.miniGames\?\.version\)>=11/);
 assert.match(live,/stream\.events\.filter\(e=>Number\(e\.atMs\)<=elapsed\)/);
 assert.match(live,/latestBoss\?\.hpAfter\?\?stream\.initialBossHp/);
 assert.match(live,/stream\.initialHeroHp\?\.\[hero\.uid\]/);
 assert.match(live,/view\?\.miniGames\?\.exchange\?\.displayTeamHealth\|\|view\?\.teamHealth/);
 for(const src of [arena,live,read('dog-boss-result-report.js')]){
  assert.doesNotMatch(src,/firebase\.firestore\(|addDoc\(|setDoc\(/);
 }
});

test('S-02 final event is included once in the server-confirmed result table and replay',()=>{
 const {model}=load('dog-boss-result-report.js','DogBossResultReport');
 const start=1900000000000;
 const id='g10-t'+start+'-a2';
 const stage={fightId:id,eventId:id+':1',sequence:1,uid:'a',
  heroId:'a',slot:0,round:0,kind:'hero-strike',targetId:'boss',
  amount:70,damage:70,rawDamage:70,overkillDamage:0,
  hpBefore:100,hpAfter:30,atMs:13000,impactAt:start+13000};
 const final={fightId:id,eventId:id+':2',sequence:2,uid:null,
  heroId:null,slot:1,round:4,kind:'team-finisher',targetId:'boss',
  amount:30,damage:30,rawDamage:55,overkillDamage:25,
  hpBefore:30,hpAfter:0,atMs:135000,impactAt:start+135000,
  rareCritical:true};
 const view={gate:10,phase:'victory',name:'Boss',
  startedAt:start,endsAt:start+135000,attempt:2,
  roster:[{uid:'a',weaponLevel:1,armorLevel:1}],
  members:[{uid:'a',name:'Hero'}],
  teamHealth:{heroes:[{uid:'a',hp:100,maxHp:145}]},
  result:{win:true,damage:125,bossHp:100,hpRemaining:0,rareCritical:true},
  combat:{version:1,fightId:id,events:[stage,final],
   reconciliation:{reconciled:true,rawDamage:125,
    appliedDamage:100,stageDamage:70,finisherDamage:30,
    overkillDamage:25,finalBossHp:0}},
  miniGames:{version:14,rounds:[{round:0,kind:'math'},
   {round:4,kind:'chain'}],exchange:{
   stages:[{round:0,kind:'math',completed:true,
    playerResults:[{uid:'a',correct:7,max:8}]}],
   strikes:[{uid:'a',round:0,slot:0,kind:'hero-strike',amount:999,atMs:13000}]
  }}
 };
 const report=model(view);
 assert.equal(report.result.damage,125);
 assert.equal(report.rows[0].attack,70,'team finisher is not falsely credited to hero');
 assert.equal(report.finisher.amount,30);
 assert.equal(report.settlement.overkillDamage,25);
 assert.equal(report.stages.at(-1).kind,'team-finisher');
 assert.equal(report.replay.length,2);
 assert.equal(report.replay.at(-1).name,'Team');
 assert.equal(report.replay.at(-1).seq,2);
 assert.equal(report.replay.reduce((sum,e)=>sum+
  (e.targetId==='boss'?e.amount:0),0),100);
});

test('S-02 historical low-luck boss guard is visible, not credited to a player',()=>{
 const {model}=load('dog-boss-result-report.js','DogBossResultReport');
 const start=1900000000000, fightId='g20-t'+start+'-a1';
 const before={eventId:fightId+':1',sequence:1,
  fightId,uid:'hero',slot:0,round:0,kind:'hero-strike',
  targetId:'boss',amount:65,atMs:12000};
 const guarded={eventId:fightId+':2',sequence:2,
  fightId,uid:null,slot:1,round:3,kind:'boss-guard',
  targetId:'boss',amount:-15,atMs:101000,
  hpBefore:35,hpAfter:50};
 const report=model({
  gate:20,phase:'cooldown',startedAt:start,endsAt:start+101000,
  name:'Boss',attempt:1,roster:[{uid:'hero',weaponLevel:1,armorLevel:1}],
  members:[{uid:'hero',name:'Hero'}],
  teamHealth:{heroes:[{uid:'hero',hp:100,maxHp:145}]},
  result:{win:false,damage:50,bossHp:100,hpRemaining:50},
  combat:{version:1,fightId,events:[before,guarded],
   reconciliation:{reconciled:true,rawDamage:50,
    appliedDamage:50,stageDamage:65,finisherDamage:0,
    guardRecovered:15,overkillDamage:0,finalBossHp:50}},
  miniGames:{version:11,rounds:[{kind:'math'}],
   exchange:{stages:[{round:0,kind:'math',completed:true,
    playerResults:[{uid:'hero',correct:0,max:8}]}]}}
 });
 assert.equal(report.replay.length,2);
 assert.equal(report.replay.at(-1).kind,'boss-guard');
 assert.equal(report.replay.at(-1).name,'Boss');
 assert.equal(report.stages.at(-1).restored,15);
 assert.equal(report.rows[0].attack,65);
 assert.equal(report.replay.reduce((sum,e)=>sum+
  (e.targetId==='boss'?e.amount:0),0),50);
});

test('K-05 personal finale: three named survivors, exact rolled totals and no anonymous extra hit',()=>{
 const {model}=load('dog-boss-result-report.js','DogBossResultReport');
 const startedAt=1900000000000, fightId='g10-t'+startedAt+'-a3';
 const heroes=[{uid:'a',name:'Chris'},{uid:'b',name:'Nova'},{uid:'c',name:'Titan'}];
 const old=[
  {eventId:fightId+':1',sequence:1,uid:'a',kind:'hero-strike',
   targetId:'boss',round:4,slot:0,amount:10,atMs:125000},
  {eventId:fightId+':2',sequence:2,uid:'b',kind:'hero-strike',
   targetId:'boss',round:4,slot:1,amount:20,atMs:128000},
  {eventId:fightId+':3',sequence:3,uid:'c',kind:'hero-strike',
   targetId:'boss',round:4,slot:2,amount:30,atMs:131000}
 ];
 const finals=[15,30,45].map((amount,slot)=>({
  eventId:fightId+':'+(slot+4),sequence:slot+4,uid:heroes[slot].uid,
  kind:'hero-finisher',targetId:'boss',round:4,slot,amount,
  hpBefore:140-[0,15,45][slot],hpAfter:140-[15,45,90][slot],
  atMs:135001+slot*1500,overkillDamage:0
 }));
 const view={gate:10,phase:'cooldown',startedAt,endsAt:startedAt+135000,
  name:'Der Aschewächter',attempt:3,
  roster:heroes.map(h=>({...h,weaponLevel:1,armorLevel:1})),
  members:heroes,teamHealth:{heroes:heroes.map(h=>({uid:h.uid,hp:100,maxHp:145}))},
  result:{win:false,damage:150,bossHp:200,hpRemaining:50},
  combat:{version:1,fightId,events:[...old,...finals],
   finale:{kind:'personal',strikes:finals,outcome:'defeat',sceneDurationMs:4500},
   reconciliation:{reconciled:true,rawDamage:150,appliedDamage:150,
    stageDamage:60,finisherDamage:90,overkillDamage:0,finalBossHp:50}},
  miniGames:{version:15,rounds:[{kind:'math',round:0},{kind:'chain',round:4}],
   exchange:{stages:[{round:4,kind:'chain',completed:true,defensive:false,
    playerResults:heroes.map(h=>({uid:h.uid,correct:5,max:10}))}]}}
 };
 const report=model(view);
 assert.equal(report.finale.strikes.length,3);
 assert.deepEqual(report.finale.strikes.map(e=>e.uid),['a','b','c']);
 assert.deepEqual(report.rows.map(r=>r.attack),[25,50,75]);
 assert.equal(report.rows.reduce((n,r)=>n+r.attack,0),150);
 assert.equal(report.replay.length,6);
 assert.equal(report.stages.at(-1).kind,'hero-finisher');
 assert.equal(report.stages.at(-1).damage,90);
 assert.equal(report.replay.filter(e=>e.kind==='team-finisher').length,0);
});
