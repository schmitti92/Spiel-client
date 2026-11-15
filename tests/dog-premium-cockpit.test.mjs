import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=(file)=>readFileSync(new URL('../DOG/'+file,import.meta.url),'utf8');
const html=read('index.html');
const styles=read('premium-cockpit.css');
const app=read('app.js');

test('DOG royal cockpit keeps the live play surface and all controls accessible',()=>{
 const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(x=>x[1]);
 assert.equal(ids.length,new Set(ids).size,'no duplicated DOM identifiers');
 for(const id of ['board','players','hand','moves','dog-deck-art','dog-discard-art',
  'dog-extra-buttons','dog-extension-panel','dog-zoom-reset','appearance-dialog','dog-joker-dialog',
  'history','status','dog-premium-round','dog-premium-phase','dog-premium-now']){
   assert.equal(ids.filter(name=>name===id).length,1,id);
 }
 assert.match(html,/<header class="dog-premium-ribbon"/);
 assert.match(html,/premium-cockpit\.css\?v=/);
 assert.match(html,/id="dog-premium-now" aria-live="polite"/);
 assert.match(html,/class="dog-premium-statusline"/);
 assert.doesNotMatch(html,/class="panel dog-history-module"[^>]*hidden/);
 assert.match(html,/<details class="dog-history-details">/);
});
test('premium status text is derived from existing round and turn, not invented network state',()=>{
 assert.match(app,/roundLabel='Runde '\+game\.round/);
 assert.match(app,/phaseLabel=\$\('phase'\)\.textContent/);
 assert.match(app,/turnLabel=\$\('turn'\)\.textContent/);
 assert.match(app,/if\(royalNow\.textContent!==turnLabel\)/);
});
test('royal style has landscape/mobile and motion-off fallbacks',()=>{
 for(const selector of ['.dog-premium-ribbon','.dog-status-panel .seat-grid',
 '.dog-hand-module .hand','.dog-premium-statusline','.dog-history-module']){
  assert.ok(styles.includes(selector),selector);
 }
 assert.match(styles,/@media\(max-width:899px\),\(orientation:portrait\)/);
 assert.match(styles,/@media\(max-width:460px\)/);
 assert.match(styles,/@media\(min-width:900px\) and \(orientation:landscape\) and \(max-height:780px\)/);
 assert.match(styles,/@media\(prefers-reduced-motion:reduce\)/);
 assert.match(styles,/:root\[data-dog-motion="off"\]/);
 assert.match(styles, /data-dog-hud-opacity-players="custom"/);
 assert.match(styles, /data-dog-board-frame="classic"/);
 assert.equal((styles.match(/\{/g)||[]).length,(styles.match(/\}/g)||[]).length);
});

test('DOG ambiguous move selection stays touch-friendly and guards stale actions',()=>{
 for(const id of ['dog-move-choice-dialog','dog-move-choice-title','dog-move-choice-description',
  'dog-move-choice-options','dog-move-choice-cancel','dog-zoom-in','dog-zoom-out']){
  assert.match(html,new RegExp('id="'+id+'"'));
 }
 assert.match(html,/\\.dog-move-choice-button\\{/);
 assert.doesNotMatch(html,/#dog-zoom-in,#dog-zoom-out\\{display:none!important\\}/);
 assert.match(app,/function chooseDogMove\\(/);
 assert.match(app,/available\\[i\\]!==m/);
 assert.match(app,/chooseDogMove\\(swapChoices/);
 assert.match(app,/chooseDogMove\\(matches/);
 assert.doesNotMatch(app,/\\bprompt\\(/);
});
