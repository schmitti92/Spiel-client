import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=name=>readFileSync(new URL('../'+name,import.meta.url),'utf8');

test('100-Tore map shows real 1–50 forge targets for all bosses without extra fetches',()=>{
 const js=read('dog-tor-map.js'),html=read('dog-tor-map.html');
 assert.match(js,/bossGearRequirements\?\.find\(row=>row\.gate===gate\)/);
 assert.match(js,/normalGateRequirements\?\.find\(row=>row\.gate===gate\)/);
 assert.match(js,/recommendedWeaponLevel/);
 assert.match(js,/recommendedArmorLevel/);
 assert.match(js,/recommendedSkillLevel/);
 assert.match(js,/3 Spieler empfohlen/);
 assert.match(js,/gate-req-note/);
 for(const id of ['gate-req-note','gate-req-hp','gate-req-attack','gate-req-weapon','gate-req-armor','gate-req-heading'])
  assert.ok(html.includes('id="'+id+'"'),id+' missing from map');
 assert.match(html,/dog-tor-map\.js\?v=20261113-boss-gear-50-v1/);
 assert.doesNotMatch(js,/fetch\([^)]*bossGearRequirements/);
 assert.doesNotThrow(()=>new Function(js));
});
