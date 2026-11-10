import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=f=>fs.readFileSync(new URL('../'+f,import.meta.url),'utf8');
const arena=read('dog-boss10.html'),arenaJs=read('dog-boss10.js');
const forge=read('dog-ascension.html'),forgeJs=read('dog-ascension.js');
const mapJs=read('dog-tor-map.js'),event=read('dog-expedition.html');
const nav=read('dog-materials-ui.js');

test('Tor 10 has a dedicated 30s ready room for exactly three players',()=>{
 for(const id of ['ready-button','react-button','heroes','ready-count','timer',
  'timer-fill','retry-button','status','outcome','phase'])
  assert.ok(arena.includes('id="'+id+'"'),'missing '+id);
 assert.ok(arenaJs.includes('/api/dog/gates/boss10'));
 for(const action of ["command('ready')","command('react')","command('finish')"])
  assert.ok(arenaJs.includes(action),'missing '+action);
 assert.ok(arenaJs.includes('30000'));
 assert.ok(arenaJs.includes('cooldownExpired'));
 assert.ok(arenaJs.includes('dog:boss10:pending:'));
 assert.ok(arenaJs.includes('setInterval'));
 assert.ok(!arenaJs.includes("localStorage.setItem('dog-unlocked'"));
});

test('Boss 10 opens from the map while old training boss remains separate',()=>{
 assert.ok(mapJs.includes('dog-boss10.html'));
 assert.ok(!mapJs.includes('Bestehende Boss-Testarena öffnen'));
 assert.ok(arena.includes('6–9 geschafft haben'));
 for(const id of ['boss10-launch','ascension-launch'])assert.ok(event.includes('id="'+id+'"'));
 assert.ok(nav.includes('boss10-launch'));
 assert.ok(nav.includes('ascension-waypoint'));
});

test('Forge loads quotes and sends authenticated, receipt-safe upgrades',()=>{
 for(const id of ['forge-level','weapon-level','armor-level','weapon-base',
  'armor-base','weapon-cost','armor-cost','upgrade-weapon','upgrade-armor',
  'inventory','status','retry'])
  assert.ok(forge.includes('id="'+id+'"'),'missing '+id);
 assert.ok(forgeJs.includes('/api/dog/gates/ascension'));
 assert.ok(forgeJs.includes("request('POST','/upgrade'"));
 assert.ok(forgeJs.includes('expectedLevel'));
 assert.ok(forgeJs.includes('quote.locked'));
 assert.ok(forgeJs.includes('quote.affordable'));
 assert.ok(forgeJs.includes('2**'));
 assert.ok(forgeJs.includes('localStorage'));
 assert.ok(forgeJs.includes('getIdToken'));
});

test('Reconnection reconciles lost ready/react/finish replies against server state',()=>{
 assert.ok(arenaJs.includes('function acknowledgePending(uid,state)'));
 assert.ok(arenaJs.includes("request.command==='ready'"));
 assert.ok(arenaJs.includes("request.command==='react'"));
 assert.ok(arenaJs.includes("request.command==='finish'"));
 assert.ok(arenaJs.includes('acknowledgePending(uid,data)'));
 assert.ok(arenaJs.includes('DOG_BOSS10_NOT_RUNNING'));
});

test('Mini-boss rewards are displayed only from an awarded server result',()=>{
 const mapHtml=read('dog-tor-map.html');
 for(const id of ['gate-mini-reward','gate-mini-reward-title','gate-mini-reward-details',
   'gate-mini-reward-link'])
  assert.ok(mapHtml.includes('id="'+id+'"'),'missing '+id);
 assert.ok(mapJs.includes('function displayMiniReward(reward,gate)'));
 assert.ok(mapJs.includes('if(!reward?.granted)return'));
 for(const rewardType of ['chest','coins','cards','hammer','joker'])
  assert.ok(mapJs.includes("reward.kind==='"+rewardType+"'"));
 assert.ok(mapJs.includes('displayMiniReward(fight.miniReward,gate)'));
 assert.ok(mapJs.includes('lastFight={gate,message:status}'));
 assert.ok(!mapJs.includes('Belohnung wird im nächsten Ausbauschritt angebunden'));
 assert.ok(!mapJs.includes('miniReward={'));
});

test('The client cannot locally grant boss victories or consume inventory',()=>{
 assert.ok(!arenaJs.includes('sharedBosses.push('));
 assert.ok(!arenaJs.includes('dogUnlocked=true'));
 assert.ok(!forgeJs.includes('resources.iron-='));
 assert.ok(arena.includes('serverseitig bestätigter Sieg'));
 assert.ok(forge.includes('serverbestätigten Versuch'));
 assert.ok(!arena.includes('href="./DOG/'));
 assert.ok(!forge.includes('href="./DOG/'));
});
