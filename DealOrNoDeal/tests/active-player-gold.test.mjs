import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Script} from 'node:vm';

const read=name=>readFileSync(new URL('../'+name,import.meta.url),'utf8');
const html=read('game.html');
const css=read('css/active-player-gold.css');
const app=read('js/app.js');

test('Goldstudio loads fresh subtle turn styling and keeps the turn above the cases',()=>{
 assert.match(html,/active-player-gold\.css\?v=20261110-soft-gold-no-turn-label-v2/);
 assert.match(html,/app\.js\?v=20261110-soft-gold-no-turn-label-v2/);
 assert.match(html,/id="turn-spotlight"/);
 assert.match(html,/id="turn-spotlight-player"/);
 assert.match(html,/id="turn-spotlight-action"/);
 assert.match(html,/👑 JETZT AM ZUG/,'the prominent turn headline still belongs above the cases');
 assert.ok(html.indexOf('id="turn-spotlight"')<html.indexOf('id="cases"'));
});

test('active player card has a restrained gold edge and readable dark background',()=>{
 assert.match(css,/#players \.player\.turn\s*\{/);
 assert.match(css,/border:2px solid #c5a469!important/);
 assert.match(css,/linear-gradient\(145deg,#3b322d/);
 assert.match(css,/box-shadow:0 0 0 1px #9e7d4780,0 0 14px #d5a75540/);
 assert.match(css,/#players \.player\.turn \.candidate-name\{/);
 assert.match(css,/#players \.player\.turn \.candidate-badge\{/);
 assert.match(css,/#players \.player\.turn \.candidate-avatar\{/);
 assert.match(css,/#players \.player\.turn \.personalcase\{/);
 assert.doesNotMatch(css,/gold-player-glow|scale\(1\.045\)|#ffcf42dd/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
});

test('all participants still share the same active player, without duplicate turn labels in character panels',()=>{
 assert.doesNotThrow(()=>new Script(app,{filename:'app.js'}));
 assert.match(app,/g\.phase==='select'\?g\.order\[g\.selectionIndex\]:g\.phase==='open'\?turn\(\):g\.phase==='reveal'\?g\.pending\?\.actor:null/);
 assert.match(app,/turnSpotlight\.hidden=!turnSpotlightVisible/);
 assert.match(app,/if\(isCurrentPlayer\)/);
 assert.match(app,/setAttribute\('aria-current','step'\)/);
 assert.match(app,/removeAttribute\('aria-current'\)/);
 assert.match(app,/const badgeText=p\.deal!==null\?'Deal gesichert':'Kandidat'/);
 assert.match(app,/const statusText=p\.deal!==null\?'🤝 DEAL · '/);
 assert.doesNotMatch(app,/👑 ÖFFNET KOFFER|👑 JETZT AM ZUG|✨ DU BIST AM ZUG|✨ AKTIVER SPIELER/);
 assert.match(app,/if\(!g\)\{\$\('turn-spotlight'\)\.hidden=true/);
 assert.doesNotMatch(app,/g\.phase==='decision'\?currentDecision\(\):null/);
});
