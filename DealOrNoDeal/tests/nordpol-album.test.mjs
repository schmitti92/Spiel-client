import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {runInNewContext} from 'node:vm';

const root=resolve('DealOrNoDeal');
const html=readFileSync(resolve(root,'weihnachten.html'),'utf8');
const lobby=readFileSync(resolve(root,'lobby.html'),'utf8');
const hub=readFileSync(resolve(root,'weihnachtswelt.html'),'utf8');
const css=readFileSync(resolve(root,'css/christmas-north-pole.css'),'utf8');
const art=[
  [
    "images.jpeg",
    "Funkelnder Weihnachtsbaum"
  ],
  [
    "images-1.jpeg",
    "Schlitten im Mondschein"
  ],
  [
    "images-2.jpeg",
    "Weihnachtsmann mit Geschenken"
  ],
  [
    "images-3.jpeg",
    "Glitzernde Weihnachtskugeln"
  ],
  [
    "images-4.jpeg",
    "Kakao am Winterfenster"
  ],
  [
    "images-5.jpeg",
    "Kleiner Weihnachtsfreund"
  ],
  [
    "images-6.jpeg",
    "Leuchtendes Winterdorf"
  ],
  [
    "images-7.jpeg",
    "Süße Nikolausstiefel"
  ],
  [
    "images-8.jpeg",
    "Wichtel im Zauberwald"
  ],
  [
    "images-9.jpeg",
    "Familie in der Schneekugel"
  ],
  [
    "images-10.jpeg",
    "Winterfee"
  ],
  [
    "images-11.jpeg",
    "Verzauberter Tannenwald"
  ],
  [
    "images-12.jpeg",
    "Goldener Weihnachtsbaum"
  ],
  [
    "images-13.jpeg",
    "Weihnachtsmanns Schneekugel"
  ],
  [
    "images-14.jpeg",
    "Schneemann im Wohnzimmer"
  ],
  [
    "images-15.jpeg",
    "Wichtel auf Zuckerstange"
  ]
];
const assetFolder=resolve(root,'Weihnachtsevent2/Weihnachtsbilder');
test('all 16 uploaded JPEG photos are wired to stable card IDs 65–80',()=>{
 assert.equal(art.length,16);
 assert.equal(new Set(art.map(([file])=>file)).size,16);
 for(const [i,[file,name]] of art.entries()){
  const path=resolve(assetFolder,file);
  assert.ok(existsSync(path),'Missing photo for card '+(65+i)+': '+file);
  const bytes=readFileSync(path);
  assert.ok(bytes.length>1024,'JPEG too small: '+file);
  assert.deepEqual([...bytes.subarray(0,3)],[255,216,255],'Invalid JPEG: '+file);
  assert.ok(html.includes('["'+file+'","'+name+'"]'),'Incorrect card '+(65+i));
 }
 assert.match(html,/file\.endsWith\('\.jpeg'\)/);
 assert.match(html,/Weihnachtsevent2\/Weihnachtsbilder/);
 assert.match(css,/object-fit:contain!important/);
});
test('third classic board and updated counters are wired without exposing locked card art',()=>{
 assert.match(html,/id="album-grid-third"/);
 assert.match(html,/id="album-set-third-bingo"/);
 assert.match(html,/id="album-owned-total">0 \/ 48/);
 assert.match(html,/id="album-bingo-total">0 \/ 30/);
 assert.match(html,/classicCardNumber=i=>i<32\?i\+1:i\+33/);
 assert.match(html,/if\(img\.getAttribute\('src'\)!==picture\)img\.src=picture/);
 assert.match(html,/card-back-winter\.svg/);
 assert.match(hub,/id="hub-collected">– \/ 48/);
 assert.match(hub,/id="hub-bingos">– \/ 30/);
});
test('five new rewards use authoritative server unlock data',()=>{
 for(const reward of ['frost-card-frame','aurora-lobby','north-star-dust','royal-north-gallery','north-pole-legend'])
  assert.ok(html.includes("'"+reward+"'"),'Missing reward '+reward);
 assert.match(lobby,/data\.progress\.rewards\.includes\('aurora-lobby'\)/);
 assert.match(lobby,/data\.progress\.rewards\.includes\('north-pole-legend'\)/);
 assert.match(css,/north-aurora-active/);
 assert.ok(existsSync(resolve(root,'assets/weihnachts_event/nordpol_aurora_lobby.svg')));
});

test('first two classic boards show five server-authoritative Bingo rewards each',()=>{
 const api={};
 runInNewContext(readFileSync(resolve(root,'js/north-pole-bingo.js'),'utf8'),{window:api});
 const engine=api.NorthPoleBingo;
 assert.ok(engine);
 assert.deepEqual([...engine.CLASSIC_BOARD_MILESTONES[0]].map(x=>x.at),[2,4,6,8,10]);
 assert.deepEqual([...engine.CLASSIC_BOARD_MILESTONES[1]].map(x=>x.at),[12,14,16,18,20]);
 assert.deepEqual([...engine.CLASSIC_BOARD_MILESTONES[0]].map(x=>x.id),
  ['rudolph','winter-lobby','christmas-studio','gift-cases','snowman-profile-avatar']);
 assert.deepEqual([...engine.CLASSIC_BOARD_MILESTONES[1]].map(x=>x.id),
  ['santa-profile-avatar','lobby-snowfall','christmas-profile-banner','santa','christmas-champion']);
 const state=engine.snapshot({}, {totalBingos:8,rewards:['rudolph','winter-lobby','christmas-studio','gift-cases']});
 assert.equal(state.classicMilestones[0][0].unlocked,true);
 assert.equal(state.classicMilestones[0][4].unlocked,false);
 assert.equal(state.classicMilestones[1][0].unlocked,false);
 assert.equal(state.totalBingos,8);
 for(const key of ['first','second']){
  assert.match(html,new RegExp('id="album-bingo-milestones-'+key+'"'));
  assert.match(html,new RegExp('id="album-bingo-next-'+key+'"'));
 }
 assert.match(html,/id="album-bingo-first-bonus"/);
 assert.match(css,/\.classic-bingo-rewards/);
 assert.match(html,/north-pole-bingo\.js\?v=20261109-compass-v2/);
});
