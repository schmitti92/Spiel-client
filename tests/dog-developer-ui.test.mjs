import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Script} from 'node:vm';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const html=read('dog-tor-map.html');
const js=read('dog-developer-ui.js');
const map=read('dog-tor-map.js');
const css=read('dog-tor-map.css');

test('Developer UI is valid JavaScript and loaded only by the 100-Gates map',()=>{
 assert.doesNotThrow(()=>new Script(js));
 assert.match(html,/src="\.\/dog-developer-ui\.js\?v=/);
 assert.match(html,/id="dog-developer-open"[^>]*hidden/);
 assert.match(css,/\.dog-dev-open\[hidden\]/);
});

test('Chris controls are a dialog, hidden for others and verified by server UID',()=>{
 for(const id of ['dog-developer-dialog','dog-developer-close','dog-developer-bots-warning',
  'dog-developer-status','dog-developer-resource','dog-developer-amount','dog-developer-boss',
  'dog-developer-prepare-boss','dog-developer-add-materials'])
  assert.ok(html.includes('id="'+id+'"'),'missing '+id);
 assert.match(js,/\.toLocaleLowerCase\('de-DE'\)==='chris'/);
 assert.match(js,/open\.hidden=!isChris\(\)/);
 assert.match(js,/\/api\/dog\/developer\//);
 assert.match(js,/api\('GET','status'\)/);
 assert.match(js,/ready=result\.botsReady===true/);
 assert.doesNotMatch(js,/localStorage\.setItem\([^)]*dog.*developer/i);
});

test('All preset checkpoints and ten boss entries are available without DOG unlock shortcut',()=>{
 for(const gate of [9,19,99])assert.match(html,new RegExp('data-dev-preset="'+gate+'"'));
 for(let gate=10;gate<=100;gate+=10)
  assert.ok(html.includes('<option value="'+gate+'">Tor '+gate),'missing boss '+gate);
 assert.match(js,/action:'preset'/);
 assert.match(js,/action:'boss'/);
 assert.match(html,/nicht automatisch freigeschaltet/);
 assert.doesNotMatch(js,/dogUnlocked\s*=\s*true/);
});

test('Resources use secure idempotent server action and refresh the real game map',()=>{
 assert.match(html,/value="all">Alle 15 Rohstoffarten/);
 for(const amount of [10,100,1000])
  assert.ok(html.includes('value="'+amount+'"'),'missing grant '+amount);
 assert.match(js,/action:'materials'/);
 assert.match(js,/requestId:pending\.requestId/);
 assert.match(js,/new Event\('dog-developer-updated'\)/);
 assert.match(map,/window\.addEventListener\('dog-developer-updated'/);
 assert.match(map,/clearPending\(uid\)/);
 assert.match(map,/void reloadMap\(\)/);
});
