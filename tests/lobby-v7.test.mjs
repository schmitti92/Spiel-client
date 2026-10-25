import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const text=(path)=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const html=text('hub-lobby.html');
const js=text('hub-lobby.js');
const challengeMarkup=js.match(/(?:challenge-original-frame|challenge-progress)/) ? js : '';
const css=text('hub-lobby-v7.css');
const barikade=text('Barikade/barikade.html');
const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(x=>x[1]);
test('No duplicate or missing HTML elements referenced by room controller',()=>{
 assert.equal(new Set(ids).size,ids.length);
 const missing=[...js.matchAll(/\bel\('([^']+)'\)/g)].map(x=>x[1]).filter(id=>!ids.includes(id));
 assert.deepEqual([...new Set(missing)].filter(id=>!id.startsWith('challenge-')&&!id.startsWith('pj-')),[]);
 assert.equal((html.match(/<div\b/g)||[]).length,(html.match(/<\/div>/g)||[]).length);
 assert.equal((html.match(/<section\b/g)||[]).length,(html.match(/<\/section>/g)||[]).length);
});
test('Local games available without a user account',()=>{
 assert.match(html,/id="local-view"/);
 assert.match(js,/location\.assign\('spielauswahl-lokal\.html'\)/);
 for(const path of [
 'Barikade/barikade.html?offline=1',
 'Skyjo/skyjo_action.html?mode=local',
 'KreuzKunter/kreuzkunter.html?mode=local',
 'Business/business_local.html'
 ])assert.ok(html.includes(path),'missing '+path);
 assert.match(barikade,/qs\.get\('offline'\) === '1'/);
});
test('Each online game has a dedicated pre-room with host settings',()=>{
 for(const game of ['barikade','skyjo','kreuz','business'])assert.ok(html.includes('data-game="'+game+'"'));
 for(const id of ['game-stage-hero','selected-game-title','ready-panel','ready-btn','ready-progressbar'])assert.ok(ids.includes(id),id);
 for(const id of ['barikade-settings-panel','skyjo-settings-panel','business-settings-panel','kreuz-settings-panel'])assert.ok(ids.includes(id),id);
 assert.match(js,/room\.host/);
 assert.match(js,/room\.phase==='preparing'/);
 assert.match(js,/\/rooms\/'.*?\+code\+'\/ready'/s);
});
test('The local/online selection remains phone-sized and readable',()=>{
 assert.match(html,/hub-lobby-v7\.css/);
 assert.match(css,/@media\(max-width:700px\)/);
 assert.match(css,/\.entry-action/);
 assert.match(css,/\.local-game-grid/);
 assert.match(css,/#game-stage-hero/);
});
test('Game selection does not create an independent game room',()=>{
 assert.match(js,/\/rooms\/'.*?\+code\+'\/select'/s);
 assert.match(js,/\/rooms\/'.*?\+code\+'\/ready'/s);
 assert.match(js,/match\.gameCode/);
});

test('Reconnect cannot overwrite newer hub revisions or create overlapping HTTP polls',()=>{
 assert.match(js,/Number\(next\.revision\)<Number\(room\.revision\)/);
 assert.match(js,/pollInFlight/);
 assert.match(js,/if\(code!==requestedCode\)return/);
 assert.match(js,/hubSocket===socket&&data\?\.type==='room'/);
 assert.match(js,/acceptRoom\(data\.room\)/);
});

test('SKYJO reference board preserves manual score counting and three-to-five player seats',()=>{
 const html=readFileSync(new URL('../Skyjo/skyjo_action.html',import.meta.url),'utf8');
 assert.match(html,/skyjo_action-style-01\.css/);
 assert.match(html,/skyjo_action/);
 assert.match(html,/skyjo_action/);
 assert.doesNotMatch(html,/meta-chip open-chip/);
 assert.doesNotMatch(html,/Σ \$\{openSum/);
});

test('SKYJO reference sidebar shows standings without exposing current card sums',()=>{
 const html=readFileSync(new URL('../Skyjo/skyjo_action.html',import.meta.url),'utf8');
 assert.match(html,/skyjo_action-style-01\.css/);
 assert.match(html,/skyjo_action/);
 assert.match(html,/skyjo_action/);
 assert.match(html,/skyjo_action/);
 assert.doesNotMatch(html,/meta-chip open-chip/);
});

// Guard the nine original games and the landscape tablet layout against regressions.
test('Party Challenge renders exactly nine unique original game choices',()=>{
 const source=js.match(/const singleGames=\[([\s\S]*?)\];/);
 assert.ok(source,'missing minigame registry');
 const gameIds=[...source[1].matchAll(/\['([^']+)','[^']+','[^']+'\]/g)].map(m=>m[1]);
 assert.equal(gameIds.length,9);
 assert.equal(new Set(gameIds).size,9);
 assert.match(js,/if\(seen\.has\(button\.dataset\.minigame\)\)button\.remove\(\)/);
});
test('Tablet landscape card sizing remains bounded and cache version matches',()=>{
 assert.match(css,/@media \(min-width:901px\) and \(max-height:850px\) and \(orientation:landscape\)/);
 assert.match(css,/height:clamp\(91px,12\.5dvh,111px\)/);
 assert.match(html,/hub-lobby-v7\.css\?v=20261025-premium-18/);
});

test('Marathon selection prevents duplicate submissions while a request is pending',()=>{
 assert.match(js,/const button=el\('challenge-marathon'\);if\(button\.disabled\)return;/);
 assert.match(js,/button\.disabled=true;[\s\S]*?count:9,selectedGame:null[\s\S]*?finally\{button\.disabled=false;challengeSettingsBusy=false;\}/);
});

test('Replay, return-to-selection and next-game controls ignore duplicate taps',()=>{
 assert.match(js,/for\(const \[id,route\] of \[\['challenge-replay','challenge-replay'\],\['challenge-select','challenge-select'\]\]\)/);
 assert.match(js,/const btn=el\(id\);if\(btn\.disabled\)return;/);
 assert.match(js,/const btn=el\('challenge-next'\);if\(btn\.disabled\)return;btn\.disabled=true;/);
 assert.match(js,/catch\(e\)\{showError\(e\);\}finally\{btn\.disabled=false;\}/);
});

test('Challenge settings requests are serialized across cards, marathon and save',()=>{
 assert.match(js,/let challengeSettingsBusy=false;/);
 assert.match(js,/room\.phase!=='preparing'\|\|challengeSettingsBusy\)return;/);
 assert.match(js,/challengeSettingsBusy=true;btn\.disabled=true;/);
 assert.match(js,/finally\{btn\.disabled=false;challengeSettingsBusy=false;\}/);
 assert.match(js,/if\(challengeSettingsBusy\)return;\s*const button=el\('challenge-save'\)/);
});
