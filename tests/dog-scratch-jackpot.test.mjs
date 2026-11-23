import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {scratchJackpotRewards,scratchJackpotPreview} from '../DOG/scratch-jackpot-ceremony.js';

test('only real Render-issued unlocks and high money main prizes start celebration',()=>{
 assert.deepEqual(scratchJackpotRewards({winnings:[{type:'coins',amount:100},{type:'lights',amount:10}]}),[]);
 const unlock={unlockId:'christmas2026:avatar:11',name:'Weihnachtskatze',category:'avatars',icon:'👤'};
 assert.deepEqual(scratchJackpotRewards({winnings:[{type:'unlock',prize:unlock},{type:'coins',amount:100}]}),[{type:'unlock',prize:unlock}]);
 assert.deepEqual(scratchJackpotRewards({winnings:[{type:'coins',amount:2000}]}),[{type:'coins',amount:2000}]);
});
test('DOG jackpot collects coin prizes into one animated reward, not eight',()=>{
 const receipt={board:{variantId:'dog_jackpot_9'},totalCoins:1100,
  winnings:[{type:'coins',amount:200},{type:'coins',amount:400},{type:'coins',amount:500}]};
 assert.deepEqual(scratchJackpotRewards(receipt),[{type:'coins',amount:1100}]);
});
test('visual previews use real catalogue images for avatars, backgrounds and boards',()=>{
 const avatar=scratchJackpotPreview({type:'unlock',prize:{unlockId:'christmas2026:avatar:11',name:'Weihnachtskatze',category:'avatars'}});
 assert.match(avatar.image,/Bilder\/Profilbilder\/11_weihnachtskatze\.webp$/);
 const backdrop=scratchJackpotPreview({type:'unlock',prize:{unlockId:'christmas2026:scene:05',name:'Fjord'}});
 assert.match(backdrop.image,/Magischer_Polarlicht_Fjord\.webp$/);
 const board=scratchJackpotPreview({type:'unlock',prize:{unlockId:'christmas2026:board:lebkuchenwerkstatt',name:'Lebkuchenwerkstatt'}});
 assert.match(board.image,/dog_weihnachten_02_lebkuchenwerkstatt\.webp$/);
});
test('card prize is previewed from the real card set, and unknown rewards fall back safely',()=>{
 const cards=scratchJackpotPreview({type:'unlock',prize:{unlockId:'christmas2026:cards:kartendesign-02',name:'Winterzauber'}});
 assert.match(cards.image,/kartendesign-02\/normiert\/7\.png$/);
 const fallback=scratchJackpotPreview({type:'unlock',prize:{unlockId:'mystery',name:'Belohnung',icon:'🎖️'}});
 assert.equal(fallback.image,null);assert.equal(fallback.icon,'🎖️');
});
test('the scratch flow never sends new payments or treats clicking accept as new reward claim',()=>{
 const flow=readFileSync(new URL('../DOG/christmas-scratch-ui.js',import.meta.url),'utf8');
 assert.match(flow,/jackpotCeremony\.show\(current\)/);
 assert.match(flow,/onAccept:\(\)=>closeRevealedTicket\(\)/);
 const source=readFileSync(new URL('../DOG/scratch-jackpot-ceremony.js',import.meta.url),'utf8');
 assert.doesNotMatch(source,/fetch\(|localStorage\.setItem|hubRequest\(/);
});
