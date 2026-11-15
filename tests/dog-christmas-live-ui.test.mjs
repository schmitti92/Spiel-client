import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const page=read('DOG/christmas-event.html');
const event=read('DOG/christmas-event.js');
const lobby=read('hub-lobby.html');
const game=read('DOG/app.js');
const room=read('DOG/room-lobby.js');

test('Lichtertal shows an authenticated shared wallet and real server-side upgrade controls',()=>{
 for(const id of ['building-live-balance','building-event-mode','building-price-overview','building-live-notice']){
  assert.match(page,new RegExp('id="'+id+'"'));
 }
 assert.match(page,/src="\.\.\/profile-auth\.js"/);
 assert.match(event,/villageRequest\('village\/upgrade','POST'/);
 assert.match(event,/expectedLevel:level/);
 assert.match(event,/crypto\.randomUUID\(\)/);
 assert.match(event,/if\(villageLive\)return;/);
 assert.match(event,/\$\('preview-'\+d\.id\)\.disabled=Boolean\(villageLive\)/);
 assert.match(event,/villageLive=v/);
 assert.doesNotMatch(event,/localStorage\.setItem|firebase\.firestore|runTransaction/);
});
test('Christmas bonuses are automatic and cannot be toggled by the host or any player',()=>{
 assert.doesNotMatch(page,/building-event-mode-toggle|Weihnachtsmodus aktivieren|Weihnachtsmodus ausschalten/);
 assert.doesNotMatch(event,/christmas-mode|villageCanToggle|enabled:!villageMode|building-event-mode-toggle/);
 assert.match(event,/villageEventActive=data\.enabled===true/);
 assert.match(event,/Die Boni gelten für alle DOG-Partien/);
 assert.match(event,/Event beendet · Fortschritt bleibt gespeichert/);
 assert.match(event,/automatisch auf echten Geschenkfeldern vergeben/);
 assert.match(event,/data-upgrade-building/);
});

test('online DOG displays gift fields received from Render and preserves room context',()=>{
 assert.match(game,/onlineChristmas=room\.match\?\.christmas/);
 assert.match(game,/onlineChristmas\.giftFields/);
 assert.match(game,/onlineChristmas\.claimedFields/);
 assert.match(game,/pointer-events="none"/);
 assert.match(game,/room:hubCode,return:editorBack/);
 assert.match(lobby,/id="dog-room-christmas"/);
 assert.match(room,/dog-room-christmas/);
 assert.match(room,/room:roomCode,return:/);
});
