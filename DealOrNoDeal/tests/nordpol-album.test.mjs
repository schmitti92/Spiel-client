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
 "65_polarstern.svg",
 "66_eisbaerenhoehle.svg",
 "67_frostfuchs.svg",
 "68_nordwind_kompass.svg",
 "69_kristallgrotte.svg",
 "70_geheime_wichteltuer.svg",
 "71_sternenschlitten.svg",
 "72_schneeeule.svg",
 "73_aurora_bruecke.svg",
 "74_diamant_schneeflocke.svg",
 "75_uhrwerk_weihnacht.svg",
 "76_mitternachtszug.svg",
 "77_krone_nordpol.svg",
 "78_palast_polarlichter.svg",
 "79_goldenes_weihnachtsherz.svg",
 "80_letzte_sternschnuppe.svg"
];

test('all sixteen independent Nordpol card illustrations exist and map to IDs 65–80',()=>{
 assert.equal(art.length,16);
 assert.equal(new Set(art).size,16);
 for(const [index,name] of art.entries()){
  const file=resolve(root,'assets/weihnachts_event',name);
  assert.ok(existsSync(file),'Missing artwork: '+name);
  const svg=readFileSync(file,'utf8');
  assert.match(svg,/^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg"/);
  assert.ok(svg.includes('viewBox="0 0 640 640"'),'Card aspect missing: '+name);
  assert.ok(svg.includes('NORDPOL ✦ '+(65+index)),'Card number mismatch: '+name);
  assert.ok(html.includes('"'+name+'"'),'Card image not wired into album: '+name);
 }
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
