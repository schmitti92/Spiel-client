import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('Material storage shows three quality levels with safe legacy fallback',()=>{
 const js=read('dog-materials-ui.js');
 assert.match(js,/inventory\?\.qualityResources\|\|null/);
 assert.match(js,/level<=3/);
 assert.match(js,/level===1\?items\[key\]:0/);
 assert.match(js,/resource-quality-levels/);
});
test('Forge + uses direct server request and skips confirmation and ceremony',()=>{
 const js=read('dog-forge-ui.js');
 assert.match(js,/void action\('upgrade',\{itemId:item.id,expectedLevel:current.level\},false,true\)/);
 assert.match(js,/if\(!retry&&!instant&&op.action==='upgrade'\)/);
 assert.match(js,/if\(instant\)\{/);
 assert.match(js,/savePending\(account,op\)/);
});
