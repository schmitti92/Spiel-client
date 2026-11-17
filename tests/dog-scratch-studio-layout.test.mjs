import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const html=readFileSync(new URL('../DOG/scratch-editions.html',import.meta.url),'utf8');
const js=readFileSync(new URL('../DOG/scratch-editions.js',import.meta.url),'utf8');
const css=readFileSync(new URL('../DOG/scratch-editions.css',import.meta.url),'utf8');
const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
const point=id=>html.indexOf('id="'+id+'"');

test('simple main screen exposes exactly the five most useful editable settings',()=>{
 assert.equal(new Set(ids).size,ids.length,'studio control IDs must stay unique');
 const easy=['simple-price','simple-budget','simple-win-chance','simple-double','simple-lights'];
 for(const id of easy){
  assert.ok(ids.includes(id),id+' missing');
  assert.ok(js.includes(id),id+' has no UI binding');
  assert.ok(point(id)>point('view-overview')&&point(id)<point('advanced-studio'),id+' must be on main page');
 }
 assert.match(html,/id="simple-variant"/);
 assert.match(html,/id="simple-open-advanced"/);
 assert.match(js,/function setupSimpleEditor/);
 assert.match(js,/function simpleWinRule/);
 assert.match(css,/body:not\(\.studio-expert\) \.studio-sidebar\{display:none\}/);
});
test('server preview and publish are visible together below the simple controls',()=>{
 const start=point('view-overview'),end=point('advanced-studio');
 for(const id of ['preview-metrics','preview-message','preview-double','ed-preview','ed-publish']){
  assert.ok(point(id)>start&&point(id)<end,id+' should live on main screen');
 }
 assert.ok(point('ed-preview')<point('ed-publish'));
 assert.match(js,/previewKey!==draftKey/);
 assert.match(js,/api\('\/editions\/preview'/);
 assert.match(js,/api\('\/editions\/publish'/);
 assert.match(js,/function validateDraftLocally/);
});
test('full editor remains optional and all legacy prize controls are preserved',()=>{
 const advanced=['currency','mechanic','quotas','plan','history'];
 for(const step of advanced){
  assert.ok(point('view-'+step)>point('advanced-studio'),step+' should be optional');
  assert.match(html,new RegExp('data-view="'+step+'"'));
 }
 for(const id of ['currency-grid','symbol-overview','quota-grid','ed-double-chance',
  'ed-double-min','ed-double-max','ed-auto-percent','ed-target','ed-budget','ed-max-coins',
  'ed-max-prizes','ed-max-unlocks','ed-volatility','ed-tolerance','ed-full27',
  'ed-full27-range','ed-price','ed-advanced-limits','ed-import-file','ed-import-draft',
  'ed-reset-draft','ed-export','simple-return']){
  assert.ok(ids.includes(id),id+' missing');
  assert.ok(js.includes(id),id+' has no event or rendering binding');
 }
 assert.match(js,/function activateView\(name/);
 assert.match(js,/rebalanceOdds/);
 assert.match(js,/function renderPlanChecks/);
});
test('responsive design, safety notices and saved drafts still work',()=>{
 assert.match(css,/\.simple-editor-grid/);
 assert.match(css,/@media\(max-width:650px\)/);
 assert.match(css,/\.simple-money-summary/);
 assert.match(js,/function replaceCurrentDraft/);
 assert.match(js,/file\.text\(\)/);
 assert.match(html,/id="studio-global-message"/);
 assert.match(html,/id="simple-validation"/);
});

test('simple screen directly supports five tickets each with eight prize payouts',()=>{
 for(const id of ['simple-prize-count','simple-prize-tickets','simple-prize-add',
  'simple-prize-rows','simple-prize-fixed','simple-prize-remaining',
  'simple-prize-bar-fill','simple-prize-clear','simple-prize-confirmed']){
  assert.ok(ids.includes(id),id+' should be editable or visible');
  assert.ok(js.includes(id),id+' should be connected');
 }
 assert.ok(point('simple-prize-count')>point('view-overview'));
 assert.ok(point('simple-prize-count')<point('advanced-studio'));
 assert.match(html,/5 Lose mit jeweils 8 Gewinnen/);
 assert.match(html,/id="simple-prize-tickets"[^>]*value="5"/);
 assert.match(js,/function updateFixedPrizes\(count,tickets\)/);
 assert.match(js,/function addFixedPrizeRow\(\)/);
 assert.match(js,/renderQuota\(\);\s*readForm\(\);updateSide\(\);invalidatePreview\(\)/);
 assert.match(js,/draft\.quotas=quotas/);
 assert.match(js,/if\(fixed>500\)/);
 assert.match(css,/\.simple-prize-distribution/);
 assert.match(css,/\.simple-prize-row/);
});
test('the allowed number of prizes per scratch card follows its genuine rules',()=>{
 assert.match(js,/current\.id==='tic_tac_toe'\)return \[0,1\]/);
 assert.match(js,/current\.id==='dog_jackpot_9'\)return \[0,8\]/);
 assert.match(js,/current\.id==='premium_27'\)return \[4,5,6,7,8,9,10\]/);
 assert.match(js,/current\.id==='number_one_20'\?21:11/);
 assert.match(js,/if\(tickets>0&&count>draft\.maxPrizesPerTicket\)/);
 assert.match(js,/s\.byWins\?\.\[Number\(win\)\]/);
});
