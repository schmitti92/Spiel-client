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
test('third and fourth classic boards and updated counters keep locked card art hidden',()=>{
 assert.match(html,/id="album-grid-third"/);
 assert.match(html,/id="album-grid-fourth"/);
 assert.match(html,/id="fourth-bingo-rows"/);
 assert.match(html,/id="fourth-bingo-columns"/);
 assert.match(html,/id="fourth-bingo-diagonals"/);
 assert.match(html,/id="album-set-third-bingo"/);
 assert.match(html,/id="album-set-fourth-bingo"/);
 assert.match(html,/id="album-owned-total">0 \/ 64/);
 assert.match(html,/id="album-bingo-total">0 \/ 40/);
 assert.match(html,/classicCardNumber=i=>i<32\?i\+1:i\+33/);
 assert.match(html,/if\(img\.getAttribute\('src'\)!==picture\)img\.src=picture/);
 assert.match(html,/card-back-winter\.svg/);
 assert.match(hub,/id="hub-collected">– \/ 64/);
 assert.match(hub,/id="hub-bingos">– \/ 40/);
});
test('five Nordpol prize milestones use server entitlement and claim status',()=>{
 for(const reward of ['north-premium-2','north-gold-hammers-2','north-jokers-2','north-platinum-combo','north-monster-spin-1'])
  assert.ok(html.includes("'"+reward+"'"),'Missing reward '+reward);
 assert.match(html,/maybeClaimNorthPoleBingos/);
 assert.match(html,/north-pole\/claim/);
 assert.match(html,/northPolePending/);
 assert.match(html,/north-pole-bingo\.js\?v=20261110-bingo40-v1/);
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
 assert.match(html,/north-pole-bingo\.js\?v=20261110-bingo40-v1/);
});

test('new fourth board uses all 16 uploaded funny Christmas JPEG images 18 through 33',()=>{
 const names=["Oma backt Plätzchen","Nikolaus und das freche Rentier","Rentiere verschenken ein Auto","Weihnachtsmann und Schneemann","Schneemobil voller Geschenke","Lustiger Weihnachts-Elch","Weihnachtskalorien zählen nicht","Überraschung vom Weihnachtsmann","Opa und die Geschenke","Plätzchenbacken mit Hund","Gemütliches Weihnachtszimmer","Weihnachtsmann im Lichterglanz","Cool bleiben, es ist Weihnachten","Weihnachtswichtel im Geschenkerausch","Schneemann auf dem Sofa","Weihnachtsmann im Büro"];
 for(let i=0;i<16;i++){
  const file='images-'+(i+18)+'.jpeg';
  const path=resolve(root,'Weihnachtsevent2/Weihnachtsbilder',file);
  assert.ok(existsSync(path),'Missing card art '+(i+81)+': '+file);
  const photo=readFileSync(path);
  assert.ok(photo.length>1000);
  assert.deepEqual([...photo.subarray(0,3)],[255,216,255]);
  assert.ok(html.includes('["'+file+'","'+names[i]+'"]'),'Unwired card '+(i+81));
 }
 assert.match(html,/n>=65&&n<=96/);
 assert.match(html,/index>=64&&index<96/);
 assert.match(html,/Math\.floor\(i\/16\)/);
 assert.match(html,/for\(let i=0;i<64;i\+\+\)/);
 assert.match(hub,/clamp\(values\.collected,64\),bingos=clamp\(values\.bingos,40\)/);
 assert.match(css,/merry-fourth/);
});

test('fourth bingo compass shows ten distinct lines without adding server reads or payouts',()=>{
 const api={};
 const source=readFileSync(resolve(root,'js/north-pole-bingo.js'),'utf8');
 runInNewContext(source,{window:api});
 const engine=api.NorthPoleBingo;
 const cards=Object.fromEntries([81,82,83].map(n=>['christmas-'+n,1]));
 let snap=engine.fourthSnapshot(cards);
 assert.equal(snap.count,3);
 assert.equal(snap.lines[0].have,3);
 assert.deepEqual([...snap.lines[0].missing],[84]);
 cards['christmas-84']=1;
 snap=engine.fourthSnapshot(cards);
 assert.equal(snap.lines[0].complete,true);
 assert.equal(snap.lines.filter(x=>x.complete).length,1);
 for(let n=85;n<=96;n++)cards['christmas-'+n]=1;
 snap=engine.fourthSnapshot(cards);
 assert.equal(snap.count,16);
 assert.equal(snap.lines.filter(x=>x.complete).length,10);
 assert.match(source,/Math\.min\(40,Math\.trunc/);
 assert.doesNotMatch(source,/fetch\(|setInterval\(|setTimeout\(/);
 assert.match(html,/id="fourth-bingo-milestones"/);
});
