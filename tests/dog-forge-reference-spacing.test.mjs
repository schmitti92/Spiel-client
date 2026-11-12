import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('No redundant tutorial, player data and stock remain',()=>{
 const html=read('dog-forge.html');
 assert.doesNotMatch(html,/class="forge-clean-help"/);
 assert.match(html,/id="forge-level-panel"/);
 assert.match(html,/id="forge-status"/);
 assert.match(html,/<details class="stock-panel" id="forge-stock">/);
 assert.match(html,/id="forge-stock-groups"/);
 assert.match(html,/id="forge-header-options-menu"|class="forge-header-options-menu"/);
});
test('Compact CSS only affects forge and preserves live messages',()=>{
 const css=read('dog-forge-clean.css');
 assert.match(css,/SCH-UI-06/);
 assert.match(css,/body:not\(\.merchant-page\) \.upgrade-panel \.upgrade-rule/);
 assert.match(css,/body:not\(\.merchant-page\) #forge-stock>summary/);
 assert.doesNotMatch(css,/body:not\(\.merchant-page\) #forge-status\{[^}]*display:none/);
 assert.match(read('dog-forge.html'),/dog-forge-clean\.css\?v=20261112-space1/);
});
