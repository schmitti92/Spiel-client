import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=relative=>readFileSync(new URL(relative,import.meta.url),'utf8');

test('Mission 2 shows the authenticated player their own hand even when another plays',()=>{
 const source=read('../DOG/grinch-campaign/mission-2.js');
 assert.match(source,/const viewSeat=onlineMode\?onlineSeat:state\.current/);
 assert.match(source,/for\(const c of state\.hands\[viewSeat\]\|\|\[\]\)/);
 assert.match(source,/b\.disabled=!mayPlay\|\|onlineBusy/);
 assert.match(source,/if\(mayPlay\)\{/);
 assert.match(source,/Deine eigenen Karten bleiben sichtbar/);
});
test('draw and discard piles show counts without exposing the hidden draw order',()=>{
 const page=read('../DOG/grinch-campaign/mission-2.html');
 const script=read('../DOG/grinch-campaign/mission-2.js');
 const style=read('../DOG/grinch-campaign/mission-2.css');
 for(const id of ['m2-draw-count','m2-discard-count','m2-last-card'])
  assert.match(page,new RegExp('id="'+id+'"'));
 assert.match(script,/Number\.isInteger\(state\.drawCount\)\?state\.drawCount/);
 assert.match(script,/Number\.isInteger\(state\.discardCount\)\?state\.discardCount/);
 assert.match(script,/state\.lastPlayedCard\|\|state\.discard\?\.at\(-1\)/);
 assert.match(style,/\.m2-piles/);
});
test('only mission 2 has helper-pawn selection and reverse-four portal entry',()=>{
 const script=read('../DOG/grinch-campaign/mission-2.js');
 const rules=read('../DOG/grinch-campaign/mission-2-rules.js');
 const effects=read('../DOG/grinch-campaign/mission-2-effects.js');
 assert.match(script,/const sources=moves\.filter\(m=>m\.pieceId===id\)/);
 assert.match(script,/canAssistAllies\(state,state\.current\)/);
 assert.match(rules,/export const canAssistAllies=/);
 assert.match(rules,/const shortPortal=intoPortal&&p\.steps<0&&distance>0&&target===1/);
 assert.match(rules,/if\(!at\|\|!isProtectedStart\(at\)\)/);
 assert.match(rules,/ensureSingleLoss\(s,p\.seat,p\.id\)/);
 assert.match(effects,/const boardSeat=s\.pieces\.find\(p=>p\.id===pieceId\)\?\.seat\?\?seat/);
 assert.doesNotMatch(read('../DOG/engine.js'),/canAssistAllies|m2-piles/);
});
