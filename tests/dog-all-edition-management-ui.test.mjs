import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {EDITION_SETTINGS_FIELDS,SCRATCH_EDITION_IDS,editionStatusLine,editionAggregateStats}
 from '../DOG/christmas-edition-management-ui.js';

const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const studio=read('../DOG/christmas-other-edition-ui.js');
const scratch=read('../DOG/christmas-scratch-ui.js');
const helper=read('../DOG/christmas-edition-management-ui.js');
const css=read('../DOG/christmas-edition-management.css');
const html=read('../DOG/christmas-event.html');

test('DOG: all seven tickets get independently editable budgets and a latest-edition panel',()=>{
 const ids=['gifts','snow_collect','elf','premium_27','tic_tac_toe','number_one_20','dog_jackpot_9'];
 assert.deepEqual(SCRATCH_EDITION_IDS,ids);
 for(const id of ids){
  assert.equal(EDITION_SETTINGS_FIELDS[id].length,2);
 }
 assert.match(scratch,/editionManagers\[variant\]=mountScratchEditionManager/);
 assert.match(studio,/editionManagers\[variant\]=mountScratchEditionManager/);
 assert.match(scratch,/\['gifts',giftsDialog/);
 assert.match(scratch,/\['snow_collect',snowDialog/);
 assert.match(scratch,/\['tic_tac_toe',ticDialog/);
 assert.match(studio,/OTHER_EDITOR_VARIANTS/);
 assert.match(studio,/editionManagers\[variant\]\.root\.hidden=variant!==active/);
});

test('DOG: current status describes issued, unsold and remaining payout budget',()=>{
 const status=editionStatusLine({issued:31,paidCoins:9400,maxTotalCoins:100000,
  createdAt:Date.parse('2026-11-23T00:00:00Z')});
 assert.match(status,/31\/500/);
 assert.match(status,/469 Restlose/);
 assert.match(status,/90\.600/);
 assert.match(editionStatusLine(null),/keine aktive Auflage/);
});

test('DOG: all ticket editors offer a payout ratio that sets the real fixed edition budget',()=>{
 assert.match(helper,/Gewünschte Auszahlungsquote/);
 assert.match(helper,/const planned=Math\.round\(500\*price\*percent\/100\)/);
 assert.match(helper,/budgetInput\.value=String\(planned\)/);
 assert.match(helper,/budgetInput\.dispatchEvent\(new Event\('input'/);
 assert.match(helper,/planned<Number\(getEdition\(\)\?\.paidCoins\|\|0\)/);
 assert.match(css,/\.scratch-edition-management/);
 assert.match(html,/christmas-edition-management\.css\?v=4/);
});

test('DOG: ending an edition fetches live state and archives only a confirmed owner series',()=>{
 assert.match(helper,/query\('\/editions\/'\+variant\+'\/status'\)/);
 assert.match(helper,/if\(!canRetire\)/);
 assert.match(helper,/window\.confirm\(msg\)/);
 assert.match(helper,/query\('\/editions\/'\+variant\+'\/retire'/);
 assert.match(helper,/expectedRevision:edition\.revision/);
 assert.match(helper,/confirmation:'RETIRE_'\+variant\.toUpperCase\(\)/);
 assert.match(helper,/onRetired\?\.\(\)/);
});

test('DOG: manager displays only verified remaining prize counts without exposing ticket order',()=>{
 const metrics=editionAggregateStats({
  issued:25,remaining:475,config:{price:600},
  paidCoins:10000,maxTotalCoins:120000,
  payingTicketsRemaining:132,nonPayingTicketsRemaining:343,
  giftTicketsRemaining:12,maxTicketCoinsRemaining:1500
 });
 assert.deepEqual(metrics,{
  remaining:475,paying:132,nonPaying:343,gift:12,maximum:1500,payoutShare:40
 });
 assert.equal(editionAggregateStats(null),null);
 const noPlan=editionAggregateStats({issued:9,config:{price:300},
  maxTotalCoins:25000,payingTicketsRemaining:null});
 assert.equal(noPlan.paying,null);
 assert.equal(noPlan.nonPaying,null);
 assert.match(helper,/scratch-edition-management-progress/);
 assert.match(helper,/scratch-edition-management-stats/);
 assert.match(helper,/Ohne Geldgewinn/);
 assert.match(helper,/Höchster Geldgewinn/);
 assert.match(css,/\.scratch-edition-management-stats/);
});

test('DOG: draft settings are not changed by a status refresh; user explicitly loads saved run',()=>{
 assert.match(helper,/load\.addEventListener\('click'/);
 assert.match(helper,/onLoadCurrent\(getEdition\(\)\)/);
 assert.match(studio,/onLoadCurrent:\(\)=>fillCurrentValues\(variant\)/);
 assert.match(scratch,/onLoadCurrent,?/);
 assert.match(scratch,/function fillGiftsSettings\(preferEdition=false\)/);
 assert.match(scratch,/function fillSnowSettings\(preferEdition=false\)/);
 assert.match(scratch,/function fillTicEditionValues\(\)/);
 assert.match(scratch,/\(preferEdition\?giftsEdition\?\.config/);
 assert.match(scratch,/\(preferEdition\?snowEdition\?\.config/);
});

test('DOG: all seven edition settings have a dedicated visible selector independent of purchase level',()=>{
 const names=['gifts','snow_collect','elf','premium_27','tic_tac_toe','number_one_20','dog_jackpot_9'];
 assert.match(html,/id="scratch-management-hub"/);
 assert.match(html,/id="scratch-management-access"/);
 for(const id of names)
  assert.match(html,new RegExp('data-scratch-manage="'+id+'"'));
 const buttons=html.match(/data-scratch-manage="/g)||[];
 assert.equal(buttons.length,7);
 assert.match(scratch,/function openScratchEditionSettings\(variant\)/);
 assert.match(scratch,/openScratchEditionSettings\(button\.dataset\.scratchManage\)/);
 assert.match(scratch,/if\(!canManageScratch\)/);
 assert.match(scratch,/DOG_SCRATCH_ADMIN_UIDS/);
 assert.match(css,/\.scratch-management-hub-grid/);
});

test('DOG: all in-ticket editor shortcuts are subject to the verified admin flag',()=>{
 assert.match(scratch,/canManage:\(\)=>canEditEditions\(\)/);
 assert.match(studio,/if\(!canManage\(\)\)/);
 assert.match(scratch,/scratch-gifts-settings-open'\)\.addEventListener\('click',\(\)=>openScratchEditionSettings\('gifts'\)\)/);
 assert.match(scratch,/scratch-snow-settings-open'\)\.addEventListener\('click',\(\)=>openScratchEditionSettings\('snow_collect'\)\)/);
});

test('DOG Chris: authenticated UID can be copied for Render administrator registration',()=>{
 assert.match(html,/id="scratch-management-identity"/);
 assert.match(html,/id="scratch-management-copy-uid"/);
 assert.match(html,/id="scratch-management-copy-feedback"/);
 assert.match(html,/DOG_SCRATCH_ADMIN_UIDS/);
 assert.match(scratch,/scratch-management-copy-uid'\)\?\.addEventListener\('click',async\(\)=>/);
 assert.match(scratch,/const uid=account\(\)\?\.uid/);
 assert.match(scratch,/navigator\.clipboard\.writeText\(uid\)/);
 assert.match(scratch,/identity\.hidden=!isDevActive\(\)\|\|!account\(\)\?\.uid/);
 assert.match(css,/\.scratch-management-identity\[hidden\]\{display:none!important\}/);
});

test('DOG: all seven edition editors only appear in active local developer mode',()=>{
 assert.match(scratch,/const isDevActive=\(\)=>window\.DOGChristmasDev\?\.isActive\(\)===true/);
 assert.match(scratch,/const canEditEditions=\(\)=>isDevActive\(\)&&canManageScratch/);
 assert.match(scratch,/hub\.hidden=!isDevActive\(\)/);
 assert.match(scratch,/if\(!isDevActive\(\)\)hub\.open=false/);
 assert.match(scratch,/if\(!isDevActive\(\)\)\{/);
 assert.match(scratch,/otherStudio\.close\?\.\(\)/);
 assert.match(scratch,/if\(isDevActive\(\)&&\(option\.id==='gifts'\)\)/);
 assert.match(scratch,/if\(isDevActive\(\)&&\(option\.id==='snow_collect'\)\)/);
 assert.match(scratch,/if\(isDevActive\(\)&&\(option\.id==='tic_tac_toe'\)\)/);
 assert.match(scratch,/if\(isDevActive\(\)&&\(OTHER_EDITOR_VARIANTS\.includes\(option\.id\)\)\)/);
 assert.match(studio,/cardGear\.hidden=!META\[variant\]\|\|window\.DOGChristmasDev\?\.isActive\(\)!==true/);
 assert.match(css,/html:not\(\.dog-dev-active\) #scratch-management-hub/);
 assert.match(css,/#scratch-management-hub\[hidden\]\{display:none!important\}/);
});

test('DOG: server-verified full developer role is shown distinctly from creator-only admin',()=>{
 assert.match(scratch,/canManageAllScratchEditions=r\.canManageAllScratchEditions===true/);
 assert.match(scratch,/canManageAllScratchEditions\?'✅ Vollständige Entwicklerrechte bestätigt/);
 assert.match(scratch,/canManageScratch\?'✅ Rubbellos-Admin bestätigt/);
 assert.match(scratch,/canManageAllScratchEditions=false;stage\.hidden=true/);
});
