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
