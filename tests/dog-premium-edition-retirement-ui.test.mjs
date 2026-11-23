import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const studio=read('../DOG/christmas-other-edition-ui.js');
const common=read('../DOG/christmas-edition-management-ui.js');
const scratch=read('../DOG/christmas-scratch-ui.js');
const event=read('../DOG/christmas-event.js');
const gate=read('../DOG/christmas-intro-gate.js');
const html=read('../DOG/christmas-event.html');

test('DOG Premium: editor embeds latest-edition manager ahead of the settings fields',()=>{
 assert.match(studio,/mountScratchEditionManager/);
 assert.match(studio,/editionManagers\[variant\]\.root\.hidden=variant!==active/);
 assert.match(common,/headingNode\.parentNode\.insertBefore\(section,headingNode\.nextSibling\)/);
 assert.match(common,/scratch-edition-management-retire/);
 assert.match(common,/refresh\.addEventListener\('click'/);
});

test('DOG Premium: creator authorization, confirmation and sale protection still apply',()=>{
 assert.match(common,/query\('\/editions\/'\+variant\+'\/status'\)/);
 assert.match(common,/if\(!canRetire\)/);
 assert.match(common,/if\(!window\.confirm\(msg\)\)/);
 assert.match(common,/query\('\/editions\/'\+variant\+'\/retire'/);
 assert.match(common,/editionId:edition\.id,expectedRevision:edition\.revision/);
 assert.match(common,/confirmation:'RETIRE_'\+variant\.toUpperCase\(\)/);
 assert.match(common,/onRetired\?\.\(\)/);
});

test('DOG Premium: latest module versions and all-ticket management are loaded',()=>{
 assert.match(scratch,/christmas-other-edition-ui\.js\?v=8/);
 assert.match(scratch,/christmas-edition-management-ui\.js\?v=3/);
 assert.match(studio,/christmas-edition-management-ui\.js\?v=3/);
 assert.match(event,/christmas-scratch-ui\.js\?v=99/);
 assert.match(gate,/christmas-event\.js\?v=197/);
 assert.match(html,/christmas-intro-gate\.js\?v=60/);
 assert.match(html,/christmas-edition-management\.css\?v=4/);
});
