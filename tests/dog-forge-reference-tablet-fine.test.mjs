import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const get=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('Landscape tablet is balanced and uses compact vertical spacing',()=>{
 const css=get('dog-forge-clean.css');
 assert.match(css,/SCH-UI-08b/);
 assert.match(css,/@media\(min-width:1181px\) and \(orientation:landscape\)/);
 assert.match(css,/grid-template-columns:minmax\(0,1\.04fr\) minmax\(0,\.96fr\)/);
 assert.match(css,/\.forge-clean-header\{[\s\S]*?min-height:72px!important/);
 assert.match(css,/\.forge-compact-cost-list \.cost-item:only-child\{/);
 assert.match(css,/max-width:320px/);
});
test('CSS-only iteration loads updated asset without altering game scripts',()=>{
 const html=get('dog-forge.html');
 assert.match(html,/dog-forge-clean\.css\?v=20261112-tablet-fine1/);
 assert.match(html,/dog-forge-ui\.js\?v=20261112-audit1/);
});
