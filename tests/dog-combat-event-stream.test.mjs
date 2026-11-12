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
  miniGames:{rounds:[{round:0,kind:'math'}],
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
 assert.match(live,/stream\.events\.filter\(e=>Number\(e\.atMs\)<=elapsed\)/);
 assert.match(live,/latestBoss\?\.hpAfter\?\?stream\.initialBossHp/);
 assert.match(live,/stream\.initialHeroHp\?\.\[hero\.uid\]/);
 assert.match(live,/view\?\.miniGames\?\.exchange\?\.displayTeamHealth\|\|view\?\.teamHealth/);
 for(const src of [arena,live,read('dog-boss-result-report.js')]){
  assert.doesNotMatch(src,/firebase\.firestore\(|addDoc\(|setDoc\(/);
 }
});
