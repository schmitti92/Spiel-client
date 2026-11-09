// Run: node --test DealOrNoDeal/tests/christmas-pack-cinema.test.mjs
// Strictly presentation-only checks: server controls prices, draws, receipts, and awards.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {Script} from 'node:vm';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const html=readFileSync(resolve(root,'weihnachten.html'),'utf8');
const js=readFileSync(resolve(root,'js/christmas-pack-cinema.js'),'utf8');
const css=readFileSync(resolve(root,'css/christmas-pack-cinema.css'),'utf8');
const inline=html.match(/<script>([\s\S]*?)<\/script>/)?.[1]||'';
const between=(a,b)=>{
 const i=inline.indexOf(a),j=inline.indexOf(b,i+a.length);
 assert.ok(i>=0&&j>i,a+' => '+b);
 return inline.slice(i,j);
};

test('both new files parse, load on the live Christmas page, and expose correct nodes',()=>{
 assert.doesNotThrow(()=>new Script(js));
 assert.doesNotThrow(()=>new Script(inline));
 assert.match(html,/christmas-pack-cinema\.css\?v=/);
 assert.match(html,/christmas-pack-cinema\.js\?v=/);
 for(const id of [
  'pack-cinema-preview','pack-cinema-sound','pack-cinema-progress',
  'pack-cinema-progress-fill','pack-cinema-summary-stats','pack-cinema-note',
  'pack-cinema-rarity-title','pack-cinema-kicker','pack-cinema-subtitle',
  'pack-cinema-particles','reveal-overlay','reveal-panel','reveal-present',
  'reveal-card','reveal-image','reveal-name','reveal-rarity',
  'reveal-new-badge','reveal-counter','reveal-next','reveal-skip','reveal-close',
  'reveal-summary','reveal-bingo-awards'
 ]){
  assert.equal((html.match(new RegExp('id="'+id+'"','g'))||[]).length,1,id);
 }
});

test('cinematic is network-free; gift artwork does not award or purchase cards',()=>{
 assert.doesNotMatch(js,/\bfetch\s*\(/);
 assert.doesNotMatch(js,/\bXMLHttpRequest\s*\(/);
 assert.doesNotMatch(js,/\bFirestore\b|\bfirebase\b/i);
 assert.doesNotMatch(js,/\bPOST\b/);
 assert.doesNotMatch(js,/\bwallet\b|\brequestId\b/);
 assert.match(js,/window\.ChristmasPackCinema=Object\.freeze/);
 assert.match(js,/prefers-reduced-motion: reduce/);
 assert.match(js,/new Promise\(resolve=>setTimeout/);
});

test('real packages preserve idempotent purchase and accurate server-supplied card lists',()=>{
 assert.match(inline,/getPurchaseId\(pack\)/);
 assert.match(inline,/clearPurchaseId\(pack\)/);
 assert.match(inline,/request\('POST','open',\{packId:pack,requestId:getPurchaseId\(pack\)\}\)/);
 assert.match(inline,/const revealed=result\.revealed\.map\(c=>\(\{\.\.\.c\}\)\)/);
 assert.match(inline,/openReveal\(revealed,'real',pack\)/);
 assert.match(inline,/request\('GET','me'\)/);
 assert.match(inline,/request\('POST','hammer\/claim'\)/);
});

test('skip and close cancel in-progress gift animations safely',()=>{
 const open=between('function openReveal(revealed','function finishReveal()');
 const finish=between('function finishReveal()','async function revealNext()');
 const next=between('async function revealNext()',"next.addEventListener('click'");
 assert.match(open,/revealMotionToken\+\+/);
 assert.match(finish,/revealMotionToken\+\+/);
 assert.match(next,/revealMotionBusy=true;next\.disabled=true/);
 assert.match(next,/token!==revealMotionToken\|\|revealState!==state/);
 assert.match(next,/next\.disabled=false;revealMotionBusy=false/);
 assert.match(inline,/skip\.addEventListener\('click',finishReveal\)/);
 assert.match(inline,/document\.dispatchEvent\(new Event\('christmas-pack-reveal-closed'\)\)/);
});

test('all four rarity scenes and legendary spotlight have real visuals',()=>{
 for(const rarity of ['common','rare','epic','legendary']){
  assert.match(js,new RegExp(rarity+':\\{name:'));
 }
 for(const component of [
  '.pack-cinema-gift-lid','.pack-cinema-gift-bow','.pack-cinema-gift-ribbon-h',
  '.pack-cinema-gift-ribbon-v','.pack-cinema-gift-seal',
  '.reveal-card.legendary','.reveal-card.epic','.reveal-card.rare',
  'pc-gift-shake','pc-lid-open','pc-card-reveal','pc-summary-pop'
 ]) assert.ok(css.includes(component),component);
 assert.match(css,/@media\(max-width:700px\)/);
 assert.match(css,/@media\(max-height:600px\)/);
 assert.match(css, /prefers-reduced-motion:reduce/);
});

test('demo uses fixed local preview without paying, purchasing or claiming',()=>{
 const demo=between("document.getElementById('pack-cinema-preview')","document.addEventListener('keydown'");
 assert.match(demo,/openReveal\(demo,'demo','premium'\)/);
 assert.doesNotMatch(demo,/\brequest\(/);
 assert.match(demo,/legendary/);
 assert.match(inline,/state\.mode==='demo'\?'🎬 '/);
 assert.match(js,/🎬 DEMO · KEINE GUTSCHRIFT/);
 assert.match(js,/keine Buchung, keine Karten und kein Spielgeld verändert/);
});

test('classic collection, Hammer Bingo, and other UI stay intact',()=>{
 assert.match(html,/id="album-grid-first"/);
 assert.match(html,/id="album-grid-second"/);
 assert.match(html,/id="hammer-board-common"/);
 assert.match(html,/id="hammer-board-mixed"/);
 assert.match(html,/id="hammer-cinema"/);
 assert.match(html,/id="event-fullscreen"/);
 assert.match(html,/id="event-refresh"/);
 for(const image of ['geschenk_gold.png','08_wichtelwerkstatt.png','10_eisschloss.png']){
  assert.ok(existsSync(resolve(root,'assets/weihnachts_event',image)),image);
 }
});
