import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('Fight and retry buttons actually invoke the existing idempotent fight flow',()=>{
 const s=read('dog-tor-map.js');
 assert.match(s,/\$\('gate-battle-button'\)\.addEventListener\('click',\(\)=>void fightGate\(false\)\)/);
 assert.match(s,/\$\('gate-retry-button'\)\.addEventListener\('click',\(\)=>void fightGate\(true\)\)/);
 assert.match(s,/const result=await request\('POST','fight',\{requestId:pending\.id,gate:pending\.gate\},account\)/);
});
test('Server combat receipt stats populate the victory/defeat dialog',()=>{
 const s=read('dog-tor-map.js'),h=read('dog-tor-map.html');
 assert.match(s,/const stats=fight.combatStats/);
 assert.match(s,/alternating-three-attacks-v1/);
 assert.match(s,/quick-attack-breakdown/);
 assert.match(s,/quick-combat-log/);
 assert.match(h,/id="gate-detail-requirements"/);
 assert.match(h,/id="gate-req-hp"/);
 assert.match(h,/id="gate-req-attack"/);
 assert.match(s,/mapState\?\.normalGateRequirements\?\.find/);
 assert.match(s,/showGateRequirements\(gate\)/);
 assert.match(s,/stats.enemyRemainingHp/);
 assert.match(s,/stats.enemyDamageTaken/);
 assert.match(s,/stats.heroRemainingHp/);
 assert.match(s,/stats.heroDamageTaken/);
 assert.match(h,/id="gate-quick-result-stats"/);
 assert.match(h,/dog-tor-map\.js\?v=20261113-boss-gear-50-v1/);
});
