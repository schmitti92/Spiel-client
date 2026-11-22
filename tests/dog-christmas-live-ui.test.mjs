import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const page=read('DOG/christmas-event.html');
const event=read('DOG/christmas-event.js');
const lobby=read('hub-lobby.html');
const game=read('DOG/app.js');
const room=read('DOG/room-lobby.js');

test('Lichtertal shows an authenticated shared wallet and real server-side upgrade controls',()=>{
 for(const id of ['building-live-balance','building-event-mode','building-price-overview','building-live-notice']){
  assert.match(page,new RegExp('id="'+id+'"'));
 }
 assert.match(page,/src="\.\.\/profile-auth\.js"/);
 assert.match(event,/villageRequest\('village\/upgrade','POST'/);
 assert.match(event,/expectedLevel:level/);
 assert.match(event,/crypto\.randomUUID\(\)/);
 assert.match(event,/if\(villageLive\)return;/);
 assert.match(event,/\$\('preview-'\+d\.id\)\.disabled=Boolean\(villageLive\)/);
 assert.match(event,/villageLive=v/);
 assert.doesNotMatch(event,/firebase\.firestore|runTransaction/,
  'all village credits remain fully server-authoritative');
 // Only the timestamp of a successful, server-verified legacy import
 // check is stored locally. Never use localStorage for prize balances.
 assert.match(event,/villageLegacyImportMarkerKey\(villageApi,uid\)/);
 assert.match(event,/localStorage\.setItem\(key,String\(checkedAt\)\)/);
});
test('Christmas bonuses are automatic and cannot be toggled by the host or any player',()=>{
 assert.doesNotMatch(page,/building-event-mode-toggle|Weihnachtsmodus aktivieren|Weihnachtsmodus ausschalten/);
 assert.doesNotMatch(event,/christmas-mode|villageCanToggle|enabled:!villageMode|building-event-mode-toggle/);
 assert.match(event,/villageEventActive=data\.enabled===true/);
 assert.match(event,/Die Boni gelten für alle DOG-Partien/);
 assert.match(event,/Event beendet · Fortschritt bleibt gespeichert/);
 assert.doesNotMatch(page,/id="panel-gifts"|id="tab-gifts"/,'outdated gifts panel remains removed');
 assert.match(event,/data-upgrade-building/);
});

test('online DOG keeps all hidden gift and scratch positions secret and preserves room context',()=>{
 assert.match(game,/onlineChristmas=room\.match\?\.christmas/);
 assert.match(game,/onlineChristmas\?\.roundGiftCollected/);
 assert.match(game,/onlineChristmas\.giftFieldCount/);
 assert.match(game,/onlineChristmas\.roundScratchCollected/);
 assert.doesNotMatch(game,/for\(const field of onlineChristmas\.giftFields/);
 assert.doesNotMatch(game,/claimed=new Set\(onlineChristmas\.claimedFields/);
 // Only Render-sanctioned, already revealed markers may be drawn.
 // Secret giftFields/scratchFields or the draw deck must stay server-side.
 assert.match(game,/onlineChristmas\.visibleGiftFields\.map\(field/);
 assert.match(game,/onlineChristmas\.visibleScratchFields\.map\(field/);
 assert.match(game,/dog-christmas-reveal-marker/);
 assert.match(game,/room:hubCode,return:editorBack/);
 assert.match(lobby,/id="dog-room-christmas"/);
 assert.match(room,/dog-room-christmas/);
 assert.match(room,/room:roomCode,return:/);
});

test('tapping a village house or nameplate opens its live building bonus dialog',()=>{
 const css=read('DOG/christmas-event-royal.css');
 for(const id of ['tower','workshop','bakery','inn']){
  const match=page.match(new RegExp('data-open-building="'+id+'"','g'))||[];
  assert.equal(match.length,2,'both image and nameplate should be clickable: '+id);
  assert.match(css,new RegExp('\\.hit-'+id+'\\{'),'building hit area exists for '+id);
 }
 for(const id of [
  'village-building-dialog','village-building-title','village-building-icon',
  'village-building-mode','village-building-image','village-building-stage',
  'village-building-progress','village-building-current-bonus',
  'village-building-description','village-building-bonus-explanation',
  'village-building-next-bonus','village-building-next-cost',
  'village-building-close','village-building-dismiss','village-building-upgrade'
 ]){
  assert.match(page,new RegExp('id="'+id+'"'));
 }
 assert.match(event,/button\.addEventListener\('click',\(\)=>openVillageBuildingDialog\(button\.dataset\.openBuilding\)\)/);
 assert.match(event,/buildingDialog\.showModal\(\)/);
 assert.match(event,/buildingDialog\.close\(\)/);
 assert.match(event,/villageLive\?\.bonus/,'actual bonus must come from server village status');
 assert.match(event,/openedBuildingId&&buildingDialog\.open/,'modal refreshes when the shared village upgrades');
 assert.match(event,/if\(eventUser\(\)&&!villageLive\)void reloadVillage\(\)/);
 assert.match(css,/dialog\.village-building-dialog::backdrop/);
 assert.match(css,/@media\(max-width:680px\)/);
 assert.match(event,/jumpToVillageBuilding/,'building detail shortcut stays available');
});
test('building bonus values and explanations match server formulas',()=>{
 const js=event;
 assert.match(js,/bonus\.towerFields/);
 assert.match(js,/bonus\.workshopExtraChancePercent/);
 assert.match(js,/bonus\.bakeryExtraPercent/);
 assert.match(js,/bonus\.innScratchFields/);
 assert.match(js,/bonus\.innPerFinishedGame/);
 assert.match(js,/5\*level/);
 assert.match(js,/10\*\(level-1\)/);
 assert.match(js,/8\+2\*\(level-1\)/);
 assert.match(js,/christmasUpgradeCost\(level\)/);
 assert.match(js,/villageEventActive\?'🟢 Gemeinsamer Bonus aktiv'/);
 assert.doesNotMatch(js,/buildingDialog.*villageRequest\('village\/upgrade'/);
});

test('tapping the depicted Christmas tree opens the existing tree window',()=>{
 const css=read('DOG/christmas-event-royal.css');
 assert.match(page,/<button type="button" class="village-tree-hit" data-open-tab="tree"/);
 assert.match(page,/aria-label="Weihnachtsbaum öffnen/);
 assert.match(event,/document\.querySelectorAll\('\[data-open-tab\]'\)/);
 assert.match(event,/button\.addEventListener\('click',\(\)=>showPanel\(button\.dataset\.openTab\)\)/);
 assert.match(event,/if\(id==='tree'\)\{centerTreeMilestone\(\);void treePrizeScreen\?\.load\(\);\}/);
 assert.match(css,/\.village-hotspots \.village-tree-hit\{/);
 assert.match(css,/\.village-tree-hit:focus-visible/);
});
