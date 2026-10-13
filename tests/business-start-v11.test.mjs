import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const html=read('Business/business_start.html'),css=read('Business/business_start.css');
const js=read('Business/business_start.js');
const home=read('spielauswahl-online.js'),hub=read('hub-lobby.js');
const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
test('Three-column photo-like Business design is a real responsive HTML interface',()=>{
 for(const id of ['players-list','chat-content','room-code','preview-dice','round-buttons','theme-preview','ready-btn','start-btn','invite-btn','leave-btn','status'])assert.ok(ids.includes(id),id);
 assert.match(html,/KAUFEN/);assert.match(html,/INVESTIEREN/);assert.match(html,/KASSIEREN/);
 assert.match(html,/ÜBERSICHT DER BRANCHEN/);
 assert.match(css,/\.biz-layout\{display:grid/);
 assert.match(css,/@media\(max-width:780px\)/);
 assert.match(css,/game-backgrounds\/business\.webp/);
});
test('No duplicate IDs, missing referenced elements or syntax errors',()=>{
 assert.equal(new Set(ids).size,ids.length);
 const referenced=[...js.matchAll(/\$\('([^']+)'\)/g)].map(x=>x[1]);
 assert.deepEqual([...new Set(referenced.filter(x=>!ids.includes(x)))],[]);
 assert.doesNotThrow(()=>new Function(js));
 assert.equal((html.match(/<div\b/g)||[]).length,(html.match(/<\/div>/g)||[]).length);
});
test('Server-authorized 10 / 20 / 30 round selection with real host permission',()=>{
 for(const n of [10,20,30])assert.ok(html.includes('data-rounds="'+n+'"'));
 assert.match(js,/room\.host&&room\.phase==='preparing'/);
 assert.match(js,/mutate\('\/business-settings',\{settings:\{rounds:Number\(btn\.dataset\.rounds\)\}\}\)/);
 assert.match(js,/user\.getIdToken\(\)/);
 assert.match(js,/Authorization:'Bearer '/);
});
test('Business market art, branch previews, and five plus one dice present',()=>{
 assert.equal((html.match(/class="sample-card/g)||[]).length,4);
 assert.equal((html.match(/class="die"/g)||[]).length,5);
 assert.equal((html.match(/class="branch-tile /g)||[]).length,8);
 assert.match(html,/Beispielvorschau/);
});
test('Unimplemented extra rules and chat controls cannot misrepresent implemented features',()=>{
 assert.match(html,/Diese Sonderregeln sind noch nicht separat konfigurierbar/);
 assert.match(html,/disabled aria-label="Chatnachricht"/);
 assert.match(html,/Noch nicht/gi); // all future controls visibly marked
 assert.doesNotMatch(js,/mutate\('\/settings'/);
 assert.doesNotMatch(js,/mutate\('\/chat'/);
});
test('All connected players can ready, only host can assign seats and manually start',()=>{
 assert.match(js,/mutate\('\/seats'/);
 assert.match(js,/mutate\('\/ready'/);
 assert.match(js,/mutate\('\/start'/);
 assert.match(js,/room\.host&&playing\.length>=2&&ready===playing\.length/);
 assert.match(js,/room\.phase==='playing'&&room\.match\?\.participating/);
});
test('The existing match URL and central lobby code remain intact',()=>{
 assert.match(js,/new URLSearchParams\(\{hub:r\.code,match:m\.id,gameCode:m\.gameCode\}\)/);
 assert.match(js,/business_online\.html\?/);
 assert.match(js,/^const roomLocation=.*Business\/business_start\.html/m);
 assert.match(hub,/Business\/business_start\.html\?room=/);
});
test('Authenticated WebSocket and HTTP room updates remain available',()=>{
 assert.match(js,/type:'subscribe',code,profileIdToken:token/);
 assert.match(js,/setInterval\(poll,4500\)/);
 assert.match(js,/\/api\/hub\/rooms\/'\+code/);
 assert.match(js,/identity|profile/);
});
test('Existing local Business mode and its gameplay file are unmodified',()=>{
 assert.match(read('spielauswahl-lokal.html'),/Business\/business_local\.html/);
 assert.match(html,/business_start\.js/);
});
