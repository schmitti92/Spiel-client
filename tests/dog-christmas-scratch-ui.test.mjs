import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {SCRATCH_TICKET_TYPES,SCRATCH_COIN_PRIZES} from '../DOG/christmas-scratch-ui.js';
import {DOG_COLLECTION_CATEGORIES} from '../DOG/collection-catalog.js';
const source=path=>readFileSync(new URL(path,import.meta.url),'utf8');
test('three scratch tickets show correct prices and unlock chances',()=>{
 assert.deepEqual(SCRATCH_TICKET_TYPES.map(x=>x.id),['simple','medium','premium']);
 assert.deepEqual(SCRATCH_TICKET_TYPES.map(x=>x.price),[200,500,1000]);
 assert.deepEqual(SCRATCH_TICKET_TYPES.map(x=>x.unlockChance),['11,1','3','4']);
 assert.ok(SCRATCH_TICKET_TYPES[0].rewards.includes('Emojis'));
 assert.ok(SCRATCH_TICKET_TYPES[1].rewards.includes('5 Profilbilder'));
 assert.ok(SCRATCH_TICKET_TYPES[2].rewards.includes('10 Profilbilder'));
});
test('scratch UI has real silver canvas, a reveal alternative and no per-stroke cloud writes',()=>{
 const html=source('../DOG/christmas-event.html');
 const js=source('../DOG/christmas-scratch-ui.js');
 assert.match(html,/id="tab-scratch"/);
 assert.match(html,/id="panel-scratch"/);
 assert.match(html,/id="scratch-board"/);
 assert.match(html,/id="scratch-reveal-button"/);
 assert.match(html,/christmas-scratch\.css/);
 assert.match(html,/christmas-event\.js\?v=\d+/);
 assert.match(js,/ctx\.globalCompositeOperation='destination-out'/);
 assert.match(js,/canvas\.addEventListener\('pointermove',stroke\)/);
 assert.match(js,/query\('\/buy',pending\)/);
 assert.match(js,/requestId/);
 assert.doesNotMatch(js,/Math\.random\(|sessionStorage\.|setInterval\(/);
});
test('simple scratched emojis and block colors are initially locked, 3 starters remain',()=>{
 const group=id=>DOG_COLLECTION_CATEGORIES.find(x=>x.id===id);
 const emoji=group('emojis').items;
 const normal=emoji.filter(x=>x.unlockId?.startsWith('christmas2026:standard-emoji:'));
 const tones=group('hud').items.filter(x=>x.field==='hudTone');
 assert.equal(normal.length,47);
 assert.equal(normal.filter(x=>x.status==='planned').length,47);
 assert.equal(emoji.filter(x=>x.status==='available').length,3);
 assert.equal(tones.length,17);
 assert.equal(tones.filter(x=>x.status==='planned').length,16);
 assert.ok(tones.every(x=>x.value==='classic'||x.unlockId==='christmas2026:hud-tone:'+x.value));
});
test('DOG gallery only trusts authenticated Render entitlements for scratch and tree cosmetics',()=>{
 const js=source('../DOG/collection.js');
 const verified=source('../DOG/verified-cosmetics.js');
 assert.match(verified,/getIdToken\(\)/);
 assert.match(verified,/api\/hub\/scratch/);
 assert.match(verified,/dog-cosmetics-verified/);
 assert.doesNotMatch(verified,/localStorage\.(?:getItem|setItem)\(|sessionStorage\.(?:getItem|setItem)\(/);
 assert.match(js,/isVerifiedCosmeticUnlocked\(item\.unlockId\)/);
 assert.match(js,/if\(!canEquip\(item\)\)return/);
 assert.match(js,/item\.kind==='avatar'&&item\.avatar>15/);
 assert.match(js,/nameFrame/);
});

test('medium elf artwork contains twenty framed cells and a path-highlighting renderer',()=>{
 const css=source('../DOG/christmas-scratch.css');
 const svg=source('../DOG/assets/scratch/wichtelpfad-mittel-01.svg');
 const js=source('../DOG/christmas-scratch-ui.js');
 assert.match(svg,/viewBox="0 0 1086 1448"/);
 assert.equal((svg.match(/fill="url\(#tile\)"/g)||[]).length,20);
 assert.match(css,/data-variant="elf"/);
 assert.match(css,/wichtelpfad-mittel-01\.svg/);
 assert.match(css,/grid-template-columns:repeat\(5/);
 assert.match(js,/showWinningElfPaths\(wins\)/);
 assert.match(js,/gift-three-connected/);
 assert.match(js,/line\.setAttribute\('points'/);
});

test('all scratch tiers expose three fixed cash symbols and a gift unlock legend',()=>{
 assert.deepEqual(SCRATCH_COIN_PRIZES,{
  simple:[10,40,100],medium:[100,300,800],premium:[200,800,2000]
 });
 const html=source('../DOG/christmas-event.html');
 const js=source('../DOG/christmas-scratch-ui.js');
 assert.match(html,/id="scratch-symbol-legend"/);
 assert.match(js,/symbolLegend\(c.id\)/);
 assert.match(js,/Freischaltung:/);
 assert.match(js,/🎁 💝 🎀 🧧/);
 assert.match(js,/p\.symbol/);
 assert.match(js,/symbolVersion===3/);
});

test('saving global scratch settings works outside a DOG room and provides user feedback',()=>{
 const js=source('../DOG/christmas-scratch-ui.js');
 const html=source('../DOG/christmas-event.html');
 const submit=js.split("addEventListener('submit',async e=>{")[1]?.split("window.addEventListener('spielonline-change'")[0];
 assert.ok(submit,'the settings form must have a submit listener');
 assert.doesNotMatch(submit,/validRoom|canManageScratch/,'room and client permission flags must not silence saves');
 assert.match(submit,/query\('\/settings',\{settings\}\)/,'send global settings without a room code');
 assert.match(submit,/response\.settings/,'only report success after server confirmation');
 assert.match(submit,/feedback\.textContent='⚠️ '/,'show save errors');
 assert.match(js,/addEventListener\('invalid',/,'explain browser validation failures');
 assert.match(html,/id="scratch-host-save"/);
});
