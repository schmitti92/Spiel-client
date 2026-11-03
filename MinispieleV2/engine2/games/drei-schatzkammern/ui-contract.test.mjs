import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const html=readFileSync(new URL('./index.html',import.meta.url),'utf8');
test('direct doors without duplicate buttons',()=>{
 assert.ok(html.includes('data-door-arch'));
 assert.ok(html.includes('function selectDoor(door)'));
 assert.ok(!html.includes('id="choices"'));
 assert.ok(!html.includes('id="next"'));
});
test('offline assets and transitions are referenced',()=>{
 assert.ok(html.includes('assets/treasure-hall.svg'));
 assert.ok(html.includes('stageReveals'));
 assert.ok(html.includes('setTimeout('));
 const svg=readFileSync(new URL('./assets/treasure-hall.svg',import.meta.url),'utf8');
 assert.ok(svg.includes('<svg'));
});
