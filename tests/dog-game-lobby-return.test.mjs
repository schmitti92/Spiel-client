import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const html=read('DOG/index.html');
const game=read('DOG/app.js');
const hub=read('hub-lobby.html');
const controller=read('hub-lobby.js');
const match=html.match(/<script id="dog-game-lobby-return">([\s\S]*?)<\/script>/);
function exitLinks(search){
 assert.ok(match,'DOG must set its return buttons before app module startup');
 const elements=new Map(['back-link','dog-victory-lobby'].map(id=>[id,{href:'../hub-lobby.html?view=local'}]));
 runInNewContext(match[1],{
  location:{search},URLSearchParams,
  document:{getElementById:id=>elements.get(id)||null}
 });
 return [...elements.values()].map(e=>e.href);
}

test('a local DOG match always returns to the existing local game selection',()=>{
 assert.deepEqual(exitLinks(''),['../hub-lobby.html?view=local','../hub-lobby.html?view=local']);
 assert.deepEqual(exitLinks('?mode=local'),['../hub-lobby.html?view=local','../hub-lobby.html?view=local']);
});
test('an online DOG match keeps its actual room and avoids immediately relaunching the same match',()=>{
 const returned=exitLinks('?room=473&match=bee0a945-d962-4fe1-8d2d-5208bd8dd732');
 const destination='../hub-lobby.html?room=473&stage=1&dogLobby=1&stayMatch=bee0a945-d962-4fe1-8d2d-5208bd8dd732';
 assert.deepEqual(returned,[destination,destination]);
 assert.match(controller,/room\.match\.id!==stayInMatchId/);
});
test('an online DOG room without match still returns to its room lobby',()=>{
 assert.deepEqual(exitLinks('?room=AB23CD'),['../hub-lobby.html?room=AB23CD&stage=1&dogLobby=1','../hub-lobby.html?room=AB23CD&stage=1&dogLobby=1']);
});
test('invalid or missing room cannot drag a local game into an online room',()=>{
 for(const search of ['?room=NO-ROOM','?room=','?room=1234567','?hub=473'])
  assert.deepEqual(exitLinks(search),['../hub-lobby.html?view=local','../hub-lobby.html?view=local']);
});
test('the original main lobby is not repurposed and DOG still recognizes its online match',()=>{
 assert.match(hub,/<h1>Ein Raum\. Alle Spiele\.<\/h1>/);
 assert.match(controller,/location\.assign\('spielauswahl-lokal\.html'\)/);
 assert.match(game,/const online=\/\^\(\?:\\d\{3\}/);
 assert.match(game,/\$\('back-link'\)\.href='\.\.\/hub-lobby\.html\?'/);
});
