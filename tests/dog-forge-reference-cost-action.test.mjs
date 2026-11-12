import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const get=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('Cost display uses server quote, compact two columns and clear blocks',()=>{
 const s=get('dog-forge-ui.js'),css=get('dog-forge-clean.css');
 assert.match(s,/const missing=Object.entries\(quote.cost\|\|\{\}\)/);
 assert.match(s,/forge-cost-badge/);
 assert.match(s,/Schmiedestufe '\+forgeNeeded\+' nötig/);
 assert.match(css,/forge-compact-cost-list\{display:grid;grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
});
test('Original server confirmation remains, button respects current quote',()=>{
 const s=get('dog-forge-ui.js');
 assert.match(s,/button.disabled=!usable\(\)\|\|!quote.affordable\|\|!!quote.locked/);
 assert.match(s,/openUpgradeConfirm\(item,quote\)/);
 assert.match(s,/confirmData=\{itemId:item.id,expectedLevel:quote.level\}/);
 assert.match(s,/const chance=node\('div','forge-ready'\)/);
});
test('Only forge refreshed its CSS/JS',()=>{
 assert.match(get('dog-forge.html'),/dog-forge-ui\.js\?v=20261112-cost-action1/);
 assert.match(get('dog-forge.html'),/dog-forge-clean\.css\?v=20261112-cost-action1/);
 assert.match(get('dog-forge-clean.css'),/body:not\(\.merchant-page\) #upgrade-content \.forge-action-panel/);
});
