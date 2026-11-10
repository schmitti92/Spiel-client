import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Script} from 'node:vm';
const load=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const lobby=load('DealOrNoDeal/lobby.html');
const page=load('dog-expedition.html');
const client=load('dog-materials-ui.js');
const style=load('DealOrNoDeal/css/dog-expedition-entry.css');
const main=load('index.html');
const shared=load('hub-lobby.html');

test('DOG expedition is entered from Deal or No Deal directly above Christmas event',()=>{
 const dog=lobby.indexOf('id="dog-expedition-entry"');
 const xmas=lobby.indexOf('class="santa-event-entry"',dog);
 const game=lobby.indexOf('class="launch-actions"',xmas);
 assert.ok(dog>0&&xmas>dog&&game>xmas,'DOG is immediately above Christmas in the game launch stage');
 assert.match(lobby,/class="deal-event-stack" aria-label="Spiel-Events"/);
 assert.match(lobby,/href="\.\.\/dog-expedition\.html"/);
 assert.match(lobby,/href="\.\/weihnachtswelt\.html"/);
 assert.match(lobby,/dog-expedition-entry\.css\?v=20261110-100-gates-v1/);
 assert.match(style,/\.launch-stage \.deal-event-stack \.santa-event-entry/);
 assert.match(style,/@media\(max-width:700px\)/);
});

test('Return to Deal lobby uses the same room code without changing current game actions',()=>{
 assert.match(lobby,/\$\('dog-expedition-entry'\)\.href='\.\.\/dog-expedition\.html'/);
 assert.match(lobby,/room='\+encodeURIComponent\(code\)\+'&stay=1'/);
 assert.match(page,/id="dog-back-deal"/);
 assert.match(client,/const room=new URLSearchParams\(location\.search\)\.get\('room'\)/);
 assert.match(client,/\/\^\(\?:\\d\{3\}\|\[A-HJ-NP-Z2-9\]\{6\}\)\$\/\.test\(room\)/);
 assert.match(client,/\.\/DealOrNoDeal\/lobby\.html\?room=/);
 assert.match(lobby,/id="start" disabled/);
 assert.match(lobby,/id="case-count-picker"/);
 assert.doesNotThrow(()=>new Script(client));
});

test('DOG remains separate from Christmas and is not duplicated in the generic game menus',()=>{
 assert.doesNotMatch(main,/class="game dog-expedition-card"/);
 assert.doesNotMatch(shared,/href="dog-expedition\.html"/);
 assert.match(page,/Die 100 Tore/);
 assert.match(page,/dog-materials-ui\.js/);
});
