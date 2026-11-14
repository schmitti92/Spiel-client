import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve,dirname} from 'node:path';
import {DOG_UI_FEATURES,dogFeatureById} from '../DOG/ui-features.js';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..','DOG');
const html=readFileSync(resolve(root,'index.html'),'utf8');
const css=readFileSync(resolve(root,'ui-shell.css'),'utf8');
const shell=readFileSync(resolve(root,'ui-shell.js'),'utf8');
const critical=['board','players','turn','round','phase','hand','moves','hand-title','show-hand',
 'dog-deck-art','dog-discard-art','dog-deck-count','dog-discard-count','history',
 'status','new-game','back-link','fullscreen-button','appearance-button',
 'appearance-dialog','appearance-board','rules-button','rules','local-player-controls',
 'human-count','dog-card-test','dog-give-test-card','dog-test-seven-setup',
 'board-choice-button','dog-extra-buttons','dog-extra-dialog'];

test('DOG cockpit retains each gameplay identifier exactly once',()=>{
 const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(x=>x[1]);
 assert.equal(new Set(ids).size,ids.length,'duplicate ID');
 for(const id of critical)assert.equal(ids.filter(x=>x===id).length,1,id);
});

test('five cockpit blocks exist in the correct order, next to the board',()=>{
 const names=['dog-status-panel','dog-pile-module','dog-hand-module','dog-extras-panel','dog-history-module'];
 const indices=names.map(name=>html.indexOf('class="panel '+name+'"'));
 assert.ok(indices.every(x=>x>0),JSON.stringify(indices));
 assert.ok(indices.every((x,i)=>i===0||x>indices[i-1]));
 assert.ok(html.indexOf('class="board-card"')<indices[0]);
 assert.match(html,/class="right dog-modules"/);
 assert.match(html,/id="dog-extra-buttons"/);
 assert.match(html,/class="dog-history-details" open/);
});

test('top controls support lobby, board selection and existing settings dialogs',()=>{
 for(const id of ['back-link','board-choice-button','fullscreen-button','appearance-button','rules-button'])
  assert.match(html,new RegExp('id="'+id+'"'));
 assert.match(shell,/boardButton\?\.addEventListener\('click'/);
 assert.match(shell,/\$\('appearance-dialog'\)/);
 assert.match(shell,/\$\('appearance-board'\)/);
 assert.match(html,/ui-shell\.css\?v=/);
 assert.match(html,/ui-shell\.js\?v=/);
});

test('board surroundings remain neutral and hand-card gestures preserved',()=>{
 assert.match(css,/\.board-card\s*\{/);
 assert.match(css,/background:#102539!important/);
 assert.match(css,/\.right\.dog-modules/);
 assert.match(css,/overflow-y:auto/);
 assert.match(html,/id="hand"[^>]*zoo[mM]en/);
 assert.match(html,/id="board" class="board-svg"/);
 assert.match(html,/data-dog-editor/);
});

test('future modules are registered and explicitly inactive until implemented',()=>{
 assert.deepEqual(DOG_UI_FEATURES.map(x=>x.id),['magic','emojis','special','events','items']);
 assert.equal(dogFeatureById('magic')?.label,'Magie');
 assert.equal(dogFeatureById('missing'),null);
 assert.ok(DOG_UI_FEATURES.every(x=>Object.isFrozen(x)));
 assert.match(shell,/dogFeatureById/);
 assert.match(shell,/button\.type='button'/);
 assert.match(shell,/tools\.hidden=true/);
 assert.match(shell,/newGame\.hidden=true/);
 assert.doesNotMatch(shell,/fetch\(|writeBatch|updateDoc|setDoc|\.emit\(/);
});
