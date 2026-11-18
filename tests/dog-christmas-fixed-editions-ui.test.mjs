import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const html=readFileSync(new URL('../DOG/christmas-event.html',import.meta.url),'utf8');
const ui=readFileSync(new URL('../DOG/christmas-scratch-ui.js',import.meta.url),'utf8');
const engine=readFileSync(new URL('../DOG/christmas-event.js',import.meta.url),'utf8');
const styles=readFileSync(new URL('../DOG/christmas-scratch.css',import.meta.url),'utf8');

for(const prefix of ['gs','sn'])test(prefix+' fixed-budget edition editor has live controls',()=>{
 assert.match(html,new RegExp('id="'+prefix+'-edition-budget"'));
 assert.match(html,new RegExp('id="'+prefix+'-edition-create"'));
 assert.match(html,new RegExp('id="'+prefix+'-edition-edit"'));
 assert.match(html,/Festes Gesamtbudget für die 500 Lose/g);
 assert.match(html,/Exakt diese Münzsumme wird auf die Lose verteilt/g);
 assert.match(ui,new RegExp("edit.hidden=!active"));
 assert.match(ui,/budget.disabled=false/);
 assert.match(ui,/async function editLatestEdition\(variant\)/);
 assert.match(ui,new RegExp("'"+prefix+"-edition-edit'\\)\\.addEventListener"));
 assert.match(styles,new RegExp('#'+prefix+'-edition-edit\\[hidden\\]'));
});

test('editing latest unsold edition happens on server and never overwrites sold receipts',()=>{
 assert.match(ui,/expectedRevision:current.revision/);
 assert.match(ui,/editionId:current.id/);
 assert.match(ui,/query\('\/editions\/'\+variant\+'\/edit'/);
 assert.match(ui,/current\.remaining<=0/);
 assert.match(ui,/current\.paidCoins/);
 assert.match(ui,/SCRATCH_EDITION_ONLY_CREATOR/);
 assert.match(ui,/SCRATCH_EDITION_CHANGED/);
 assert.match(html,/Bereits ausgegebene Lose bleiben unverändert/);
});

test('fixed budget interface is reloaded from current version of event module',()=>{
 assert.match(engine,/christmas-scratch-ui\.js\?v=\d+/);
 assert.match(html,/christmas-event\.js\?v=\d+/);
 assert.match(html,/christmas-scratch\.css\?v=\d+/);
 assert.doesNotMatch(html,/Das ist keine Auszahlungsgarantie/);
});
