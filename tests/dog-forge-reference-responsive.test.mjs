import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('Tablet retains side-by-side columns without fixed 340px right minimum',()=>{
 const css=read('dog-forge-clean.css');
 assert.match(css,/SCH-UI-07/);
 assert.match(css,/@media\(min-width:761px\) and \(max-width:1180px\)/);
 assert.match(css,/grid-template-columns:minmax\(0,1\.08fr\) minmax\(0,\.92fr\)/);
});
test('Phone stacks and keeps readable skill cards, with tiny phone fallback',()=>{
 const css=read('dog-forge-clean.css');
 assert.match(css,/@media\(max-width:760px\)/);
 assert.match(css,/@media\(max-width:420px\)/);
 assert.match(css,/@media\(max-width:330px\)/);
 assert.match(css,/white-space:normal;overflow-wrap:anywhere;word-break:normal/);
 assert.match(css,/touch-action:manipulation/);
 assert.match(css,/outline:3px solid #ffe29e/);
});
test('Forge only CSS; existing live logic and navigation unchanged',()=>{
 const css=read('dog-forge-clean.css');
 assert.match(css,/body:not\(\.merchant-page\) \.forge-workspace/);
 assert.match(read('dog-forge.html'),/dog-forge-clean\.css\?v=20261112-responsive1/);
 assert.match(read('dog-forge.html'),/id="forge-level-up"/);
 assert.match(read('dog-forge.html'),/id="forge-stock"/);
});
