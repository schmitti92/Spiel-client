import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Script} from 'node:vm';
const read=name=>readFileSync(new URL('../'+name,import.meta.url),'utf8');
const html=read('game.html'),boost=read('js/double-boost.js'),app=read('js/app.js'),banker=read('js/banker.js'),finale=read('js/finale.js'),css=read('css/double-boost.css'),playerCss=read('css/active-player-gold.css');
test('3m x2 purchase can only be displayed before choosing personal case',()=>{
 assert.match(html,/double-boost\.js\?v=20261111-x2-v1/);
 assert.match(html,/double-boost\.css\?v=20261111-x2-v1/);
 assert.doesNotThrow(()=>new Script(boost));
 assert.match(boost,/game\.phase==='select'&&player\.case===null/);
 assert.match(boost,/request\('POST','\/double-boost'\)/);
 assert.match(boost,/player\.doublePayout===true/);
 assert.match(boost,/BOOST_INSUFFICIENT_FUNDS/);
 assert.match(boost,/3\.000\.000 €/);
 assert.match(boost,/data\.game\?\.id===g\?\.id/);
 assert.match(css,/\.deal-double-boost\[hidden\]/);
 assert.match(app,/DealDoubleBoost\?\.render\(g\)/);
});
test('Banker stays shared while display and final payout are personal',()=>{
 assert.doesNotThrow(()=>new Script(app));
 assert.doesNotThrow(()=>new Script(banker));
 assert.doesNotThrow(()=>new Script(finale));
 assert.match(banker,/function personalBankerAmount/);
 assert.match(banker,/personalBankerAmount\(h,d\.id\)/);
 assert.match(banker,/personalBankerAmount\(h\)/);
 assert.match(app,/myBankerBoost/);
 assert.match(app,/×2-Bonus/);
 assert.match(finale,/×2-Gewinn/);
 assert.match(finale,/f\.payout/);
});

test("purchased x2 bonus has a permanent footer in its owner\'s player card",()=>{
 assert.match(app,/let boostMarker=el\.querySelector\('\.player-double-boost'\)/);
 assert.match(app,/if\(p\.doublePayout===true\)\{if\(!boostMarker\)/);
 assert.match(app,/boostMarker\.textContent='✦ ×2 GEWINN AKTIV ✦'/);
 assert.match(app,/else if\(boostMarker\)boostMarker\.remove\(\)/);
 assert.match(playerCss,/#players \.player \.player-double-boost\{/);
 assert.match(playerCss,/grid-column:1\/-1!important/);
 assert.match(playerCss,/grid-row:5!important/);
 assert.match(html,/active-player-gold\.css\?v=[^"]+x2-profile-v1/);
});
