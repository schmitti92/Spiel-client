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
 assert.equal((html.match(/class="event-tab(?: event-tab-grinch)?"/g)||[]).length,9);
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

test('research picture and text stay in separate rows, even with long German labels or zoom',()=>{
 const css=read('christmas-research-readability.css');
 assert.match(html,/christmas-research-readability\.css\?v=/);
 assert.match(css,/grid-template-rows:160px minmax\(126px,auto\)/);
 assert.match(css,/height:auto!important;min-height:286px/);
 assert.match(css,/background-image:var\(--dr-property-scene\)/);
 assert.match(css,/brightness\(1\.28\)/);
 assert.match(css,/white-space:normal!important;overflow:visible!important/);
 assert.match(css,/overflow-wrap:anywhere!important/);
 assert.match(css,/\.dr-card-level\{/);
 assert.match(css,/\.dr-detail-heading h3\{/);
 assert.match(css,/\.dr-detail-panel\[data-research-art\]/);
 assert.match(css,/@media\(max-width:560px\)/);
 for(const skill of ['card_swap','thaw','xp','win_xp','discount','coin_bonus','pity','free_ticket','spot_ticket','spot_light','lights_bonus','builder']){
  assert.ok(existsSync(new URL('../DOG/assets/research/bg-'+skill+'.webp',import.meta.url)),skill);
 }
});

test('Lichtertal event tabs have space for full titles, without clipping or shifted text',()=>{
 const sidebar=read('christmas-sidebar-textfit.css');
 assert.match(html,/christmas-sidebar-textfit\.css\?v=/);
 assert.equal((html.match(/class="event-tab(?: event-tab-grinch)?"/g)||[]).length,9);
 assert.match(sidebar,/grid-template-rows:repeat\(8,minmax\(0,1fr\)\)/);
 assert.match(sidebar,/grid-template-columns:clamp\(29px,3\.1vw,40px\) minmax\(0,1fr\) 10px/);
 assert.match(sidebar,/white-space:normal!important/);
 assert.match(sidebar,/overflow-wrap:anywhere!important/);
 assert.match(sidebar,/transform:none!important/);
 assert.match(sidebar,/text-overflow:clip!important/);
 assert.match(sidebar,/data-tab="research"/);
 assert.match(sidebar,/@media \(max-width:760px\)/);
});

test('sidebar text fitting adapts automatically to landscape window and fonts',()=>{
 const fit=read('christmas-sidebar-fit.js');
 assert.match(app,/import \{initLichtertalSidebarTextFit\} from/);
 assert.match(app,/initLichtertalSidebarTextFit\(\)/);
 assert.match(fit,/querySelectorAll\('\.event-tab'\)/);
 assert.match(fit,/getBoundingClientRect\(\)\.height/);
 assert.match(fit,/ResizeObserver/);
 assert.match(fit,/document\.fonts\?\.ready/);
 assert.match(fit,/removeProperty\('font-size'\)/);
 assert.match(fit,/requestAnimationFrame\(fit\)/);
 assert.doesNotMatch(fit,/innerHTML|replaceChildren|remove\(\)/);
});

test('the four uploaded Christmas reference sheets decorate research without faking account values',()=>{
 const skin=read('christmas-research-reference-v2.css');
 assert.match(html,/christmas-research-reference-v2\.css\?v=1/);
 for(const file of ['research-ui-buttons.webp','research-ui-goldornamente.webp',
     'research-ui-kartenrahmen.webp','research-ui-navigationsicons.webp']){
  assert.ok(existsSync(new URL('../DOG/assets/research/'+file,import.meta.url)),file);
  assert.ok(skin.includes(file),file);
 }
 assert.match(skin,/\.dog-research-card\[data-research-art\]/);
 assert.match(skin,/background-image:var\(--dr-property-scene\)/);
 assert.match(skin,/\.dr-detail-artwork\[data-research-art\]/);
 assert.match(skin,/\.dr-upgrade-button/);
 assert.match(skin,/\.event-tab\[data-tab="research"\]/);
 assert.equal((html.match(/class="event-tab(?: event-tab-grinch)?"/g)||[]).length,9);
 assert.match(read('christmas-sidebar-fit.js'),/Math.max\(9\.5,a-\.4\)/);
 assert.match(controller,/getIdToken\(\)/);
 assert.match(controller,/call\('\/upgrade',\{id:skill\.id\}\)/);
});

test('every research shows a real current and next advantage in card and detail',()=>{
 const clarity=read('christmas-research-bonus-clarity.css');
 assert.match(html,/christmas-research-bonus-clarity\.css\?v=1/);
 assert.match(controller,/function bonusTile\(label,value,cls\)/);
 assert.match(controller,/function nextGain\(skill,level\)/);
 assert.match(controller,/bonusTile\('JETZT · Stufe '/);
 assert.match(controller,/bonusTile\(isMax\?'STATUS':'NÄCHSTE · Stufe '/);
 assert.match(controller,/shortValue\(skill,level\+1\)/);
 assert.match(controller,/dr-detail-gain-value/);
 assert.match(controller,/dr-current-effect/);
 assert.match(controller,/dr-next-effect/);
 assert.match(controller,/skill\.nextCost/);
 assert.match(clarity,/dr-card-bonus-compare/);
 assert.match(clarity,/dr-detail-effects \.dr-next-effect/);
 assert.match(clarity,/dr-detail-gain-value/);
 assert.equal((html.match(/class="event-tab(?: event-tab-grinch)?"/g)||[]).length,9);
 assert.match(controller,/getIdToken\(\)/);
 assert.match(controller,/call\('\/upgrade',\{id:skill\.id\}\)/);
});

test('sidebar icons use complete svg files and all eight labels stay in their own centered slots',()=>{
 const css=read('christmas-sidebar-repaired.css');
 assert.match(html,/christmas-sidebar-repaired\.css\?v=1/);
 assert.equal((html.match(/class="event-tab-copy"/g)||[]).length,9);
 assert.match(css,/grid-template-rows:repeat\(8,minmax\(0,1fr\)\)/);
 assert.match(css,/\.event-tab>\.event-tab-copy/);
 assert.match(css,/justify-content:center!important/);
 for(const key of ['village','buildings','tree','story','grinch','scratch','level','research'])
  assert.match(css,new RegExp('data-tab="'+key+'"'));
 assert.match(css,/08-weihnachtsforschung\.svg/);
 assert.doesNotMatch(read('christmas-research-reference-v2.css'),/420% 310%/);
 assert.match(read('christmas-sidebar-fit.js'),/copy\.scrollHeight<=copy\.clientHeight/);
});

test('uploaded background appears only in research and preserves readable real bonuses',()=>{
 const css=read('christmas-research-background.css');
 const p=new URL('../DOG/assets/research/research-background-lichtertal.webp',import.meta.url);
 assert.ok(existsSync(p));
 assert.match(html,/christmas-research-background\.css\?v=1/);
 assert.match(css,/body\.research-mode #panel-research/);
 assert.match(css,/research-background-lichtertal\.webp/);
 assert.match(css,/linear-gradient/);
 assert.match(css,/\.dog-research-shell/);
 assert.match(css,/\.dr-gallery/);
 assert.match(css,/\.dr-detail-panel/);
 assert.doesNotMatch(css,/\.event-sidebar/);
 assert.match(controller,/data\.available/);
 assert.match(controller,/getIdToken\(\)/);
 assert.match(controller,/call\('\/upgrade',\{id:skill\.id\}\)/);
});

test('ninth Spielerstatistik tab is wired to live authenticated room results',()=>{
 const skin=read('christmas-sidebar-nine-statistics.css');
 const js=read('christmas-player-statistics-ui.js');
 assert.equal((html.match(/class="event-tab(?: event-tab-grinch)?"/g)||[]).length,9);
 assert.equal((html.match(/class="event-tab-copy"/g)||[]).length,9);
 assert.match(html,/id="tab-statistics"/);
 assert.match(html,/id="panel-statistics"/);
 assert.match(html,/christmas-sidebar-nine-statistics\.css\?v=1/);
 for(const id of ['christmas-stat-room-code','christmas-stat-kpis','christmas-stat-dog-table',
 'christmas-stat-scratch-table','christmas-stat-reward-table','christmas-stat-sort'])
  assert.match(html,new RegExp('id="'+id+'"'));
 assert.match(skin,/grid-template-rows:repeat\(9,minmax\(0,1fr\)\)/);
 assert.match(skin,/\.event-tab\[data-tab="statistics"\]/);
 assert.match(skin,/dr-gallery-content \.dog-research-grid/);
 assert.match(skin,/\.dog-research-card\[data-research-art\]::before\{display:none!important\}/);
 assert.match(app,/initChristmasPlayerStatistics\(\)/);
 assert.match(app,/statisticsScreen\?\.load\(\)/);
 assert.match(js,/\/api\/hub\/rooms\//);
 assert.match(js,/\/dog\/player-statistics/);
 assert.match(js,/getIdToken\(\)/);
 assert.doesNotMatch(js,/localStorage|sessionStorage/);
});

test('statistics identifies unpublished endpoint without declaring room deleted',()=>{
 const js=read('christmas-player-statistics-ui.js');
 assert.match(js,/HTTP_404/);
 assert.match(js,/ROOM_NOT_FOUND/);
 assert.match(js,/getIdToken\(\)/);
 assert.doesNotMatch(js,/localStorage/);
});
