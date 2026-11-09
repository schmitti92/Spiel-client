import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const app=readFileSync(new URL('../js/app.js',import.meta.url),'utf8');
const core=readFileSync(new URL('../js/core.js',import.meta.url),'utf8');
const html=readFileSync(new URL('../game.html',import.meta.url),'utf8');
const finale=readFileSync(new URL('../js/finale.js',import.meta.url),'utf8');
const banker=readFileSync(new URL('../js/banker.js',import.meta.url),'utf8');
test('Deal game subscribes to the dedicated authenticated socket',()=>{
 assert.match(app,/new WebSocket\(base\.replace\(\/\^http\/,\s*'ws'\)\+'\/deal-or-no-deal'\)/);
 assert.match(app,/type:'subscribe',code,token,clientSentAt:Date\.now\(\)/);
 assert.match(app,/msg\.type==='deal-state'/);
});
test('Deal stream and HTTP updates reject stale revisions',()=>{
 assert.match(app,/Number\(next\.revision\)>Number\(g\.revision\)/);
 assert.match(app,/Number\(data\.game\.revision\)>Number\(g\.revision\)/);
 assert.match(core,/Number\(data\.game\?\.revision\)>Number\(g\.revision\)/);
});
test('Deal stream retains HTTP fallback and reward checks are event driven',()=>{
 assert.match(app,/if\(!dealSocketHealthy\(\)\|\|Date\.now\(\)-lastHttpSafetySync>=30000\)await poll\(\)/);
 assert.match(html,/addEventListener\('deal-game-state-change',\(\)=>\{syncSharedClose\(\);syncWheel\(\);checkRewards\(\);checkWheelStart\(\)\}\)/);
 assert.match(html,/if\(rewardMayExist\(\)&&box.hidden\)checkRewards\(\)/);
 assert.match(html,/setInterval\(\(\)=>\{if\(!document.hidden\)\{syncSharedClose\(\);if\(rewardMayExist\(\)&&box.hidden\)checkRewards\(\)\}\},30000\)/);
 assert.doesNotMatch(html,/setInterval\(checkRewards,1700\)/);
});

test('Healthy WebSocket performs a bounded periodic HTTP reconciliation',()=>{
 assert.match(app,/Date\.now\(\)-lastHttpSafetySync>=30000/);
 assert.match(app,/if\(!dealSocketHealthy\(\)\|\|Date\.now\(\)-lastHttpSafetySync>=30000\)await poll\(\)/);
});

test('Deal heartbeats carry clock samples but no revision-triggered Firestore fetch',()=>{
 assert.match(app,/type:'ping',clientSentAt:Date\.now\(\)/);
 assert.doesNotMatch(app,/type:'ping',revision:/);
 assert.match(app,/function dealServerNow\(\)/);
 assert.match(app,/syncDealClock\(msg\)/);
});

test('Finale and final banker reveal use shared server time',()=>{
 assert.match(finale,/dealServerNow\(\)-finaleEpoch/);
 assert.match(finale,/dealServerNow\(\)-hammer\.startedAt/);
 assert.match(banker,/Number\(g\.finalStartedAt\)\+3000/);
 assert.match(banker,/finalDealRevealUntil-dealServerNow\(\)/);
});

test('Christmas reward probes skip acknowledged events',()=>{
 assert.match(html,/function pendingReward\(kind,id\)/);
 assert.match(html,/g\.christmasWheelClosed\?\.\[kind\+':'\+id\]/);
 assert.match(html,/lastRewardProbeAt<30000/);
 assert.match(html,/pendingReward\('cent'/);
 assert.match(html,/pendingReward\('banker'/);
});
