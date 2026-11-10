import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {Script} from 'node:vm';

const root=resolve(fileURLToPath(new URL('../',import.meta.url)));
const read=path=>readFileSync(resolve(root,path),'utf8');
const page=read('weihnachtsmuetzen.html');
const css=read('css/christmas-hats-premium-v4.css');
const inline=[...page.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(x=>x[1]).filter(Boolean).join('\n');
const assets=['santa-hat-premium.svg','workshop-stage.svg','gold-vault-stage.svg','ice-palace-stage.svg'];

test('Premium stage stylesheet is last so the V3 rules are safely overridden',()=>{
 const v3=page.indexOf('christmas-hats-show-v3.css'),v4=page.indexOf('christmas-hats-premium-v4.css');
 assert.ok(v3>=0&&v4>v3,'V4 must load after V3');
 assert.match(css,/\.hat\s+\.santa-hat\s*\{/);
 assert.match(css,/\.game\[data-zone="easy"\]/);
 assert.match(css,/\.game\[data-zone="medium"\]/);
 assert.match(css,/\.game\[data-zone="jackpot"\]/);
});

test('All four premium illustrations exist and have safe, self-contained SVG source',()=>{
 for(const name of assets){
  const path='assets/hats/'+name;
  assert.equal(existsSync(resolve(root,path)),true,'missing illustration '+path);
  const svg=read(path);
  assert.match(svg,/<svg[^>]+xmlns="http:\/\/www\.w3\.org\/2000\/svg"/);
  assert.match(svg,/<\/svg>\s*$/);
  assert.ok(svg.length>1500,'premium asset should have real painted detail: '+name);
  assert.doesNotMatch(svg,/<script|<foreignObject|href="https?:|onload=|onclick=/i);
  assert.ok(css.includes(name),'CSS must load illustration '+name);
 }
});

test('Journey shows ten distinct stages, stronger checkpoints and three stage locations',()=>{
 assert.match(page,/id="journey-current"/);
 assert.match(page,/id="tiers" role="group"/);
 assert.match(page,/data-stage-label="easy"/);
 assert.match(page,/data-stage-label="medium"/);
 assert.match(page,/data-stage-label="jackpot"/);
 assert.match(page,/id="hats-stage" class="game" data-zone="easy"/);
 assert.match(inline,/i===3\|\|i===7/);
 assert.match(inline,/i===10\?'👑'/);
 assert.match(inline,/\$\('hats-stage'\)\.dataset\.zone=zone/);
 assert.match(inline,/roomNumber<=3\?'easy':roomNumber<=6\?'medium':'jackpot'/);
});

test('Hats remain equally concealed and stage graphic never determines server prizes',()=>{
 assert.doesNotThrow(()=>new Script(inline,{filename:'weihnachtsmuetzen.html'}));
 assert.match(inline,/const shape=document\.createElement\('div'\);shape\.className='santa-hat'/);
 assert.match(inline,/hat\.setAttribute\('aria-label'/);
 assert.match(inline,/data\.result/);
 assert.match(inline,/\/api\/christmas-hats\/action/);
 assert.doesNotMatch(inline,/const bombIndex\s*=/);
 assert.match(css,/prefers-reduced-motion/);
});

test('Phone and landscape experiences remain supported without changing reward logic',()=>{
 assert.match(css,/@media\(max-width:620px\)/);
 assert.match(css,/@media\(min-width:900px\) and \(orientation:landscape\)/);
 assert.match(page,/NO_HATS_VOUCHERS/);
 assert.match(page,/function showChoice\(\)/);
 assert.match(page,/function finishReveal\(\)/);
 assert.match(page,/if\(DEMO\)/);
});
