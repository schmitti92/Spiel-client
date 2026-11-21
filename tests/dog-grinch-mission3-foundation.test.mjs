import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const src=file=>readFileSync(new URL('../DOG/grinch-campaign/'+file,import.meta.url),'utf8');
test('Mission 3 is an isolated local test page, not an official campaign launcher',()=>{
 const html=src('mission-3.html');
 assert.match(html,/SPIELBARER PROTOTYP/);
 assert.match(html,/keine offiziellen Kampagnendaten/);
 assert.match(html,/mission-3\.js\?v=1/);
 assert.match(html,/id="m3-board"/);
 assert.doesNotMatch(html,/\/api\/hub\/|awardCoins|grantReward/);
});
test('Mission 3 frontend board uses the shared DOG layout and green fourth seat',()=>{
 const board=src('mission-3-board.js');
 const engine=src('mission-3-rules.js');
 assert.match(board,/trackPoint,homePoint,TRACK_POINTS/);
 assert.match(board,/mission3Start/);
 assert.match(board,/onPieceClick/);
 assert.match(engine,/MISSION3_STARTS=Object\.freeze\(\[0,16,48,32\]\)/);
 assert.match(engine,/MISSION3_GRINCH=3/);
});
test('controller offers real cards, play interactions and local 6-12-18 preview',()=>{
 const js=src('mission-3.js'),html=src('mission-3.html'),css=src('mission-3.css');
 for(const name of ['m3-draw','m3-discard','m3-last','m3-hand','m3-moves','m3-players','m3-change-stage','m3-next-deal']){
  assert.match(html,new RegExp('id="'+name+'"'));
 }
 for(const name of ['mission3Play','mission3LegalMoves','mission3AutoGrinch','mission3NextPreviewDeal'])
  assert.match(js,new RegExp(name));
 assert.match(css,/\.m3-hand/);
 assert.match(css,/@media\(max-width:680px\)/);
});
test('Mission 3 rules do not import or modify official matches, mission 1 or mission 2',()=>{
 const srcRules=src('mission-3-rules.js');
 assert.doesNotMatch(srcRules,/^import /m);
 assert.doesNotMatch(srcRules,/fetch\(|WebSocket|localStorage|firebase|award|\/api\//);
 assert.match(srcRules,/mission3HandSize=\(stage,seat\)=>seat===MISSION3_GRINCH\?6\*\(stage\+1\):6/);
 assert.match(srcRules,/mission3CardTotal\(s\)!==110/);
});
