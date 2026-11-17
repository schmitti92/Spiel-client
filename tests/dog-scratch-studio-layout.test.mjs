import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const html=readFileSync(new URL('../DOG/scratch-editions.html',import.meta.url),'utf8');
const js=readFileSync(new URL('../DOG/scratch-editions.js',import.meta.url),'utf8');
const css=readFileSync(new URL('../DOG/scratch-editions.css',import.meta.url),'utf8');
const steps=['overview','currency','mechanic','quotas','plan','history'];
const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
const viewIndex=id=>html.indexOf('id="view-'+id+'"');

test('studio has unique controls and an easy six-tab workflow',()=>{
 assert.equal(new Set(ids).size,ids.length,'all studio IDs must be unique');
 for(const step of steps){
  assert.ok(viewIndex(step)>0,step+' view must exist');
  assert.match(html,new RegExp('data-view="'+step+'"'));
  assert.match(js,/function activateView\(name/);
 }
 assert.equal(steps.length,6);
 assert.ok(viewIndex('overview')<viewIndex('currency'));
 assert.ok(html.indexOf('data-view="currency"')<html.indexOf('data-view="mechanic"'));
 assert.ok(html.indexOf('data-view="mechanic"')<html.indexOf('data-view="quotas"'));
 assert.ok(html.indexOf('data-view="quotas"')<html.indexOf('data-view="plan"'));
});
test('the print check and publish button appear only within the budget/final step',()=>{
 const plan=viewIndex('plan'),quotas=viewIndex('quotas');
 for(const value of ['preview-metrics','preview-message','preview-double','ed-preview','ed-publish',
  'ed-export','plan-checks']){
  const index=html.indexOf('id="'+value+'"');
  assert.ok(index>plan&&index<quotas,value+' must be in final budget step');
 }
 assert.match(js,/previewKey!==draftKey/);
 assert.match(js,/api\('\/editions\/preview'/);
 assert.match(js,/api\('\/editions\/publish'/);
});
test('all core prize, percent, x2 and 500-ticket controls remain wired',()=>{
 for(const value of ['edition-tabs','currency-grid','symbol-overview','quota-grid',
  'ed-double-chance','ed-double-min','ed-double-max','ed-auto-percent',
  'ed-target','ed-budget','ed-max-coins','ed-max-prizes','ed-max-unlocks',
  'ed-volatility','ed-tolerance','ed-full27','ed-full27-range','ed-price',
  'ed-advanced-limits','ed-import-file','ed-import-draft','ed-reset-draft']){
  assert.ok(ids.includes(value),value+' must remain in the page');
  assert.ok(js.includes(value),value+' must have a JS binding');
 }
 assert.match(js,/rebalanceOdds/);
 assert.match(js,/function validateDraftLocally/);
 assert.match(js,/function renderPlanChecks/);
});
test('mobile presentation and saved configurations are supported',()=>{
 assert.match(css,/\.studio-quick-stats/);
 assert.match(css,/\.wizard-footer/);
 assert.match(css,/@media\(max-width:660px\)/);
 assert.match(js,/function replaceCurrentDraft/);
 assert.match(js,/file\.text\(\)/);
 assert.match(html,/id="studio-global-message"/);
});
