import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {EDITION_SETTINGS_FIELDS,SCRATCH_EDITION_IDS,editionStatusLine}
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
 assert.match(html,/christmas-edition-management\.css\?v=1/);
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
