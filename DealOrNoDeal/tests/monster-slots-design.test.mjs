import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {Script} from 'node:vm';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const js=read('js/monster-slots-final.js');
const css=read('css/monster-slots-final.css');
const html=read('game.html');
const slotMarkup=JSON.parse(js.split('root.innerHTML=')[1].split(';\n')[0]);
test('Monster Slots script parses as a classic browser script and is loaded with a cache-busted asset',()=>{
 assert.doesNotThrow(()=>new Script(js,{filename:'monster-slots-final.js'}));
 assert.match(html,/js\/monster-slots-final\.js\?v=20261114-spectator/);
 assert.match(html,/css\/monster-slots-final\.css\?v=20261113-podium-slots-v2/);
});
test('three reels with real scrolling icon tracks and sequential stops, never a browser-side prize roll',()=>{
 assert.equal((slotMarkup.match(/class="monster-slot-reel"/g)||[]).length,3,'exactly three reels');
 assert.equal((slotMarkup.match(/class="monster-slot-track"/g)||[]).length,3,'one moving track per reel');
 assert.equal((slotMarkup.match(/class="monster-slot-prize"/g)||[]).length,3,'one server prize display per reel');
 assert.match(js,/3000,4500,6000/,'three left-to-right stop timestamps');
 assert.match(js,/setPhase\(reel,'running'\)/);
 assert.match(js,/showPrize\(reels\[i\],claimed\.prizes\[i\]\)/,'server prize is displayed');
 assert.doesNotMatch(js,/Math\.random|crypto\.randomInt|randomPrize/,'reels must not compute prize outcomes');
 assert.match(css,/@keyframes ms-roll/);
 assert.match(css,/translateY\(-50%\)/);
 assert.match(css,/animation:ms-roll/);
 assert.match(js,/if\(finished\)timer\(\(\)=>showSummary\(token,id\),single\?1000:2000\)/,'single reel reveals after one stop, triple reel after third stop');
 assert.match(js,/reels\.slice\(0,claimed\.prizes\.length\)/,'only allowed reels spin');
 assert.match(css,/data-reels="1"/,'runner-up has a single centered reel');
});
test('premium show appearance supports three visible reel windows, mobile screens and reduced motion',()=>{
 assert.match(css,/linear-gradient\(155deg,#372054/);
 assert.match(css,/border:4px solid #dbac48/);
 assert.match(css,/grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
 assert.match(css,/@media\(max-width:570px\)/);
 assert.match(css,/@media\(max-height:655px\)/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
 assert.match(slotMarkup,/aria-live="polite"/);
 assert.match(js,/role','dialog'/);
 assert.match(js,/accept\.disabled=true/);
});
test('all five already-uploaded chest artworks exist and no new prize payout is made by presentation',()=>{
 for(const name of ['01_Holzkiste.png','02_Eisenkiste.png','03_Silberkiste.png','04_Goldkiste.png','05_Legendaere_Kiste.png']){
  assert.ok(existsSync(new URL('../../dog-chest-art/'+name,import.meta.url)),name);
  assert.ok(js.includes(name),name);
 }
 assert.match(js,/monster-slots\/claim/);
 assert.match(js,/sessionStorage\.setItem\(seenKey\(liveGame\),'yes'\)/);
 assert.match(js,/monster-slots-watched:/);
 assert.match(js,/claimed\.prizes/);
 assert.match(js,/summaryCards\.replaceChildren\(\.\.\.tiles\)/,'all cards appear together instead of sequential reveal');
 assert.doesNotMatch(js,/function revealNewPacks/,'do not replay each pack separately');
 assert.match(html,/g\.monsterSlotsVersion!==1/,'old reward wheel suppressed for new game finales');
});

test('real reward artwork resolves for every award category and all hammer types',()=>{
 const basePaths=[
  'assets/slot-premium/slot-pack-silver.png','assets/slot-premium/slot-pack-gold.png',
  'assets/slot-premium/slot-pack-premium.png','assets/hats/reward-platinum.svg',
  'assets/slot-premium/slot-joker.png','assets/hats/reveal-gift.svg',
  'assets/slot-premium/slot-money.png','assets/slot-premium/slot-hammer.png',
  'assets/slot-premium/slot-doublehammer.png','assets/slot-premium/slot-goldhammer.png',
  'assets/slot-premium/slot-question-card.png',
  'Weihnachtsevent2/Weihnachtsbilder/file_0000000077288210bd94623e0d40c452.png'
 ];
 for(const name of basePaths){
  assert.ok(existsSync(new URL('../'+name,import.meta.url)),'missing slot art '+name);
  assert.ok(js.includes(name),'slot reward mapping missing '+name);
 }
 for(const key of ['chest','pack','hammer','joker','minigame','monster','cash']){
  assert.ok(js.includes(key+':'),'missing reward category '+key);
 }
 assert.match(js,/if\(art\.contains\(img\)\)art\.classList\.add\('has-image'\)/);
 assert.match(js,/img\.addEventListener\('error'/,'broken images must fall back to icons');
});
