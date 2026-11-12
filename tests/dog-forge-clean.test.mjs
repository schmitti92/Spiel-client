import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const get=path=>fs.readFileSync(new URL('../'+path,import.meta.url),'utf8');
test('The former ascent tab is removed and redirects existing bookmarks',()=>{
 const nav=get('dog-event-tabs.js'),page=get('dog-ascension.html');
 assert.doesNotMatch(nav,/dog-ascension.html/);
 assert.match(page,/window.location.replace/);
});
test('One full-width ascent bar in the forge uses a safe, receipt-backed request',()=>{
 const page=get('dog-forge.html'),script=get('dog-forge-ascent-ui.js'),css=get('dog-forge-clean.css');
 assert.match(page,/id="forge-level-panel"/);
 assert.match(page,/id="forge-level-dialog"/);
 assert.match(page,/dog-forge-clean.css/);
 assert.match(page,/dog-forge-ascent-ui.js/);
 assert.match(script,/api\/dog\/forge\/level-up/);
 assert.match(script,/localStorage.setItem\(key\(uid\),serialized\)/);
 assert.match(css,/\.forge-level-panel/);
 assert.match(css,/\.forge-workspace/);
});
test('Forge keeps class-specific images with five 10-level visual tiers',()=>{
 assert.match(get('dog-hero-equipment.js'),/const tiers=\[10,20,30,40,50\]/);
 assert.match(get('dog-forge-ui.js'),/limit:50,title:'Legendär'/);
 assert.match(get('dog-forge-ui.js'),/dog-forge-view/);
});
test('Every Event page has the current shared tabs version',()=>{
 for(const name of ['dog-expedition.html','dog-tor-map.html','dog-merchant.html','dog-ascension.html',
 'dog-boss10.html','dog-group-boss.html','dog-boss.html','dog-private-preview.html','dog-forge.html']){
  assert.match(get(name),/dog-event-tabs.js\?v=20261112-forge50-v1/,name);
 }
});
