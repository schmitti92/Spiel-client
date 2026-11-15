import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {SCRATCH_TICKET_TYPES,SCRATCH_SHOP_VARIANTS,SCRATCH_COIN_PRIZES,premiumScratchProgress,premiumWinningRowIndices} from '../DOG/christmas-scratch-ui.js';
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

test('all scratch tiers expose three configurable cash symbols and a gift unlock legend',()=>{
 assert.deepEqual(SCRATCH_COIN_PRIZES,{
  simple:[10,40,100],medium:[100,300,800],premium:[200,800,2000]
 });
 const html=source('../DOG/christmas-event.html');
 const js=source('../DOG/christmas-scratch-ui.js');
 assert.match(html,/id="scratch-symbol-legend"/);
 assert.match(js,/symbolLegend\(option.tier,amounts\)/);
 assert.match(js,/for\(const option of SCRATCH_SHOP_VARIANTS\)/,'four separately selectable scratch variants');
 assert.match(js,/Freischaltung:/);
 assert.match(js,/🎁 💝 🎀 🧧/);
 assert.match(js,/p\.symbol/);
 assert.match(js,/coinAmountsFor\(tier,result\?\.board\?\.variantId\|\|null,result\)/);
 assert.match(js,/symbolOddsSection\('moneySymbolWeights'/);
 assert.match(js,/symbolOddsSection\('giftSymbolWeights'/);
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

test('scratch progress dashboard is personal, responsive and uses the existing wallet response',()=>{
 const html=source('../DOG/christmas-event.html');
 const css=source('../DOG/christmas-scratch.css');
 const js=source('../DOG/christmas-scratch-ui.js');
 for(const id of ['scratch-analytics','scratch-analytics-kpis','scratch-analytics-body',
  'scratch-analytics-footer','scratch-analytics-note']){
  assert.match(html,new RegExp('id="'+id+'"'));
 }
 assert.match(html,/Meine Rubbellos-Statistik/);
 assert.match(js,/function drawScratchAnalytics\(\)/);
 assert.match(js,/drawScratchAnalytics\(\)/);
 assert.match(js,/status\?\.progress/);
 assert.match(js,/olderUnclassified/);
 assert.match(js,/byVariant\?\.\[id\]/);
 assert.match(js,/Weitere ältere Losarten/);
 assert.match(js,/Frühere Lose ohne Einzelstatistik/);
 assert.match(css,/\.scratch-analytics-table/);
 assert.match(css,/@media\(max-width:760px\)/);
 assert.doesNotMatch(js,/query\('\/stats'/,'progress must not cause additional API calls');
});

test('premium counts only uncovered non-ice symbols and lights 20/24 only for earned milestones',()=>{
 const cells=[...Array(20).fill('🎄'),...Array(7).fill('🧊')];
 const board={variantId:'premium_27',symbolVersion:3,cells,
  wins:[{rule:'gold-20',indices:Array.from({length:20},(_,i)=>i),prize:{type:'coins'}}]};
 const untouched=premiumScratchProgress(board);
 assert.deepEqual({count:untouched.count,total:untouched.total,goldAwarded:untouched.goldAwarded,
  premiumAwarded:untouched.premiumAwarded},{count:0,total:20,goldAwarded:true,premiumAwarded:false});
 const partial=premiumScratchProgress(board,Array.from({length:19},(_,i)=>i));
 assert.equal(partial.count,19);
 const done=premiumScratchProgress(board,cells.map((_,i)=>i));
 assert.equal(done.count,20);
 assert.equal(done.premiumAwarded,false);
 assert.deepEqual(premiumWinningRowIndices(board.wins),[],
  '20-symbol milestone must not light the twenty counted cells');
 const premiumBoard={...board,
  cells:[...Array(24).fill('🎄'),...Array(3).fill('🧊')],
  wins:[...board.wins,{rule:'premium-24',indices:[12,13,14],prize:{type:'unlock'}}]};
 const full=premiumScratchProgress(premiumBoard,premiumBoard.cells.map((_,i)=>i));
 assert.equal(full.count,24);
 assert.equal(full.premiumAwarded,true);
 assert.equal(full.giftRowRequired,true);
 assert.equal(premiumScratchProgress({variantId:'gifts',cells},[]),null);
});

test('premium gold highlights only genuine complete rows, never every milestone cell',()=>{
 const wins=[
  {rule:'gold-20',indices:Array.from({length:20},(_,i)=>i)},
  {rule:'premium-24',indices:[12,13,14]},
  {rule:'row-3',indices:[21,22,23]},
  {rule:'row-3',indices:[3,5,6]}, // not a contiguous row
  {rule:'row-3',indices:[25,26,27]}, // invalid index
 ];
 assert.deepEqual(premiumWinningRowIndices(wins),[12,13,14,21,22,23]);
 const ui=source('../DOG/christmas-scratch-ui.js');
 assert.match(ui,/premiumWinningRowIndices\(wins\)/);
 assert.match(ui,/updatePremiumCounter\(revealedPremiumCells\(canvas\)\)/);
 assert.match(ui,/panel\.append\(results,\$\('scratch-winning-lines'\)\)/);
 assert.match(ui,/stage\.classList\.add\('is-revealed'\)/);
 assert.match(ui,/artwork\.dataset\.premiumGold20=String\(progress\.count>=20&&progress\.goldAwarded\)/);
 assert.match(ui,/artwork\.dataset\.premiumGold24=String\(progress\.count>=24&&progress\.premiumAwarded\)/);
 assert.match(ui,/finished\?[\s\S]*?progress\.total\+' echte Symbole insgesamt/);
 assert.doesNotMatch(ui,/stage\.scrollIntoView\(/);
});

test('all premium artwork, payouts and counters fit in a viewport without internal page scrolling',()=>{
 const css=source('../DOG/christmas-scratch.css');
 assert.match(css,/height:min\(850px,calc\(100dvh - 16px\)\)/);
 assert.match(css,/overflow:hidden!important;align-items:stretch/);
 assert.match(css,/grid-template-rows:auto auto auto auto auto minmax\(0,1fr\) auto/);
 assert.match(css,/\.scratch-premium-milestone\.is-earned\{/);
 assert.match(css,/\.scratch-stage\[data-variant="premium_27"\] \.scratch-field:not\(\.scratch-winning-cell\)/);
 assert.match(css,/\.scratch-stage:not\(\[hidden\]\) \.scratch-card-art/);
 assert.match(css,/@media\(max-width:700px\)/);
 const page=source('../DOG/christmas-event.html');
 assert.match(page,/christmas-scratch\.css\?v=\d+/);
});

test('all four distinct scratch tickets are visible together in compact non-scrolling selection',()=>{
 assert.deepEqual(SCRATCH_SHOP_VARIANTS.map(x=>x.id),['gifts','snow_collect','elf','premium_27']);
 assert.deepEqual(SCRATCH_SHOP_VARIANTS.map(x=>x.tier),['simple','simple','medium','premium']);
 assert.equal(new Set(SCRATCH_SHOP_VARIANTS.map(x=>x.id)).size,4);
 const js=source('../DOG/christmas-scratch-ui.js');
 const css=source('../DOG/christmas-scratch.css');
 const html=source('../DOG/christmas-event.html');
 assert.match(js,/for\(const option of SCRATCH_SHOP_VARIANTS\)/);
 assert.match(js,/article\.dataset\.variant=option\.id/);
 assert.match(js,/buy\(option\.tier,false,option\.id\)/);
 assert.match(js,/buy\(option\.tier,true,option\.id\)/);
 assert.match(js,/pending\.variantId===variantId/);
 assert.match(js,/\{tier,variantId,free,voucher,commandId:/);
 assert.match(js,/status\?\.vouchers\?\.\[option\.tier\]/);
 assert.match(js,/Gesammeltes Los einlösen/);
 assert.match(css,/#panel-scratch \.scratch-tickets\{\s*display:grid;grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
 assert.match(css,/@media\(min-width:1250px\)/);
 assert.match(css,/grid-template-columns:repeat\(4,minmax\(0,1fr\)\)/);
 assert.match(html,/id="scratch-tier-grid"/);
 assert.match(html,/id="scratch-analytics"/,'statistics remain available');
});


test('opened scratch tickets fit in a single viewport on tablet, phone and landscape',()=>{
 const css=source('../DOG/christmas-scratch.css');
 const js=source('../DOG/christmas-scratch-ui.js');
 const override=css.split('ONE-VIEW SCRATCH CARD OVERRIDE v1')[1];
 assert.ok(override,'one-screen layout must be the final CSS override');
 assert.match(override,/height:min\(690px,calc\(100dvh - 16px\)\)!important/);
 assert.match(override,/overflow:hidden!important/);
 assert.match(override,/body\.scratch-ticket-open/);
 assert.match(override,/\.scratch-card-art\{/);
 assert.match(override,/aspect-ratio:3\/4/);
 assert.match(override,/@media\(max-width:700px\) and \(min-height:501px\)/);
 assert.match(override,/@media\(max-height:500px\)/);
 assert.match(override,/grid-row:6/);
 assert.match(override,/grid-row:7/);
 assert.match(override,/grid-row:8/);
 assert.match(override,/scratch-stage\.is-revealed/);
 assert.match(js,/document\.body\.classList\.add\('scratch-ticket-open'\)/);
 assert.match(js,/document\.body\.classList\.remove\('scratch-ticket-open'\)/);
});

test('premium v4 shows every actual reward and its permanent 1000-coin threshold',()=>{
 const js=source('../DOG/christmas-scratch-ui.js');
 const css=source('../DOG/christmas-scratch.css');
 assert.match(js,/symbolVersion===4/);
 assert.match(js,/20 Symbole = 1\.000/);
 assert.match(js,/function drawPrizeTable\(result,entries=\[\]\)/);
 assert.match(js,/if\(!finished\)\{/);
 assert.match(js,/Array\.isArray\(result\?\.winnings\)\?result\.winnings:entries/);
 assert.match(js,/section=el\('section','scratch-current-awards'\)/);
 assert.match(js,/scratch-current-value/);
 assert.match(js,/scratch-current-hero/);
 assert.match(js,/prize\.milestone\|\|win\?\.rule/);
 assert.match(js,/\[3,4\]\.includes\(board\.symbolVersion\)/);
 assert.match(css,/\.scratch-current-grid/);
 assert.match(css,/\.scratch-current-item\.is-unlock/);
 assert.match(css,/\.scratch-stage\.is-revealed:not\(\[hidden\]\) > \.scratch-prize-sidebar > :not\(\.scratch-current-awards\)/);
});

test('DOG Weihnachten top header is hidden only while a scratch ticket is open',()=>{
 const html=source('../DOG/christmas-event.html');
 const css=source('../DOG/christmas-scratch.css');
 const js=source('../DOG/christmas-scratch-ui.js');
 assert.match(html,/<header class="event-top">/);
 assert.match(css,/body\.scratch-ticket-open > header\.event-top\s*\{\s*display:none!important;/);
 assert.match(js,/document\.body\.classList\.add\('scratch-ticket-open'\)/);
 // Upon finishing, signing out and switching profiles, normal page header returns.
 assert.ok(js.match(/document\.body\.classList\.remove\('scratch-ticket-open'\)/g)?.length>=3);
});


test('premium scratch shows symbols AND saved coin amounts in each money square',()=>{
 const js=source('../DOG/christmas-scratch-ui.js');
 const css=source('../DOG/christmas-scratch.css');
 assert.match(js,/function makeField\(symbol\)/);
 assert.match(js,/stage\.dataset\.variant==='premium_27'&&\['🪙','💵','💼'\]\.includes\(symbol\)/);
 assert.match(js,/coinAmountsFor\(ticket\?\.tier\|\|'premium','premium_27',ticket\)/);
 assert.match(js,/scratch-cell-amount/);
 assert.match(js,/cell\.setAttribute\('aria-label',symbol\+' '\+num\(amount\)\+' Münzen'\)/);
 assert.match(css,/\.scratch-money-field \.scratch-cell-amount/);
 assert.match(css,/\.scratch-money-field\.scratch-winning-cell/);
});
