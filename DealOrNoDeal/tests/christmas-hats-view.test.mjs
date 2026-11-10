import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {Script} from 'node:vm';

const root=resolve(fileURLToPath(new URL('.',import.meta.url)),'..');
const html=readFileSync(resolve(root,'weihnachtsmuetzen.html'),'utf8');
const script=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)]
 .map(match=>match[1]).filter(Boolean).join('\n');

test('Christmas Hats production page contains valid inline JavaScript',()=>{
 assert.ok(script.length>1000);
 assert.doesNotThrow(()=>new Script(script,{filename:'weihnachtsmuetzen.html'}));
});

test('All referenced Christmas Hats DOM IDs exist exactly once',()=>{
 const ids=[...new Set([...script.matchAll(/\$\('([A-Za-z0-9_-]+)'\)/g)].map(m=>m[1]))];
 for(const id of ids){
  const count=[...html.matchAll(new RegExp('id="'+id+'"','g'))].length;
  assert.equal(count,1,'missing/duplicate id '+id);
 }
});

test('Cashing out, checkpoint presentation and safe retry remain interactive',()=>{
 for(const id of ['start','cash','again','continue','cash-dialog','cash-confirm','cash-cancel','refresh','retry','hats','tiers','lobby','back']){
  assert.match(html,new RegExp('id="'+id+'"'));
 }
 assert.match(script,/pendingId=/);
 assert.match(script,/pendingAction\?\.applied/);
 assert.match(script,/dialog\.showModal\(\)/);
 assert.match(script,/function finishReveal\(\)/);
 assert.match(script,/if\(busy\|\|reveal\|\|pendingRequest\)return;/);
 assert.match(script,/SpielOnline\?\.state/);
});

test('Random prize and money decisions are never client-controlled',()=>{
 assert.match(script,/\/api\/christmas-hats\/action/);
 assert.match(script,/data\.result/);
 assert.doesNotMatch(script,/const\s+bombIndex\s*=/);
 assert.doesNotMatch(script,/localStorage\.setItem\(.+balance/);
});
