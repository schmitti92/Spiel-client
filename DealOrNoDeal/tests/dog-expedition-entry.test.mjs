import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const load=path=>readFileSync(new URL('../../'+path,import.meta.url),'utf8');
const lobby=load('DealOrNoDeal/lobby.html');
const style=load('DealOrNoDeal/css/lobby-featured-events.css');
const existing=load('DealOrNoDeal/css/dog-expedition-entry.css');

test('Deal lobby shows two equal large dedicated event tiles outside the game launcher',()=>{
 const section=lobby.indexOf('class="featured-events" aria-labelledby="featured-events-title"');
 const christmas=lobby.indexOf('class="featured-event featured-event--christmas santa-event-entry"');
 const dog=lobby.indexOf('id="dog-expedition-entry" class="featured-event featured-event--gates dog-event-entry"');
 const room=lobby.indexOf('class="panel room-panel"');
 const launch=lobby.indexOf('class="launch-stage"');
 assert.ok(section>0&&christmas>section&&dog>christmas&&room>dog&&launch>dog);
 assert.equal((lobby.match(/id="dog-expedition-entry"/g)||[]).length,1);
 assert.equal((lobby.match(/class="featured-event featured-event--christmas santa-event-entry"/g)||[]).length,1,
  'exactly one accessible Christmas entry');
 assert.match(lobby,/aria-labelledby="featured-events-title"/);
 assert.match(lobby,/href="\.\/weihnachtswelt\.html"/);
 assert.match(lobby,/href="\.\.\/dog-start\.html"/);
 assert.match(lobby,/lobby-featured-events\.css\?v=20261113-event-hub-v1/);
 assert.doesNotMatch(lobby,/class="deal-event-stack"/);
});

test('Room links and game start, case picker and character controls are kept unchanged',()=>{
 assert.match(lobby,/function showPublicDogEvent\(\)/);
 assert.match(lobby,/entry\.href='\.\.\/dog-start\.html'\+\(valid\?'\?room='\+encodeURIComponent\(code\):''\)/);
 assert.match(lobby,/christmasEntry\.href='\.\/weihnachtswelt\.html'\+\(valid\?'\?room='\+encodeURIComponent\(code\):''\)/);
 assert.match(lobby,/id="start" disabled/);
 assert.match(lobby,/id="case-count-picker"/);
 assert.match(lobby,/id="preview"/);
 assert.match(lobby,/id="avatar-grid"/);
 assert.match(lobby,/id="player-records-dialog"/);
});

test('Event images are responsive, both clickable, and 100-Tore has a no-image gradient fallback',()=>{
 assert.match(style,/grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
 assert.match(style,/@media\(max-width:610px\)/);
 assert.match(style,/100_tore_aufstieg_zum_letzten_tor\.png/);
 assert.match(style,/radial-gradient\(ellipse at 62% 30%/);
 assert.match(style,/\.featured-event--christmas/);
 assert.match(style,/\.featured-event--gates/);
 assert.match(style,/:focus-visible/);
 assert.match(style,/prefers-reduced-motion/);
 assert.match(style,/main>\.featured-events\{grid-row:3/);
 assert.match(existing,/\.launch-stage \.deal-event-stack/,
  'legacy CSS remains available, but no longer places event cards inside the launcher');
});
