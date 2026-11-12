import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=name=>readFileSync(new URL('../'+name,import.meta.url),'utf8');
test('Merchant uses the original safe server trade workflow on a separate page',()=>{
 const merchant=read('dog-merchant.html'),forge=read('dog-forge.html'),ui=read('dog-forge-ui.js');
 assert.match(read('dog-event-tabs.js'),/dog-merchant\.html/);
 assert.match(merchant,/data-dog-area="merchant"/);
 assert.match(ui,/merchantMode\?'exchange':'equipment'/);
 assert.match(ui,/savePending\(account,op\)/);
 assert.match(ui,/requestId:op\.id/);
 assert.match(ui,/action\('exchange',\{resourceId:from\[0\]\}\)/);
 assert.match(ui,/action\('exchange',\{resourceId:req\.resourceId,count:req\.count\}\)/);
 assert.doesNotMatch(forge,/data-tab="exchange"/);
});
test('Equipment and both skill areas stay visible together',()=>{
 const ui=read('dog-forge-ui.js'),css=read('dog-forge-areas.css');
 for(const name of ['Waffen & Rüstung','Angriffsfähigkeiten','Abwehrfähigkeiten'])assert.ok(ui.includes(name));
 for(const name of ['equipment','attack','defense'])assert.ok(css.includes('forge-item-group-'+name));
 assert.doesNotMatch(ui,/tab='exchange';tradeGroup=suggestion\.group/);
});
test('Nine pages use shared updated navigation',()=>{
 for(const p of ['dog-expedition.html','dog-tor-map.html','dog-forge.html','dog-merchant.html','dog-ascension.html','dog-boss10.html','dog-group-boss.html','dog-boss.html','dog-private-preview.html'])
  assert.match(read(p),/dog-event-tabs\.js\?v=20261112-boss-from-map1/);
});
