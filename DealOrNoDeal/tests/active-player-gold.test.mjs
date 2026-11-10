import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Script} from 'node:vm';

const read=name=>readFileSync(new URL('../'+name,import.meta.url),'utf8');
const html=read('game.html');
const css=read('css/active-player-gold.css');
const app=read('js/app.js');

test('Goldstudio loads gold active-player styling and shows the turn above the cases',()=>{
 assert.match(html,/active-player-gold\.css\?v=20261110-full-gold-turn-v1/);
 assert.match(html,/app\.js\?v=20261110-full-gold-turn-v1/);
 assert.match(html,/id="turn-spotlight"/);
 assert.match(html,/id="turn-spotlight-player"/);
 assert.match(html,/id="turn-spotlight-action"/);
 assert.match(html,/👑 JETZT AM ZUG/);
 assert.ok(html.indexOf('id="turn-spotlight"')<html.indexOf('id="cases"'),
   'the highlight must be visible beside the suitcase board');
});

test('entire active player card uses opaque gold background and strong gold borders',()=>{
 assert.match(css,/#players \.player\.turn\s*\{/);
 assert.match(css,/background:[\s\S]*?linear-gradient\(140deg,#fff5bc/);
 assert.match(css,/border:3px solid #fff6c0!important/);
 assert.match(css,/box-shadow:[\s\S]*?#ffcf42dd/);
 assert.match(css,/#players \.player\.turn \.candidate-name\{/);
 assert.match(css,/#players \.player\.turn \.candidate-badge\{/);
 assert.match(css,/#players \.player\.turn \.candidate-avatar\{/);
 assert.match(css,/#players \.player\.turn \.personalcase\{/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
});

test('all participants see the same active player from server state through the reveal',()=>{
 assert.doesNotThrow(()=>new Script(app,{filename:'app.js'}));
 assert.match(app,/g\.phase==='select'\?g\.order\[g\.selectionIndex\]:g\.phase==='open'\?turn\(\):g\.phase==='reveal'\?g\.pending\?\.actor:null/);
 assert.match(app,/turnSpotlight\.hidden=!turnSpotlightVisible/);
 assert.match(app,/if\(isCurrentPlayer\)/);
 assert.match(app,/setAttribute\('aria-current','step'\)/);
 assert.match(app,/removeAttribute\('aria-current'\)/);
 assert.match(app,/g\.phase==='reveal'\?'👑 ÖFFNET KOFFER':'👑 JETZT AM ZUG'/);
 assert.match(app,/if\(!g\)\{\$\('turn-spotlight'\)\.hidden=true/);
 assert.doesNotMatch(app,/g\.phase==='decision'\?currentDecision\(\):null/,'simultaneous voting must not pick a misleading active player');
});
