import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {SCRATCH_TICKET_TYPES,SCRATCH_SHOP_VARIANTS,SCRATCH_COIN_PRIZES,SCRATCH_TAB_READ_REUSE_MS,reuseRecentScratchView,premiumScratchProgress,premiumWinningRowIndices} from '../DOG/christmas-scratch-ui.js';
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
 const submit=js.split("$('scratch-host-form').addEventListener('submit',async e=>{")[1]?.split("window.addEventListener('spielonline-change'")[0];
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
 assert.match(ui,/panel\.append\(results,winningLines\)/,
  'the win list reference must survive sidebar redraw without appending a literal null');
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

test('all seven scratch tickets are visible together in compact selection',()=>{
 assert.deepEqual(SCRATCH_SHOP_VARIANTS.map(x=>x.id),['gifts','snow_collect','elf','premium_27','tic_tac_toe','number_one_20','dog_jackpot_9']);
 assert.deepEqual(SCRATCH_SHOP_VARIANTS.map(x=>x.tier),['simple','simple','medium','premium','medium','medium','premium']);
 assert.equal(new Set(SCRATCH_SHOP_VARIANTS.map(x=>x.id)).size,7);
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
 assert.match(js,/\[3,4,5\]\.includes\(board\.symbolVersion\)/);
 assert.match(css,/\.scratch-current-grid/);
 assert.match(css,/\.scratch-current-item\.is-unlock/);
 assert.match(css,/\.scratch-stage\.is-revealed:not\(\[hidden\]\) > \.scratch-prize-sidebar > :not\(\.scratch-current-awards\)/);
});

test('scratch win and zero-coin losing ticket both require result confirmation',()=>{
 const js=source('../DOG/christmas-scratch-ui.js');
 const html=source('../DOG/christmas-event.html');
 const css=source('../DOG/christmas-scratch.css');
 assert.match(html,/id="scratch-ticket-finish"[^>]*hidden>✓ Ergebnis bestätigen<\/button>/);
 assert.match(js,/stage\.dataset\.result=winFlag\?'win':'none'/);
 assert.match(js,/Niete · 0 Münzen/);
 assert.match(js,/if\(!ticket\|\|!finished\)return/);
 assert.match(js,/acknowledge\(ticket\.commandId\)/);
 assert.match(js,/const won=stage\.dataset\.result==='win'/);
 assert.match(js,/Gewinn bestätigt/);
 assert.match(js,/Ergebnis bestätigt: Niete · 0 Münzen/);
 assert.match(css,/Scratch result \/ confirmation v2/);
 assert.match(css,/position:absolute!important;z-index:30/);
 assert.match(css,/button:not\(\[hidden\]\)/);
});

test('scratch reveal never leaves an uncovered card stuck or writes literal null',()=>{
 const js=source('../DOG/christmas-scratch-ui.js');
 const css=source('../DOG/christmas-scratch.css');
 assert.match(js,/winningLines=\$\('scratch-winning-lines'\)/);
 assert.match(js,/panel\.append\(results,winningLines\)/);
 assert.doesNotMatch(js,/panel\.append\(results,\$\('scratch-winning-lines'\)\)/);
 assert.match(js,/rememberReveal\(current\.commandId\)/);
 assert.match(js,/result\.commandId===revealedReceipt\(\)\)finish\(\)/);
 assert.match(js,/finish\(\);/);
 assert.match(js,/confirm\.hidden=false/);
 assert.match(js,/\$\('scratch-reveal-button'\)\.hidden=false/);
 assert.match(js,/\$\('scratch-reveal-button'\)\.textContent='✨ Ergebnis jetzt aufdecken'/);
 assert.match(js,/drawPrizeTable\(current,entries\)/);
 assert.match(js,/catch\(err\)\{[\s\S]*?Ergebnisanzeige/);
 assert.match(css,/\.scratch-stage:not\(\[hidden\]\) > \.scratch-stage-actions button:not\(\[hidden\]\)/);
});

