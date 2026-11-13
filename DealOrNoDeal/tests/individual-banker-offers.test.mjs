import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Script} from 'node:vm';
const load=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const lobby=load('lobby.html');
const banker=load('js/banker.js');
const app=load('js/app.js');
const html=load('game.html');
const stage=load('css/banker-stage.css');

test('the host can opt in to personal Banker offers when starting, default off',()=>{
 assert.match(lobby,/<input id="individual-banker-offers" type="checkbox">/);
 assert.doesNotMatch(lobby,/<input id="individual-banker-offers"[^>]*checked/);
 assert.match(lobby,/'individual-banker-offers'\)\.disabled=!host/);
 assert.match(lobby,/individualBankerOffers:\$\('individual-banker-offers'\)\.checked===true/);
 assert.match(lobby,/id="banker-mode-state">AUS/);
 const browserScript=lobby.split('<script src="../profile-config.js"></script><script src="../profile-auth.js"></script><script>')[1]?.split('</script>')[0];
 assert.ok(browserScript,'lobby startup script present');
 assert.doesNotThrow(()=>new Script(browserScript,{filename:'lobby-inline.js'}));
});

test('each client displays its own saved Banker amount in all decision views',()=>{
 assert.doesNotThrow(()=>new Script(banker,{filename:'banker.js'}));
 assert.doesNotThrow(()=>new Script(app,{filename:'app.js'}));
 assert.match(banker,/function bankerCashOffer\(h\)/);
 assert.match(banker,/h\?\.offersByPlayer\?\.\[person\]/);
 assert.match(banker,/eur\(bankerCashOffer\(h\)\)/);
 assert.match(banker,/eur\(offerAmount\)/);
 assert.match(banker,/const ratio=average>0\?offerAmount\/average/);
 assert.match(banker,/bankerSetText\('final-choice-offer',eur\(offerAmount\)\)/);
 assert.match(banker,/h\.offersByPlayer\[d\.id\]/);
 assert.match(app,/function personalBankerAmount\(h\)/);
 assert.match(app,/eur\(personalBankerAmount\(h\)\)/);
 assert.match(app,/Dein persönliches Banker-Angebot:/);
 assert.doesNotMatch(banker,/offers always remain identical/);
});

test('mega offers are visibly marked, never client-rolled or automatically accepted',()=>{
 assert.match(banker,/function bankerMegaOffer\(h\)/);
 assert.match(banker,/megaOfferUids\.includes\(person\)/);
 assert.match(banker,/DEIN MEGA-ANGEBOT/);
 assert.match(stage,/banker-call\[data-mega="yes"\]/);
 assert.match(stage,/prefers-reduced-motion/);
 assert.match(html,/banker-stage\.css\?v=20261110-special-bonuses-v1&individual-banker-v1/);
 assert.match(html,/banker\.js\?v=20261110-special-bonuses-v1&x2=1&finalcash=1&individual-banker-v1/);
 assert.match(html,/app\.js\?v=20261114-spectator-v1-slot-sync-v2&individual-banker-v1/);
 assert.doesNotMatch(banker,/Math\.random/);
});
