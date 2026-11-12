import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('Material refinement belongs to forge workshop, not merchant',()=>{
 const forge=read('dog-forge.html'),merchant=read('dog-merchant.html');
 assert.match(forge,/id="forge-refinement"/);
 assert.match(forge,/id="forge-refinement-list"/);
 assert.doesNotMatch(merchant,/id="forge-refinement"/);
 assert.match(forge,/5 : 1 · mit Erfolgschance/);
 assert.match(forge,/20261113-quality-forge-v2/);
});
test('Forge material quality UI locks behind confirmed boss milestones',()=>{
 const js=read('dog-forge-ui.js'),css=read('dog-forge-areas.css');
 assert.match(js,/function renderRefinement\(\)/);
 assert.match(js,/\[\[2,30\],\[3,60\]\]/);
 assert.match(js,/Number\(view\.qualityUnlocked\|\|1\)/);
 assert.match(js,/haveQuality\(id,level\)<5/);
 assert.match(js,/void action\('refine',\{resourceId:id,fromQuality:level,count:1\},false,true\)/);
 assert.match(css,/\.quality-forge-action:disabled/);
 assert.match(css,/@media\(max-width:470px\)/);
});
test('Material refinement and quick upgrades use same receipt safety without a ceremony',()=>{
 const js=read('dog-forge-ui.js');
 assert.match(js,/\['upgrade','exchange','refine'\]\.includes\(data.action\)/);
 assert.match(js,/savePending\(account,op\)/);
 assert.match(js,/if\(!retry&&!instant&&op.action==='upgrade'\)/);
 assert.match(js,/if\(instant\)\{/);
 assert.match(js,/if\(instant\)/);
 assert.match(js,/op.action==='refine'/);
 assert.match(js,/qualityLevel\|\|1/);
});