test('all four scratch rules and live odds are described without misleading winnings',()=>{
 const js=source('../DOG/christmas-scratch-ui.js');
 const css=source('../DOG/christmas-scratch.css');
 assert.match(js,/3 gleiche Gewinnzeichen in einer Linie/);
 assert.match(js,/3 gleiche Gewinnzeichen irgendwo/);
 assert.match(js,/Geld: Pfad · Geschenke: 3 verbunden/);
 assert.match(js,/rule==='three-anywhere'\?'3 gleiche beliebig'/);
 assert.match(js,/rule==='gift-three-connected'\?'3 verbundene Geschenke'/);
 assert.match(js,/rule==='path'\?'Pfad links → rechts'/);
 assert.match(js,/prize\.bonus\?'🎉 Bonus zu Gewinn '/);
 assert.match(js,/unlocksLeft===0\?'🎁 Alle Freischaltungen gesammelt'/);
 assert.match(js,/chanceWeights\.unlock\+Math\.min\(chanceWeights\.coins/);
 assert.match(js,/premiumMilestoneChance\.toLocaleString\('de-DE'\)/);
 assert.match(js,/Premium: 🪙 💵 💼 erscheinen jeweils mindestens einmal garantiert/);
 assert.match(css,/overflow-x:hidden;overflow-y:auto;overscroll-behavior:contain/);
});
test('DOG Weihnachten top header is hidden only while a scratch ticket is open',()=>{
 const html=source('../DOG/christmas-event.html');
 const css=source('../DOG/christmas-scratch.css');
 const js=source('../DOG/christmas-scratch-ui.js');
 assert.doesNotMatch(html,/<header class="event-top">/);
 assert.match(html,/id="event-return"[^>]*class="top-action event-fixed-return"/);
 assert.match(css,/body\.scratch-ticket-open > #event-return\s*\{\s*display:none!important;/);
 assert.match(js,/document\.body\.classList\.add\('scratch-ticket-open'\)/);
 // Upon finishing, signing out and switching profiles, normal page header returns.
 assert.ok(js.match(/document\.body\.classList\.remove\('scratch-ticket-open'\)/g)?.length>=3);
});


test('premium scratch shows symbols AND saved coin amounts in each money square',()=>{
 const js=source('../DOG/christmas-scratch-ui.js');
 const css=source('../DOG/christmas-scratch.css');
 assert.match(js,/function makeField\(symbol,index=0\)/);
 assert.match(js,/stage\.dataset\.variant==='premium_27'&&\['🪙','💵','💼'\]\.includes\(symbol\)/);
 assert.match(js,/coinAmountsFor\(ticket\?\.tier\|\|'premium','premium_27',ticket\)/);
 assert.match(js,/scratch-cell-amount/);
 assert.match(js,/cell\.setAttribute\('aria-label',symbol\+' '\+num\(amount\)\+' Münzen'\)/);
 assert.match(css,/\.scratch-money-field \.scratch-cell-amount/);
 assert.match(css,/\.scratch-money-field\.scratch-winning-cell/);
});

test('premium v5 guarantees four paid money rows in the UI and compact result list',()=>{
 const js=source('../DOG/christmas-scratch-ui.js');
 const css=source('../DOG/christmas-scratch.css');
 assert.match(js,/symbolVersion===5/);
 assert.match(js,/Vier echte Geld-Dreierreihen/);
 assert.match(js,/Mindestens sechs Gewinnplätze/);
 assert.match(js,/\[3,4,5\]\.includes\(board\.symbolVersion\)/);
 assert.match(js,/Math\.max\(6,settings\.maxPrizes\)|id==='premium_27'\?6:1/);
 assert.match(css,/Compact premium v5 results/);
 assert.match(css,/\.scratch-stage\[data-variant="premium_27"\]\.is-revealed:not\(\[hidden\]\) \.scratch-current-grid/);
 assert.match(css,/grid-template-columns:repeat\(2,minmax\(0,1fr\)\)!important/);
});

test('separate right-hand result window is removed while winning amounts stay inside the ticket',()=>{
 const html=source('../DOG/christmas-event.html');
 const js=source('../DOG/christmas-scratch-ui.js');
 const css=source('../DOG/christmas-scratch.css');
 assert.match(html,/id="scratch-inline-results"/);
 assert.match(html,/id="scratch-ticket-finish"/,'confirm button must stay usable');
 assert.match(js,/function renderInlineResults\(result\)/);
 assert.match(js,/renderInlineResults\(null\)/);
 assert.match(js,/renderInlineResults\(current\)/);
 assert.match(js,/prize\.milestone==='gold-20'/);
 assert.match(js,/scratch-inline-chip/);
 assert.match(css,/NO SEPARATE SCRATCH PRIZE WINDOW v1/);
 assert.match(css,/\.scratch-stage:not\(\[hidden\]\) > \.scratch-prize-sidebar\{\s*display:none!important;/);
 assert.match(css,/\.scratch-stage:not\(\[hidden\]\) > \.scratch-inline-results/);
 assert.match(css,/grid-template-columns:repeat\(4,minmax\(0,1fr\)\)/);
 assert.match(css,/\.scratch-stage:not\(\[hidden\]\) > \.scratch-stage-actions\{\s*grid-row:8!important/);
});

test('every one of four scratch cards shows its own Level-1 voucher balance',()=>{
 const js=source('../DOG/christmas-scratch-ui.js');
 const levels=source('../DOG/christmas-player-levels-ui.js');
 assert.match(js,/status\?\.variantVouchers\?\.\[option\.id\]/);
 assert.match(js,/api\/hub\/dog\/level\/rewards\/claim/);
 assert.match(js,/status\.levelOneStarterClaimed/);
 assert.match(levels,/Vier Startgutscheine abholen/);
 assert.match(levels,/levelRewardClaims/);
});


test('20 by 2 number scratch hides BOTH prize symbols and numbers in 40 separate panels',()=>{
 const js=source('../DOG/christmas-scratch-ui.js');
 const art=source('../DOG/christmas-scratch-glueckszahl.css');
 const html=source('../DOG/christmas-event.html');
 assert.match(js,/number_one_20:\['🔢 Die Glückszahl 1'/);
 assert.match(js,/scratch-number-target/);
 assert.match(js,/scratch-number-prize/);
 assert.match(js,/const coated=cells;/);
 assert.match(js,/for\(const cell of coated\)/);
 assert.match(js,/Verdecktes Gewinnsymbol in Reihe/);
 assert.match(js,/Verdeckte Zahl in Reihe/);
 assert.match(art,/glueckszahl-1-design\.png/);
 // The old 20x2 grid covered only 50.8% of the artwork, leaving the last
 // two printed rows without scratch overlays. Full-image positioning is required.
 assert.match(art,/width:100%!important;height:100%!important/);
 assert.match(art,/grid-template-columns:none!important/);
 assert.doesNotMatch(art,/width:50\.8%!important/);
 assert.doesNotMatch(art,/left:24\.7%!important/);
 assert.match(art,/\.scratch-stage\[data-variant="number_one_20"\]/);
 assert.match(html,/christmas-scratch-glueckszahl\.css\?v=\d+/);
});
test('nine field DOG trigger uses authoritative server wins and highlights DOG',()=>{
 const js=source('../DOG/christmas-scratch-ui.js');
 const css=source('../DOG/christmas-scratch-specials.css');
 const html=source('../DOG/christmas-event.html');
 assert.match(js,/dog_jackpot_9:\['🐾 Finde DOG!'/);
 assert.match(js,/scratch-dog-trigger/);
 assert.match(js,/visibleCells\[dogIndex\]\?\.classList\.add\('scratch-winning-cell','scratch-dog-winner'\)/);
 assert.match(css,/grid-template-rows:repeat\(3,minmax\(0,1fr\)\)/);
 assert.match(html,/christmas-scratch-specials\.css\?v=\d+/);
});

test('failed Render scratch purchases remain visible near the tapped card',()=>{
 const js=source('../DOG/christmas-scratch-ui.js');
 const css=source('../DOG/christmas-scratch-glueckszahl.css');
 assert.match(js,/scratch-action-toast/);
 assert.match(js,/scratch-card-open-error/);
 assert.match(js,/scratchBuyError/);
 assert.match(js,/SCRATCH_INVALID_VARIANT/);
 assert.match(js,/showAlert\(scratchBuyError\(e\?\.message\),variantId\)/);
 assert.match(js,/ticket=r\.result;/);
 assert.match(js,/if\(stage\.dataset\.duelVersion==='8'\)attachDuelCovers\(\)/);
 assert.match(js,/else attachUnifiedCover\(\)/);
 assert.match(js,/scratch-reopen-ticket/);
 assert.match(css,/\.scratch-action-toast:not\(\[hidden\]\)/);
 assert.match(css,/#panel-scratch \.scratch-card-open-error/);
});

test('Glückszahl 1 lottery renders editable values instead of fixed image labels',()=>{
 const js=source('../DOG/christmas-scratch-ui.js');
 const css=source('../DOG/christmas-scratch-lotto.css');
 const html=source('../DOG/christmas-event.html');
 assert.match(js,/function renderNumberLottery\(receipt\)/);
 assert.match(js,/receipt\.board\.hitPer1000/);
 assert.match(js,/receipt\.board\.symbolWeights/);
 assert.match(js,/receipt\.board\.coinAmounts/);
 assert.match(js,/scratch-host-lucky/);
 assert.match(js,/dataset\.luckyKey/);
 assert.match(js,/numberOne20=\{price,hitPer1000,giftFallbackCoins,coinAmounts,symbolWeights\}/);
 assert.match(js,/const ticketCost=option\.id==='number_one_20'/);
 assert.match(js,/scratch-lotto-back/);
 assert.doesNotMatch(js,/scratch-number-payout',amount\?num\(amount\)/);
 assert.match(css,/lotto-fenster-hintergrund\.png/);
 assert.match(css,/grid-template-columns:minmax\(0,27%\) minmax\(0,43%\) minmax\(0,28%\)/);
 assert.match(html,/scratch-lotto-left/);
 assert.match(html,/scratch-lotto-right/);
 assert.match(html,/christmas-scratch-lotto\.css/);
});

test('dynamic lottery footer masks old raster money labels and follows the saved receipt',()=>{
 const js=source('../DOG/christmas-scratch-ui.js');
 const css=source('../DOG/christmas-scratch-lotto.css');
 const html=source('../DOG/christmas-event.html');
 assert.match(js,/scratch-lotto-ticket-prizes/);
 assert.match(js,/prizeStrip\.replaceChildren\(\)/);
 assert.match(js,/num\(amounts\[0\]\)/);
 assert.match(js,/num\(amounts\[2\]\)/);
 assert.match(js,/giftFallbackCoins/);
 assert.match(css,/lotto-ticket-prize-label/);
 assert.match(css,/background:linear-gradient\(180deg,#0b6944,#073d32/);
 assert.match(html,/id="scratch-lotto-ticket-prizes"/);
});


test('Glückszahl lottery rules and probabilities render without TDZ initialization errors',()=>{
 const js=source('../DOG/christmas-scratch-ui.js');
 const render=js.slice(js.indexOf('function renderNumberLottery(receipt){'),
  js.indexOf('function drawShop(){'));
 assert.ok(render.length>1000,'lottery renderer should be present');
 const declared=render.indexOf('const giftReplacement=');
 const used=render.indexOf("num(giftReplacement)");
 assert.ok(declared>=0&&used>=0&&declared<used,
  'giftReplacement must be initialized before drawing the left prize panel');
 assert.match(render,/left\.append\(intro,/);
 assert.match(render,/right\.append\(/);
 assert.match(render,/Math\.pow\(1-hit,20\)/);
 assert.match(js,/renderNumberLottery\(result\)/);
 const html=source('../DOG/christmas-event.html');
 for(const id of ['scratch-lotto-left','scratch-lotto-right','scratch-lotto-header']){
  assert.match(html,new RegExp('id="'+id+'"'));
 }
});


test('Glückszahl native artwork uses 40 pixel-aligned independent hitboxes instead of a CSS grid',()=>{
 const js=source('../DOG/christmas-scratch-ui.js');
 const lottoCss=source('../DOG/christmas-scratch-lotto.css');
 assert.match(js,/const LUCKY_ART_WIDTH=1152,LUCKY_ART_HEIGHT=1536/);
 assert.match(js,/applyLuckyArtGeometry\(cell,index\)/);
 assert.match(js,/const x=right\?644:314, width=right\?301:307/);
 const tops=js.match(/const LUCKY_ROW_TOPS=Object\.freeze\(\[([\s\S]*?)\]\);/);
 const heights=js.match(/const LUCKY_ROW_HEIGHTS=Object\.freeze\(\[([\s\S]*?)\]\);/);
 assert.ok(tops&&heights,'Native PNG positions must be defined for all rows');
 const getNumbers=match=>match[1].match(/\d+/g).map(Number);
 const ys=getNumbers(tops),hs=getNumbers(heights);
 assert.equal(ys.length,20);
 assert.equal(hs.length,20);
 assert.equal(ys[0],371);
 assert.equal(ys[19],1285);
 for(let i=0;i<20;i++){
  assert.ok(ys[i]>=370&&ys[i]+hs[i]<=1325,'row '+i+' must stay inside printed area');
  assert.ok(hs[i]>=35&&hs[i]<=40,'row '+i+' height matches source artwork');
  if(i>0)assert.ok(ys[i-1]+hs[i-1]<ys[i],'no scratch fields may overlap adjacent rows');
 }
 assert.match(lottoCss,/ARTWORK-ALIGNED SCRATCH RECTANGLES/);
 assert.match(lottoCss,/grid-template-columns:none!important/);
 assert.match(lottoCss,/position:absolute!important;\s*left:var\(--lucky-x\)!important/);
 assert.match(lottoCss,/top:var\(--lucky-y\)!important/);
 assert.match(lottoCss,/width:var\(--lucky-width\)!important/);
 assert.match(lottoCss,/height:var\(--lucky-height\)!important/);
 assert.match(js,/const coated=cells;/);
});


test('Lucky Number uses full-art scratch hitboxes even when older CSS is cached',()=>{
 const js=source('../DOG/christmas-scratch-ui.js');
 const specials=source('../DOG/christmas-scratch-specials.css');
 const glueck=source('../DOG/christmas-scratch-glueckszahl.css');
 const lotto=source('../DOG/christmas-scratch-lotto.css');
 const html=source('../DOG/christmas-event.html');
 assert.match(js,/cell\.style\.setProperty\('position','absolute','important'\)/);
 assert.match(js,/cell\.style\.setProperty\(key,value,'important'\)/);
 assert.match(js,/board\.style\.setProperty\(key,value,'important'\)/);
 assert.match(js,/width:'100%',height:'100%'/);
 assert.match(js,/LUCKY_ROW_TOPS=Object\.freeze/);
 for(const css of [specials,glueck,lotto]){
  assert.match(css,/grid-template-columns:none!important/);
  assert.doesNotMatch(css,/left:24\.7%!important/);
  assert.doesNotMatch(css,/width:50\.8%!important/);
 }
 assert.match(html,/christmas-scratch-lotto\.css\?v=\d+/);
});


test('Tic-Tac-Toe Duell has exactly twelve pixel-anchored scratch targets with bottom prize',()=>{
 const js=source('../DOG/christmas-scratch-ui.js');
 const css=source('../DOG/christmas-scratch-duel.css');
 const html=source('../DOG/christmas-event.html');
 assert.match(js,/const DUEL_ART_W=1086,DUEL_ART_H=1448/);
 const zone=js.match(/const DUEL_HITBOXES=Object\.freeze\(\[([\s\S]*?)\]\.map\(coords/);
 assert.ok(zone,'Duell hitboxes must be defined');
 const boxes=[...zone[1].matchAll(/\[(\d+),(\d+),(\d+),(\d+)\]/g)]
  .map(m=>m.slice(1).map(Number));
 assert.equal(boxes.length,12,'Multiplier, sign, bottom prize and nine board tiles');
 for(const [x,y,w,h] of boxes){
  assert.ok(x>=0&&y>=0&&w>0&&h>0&&x+w<=1086&&y+h<=1448);
 }
 assert.deepEqual(boxes[0],[325,290,412,85]);
 assert.deepEqual(boxes[1],[434,482,192,88]);
 assert.deepEqual(boxes[2],[324,1242,438,72]);
 assert.match(css,/\.scratch-duel-prize-zone/);
 assert.match(css,/\.scratch-duel-board-heading/);
 assert.match(css,/\.scratch-duel-rules-panel/);
 assert.match(css,/tic-tac-toe-duell\.webp/);
 assert.match(css,/width:var\(--duel-w\)!important/);
 assert.match(css,/height:var\(--duel-h\)!important/);
 assert.match(html,/christmas-scratch-duel\.css\?v=\d+/);
});
test('Tic-Tac-Toe Duell forces multiplier then sign then bottom prize then nine board cells',()=>{
 const js=source('../DOG/christmas-scratch-ui.js');
 assert.match(js,/function attachDuelCovers\(\)/);
 assert.match(js,/cells\.length!==12/);
 assert.match(js,/phase===0\?i===0:phase===1\?i===1:phase===2\?i===2:i>=3/);
 assert.match(js,/if\(i===0\)phase=1;else if\(i===1\)phase=2;else if\(i===2\)phase=3/);
 assert.match(js,/if\(uncovered===12\)finish\(\)/);
 assert.match(js,/if\(stage\.dataset\.duelVersion==='8'\)attachDuelCovers\(\)/);
 assert.match(js,/applyDuelArtGeometry\(cell,index\)/);
 assert.match(js,/makeDuelTile\(String\(result\.board\.multiplier\)\+'×',0\)/);
 assert.match(js,/makeDuelTile\(result\.board\.winningSymbol,1\)/);
 assert.match(js,/const duelOffset=stage\.dataset\.duelVersion==='8'\?3:0/);
 assert.match(js,/makeDuelTile\(result\.board\.prizeSymbol\|\|'\?',2\)/);
 assert.match(js,/makeDuelTile\(symbol,index\+3\)/);
 assert.match(js,/Eine Dreierlinie aus dem Gewinnzeichen gewinnt EINEN/);
 assert.match(js,/board\.querySelectorAll\('\.scratch-duel-cover'\)/);
});


test('Tic-Tac-Toe offers its own real 500-ticket fixed-budget edition editor',()=>{
 const html=source('../DOG/christmas-event.html');
 const js=source('../DOG/christmas-scratch-ui.js');
 const css=source('../DOG/christmas-scratch-tic-edition.css');
 for(const id of ['scratch-tic-edition-dialog','tic-price','tic-max-multiplier',
  'tic-coin-0','tic-coin-1','tic-coin-2','tic-none',
  'tic-weight-0','tic-weight-1','tic-weight-2','tic-weight-3',
  'tic-edition-budget','tic-edition-create','tic-edition-edit','tic-edition-status'])
  assert.match(html,new RegExp('id="'+id+'"'));
 assert.match(js,/function readTicEdition\(\)/);
 assert.match(js,/function openTicEdition\(\)/);
 assert.match(js,/function submitTicEdition\(edit\)/);
 assert.match(js,/query\(edit\?'\/editions\/tic_tac_toe\/edit':'\/editions\/tic_tac_toe'/);
 assert.match(js,/ticEdition=r\.ticEdition\?\?null/);
 assert.match(js,/option\.id==='tic_tac_toe'\?ticEdition:otherStudio\.get\(option\.id\)/);
 assert.match(js,/ticEdition\?\.remaining===0/);
 assert.match(js,/tic-edition-budget/);
 assert.match(css,/@media\(max-width:620px\)/);
 assert.match(html,/christmas-scratch-tic-edition\.css\?v=\d+/);
});


test('Tic-Tac-Toe edition lets its creator choose prize category 1, 2 or 3',()=>{
 const html=source('../DOG/christmas-event.html');
 const js=source('../DOG/christmas-scratch-ui.js');
 assert.match(html,/id="tic-prize-category" required/);
 assert.match(html,/<option value="1">1 · Einfach/);
 assert.match(html,/<option value="2">2 · Mittel/);
 assert.match(html,/<option value="3">3 · Schwer/);
 assert.match(html,/id="tic-prize-category-preview"/);
 assert.match(js,/prizeCategory:getInt\('tic-prize-category',1,3\)/);
 assert.match(js,/set\('tic-prize-category',conf\.prizeCategory\?\?2\)/);
 assert.match(js,/getPrizeCategoryLabel\(ticEdition\.config\?\.prizeCategory\?\?2\)/);
 assert.match(js,/getPrizeCategoryLabel\(tic\.prizeCategory\)/);
 assert.match(js,/'tic-weight-0','tic-weight-1','tic-weight-2','tic-weight-3'/);
});

test('all seven DOG scratch cards expose an edition editor and category selector',()=>{
 const html=source('../DOG/christmas-event.html');
 const core=source('../DOG/christmas-scratch-ui.js');
 const other=source('../DOG/christmas-other-edition-ui.js');
 const css=source('../DOG/christmas-scratch-other-edition.css');
 assert.match(core,/createOtherScratchStudio\(\{account,query,drawShop,showAlert,stage\}\)/);
 assert.match(core,/if\(OTHER_EDITOR_VARIANTS\.includes\(option\.id\)\)/);
 assert.match(core,/otherStudio\.load\(r\.otherEditions\?\?\{\}\)/);
 assert.match(core,/otherStudio\.receive\(variantId,r\.otherEdition\)/);
 assert.match(core,/otherStudio\.onTicket\(stage\.dataset\.variant\)/);
 assert.match(other,/OTHER_EDITOR_VARIANTS=Object\.freeze\(\['elf','premium_27','number_one_20','dog_jackpot_9'\]\)/);
 assert.match(other,/500ER-AUFLAGENSTUDIO/);
 for(const text of ['oe-category','oe-budget','oe-coin-0','oe-coin-1','oe-coin-2',
  'oe-create','oe-edit','oe-gift','oe-none','oe-dog','oe-gold','oe-double'])
  assert.ok(other.includes(text),'The editor requires control '+text);
 assert.ok(other.includes("query('/editions/'+active+(edit?'/edit':'')"),'Editor must call the real variant create/edit endpoint');
 assert.match(css,/max-width:620px/);
 for(const id of ['gs-prize-category','sn-prize-category','tic-prize-category'])
  assert.ok(html.includes('id="'+id+'"'),'Missing prize category '+id);
 assert.match(core,/prizeCategory:Number\(\$\('gs-prize-category'\)\.value\)/);
 assert.match(core,/prizeCategory:Number\(\$\('sn-prize-category'\)\.value\)/);
});


test('Premium 27 artwork fits the available landscape and portrait viewport without clipping',()=>{
 const html=source('../DOG/christmas-event.html');
 const css=source('../DOG/christmas-scratch-premium-fit.css');
 assert.match(html,/christmas-scratch-premium-fit\.css\?v=1/);
 assert.match(css,/#scratch-stage\[data-variant="premium_27"\]:not\(\[hidden\]\) > #scratch-reveal/);
 assert.match(css,/container-type:size/);
 assert.match(css,/width:min\(100cqw,75cqh\)!important/);
 assert.match(css,/aspect-ratio:3 \/ 4!important/);
 assert.match(css,/max-height:100cqh!important/);
 assert.match(css,/max-width:100cqw!important/);
 assert.match(css,/transform:none!important/);
 assert.match(css,/left:10\.4%!important/);
 assert.match(css,/top:23\.6%!important/);
 assert.match(css,/width:53\.2%!important/);
 assert.match(css,/height:55\.8%!important/);
 assert.match(css,/@media \(orientation:landscape\)/);
 assert.match(css,/@media \(orientation:portrait\)/);
});


test('Firebase scratch shop read reuse is scoped to one UID and expires in 45 seconds',()=>{
 assert.equal(SCRATCH_TAB_READ_REUSE_MS,45000);
 const ctx={uid:'alice',loadedUid:'alice',loadedAt:100000,hasStatus:true,now:110000};
 assert.equal(reuseRecentScratchView(ctx),true,'quick tab switch must not reload all editions');
 assert.equal(reuseRecentScratchView({...ctx,now:144999}),true);
 assert.equal(reuseRecentScratchView({...ctx,now:145000}),false,'stale data gets a fresh read');
 assert.equal(reuseRecentScratchView({...ctx,force:true}),false,'manual refresh always reads');
 assert.equal(reuseRecentScratchView({...ctx,uid:'bob'}),false,'new account may not reuse private data');
 assert.equal(reuseRecentScratchView({...ctx,hasStatus:false}),false,'failed load cannot be cached');
 assert.equal(reuseRecentScratchView({...ctx,now:99999}),false,'clock rollback must not freeze updates');
 assert.equal(reuseRecentScratchView({...ctx,uid:null}),false,'logged out users never reuse data');
});

test('DOG voucher, research and village rewards invalidate scratch read reuse immediately',()=>{
 const scratch=source('../DOG/christmas-scratch-ui.js');
 const level=source('../DOG/christmas-player-levels-ui.js');
 const research=source('../DOG/christmas-research-ui.js');
 const event=source('../DOG/christmas-event.js');
 const intro=source('../DOG/christmas-intro-gate.js');
 assert.match(scratch,/if\(reuseRecentScratchView\(/);
 assert.match(scratch,/pendingScratchReadUid===uid/);
 assert.match(scratch,/scratch-refresh'\)\.addEventListener\('click',\(\)=>void load\(true\)\)/);
 assert.match(scratch,/lastScratchReadAt=0;\s*if\(\$\('tab-scratch'\)/);
 for(const code of [level,research,event])
  assert.match(code,/dispatchEvent\(new Event\('dog-scratch-balance-changed'\)\)/);
 assert.match(event,/christmas-scratch-ui\.js\?v=\d+/);
 assert.match(event,/christmas-player-levels-ui\.js\?v=\d+/);
 assert.match(event,/christmas-research-ui\.js\?v=\d+/);
 assert.match(intro,/christmas-event\.js\?v=\d+/);
});
