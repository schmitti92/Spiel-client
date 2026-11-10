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


test('V3 stage presents ten checkpoint rooms and professional show controls',()=>{
 const css=readFileSync(resolve(root,'css/christmas-hats-show-v3.css'),'utf8');
 assert.match(html,/christmas-hats-show-v3\.css/);
 for(const id of ['choice-dialog','choice-next','choice-cash','choice-secured','choice-risked',
   'announcer-text','story-speech','cinema-subtitle','cash-description']){
  assert.match(html,new RegExp('id="'+id+'"'));
 }
 assert.match(css,/\.hats\.stage-suspense/);
 assert.match(css,/\.choice-dialog::backdrop/);
 assert.match(css,/\.trophy-groups/);
 assert.match(css,/prefers-reduced-motion/);
 assert.match(script,/function showChoice\(\)/);
 assert.match(script,/function renderFinalShow\(/);
 assert.match(script,/function clearShowTimers\(\)/);
 assert.match(script,/revealPhase='suspense'/);
 assert.match(script,/revealPhase='shown'/);
 assert.match(script,/revealTimer=setTimeout\(finishReveal,reduced\?3000:event\.superLuck\?12800:\[3,7\]\.includes\(event\.room\)\?10100:7600\)/);
 assert.match(script,/showChoice\(\)/);
 assert.match(script,/function finishReveal\(\)/);
 assert.match(script,/closeChoice\(\)/);
});

test('V3 keeps real payouts separate from local Chris test games',()=>{
 assert.match(script,/if\(DEMO\)\s*\{\s*if\(!isChrisDemo\(\)\)/);
 assert.match(script,/return demoRequest\(path,method,payload\)/);
 assert.match(script,/DEMO\?'Testmodus: Deine Gewinne/);
 assert.doesNotMatch(script,/fetch\(['"]\/api\/christmas-hats\/action['"]\)/);
});
