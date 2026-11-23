import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const source=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('four named scratch cards visibly lock at exact verified player levels',()=>{
 const shop=source('DOG/christmas-scratch-ui.js');
 assert.match(shop,/snow_collect:3,tic_tac_toe:6,elf:7,dog_jackpot_9:8/);
 for(const name of ['Schneeflocken-Bingo','DOG Tic-Tac-Toe','Magischer Wichtelpfad','Finde DOG!'])
  assert.ok(shop.includes(name),'named ticket missing: '+name);
 assert.match(shop,/status\?\.playerLevel/);
 assert.match(shop,/playerLevel:r\.playerLevel,variantUnlockLevels:r\.variantUnlockLevels/);
 assert.match(shop,/status\?\.variantUnlockLevels/);
 assert.match(shop,/scratch-level-lock-badge/);
 assert.match(shop,/scratch-level-locked/);
 assert.match(shop,/buyBtn\.disabled=busy\|\|!onSale\|\|levelLocked/);
 assert.match(shop,/voucherBtn\.disabled=busy\|\|!onSale\|\|levelLocked/);
 assert.doesNotMatch(shop,/free\.disabled=busy\|\|!onSale\|\|levelLocked/,'retired daily free tickets are not offered');
 assert.match(shop,/if\(playerLevel<requiredLevel\)/);
 assert.match(shop,/DOGChristmasDev\?\.isActive\(\)/);
});
test('new shop lock stylesheet is loaded and old UI cache is invalidated',()=>{
 const html=source('DOG/christmas-event.html');
 const js=source('DOG/christmas-event.js');
 const style=source('DOG/christmas-scratch-level-locks.css');
 assert.match(html,/christmas-scratch-level-locks\.css\?v=1/);
 assert.match(js,/christmas-scratch-ui\.js\?v=\d+/);
 assert.match(style,/\.scratch-tier\.scratch-level-locked/);
 assert.match(style,/\.scratch-level-lock-badge/);
});
test('real DOG Nikolaus cards require verified player level twenty',()=>{
 const deck=source('DOG/card-visuals.js');
 assert.match(deck,/kartendesign-05[\s\S]*?minPlayerLevel:20/);
 assert.match(deck,/isVerifiedDogPlayerLevelAtLeast\(entry\.minPlayerLevel\)/);
 assert.match(source('DOG/app.js'),/card-visuals\.js\?v=\d+/);
 assert.match(source('DOG/index.html'),/app\.js\?v=\d+/);
});
