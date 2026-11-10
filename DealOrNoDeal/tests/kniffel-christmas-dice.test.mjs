import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';

const read=path=>readFileSync(new URL('../../'+path,import.meta.url),'utf8');
const local=read('Kniffel/index.html'),online=read('Kniffel/online.html');
const localJS=read('Kniffel/game.js'),onlineJS=read('Kniffel/online.js');
const theme=read('Kniffel/christmas-dice.css'),skin=read('Kniffel/christmas-dice.js');
const ice=read('DealOrNoDeal/Weihnachtsevent2/online-ice.js');

test('all six correctly named Christmas dice images are uploaded',()=>{
 for(let n=1;n<=6;n++){
  assert.equal(existsSync(new URL('../../Kniffel/Bilder/weihnachtswuerfel-'+n+'.png',import.meta.url)),true);
 }
});
test('local and online Kniffel load the same cosmetic dice switch and stylesheet',()=>{
 for(const html of [local,online]){
  assert.doesNotMatch(html,/id="christmas-dice-toggle"[^>]*hidden/);
  assert.match(html,/christmas-dice\.css\?v=/);
  assert.match(html,/christmas-dice\.js\?v=/);
  assert.match(html,/profile-config\.js/);
  assert.match(html,/profile-auth\.js/);
 }
 assert.match(localJS,/KniffelChristmasDice\?\.decorate\(b,game\.rolls\?n:0\)/);
 assert.match(onlineJS,/KniffelChristmasDice\?\.decorate\(b,g\.rolls\?n:0\)/);
 assert.match(localJS,/dataset\.diceValue=game\.rolls\?String\(n\):'0'/);
 assert.match(onlineJS,/dataset\.diceValue=g\.rolls\?String\(n\):'0'/);
});
test('dice skin is authorized by server progress and only modifies image presentation',()=>{
 assert.doesNotThrow(()=>new Function(skin));
 assert.match(skin,/api\/christmas-ice\/unlocks/);
 assert.match(skin,/unlocked=result\.unlocked/);
 assert.match(skin,/result\.kniffelChristmasDice/);
 assert.match(skin,/api\/christmas-ice\/me/);
 assert.match(skin,/if\(!die\|\|!enabled/);
 assert.match(skin,/art\.onerror=/);
 assert.match(skin,/art\.onload=/);
 assert.match(skin,/localStorage\.setItem\(key\(uid\)/);
 assert.match(skin,/christmas-die-art/);
 assert.match(theme,/button\.die\.christmas-die/);
 assert.match(theme,/button\.die\.christmas-die \.pips\{display:none!important\}/);
});
test('20-picture milestone advertises the permanent Kniffel Christmas dice reward',()=>{
 assert.match(ice,/n===20\?\(unlocked\?'🎲 Weihnachtswürfel für Kniffel'/);
 assert.match(ice,/celebration\.number===20\?'🎲 Weihnachtswürfel freigeschaltet!/);
 assert.match(ice,/state\.maxRewarded/);
});
