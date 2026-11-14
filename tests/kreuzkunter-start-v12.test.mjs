import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const html=read('KreuzKunter/kreuzkunter_start.html');
const css=read('KreuzKunter/kreuzkunter_start.css');
const js=read('KreuzKunter/kreuzkunter_start.js');
const home=read('spielauswahl-online.js'),hub=read('hub-lobby.js');
const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
test('Reference-inspired KreuzKunter start mask: header, players, paper grid, dice, settings, start',()=>{
 for(const id of ['room-code','copy-code','invite-link','invite-qr','player-list','player-count','board-grid','ready-btn','start-btn','status','qr-modal'])assert.ok(ids.includes(id),id);
 for(const word of ['Rundenanzahl','Zeitlimit pro Zug','Glückswürfel','Hilfen anzeigen','Reihenfolge mischen','Spiel starten'])assert.ok(html.includes(word),word);
 assert.equal((html.match(/class="visual-die /g)||[]).length,6);
 assert.match(css,/@media\(max-width:700px\)/);
 assert.match(css,/game-backgrounds\/kreuzkunter\.webp/);
});
test('No duplicate or missing elements and valid JavaScript',()=>{
 assert.equal(new Set(ids).size,ids.length);
 const missing=[...js.matchAll(/\$\('([^']+)'\)/g)].map(x=>x[1]).filter(id=>!ids.includes(id));
 assert.deepEqual([...new Set(missing)],[]);
 assert.doesNotThrow(()=>new Function(js));
 assert.equal((html.match(/<div\b/g)||[]).length,(html.match(/<\/div>/g)||[]).length);
});
test('Draws authentic KreuzKunter 7 by 15 original color pattern rather than a fake board',()=>{
 const original=read('KreuzKunter/kreuzkunter.html');
 const match=original.match(/const ROWS=(\[[^;]+\]);/);
 assert.ok(match,'original board rows present');
 const existing=JSON.parse(match[1]);
 const preview=js.match(/const COLOR_ROWS=(\[[\s\S]*?\]);/);
 assert.ok(preview,'board preview rows present');
 const actual=new Function('return '+preview[1])();
 assert.deepEqual(actual,existing);
 assert.equal(actual.reduce((n,row)=>n+row.length,0),105);
 assert.match(html,/Beispielkreuze/);
});
test('Unsupported round, timer and bonus options are clearly preview only and disabled',()=>{
 assert.match(html,/Vorschau · KreuzKunter endet/);
 assert.match(html,/Zeitlimits sind noch nicht/);
 assert.match(html,/Spielkern/);
 assert.equal((html.match(/<button type="button" disabled>/g)||[]).length,6);
 assert.doesNotMatch(js,/\/kreuz-settings|\/settings.*rounds/);
});
test('Firebase verified room membership, private match code and authenticated start',()=>{
 assert.match(js,/getIdToken\(\)/);
 assert.match(js,/Authorization:'Bearer '/);
 assert.match(js,/\/api\/hub\/rooms\/'\+roomCode/);
 assert.match(js,/\/seats'/);
 assert.match(js,/\/ready'/);
 assert.match(js,/\/start'/);
 assert.match(js,/room\.host&&room\.phase==='preparing'/);
 assert.match(js,/if\(r\.phase==='playing'&&r\.match\?\.participating\)/);
 assert.match(js,/new URLSearchParams\(\{hub:r\.code,match:m\.id,gameCode:m\.gameCode\}\)/);
});
test('Shares room invitations via real offline QR library without external QR API',()=>{
 assert.match(html,/src="qrcode\.min\.js"/);
 assert.match(js,/new QRCode\(target,/);
 assert.match(js,/hub-lobby\.html\?invite=/);
 assert.match(js,/navigator\.share/);
 assert.match(js,/navigator\.clipboard/);
 assert.match(read('KreuzKunter/QR_CODE_LICENSE.txt'),/MIT License/);
});
test('Online selection opens branded KreuzKunter pre-room without changing other games',()=>{
 assert.match(home,/game==='kreuz'\?'KreuzKunter\/kreuzkunter_start\.html/);
 assert.match(hub,/location\.replace\('KreuzKunter\/kreuzkunter_start\.html/);
 assert.match(home,/Barikade\/barikade_start\.html/);
 assert.match(home,/Business\/business_start\.html/);
 assert.match(home,/Skyjo\/skyjo_start\.html/);
 assert.match(read('spielauswahl-lokal.html'),/KreuzKunter\/kreuzkunter\.html\?mode=local/);
});
test('Online updates use live WebSocket and HTTP fallback, and no local profile clone',()=>{
 assert.match(js,/type:'subscribe',code:roomCode,profileIdToken:token/);
 assert.match(js,/setInterval\(refresh,4500\)/);
 assert.match(js,/SPECTATOR_CANNOT_READY/);
 assert.doesNotMatch(js,/localStorage\.setItem/);
});
