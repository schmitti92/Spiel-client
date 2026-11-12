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
test('Quick + follows validated confirmation and server receipt flow',()=>{
 const js=read('dog-forge-ui.js');
 assert.match(js,/const current=quoteFor\(item.id\)/);
 assert.match(js,/current.maxed\|\|current.locked\|\|!current.affordable/);
 assert.match(js,/openUpgradeConfirm\(item,current\)/);
 assert.match(js,/confirmData=\{itemId:item.id,expectedLevel:quote.level\}/);
 assert.match(js,/savePending\(account,op\)/);
 assert.match(js,/requestId:op.id/);
 assert.match(js,/void action\('upgrade',requested\)/);
});
test('Both forge and merchant load the new shared script',()=>{
 assert.match(read('dog-forge.html'),/dog-forge-ui.js\?v=20261112-plus-v1/);
 assert.match(read('dog-merchant.html'),/dog-forge-ui.js\?v=20261112-plus-v1/);
 assert.match(read('dog-forge.html'),/dog-forge-areas.css\?v=20261112-plus-v1/);
});
