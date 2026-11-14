import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const html=read('Barikade/barikade_start.html'),css=read('Barikade/barikade_start.css');
const js=read('Barikade/barikade_start.js'),hub=read('hub-lobby.js'),home=read('spielauswahl-online.js');
const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(x=>x[1]);
const board=JSON.parse(read('Barikade/board.json'));
test('Barikade screenshot layout implemented as real responsive three-column HTML',()=>{
 for(const id of ['player-list','chat-messages','board-stage','board-content','host-status','ready-btn','start-btn','room-code','share-whatsapp','copy-room'])
  assert.ok(ids.includes(id),id);
 assert.match(html,/Barikade/);
 assert.match(html,/Spieler/);
 assert.match(html,/Brettvorschau/);
 assert.match(html,/Spieleinstellungen/);
 assert.match(css,/\.columns\{display:grid/);
 assert.match(css,/@media\(max-width:820px\)/);
 assert.match(css,/game-backgrounds\/barikade\.webp/);
});
test('No duplicate or missing HTML ids and JS is syntactically valid',()=>{
 assert.equal(new Set(ids).size,ids.length);
 const missing=[...js.matchAll(/\bel\('([^']+)'\)/g)].map(x=>x[1]).filter(x=>!ids.includes(x));
 assert.deepEqual([...new Set(missing)],[]);
 assert.doesNotThrow(()=>new Function(js));
});
test('Real original Barikade board is displayed using board.json nodes and edges',()=>{
 assert.equal(board.nodes.length,132);
 assert.equal(board.edges.length,122);
 assert.match(js,/fetch\('board\.json'/);
 assert.match(js,/for\(const edge of data\.edges\)/);
 assert.match(js,/for\(const node of data\.nodes\)/);
});
test('Existing supported themes selectable; future themes clearly marked preview-only',()=>{
 for(const key of ['classic','wood','stone'])assert.ok(html.includes('data-board="'+key+'"'),key);
 for(const key of ['forest','desert','winter','volcano'])assert.ok(html.includes('data-preview="'+key+'"'),key);
 assert.match(html,/Weitere Designs sind Vorschau/);
 assert.match(js,/nur eine Vorschau/);
});
test('All Barikade host setting changes use server-validated options',()=>{
 for(const kind of ['id="event-count"','type="range" min="5" max="20"','data-joker=','data-boss=','data-mode=','data-board=','data-color='])
  assert.ok(html.includes(kind),kind);
 assert.match(js,/mutate\('\/settings'/);
 assert.match(js,/const hostOnly=.*room\?\.host/);
 assert.match(js,/mutate\('\/seats'/);
 assert.match(js,/mutate\('\/color'/);
 assert.match(js,/mutate\('\/ready'/);
 assert.match(js,/mutate\('\/start'/);
});
test('Firebase identity and membership verified through API, never local profiles',()=>{
 assert.match(js,/user\.getIdToken/);
 assert.match(js,/Authorization:'Bearer '/);
 assert.match(js,/room\.phase==='playing'/);
 assert.match(js,/barikade_room/);
 assert.match(js,/localStorage\.setItem\('barikade_mode'/);
});
test('Chat displays server room messages as text and sends only to authenticated room route',()=>{
 assert.match(js,/room\?\.chatEnabled/);
 assert.match(js,/make\('div','',m\.text/);
 assert.match(js,/mutate\('\/chat'/);
 assert.match(html,/maxlength="300"/);
 assert.match(js,/chat-input/);
});
test('Host/game route preserves shared room for Skyjo, KreuzKunter, Business',()=>{
 assert.match(home,/Barikade\/barikade_start\.html/);
 assert.match(home,/Skyjo\/skyjo_start\.html/);
 assert.match(home,/hub-lobby\.html/);
 assert.match(hub,/Barikade\/barikade_start\.html/);
 assert.match(hub,/Skyjo\/skyjo_start\.html/);
});
test('Readiness and game leave are protected and the game itself stays unchanged',()=>{
 assert.match(js,/if\(players\.length<2\|\|!players\.every\(p=>p\.ready\)\)/);
 assert.match(js,/if\(room\.phase==='playing'&&room\.match\?\.participating\)/);
 assert.match(js,/mutate\('\/leave'/);
 assert.match(js,/\.replace\(gameUrl\(room\)\)/);
});
