import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const text=(path)=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const html=text('hub-lobby.html');
const js=text('hub-lobby.js');
const css=text('hub-lobby-v7.css');
const barikade=text('Barikade/barikade.html');
const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(x=>x[1]);
test('No duplicate or missing HTML elements referenced by room controller',()=>{
 assert.equal(new Set(ids).size,ids.length);
 const missing=[...js.matchAll(/\bel\('([^']+)'\)/g)].map(x=>x[1]).filter(id=>!ids.includes(id));
 assert.deepEqual([...new Set(missing)],[]);
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
