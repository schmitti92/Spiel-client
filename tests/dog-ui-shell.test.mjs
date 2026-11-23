import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve,dirname} from 'node:path';
import {DOG_UI_FEATURES,dogFeatureById} from '../DOG/ui-features.js';
import {dogExchangePrompt} from '../DOG/exchange-prompt.js';

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
 // Premium HUD keeps history accessible but collapsed by default.
 assert.match(html,/class="dog-history-details"/);
 assert.doesNotMatch(html,/class="dog-history-details" open/);
 assert.match(html,/class="dog-premium-statusline"/);
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

test('Magie shows move hints and bot-animation switches, not a placeholder',()=>{
 const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(x=>x[1]);
 for(const id of ['dog-magic-panel-root','dog-move-hints-toggle','dog-move-hints-description',
 'dog-bot-animation-toggle','dog-bot-animation-description'])
   assert.equal(ids.filter(x=>x===id).length,1,id);
 const hand=html.indexOf('class="panel dog-hand-module"');
 const extras=html.indexOf('class="panel dog-extras-panel"');
 const magic=html.indexOf('id="dog-magic-panel-root"');
 const switchIndex=html.indexOf('id="dog-move-hints-toggle"');
 assert.ok(hand>0&&extras>hand&&magic>extras&&switchIndex>magic);
 assert.match(shell,/magicBody\.hidden=activeExtension!=='magic'/);
 assert.match(html,/dog-magic-panel-root"[^>]*hidden/);
 assert.match(html,/role="switch" aria-checked="true" aria-label="Bot-Animationen/);
});

test('Magie contains individual bot levels without changing online rules',()=>{
 const ids=[...html.matchAll(/id="([^"]+)"/g)].map(x=>x[1]);
 for(const id of ['dog-bot-difficulty-heading','dog-bot-difficulty-default',
  'dog-bot-difficulty-players','dog-bot-difficulty-description'])
   assert.equal(ids.filter(x=>x===id).length,1,id);
 for(const [value,name] of [['easy','Leicht'],['medium','Mittel'],['expert','Experte']])
   assert.ok(html.includes('<option value="'+value+'">'+name+'</option>')||
             (value==='medium'&&html.includes('<option value="medium" selected>Mittel</option>')));
 const app=readFileSync(resolve(root,'app.js'),'utf8');
 assert.ok(app.includes('chooseDogBotAction(game,actor,dogBotDifficultyForSeat(botDifficulties,actor))'));
 assert.ok(app.includes('chooseDogBotAction(game,i,dogBotDifficultyForSeat(botDifficulties,i))'));
 assert.ok(app.includes('select.disabled=online'));
 assert.ok(app.includes('saveDogBotDifficulty(bot.seat,select.value,window.localStorage)'));
});

test('DOG card handoff window appears over board without intercepting card or board touches',()=>{
 const board=html.indexOf('id="board" class="board-svg"');
 const dialog=html.indexOf('id="dog-exchange-prompt"');
 const teams=html.indexOf('class="teams"');
 assert.ok(board>=0&&dialog>board&&teams>dialog,'overlay must be inside board section after SVG');
 for(const id of ['dog-exchange-prompt','dog-exchange-prompt-title','dog-exchange-prompt-target','dog-exchange-prompt-guidance'])
  assert.equal((html.match(new RegExp('id="'+id+'"','g'))||[]).length,1,id);
 assert.match(html,/<section id="dog-exchange-prompt"[^>]*role="status"[^>]*hidden>/);
 assert.match(html,/exchange-prompt\.css\?v=1/);
 assert.match(html,/app\.js\?v=117/);
 const promptCss=readFileSync(resolve(root,'exchange-prompt.css'),'utf8');
 const app=readFileSync(resolve(root,'app.js'),'utf8');
 assert.match(promptCss,/\.dog-exchange-prompt\s*\{/);
 assert.match(promptCss,/pointer-events:none/,'notice must never block card or board touches');
 assert.match(promptCss,/prefers-reduced-motion/);
 assert.match(app,/renderHand\(\);drawBoard\(\);syncDogExchangePrompt\(\)/);
 assert.match(app,/if\(!info\)\{panel.hidden=true;return;\}/);
 assert.match(app,/Tippe zuerst auf „Karten ansehen“/);
});

test('exchange notice shows correct recipient in solo and teams, then disappears after exchange',()=>{
 const game={
  mode:'solo3',phase:'exchange',
  players:['Chris','Vanessa','David','Alex'].map((name,seat)=>({seat,name,inactive:seat===2,bot:false})),
  hands:[[{id:8,type:'5'}],[{id:9,type:'7'}],[],[{id:12,type:'10'}]],
  exchanges:[null,null,true,null]
 };
 const solo=dogExchangePrompt(game,1);
 assert.equal(solo?.recipientSeat,3,'inactive player must be skipped clockwise');
 assert.equal(solo?.recipientName,'Alex');
 assert.equal(solo?.title,'Gib eine Karte an den nächsten Spieler');
 const chosen=dogExchangePrompt(game,0,8);
 assert.equal(chosen?.selected,true);
 assert.match(chosen.guidance,/Karte weitergeben/);
 assert.equal(dogExchangePrompt(game,0,800)?.selected,false);
 game.exchanges[0]={id:8,type:'5'};
 assert.equal(dogExchangePrompt(game,0),null,'already exchanged hand no longer gets prompt');
 game.exchanges[0]=false;
 assert.ok(dogExchangePrompt(game,0),'online private exchange state uses false');
 game.mode='teams4';game.players[2].inactive=false;
 assert.equal(dogExchangePrompt(game,0)?.recipientSeat,2);
 assert.equal(dogExchangePrompt(game,0)?.title,'Gib eine Karte an deinen Partner');
 game.phase='play';
 assert.equal(dogExchangePrompt(game,0),null);
 game.phase='exchange';game.players[0].bot=true;
 assert.equal(dogExchangePrompt(game,0),null,'bots never receive UI instructions');
});
