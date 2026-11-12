import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('Available upgrades get independent quick + buttons',()=>{
 const js=read('dog-forge-ui.js'),css=read('dog-forge-areas.css');
 assert.match(js,/const card=node\('div','forge-item-quick'\)/);
 assert.match(js,/if\(canUpgradeItem\(item.id\)\)/);
 assert.match(js,/card.append\(button\)/);
 assert.match(js,/card.append\(plus\)/);
 assert.match(js,/plus.disabled=!usable\(\)/);
 assert.match(css,/\.forge-item-quick>\.forge-quick-upgrade/);
});
test('Quick + skips confirmation and uses server receipt flow',()=>{
 const js=read('dog-forge-ui.js');
 assert.match(js,/const current=quoteFor\(item.id\)/);
 assert.match(js,/current.maxed\|\|current.locked\|\|!current.affordable/);
 assert.match(js,/void action\('upgrade',\{itemId:item.id,expectedLevel:current.level\},false,true\)/);
 assert.match(js,/if\(!retry&&!instant&&op.action==='upgrade'\)/);
 assert.match(js,/savePending\(account,op\)/);
 assert.match(js,/requestId:op.id/);
 assert.match(js,/if\(instant\)\{/);
});
test('Both forge and merchant load the new shared script',()=>{
 assert.match(read('dog-forge.html'),/dog-forge-ui.js\?v=20261113-instant-quality-v1/);
 assert.match(read('dog-merchant.html'),/dog-forge-ui.js\?v=20261113-instant-quality-v1/);
 assert.match(read('dog-forge.html'),/dog-forge-areas.css\?v=20261113-instant-quality-v1/);
});

test('Material stock lists quality levels 1, 2, 3 with legacy level-one fallback',()=>{
 const js=read('dog-forge-ui.js');
 assert.match(js,/stock-quality-counts/);
 assert.match(js,/level<=3/);
 assert.match(js,/level===1\?have\(id\):0/);
});
