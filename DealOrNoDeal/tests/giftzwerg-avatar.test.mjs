import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext,Script} from 'node:vm';

const read=name=>readFileSync(new URL('../'+name,import.meta.url),'utf8');
const art=read('assets/giftzwerg.svg'),lobby=read('lobby.html'),app=read('js/app.js');
const finale=read('js/finale.js'),commentary=read('js/commentary.js'),catalogue=read('js/commentary-lines.js'),game=read('game.html');

test('Giftzwerg is a real named portrait in lobby, game cards, finale and voice overlays',()=>{
 assert.match(lobby,/Muffiger Giftzwerg/);
 assert.match(lobby,/15:'\.\/assets\/giftzwerg\.svg'/);
 assert.match(lobby,/n===15&&!giftzwergUnlocked/);
 assert.match(app,/avatarId===15\?'giftzwerg\.svg'/);
 assert.match(app,/portraitImage\.src=chosenSrc/);
 assert.match(app,/avatarFile=avatarId/);
 assert.match(app,/new URL\('assets\/'\+avatarFile,document\.baseURI\)/);
 assert.match(app,/winnerPlayer\.avatar===15\?'assets\/giftzwerg\.svg'/);
 assert.match(game,/commentary-lines\.js\?v=/);
 assert.match(game,/commentary\.js\?v=/);
 assert.match(commentary,/portrait\.src='\.\/assets\/'\+entry\.image/);
 assert.ok(art.startsWith('<svg xmlns="http://www.w3.org/2000/svg"'));
 assert.match(art,/<title id="t">Der muffige Giftzwerg<\/title>/);
 assert.match(art,/<\/svg>\s*$/);
 assert.doesNotThrow(()=>new Script(app), 'game rendering script must be parseable');
 assert.doesNotThrow(()=>new Script(finale), 'finale rendering script must be parseable');
});

test('Giftzwerg has his own voice catalogue for each gameplay event, instead of a silent fallback',()=>{
 const empty={oneCent:[],small:[],medium:[],millionLost:[],high:[]};
 const persona=runInNewContext(
  catalogue+'\n'+commentary+'\n;studioPersona({id:"a",avatar:15})',
  {strombergCatalogue:empty});
 assert.equal(persona.avatar,15);
 assert.equal(persona.name,'Muffiger Giftzwerg');
 assert.equal(persona.image,'giftzwerg.svg');
 for(const category of [
  'oneCent','small','neutral','large','millionLost',
  'bankerVeryGood','bankerGood','bankerBad','bankerVeryBad',
  'finalCases','deal','noDeal'
 ]){
  assert.ok(Array.isArray(persona[category])&&persona[category].length>=5,
   'Giftzwerg is missing playable commentary for '+category);
  assert.ok(persona[category].every(line=>typeof line==='string'&&line.length>=8));
 }
});
