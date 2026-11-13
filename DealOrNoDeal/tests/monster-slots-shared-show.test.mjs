import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
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
 assert.match(html,/monster-slots-final\.js\?v=20261114-(?:spectator|cards-priority)/);
});


test('premium cabinet loads uploaded reel and glow assets without cropping DOG cards',()=>{
 assert.match(css,/slot-reel-panel\.png/);
 assert.match(css,/slot-win-glow\.png/);
 assert.match(css,/monster-slot-reward-card-art[\s\S]*?aspect-ratio:2\/3/);
 assert.match(css,/monster-slot-reward-card-art img[\s\S]*?object-fit:contain/);
 assert.match(css,/ms-studio-summary-fade/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
 assert.match(html,/monster-slots-shared-show\.css\?v=20261114-spectator-v1-studio-v2/);
});


test('full premium artwork integration uses the shared 3-reel cabinet and original prize symbols',()=>{
 const images=[
  'slot-machine-frame.png','slot-reel-panel.png','slot-reel-highlight.png',
  'slot-chest.png','slot-pack-silver.png','slot-pack-gold.png','slot-pack-premium.png',
  'slot-hammer.png','slot-doublehammer.png','slot-goldhammer.png',
  'slot-joker.png','slot-money.png','slot-jackpot.png','slot-question-card.png',
  'slot-flash.png','slot-sparkle.png','slot-confetti.png','slot-win-glow.png',
  'slot-win-banner.png','slot-epic-banner.png','slot-jackpot-banner.png',
  'slot-button-spin.png','slot-button-reward.png'
 ];
 for(const name of images){
  assert.ok(existsSync(new URL('../assets/slot-premium/'+name,import.meta.url)),name+' is not uploaded');
  assert.ok(css.includes(name)||js.includes(name),name+' is not used in the slot show');
 }
 assert.match(css,/#deal-monster-slots\[data-reels="3"\] \.monster-slot-reels/);
 assert.match(css,/aspect-ratio:512 \/ 377/);
 assert.match(css,/slot-machine-frame\.png/);
 assert.match(js,/const rolling=\[/);
 assert.match(js,/img\.src=symbol\.src/);
 assert.match(js,/span\.classList\.add\('has-image'\)/);
 assert.match(js,/summary\.dataset\.tier=/);
 assert.match(js,/root\.dataset\.actor=me\?'yes':'no'/);
 assert.match(css,/data-actor="yes"/);
 assert.match(css,/prefers-reduced-motion:reduce/);
 assert.doesNotMatch(js,/Math\.random|randomPrize/);
 assert.match(html,/monster-slots-shared-show\.css\?v=20261114-spectator-v1-studio-v2-art-v3/);
 assert.match(html,/monster-slots-final\.js\?v=20261114-cards-priority-v3-art-v3/);
});

test('preview-only control images are not misleadingly displayed as finale options',()=>{
 for(const name of ['slot-button-auto.png','slot-button-spin5.png','slot-free-spin.png','slot-button-back.png']){
  assert.doesNotMatch(css,new RegExp(name.replace('.','\\.')));
  assert.doesNotMatch(js,new RegExp(name.replace('.','\\.')));
 }
 assert.match(css,/data-phase="ready"\] #monster-slot-accept:not\(:disabled\)/);
 assert.match(css,/data-actor="yes"\] #monster-slot-summary-accept:not\(:disabled\)/);
});
