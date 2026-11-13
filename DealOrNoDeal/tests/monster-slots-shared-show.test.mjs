import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Script} from 'node:vm';
const load=path=>readFileSync(new URL('../../'+path,import.meta.url),'utf8');
const js=load('DealOrNoDeal/js/monster-slots-final.js');
const app=load('DealOrNoDeal/js/app.js');
const finale=load('DealOrNoDeal/js/finale.js');
const css=load('DealOrNoDeal/css/monster-slots-shared-show.css');
const html=load('DealOrNoDeal/game.html');

test('shared stage shows both winner and spectators using server-stamped game state',()=>{
 assert.doesNotThrow(()=>new Script(js,{filename:'monster-slots-final.js'}));
 assert.match(js,/function renderShared\(\)/);
 assert.match(js,/game\.id\+':'\+stage\.turn\+':'\+stage\.phase/);
 assert.match(js,/startedAt/);
 assert.match(js,/dealServerNow/);
 assert.match(js,/ALLE SPIELER SEHEN LIVE ZU/);
 assert.match(js,/stage\.reels===1\?\[3000\]:\[3000,4500,6000\]/);
 assert.match(js,/const resultAt=stage\.reels===1\?4200:7800/);
 assert.match(js,/sharedAction\('spin'\)/);
 assert.match(js,/sharedAction\('confirm'\)/);
 assert.match(js,/30[05]0/);
 assert.match(js,/if\(typeof g!=='undefined'&&g\?\.phase==='final'&&g\.monsterSlotShow\)/);
});

test('shared slots precede the suitcase awards ceremony for every player',()=>{
 assert.match(finale,/monsterSlotShow\.phase!=='ceremony'/);
 assert.match(finale,/g\.monsterSlotShow\.finishedAt/);
 assert.match(finale,/Siegerehrung bestätigen/);
 assert.match(finale,/game\.monsterSlotShow\.phase==='ceremony'/);
 assert.match(app,/g\.monsterSlotShow&&g\.monsterSlotShow\.phase!=='ceremony'/);
 assert.match(app,/Gemeinsame Slots ansehen/);
 assert.match(app,/gemeinsamen Monster-Slots abschließen/);
 assert.doesNotThrow(()=>new Script(finale,{filename:'finale.js'}));
 assert.doesNotThrow(()=>new Script(app,{filename:'app.js'}));
});

test('uploaded premium assets are live in the shared slot and preserve old fallbacks',()=>{
 assert.match(js,/assets\/slot-premium\/slot-pack-premium\.png/);
 assert.match(js,/assets\/slot-premium\/slot-goldhammer\.png/);
 assert.match(js,/assets\/slot-premium\/slot-question-card\.png/);
 assert.match(js,/assets\/hats\/reward-platinum\.svg/);
 assert.match(css,/slot-background\.png/);
 assert.match(css,/slot-stage-alternative\.png/);
 assert.match(css,/monster-slot-shared-caption/);
 assert.match(css,/@media\(max-width:570px\)/);
 assert.match(html,/monster-slots-shared-show\.css\?v=20261114-spectator-v1/);
 assert.match(html,/monster-slots-final\.js\?v=20261114-spectator-v1/);
});
