import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import { fileURLToPath } from 'node:url';
import { EFFECT_NAMES, EFFECT_IDS, NEVER_WINNABLE, effectiveCardTypes } from '../DOG/grinch-campaign/mission-2-effects.js';

const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const exists=path=>existsSync(fileURLToPath(new URL(path,import.meta.url)));
test('Mission 2 and its 40 curses exist as isolated modules, not in classic DOG',()=>{
 assert.equal(EFFECT_NAMES.length,40);
 assert.equal(EFFECT_IDS.length,40);
 assert.deepEqual(NEVER_WINNABLE,[10,50,100]);
 for(const name of ['mission-2.html','mission-2.js','mission-2-rules.js','mission-2-effects.js','mission-2-board.js','mission-2-markers.js','mission-2-online.js','mission-2-slot-ui.js','mission-2.css'])
  assert.ok(exists('../DOG/grinch-campaign/'+name),name);
 const classic=read('../DOG/engine.js');
 assert.doesNotMatch(classic,/mission-2|grinch-mission2|m2-slot|m2\.spins/);
});
test('Mission 2 uses the official 110-card deck, exact three rescues, and the 10 percent second slot',()=>{
 const engine=read('../DOG/grinch-campaign/mission-2-rules.js');
 const effects=read('../DOG/grinch-campaign/mission-2-effects.js');
 assert.match(engine,/rescuedCount\(s,info\.seat\)===3/);
 assert.match(engine,/permanentLossCount\(s,info\.seat\)===2/);
 assert.match(engine,/m2LostPieceId/);
 assert.match(engine,/target===TRACK&&\(\(!s\.players\[p\.seat\]\.m2Lost/);
 assert.match(engine,/version:6,mission:MISSION_2\.id/);
 assert.match(effects,/BONUS_PROBABILITY=\.10/);
 assert.match(effects,/m\.spins\.push/);
 assert.match(effects,/group\(id\)!==group\(first\)/);
 const page=read('../DOG/grinch-campaign/mission-2.html');
 assert.match(page,/m2-slot-reels/);
 assert.match(page,/mission-2\.js/);
 assert.match(page,/class="m2-slot-reel is-blank"/);
});
test('Joker takes on transformed card values only inside mission 2',()=>{
 const game={m2:{cardCurse:11}};
 const source=['7','8','joker'];
 assert.deepEqual(effectiveCardTypes(game,{type:'joker'},source),['8','joker']);
 game.m2.cardCurse=19;
 assert.deepEqual(effectiveCardTypes(game,{type:'joker'},['swap','7','13']),['13']);
 game.m2.cardCurse=13;
 assert.deepEqual(effectiveCardTypes(game,{type:'2'},['2']),['12']);
});
test('Mission 2 only exposes protected server launch, never direct unverified victory',()=>{
 const event=read('../DOG/christmas-grinch-event.js');
 assert.match(event,/mission-2\.html/);
 const online=read('../DOG/grinch-campaign/mission-2-online.js');
 assert.match(online,/grinch\/launch2/);
 assert.match(online,/dog-grinch2/);
 assert.doesNotMatch(online,/\/grinch\/launch'/);
});
