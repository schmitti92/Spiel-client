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
  assert.match(arena,new RegExp('id="'+id+'"'),'missing '+id);
 assert.match(arenaJs,/\\/api\\/dog\\/gates\\/boss10/);
 assert.match(arenaJs,/['"]POST['"],'\\/ready'/);
 assert.match(arenaJs,/['"]POST['"],'\\/react'/);
 assert.match(arenaJs,/['"]POST['"],'\\/finish'/);
 assert.match(arenaJs,/30000/);
 assert.match(arenaJs,/cooldownExpired/);
 assert.match(arenaJs,/pendingKey/);
 assert.match(arenaJs,/setInterval/);
 assert.ok(!arenaJs.includes("localStorage.setItem('dog-unlocked'"));
});

test('Boss 10 is launched from map and old Tor-1 test arena remains separate',()=>{
 assert.match(mapJs,/dog-boss10\\.html/);
 assert.doesNotMatch(mapJs,/Bestehende Boss-Testarena öffnen/);
 assert.match(arena,/Tor 9 geschafft/);
 assert.match(event,/id="boss10-launch"/);
 assert.match(event,/id="ascension-launch"/);
 assert.match(nav,/boss10-launch/);
 assert.match(nav,/ascension-waypoint/);
});

test('Forge shows real server quotes, raw 10-tier damage and replay-safe upgrades',()=>{
 for(const id of ['forge-level','weapon-level','armor-level','weapon-base',
  'armor-base','weapon-cost','armor-cost','upgrade-weapon','upgrade-armor',
  'inventory','status','retry'])
  assert.match(forge,new RegExp('id="'+id+'"'),'missing '+id);
 assert.match(forgeJs,/\\/api\\/dog\\/gates\\/ascension/);
 assert.match(forgeJs,/['"]POST['"],'\\/upgrade'/);
 assert.match(forgeJs,/expectedLevel/);
 assert.match(forgeJs,/quote\\.locked/);
 assert.match(forgeJs,/quote\\.affordable/);
 assert.match(forgeJs,/2\\*\\*/);
 assert.match(forgeJs,/localStorage/);
 assert.match(forgeJs,/getIdToken/);
});

test('Neither UI grants a boss victory or spends materials locally',()=>{
 assert.ok(!arenaJs.includes('sharedBosses.push('));
 assert.ok(!arenaJs.includes('dogUnlocked=true'));
 assert.ok(!forgeJs.includes('resources.iron-='));
 assert.match(arena,/serverseitig bestätigter Sieg/);
 assert.match(forge,/serverbestätigten Versuch/);
 assert.ok(!arena.includes('href="./DOG/'));
 assert.ok(!forge.includes('href="./DOG/'));
});
