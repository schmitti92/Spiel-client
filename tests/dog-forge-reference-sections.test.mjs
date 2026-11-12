import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const get=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('preview 2 equipment and 3 of each skill category',()=>{
 const s=get('dog-forge-ui.js');
 assert.match(s,/sectionExpanded=\{equipment:true,attack:false,defense:false\}/);
 assert.match(s,/items\.slice\(0,3\)/);
 assert.match(s,/sectionExpanded\[group\]=!sectionExpanded\[group\]/);
 assert.match(s,/aria-controls/);
 assert.match(s,/aria-expanded/);
 assert.match(s,/forge-area-grid-/);
});
test('quick upgrades and server confirmation remain unchanged',()=>{
 const s=get('dog-forge-ui.js');
 assert.match(s,/if\(canUpgradeItem\(item\.id\)\)/);
 assert.match(s,/openUpgradeConfirm\(item,current\)/);
 assert.match(s,/const areas=merchantMode\?\[tab\]:\['equipment','attack','defense'\]/);
});
test('preview page loads current stylesheet and script',()=>{
 assert.match(get('dog-forge.html'),/dog-forge-ui\.js\?v=20261112-upgrade-hero1/);
 assert.match(get('dog-forge.html'),/dog-forge-clean\.css\?v=20261112-upgrade-hero1/);
});
