import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const html=read('Skyjo/skyjo_start.html');
const css=read('Skyjo/skyjo_start.css');
const js=read('Skyjo/skyjo_start.js');
const hub=read('hub-lobby.js');
const home=read('spielauswahl-online.js');
const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(x=>x[1]);
test('Screenshot-like SKYJO start mask is separate responsive HTML/CSS',()=>{
 assert.match(html,/SKYJO/);
 assert.match(html,/Spiel-Lobby/);
 assert.match(html,/Spieleinstellungen/);
 assert.match(html,/Warte auf Spieler/);
 assert.match(html,/Spielbrett auswählen/);
 assert.match(css,/\.sj-grid/);
 assert.match(css,/@media\(max-width:650px\)/);
 assert.equal((html.match(/<div\b/g)||[]).length,(html.match(/<\/div>/g)||[]).length);
});
test('No duplicate or missing UI elements referenced in new controller',()=>{
 assert.equal(new Set(ids).size,ids.length);
 const missing=[...js.matchAll(/\$\('([^']+)'\)/g)].map(m=>m[1]).filter(x=>!ids.includes(x));
 assert.deepEqual([...new Set(missing)],[]);
});
test('UI includes all the illustrated reference settings and four future board previews',()=>{
 for(const key of ['target','jokerCount','streetModeEnabled','jokerEnabled','beginner'])assert.ok(html.includes('data-key="'+key+'"'),key);
 for(const key of ['streetScoring','specialCards','maxPlayers'])assert.ok(html.includes('data-key="'+key+'"'),key);
 for(const board of ['classic','strand','berge','neon'])assert.ok(html.includes('data-board="'+board+'"'),board);
 assert.equal((html.match(/class="sj-board(?: active)?"/g)||[]).length,4);
});
test('Unsupported settings remain preview-only and do not change game rules',()=>{
 assert.match(html,/weiteren Spielbretter sind als Designvorschau vorbereitet/i);
 assert.match(html,/Weitere Wertungen sind noch nicht im Spiel verfügbar/);
 assert.match(js,/const supported=\['target','jokerCount','streetModeEnabled','jokerEnabled','beginner'\]/);
 assert.doesNotMatch(js,/mutate\('\/skyjo-settings'.*?(?:streetScoring|specialCards)/);
});
test('All settings changes use authenticated server endpoints with server-host restrictions',()=>{
 assert.match(js,/user\.getIdToken\(\)/);
 assert.match(js,/identity\(\)\?\.uid!==uid/);
 assert.match(js,/if\(!room\?\.host\|\|updating\(\)/);
 assert.match(js,/mutate\('\/skyjo-settings'/);
 assert.match(js,/mutate\('\/seats'/);
 assert.match(js,/mutate\('\/ready'/);
 assert.match(js,/mutate\('\/start'/);
 assert.match(js,/match:m\.id/);
});
test('Skyjo selected from online home opens the dedicated mask, other games remain unchanged',()=>{
 assert.match(home,/Skyjo\/skyjo_start\.html\?room=/);
 assert.match(home,/hub-lobby\.html\?room=/);
 assert.match(hub,/Skyjo\/skyjo_start\.html\?room=/);
});
test('Automatic ready start preserved, spectators cannot mark themselves ready',()=>{
 assert.match(js,/me\?\.participating/);
 assert.match(js,/if\(!me\?\.participating\|\|updating\(\)\)return/);
 assert.match(js,/if\(data\.phase==='playing'&&data\.match\?\.participating\)/);
 assert.match(js,/Die Partie wird gestartet|Partie wird gestartet/);
 assert.match(js,/Bereitmeldung/);
});
test('Player list, room sharing, and WebSocket lobby reconnect are supported',()=>{
 assert.match(html,/id="players-list"/);
 assert.match(html,/id="invite-button"/);
 assert.match(html,/id="copy-code-btn"/);
 assert.match(js,/navigator\.share/);
 assert.match(js,/\/hub'/);
 assert.match(js,/type:'subscribe'/);
 assert.match(js,/setInterval\(refresh,4000\)/);
});
test('SKYJO room supports validated 2-3 participants, not fictitious four-person launch',()=>{
 assert.match(js,/room\.maxPlayers\|\|3/);
 assert.match(js,/mindestens zwei Spieler/);
 assert.match(html,/3 Spieler/);
});
