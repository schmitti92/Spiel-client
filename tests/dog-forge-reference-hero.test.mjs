import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const get=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('Equipment and skills share image-left, levels-right composition',()=>{
 const s=get('dog-forge-ui.js').split('function renderUpgrade()')[1].split('function renderExchange()')[0];
 assert.match(s,/const hero=node\('div','forge-upgrade-hero'\)/);
 assert.match(s,/const details=node\('div','forge-upgrade-details'\)/);
 assert.match(s,/scene\.append\(gearVisual\(item.id,level\)\);hero\.append\(scene\)/);
 assert.match(s,/scene\.append\(skillVisual\(item\)\)/);
 assert.match(s,/hero\.append\(details\);root\.append\(hero\)/);
 assert.match(s,/root\.append\(teaser\)/);
});
test('Server validated confirmation and visual-only style remain',()=>{
 const s=get('dog-forge-ui.js');
 assert.match(s,/const quote=quoteFor\(selected\)/);
 assert.match(s,/button\.addEventListener\('click',\(\)=>openUpgradeConfirm\(item,quote\)\)/);
 assert.match(get('dog-forge-clean.css'),/body:not\(\.merchant-page\) \.forge-upgrade-hero/);
 assert.match(get('dog-forge.html'),/dog-forge-ui\.js\?v=20261112-cost-action1/);
});
