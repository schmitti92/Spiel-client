import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const app=readFileSync(new URL('../js/app.js',import.meta.url),'utf8');
const core=readFileSync(new URL('../js/core.js',import.meta.url),'utf8');
const html=readFileSync(new URL('../game.html',import.meta.url),'utf8');
test('Deal game subscribes to the dedicated authenticated socket',()=>{
 assert.match(app,/new WebSocket\(base\.replace\(\/\^http\/,\s*'ws'\)\+'\/deal-or-no-deal'\)/);
 assert.match(app,/type:'subscribe',code,token/);
 assert.match(app,/msg\.type==='deal-state'/);
});
test('Deal stream and HTTP updates reject stale revisions',()=>{
 assert.match(app,/Number\(next\.revision\)>Number\(g\.revision\)/);
 assert.match(app,/Number\(data\.game\.revision\)>Number\(g\.revision\)/);
 assert.match(core,/Number\(data\.game\?\.revision\)>=Number\(g\.revision\)/);
});
test('Deal stream retains HTTP fallback and reward checks are event driven',()=>{
 assert.match(app,/if\(!dealSocketHealthy\(\)\)await poll\(\)/);
 assert.match(html,/addEventListener\('deal-game-state-change',checkRewards\)/);
 assert.match(html,/setInterval\(checkRewards,30000\)/);
 assert.doesNotMatch(html,/setInterval\(checkRewards,1700\)/);
});
