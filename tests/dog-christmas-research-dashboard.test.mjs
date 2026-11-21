import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
const read=name=>readFileSync(new URL('../DOG/'+name,import.meta.url),'utf8');
const html=read('christmas-event.html');
const controller=read('christmas-research-ui.js');
const app=read('christmas-event.js');
const royal=read('christmas-research-royal.css');
const compact=read('christmas-research-compact.css');
const zoom=read('christmas-content-zoom.css');
test('research removes the large hero and active-bonuses banner without losing the point wallet',()=>{
 for(const id of ['panel-research','dog-research-shell','dog-research-cards','dog-research-detail','dog-research-points','dog-research-sort','dog-research-grid-toggle']){
  assert.match(html,new RegExp('id="'+id+'"'),id);
 }
 assert.doesNotMatch(html,/class="dr-hero"|class="dr-bonuses/);
 assert.doesNotMatch(html,/Aktive Boni|Noch keine Boni|Erforsche mächtige Weihnachtsfähigkeiten/);
 assert.doesNotMatch(controller,/dog-research-active-count|dog-research-active-bonuses/);
 assert.match(controller,/renderSummary\(\)/);
 assert.match(html,/christmas-research-compact\.css\?v=/);
});
test('reference gold frame and original eight-tab Lichtertal navigation are retained',()=>{
 assert.match(html,/class="event-sidebar"/);
 assert.match(html,/class="event-menu"/);
 assert.equal((html.match(/class="event-tab(?: event-tab-grinch)?"/g)||[]).length,8);
 assert.match(royal,/dr-detail-panel/);
 assert.match(app,/classList\.toggle\('research-mode',id==='research'\)/);
 assert.match(zoom,/\.event-layout > \.event-sidebar/);
});
test('right detail is sticky, has no internal scrollbar, and the 12 cards scroll separately',()=>{
 assert.match(compact,/\.dr-detail-panel\s*\{/);
 assert.match(compact,/position:sticky!important/);
 assert.match(compact,/height:100%!important/);
 assert.match(compact,/overflow:hidden!important/);
 assert.match(compact,/\.dr-gallery-content\s*\{/);
 assert.match(compact,/overflow-x:hidden!important;overflow-y:auto!important/);
 assert.match(compact,/@media\(min-width:850px\)/);
 assert.match(compact,/@media\(max-width:849px\)/);
});
test('authenticated server remains the sole authority for research and claims',()=>{
 assert.match(controller,/\/api\/hub\/dog\/research/);
 assert.match(controller,/getIdToken\(\)/);
 assert.match(controller,/data\.available/);
 assert.match(controller,/skill\.nextCost/);
 assert.match(controller,/call\('\/upgrade',\{id:skill\.id\}\)/);
 assert.match(controller,/call\('\/claim',\{type:id,/);
 assert.match(controller,/user\(\)\?\.uid!==uid/);
 assert.doesNotMatch(controller,/localStorage|sessionStorage|runTransaction/);
});
test('cards keep all active selection, sorting, artwork and reward pickup controls',()=>{
 assert.match(controller,/sortSelect\.addEventListener\('change'/);
 assert.match(controller,/selectedId=skill\.id/);
 assert.match(controller,/category=cat\.id/);
 assert.match(controller,/cards\.classList\.toggle\('is-list'/);
 assert.match(controller,/renderDetail\(data\.skills\.find/);
 assert.match(controller,/ticketTier=select\.value/);
 assert.match(controller,/\.webp/);
 assert.ok(existsSync(new URL('../DOG/assets/research/lantern-illustration.svg',import.meta.url)));
});

test('all twelve uploaded background visuals are wired to the correct research cards and detail pane',()=>{
 const art=read('christmas-research-artpack.css');
 const ids=["card_swap","thaw","xp","win_xp","discount","coin_bonus","pity","free_ticket","spot_ticket","spot_light","lights_bonus","builder"];
 assert.equal(ids.length,12);
 for(const id of ids){
  assert.match(art,new RegExp('data-research-art="'+id+'"'));
  assert.match(art,new RegExp('bg-'+id+'\\.webp'));
  assert.ok(existsSync(new URL('../DOG/assets/research/bg-'+id+'.webp',import.meta.url)),id);
 }
 assert.match(controller,/btn\.dataset\.researchArt=skill\.id/);
 assert.match(controller,/details\.dataset\.researchArt=skill\.id/);
 assert.match(art,/ui-panel-ornaments\.webp/);
 assert.match(art,/ui-buttons-variations\.webp/);
});

test('Lichtertal polish renders legible picture-first cards and a prominent right-side scene',()=>{
 const polish=read('christmas-research-polish.css');
 assert.match(html,/christmas-research-polish\.css\?v=/);
 assert.match(polish,/dog-research-card\[data-research-art\]/);
 assert.match(polish,/brightness\(1\.15\)/);
 assert.match(polish,/mask-image:none!important/);
 assert.match(polish,/dr-detail-artwork\[data-research-art\]/);
 assert.match(polish,/position:relative!important/);
 assert.match(polish,/dr-detail-effects/);
 assert.match(polish,/dr-detail-panel\.has-claim/);
 assert.match(controller,/const effects=el\('div','dr-detail-effects'\)/);
 assert.match(controller,/details\.classList\.toggle\('has-claim',Boolean\(claimUI\)\)/);
 assert.match(html,/<details class="dog-research-note">/);
 assert.match(html,/dr-status-footer/);
 assert.match(html,/christmas-content-zoom\.css/);
});
