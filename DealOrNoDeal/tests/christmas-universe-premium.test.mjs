// Node-only checks for the shared Christmas portal / collection / ice universe.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {Script} from 'node:vm';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const portal=readFileSync(resolve(root,'weihnachtswelt.html'),'utf8');
const collection=readFileSync(resolve(root,'weihnachten.html'),'utf8');
const ice=readFileSync(resolve(root,'Weihnachtsevent2/index.html'),'utf8');
const shared=readFileSync(resolve(root,'css/christmas-universe-premium.css'),'utf8');
const spectacle=readFileSync(resolve(root,'js/christmas-spectacle-v2.js'),'utf8');
const nav=html=>html.match(/<nav class="event-tabs event-hub-nav"[^>]*>([\s\S]*?)<\/nav>/)?.[1]||'';
const count=(s,re)=>(s.match(re)||[]).length;

test('all three pages load identical premium universe styling after existing theme',()=>{
 assert.match(portal,/css\/christmas-event-hub\.css[^"']*"/);
 assert.match(ice,/css\/christmas-event-hub\.css[^"']*"/);
 assert.match(collection,/css\/christmas-event-hub\.css[^"']*"/);
 for(const html of [portal,collection,ice]){
  assert.match(html,/christmas-universe-premium\.css\?v=20261109-nested-nav-v1/);
  assert.equal(count(html,/id="christmas-effects-toggle"/g),1);
  assert.ok(html.indexOf('christmas-universe-premium.css')>html.indexOf('christmas-event-hub.css'));
 }
 assert.ok(collection.indexOf('christmas-universe-premium.css')>collection.indexOf('christmas-spectacle-v2.css'));
 assert.ok(ice.indexOf('christmas-universe-premium.css')>ice.indexOf('winter-studio-deluxe.css'));
});

test('common visual performance control shares the exact local preference across chapters',()=>{
 for(const html of [portal,collection,ice]){
  assert.match(html,/christmas-spectacle-v2\.js\?v=20261109-spectacle-v2/);
  assert.match(html,/christmas-spectacle-v2\.css\?v=20261109-spectacle-v2/);
 }
 assert.doesNotThrow(()=>new Script(spectacle));
 assert.match(spectacle,/spielportal\.christmas\.visualEffects\.v2/);
 assert.match(spectacle,/localStorage\?\.setItem/);
 assert.doesNotMatch(spectacle,/\bfetch\s*\(|\bXMLHttpRequest\s*\(/);
});

test('every Christmas page provides three main destinations and collection sub-tabs',()=>{
 const destinations=[
  /weihnachten\.html\?view=album/,
  /weihnachten\.html\?view=packs/,
  /Weihnachtsevent2\/index\.html/
 ];
 for(const re of destinations)assert.match(nav(portal),re);
 for(const re of destinations.slice(0,2))assert.match(nav(ice),re);
 assert.match(nav(ice),/href="\.\/index\.html" class="event2-tab" aria-current="page"/);
 assert.equal(count(nav(portal),/<a\b/g),3);
 assert.equal(count(nav(ice),/<a\b/g),3);
 assert.equal(count(nav(collection),/<button\b/g),2);
 assert.equal(count(nav(collection),/<a\b/g),1);
 assert.match(nav(collection),/data-main-view="collection"/);
 assert.match(nav(collection),/data-main-view="packs"/);
 const subnav=collection.match(/<nav id="event-collection-nav"[\s\S]*?<\/nav>/)?.[0]||'';
 assert.equal(count(subnav,/<button\b/g),4);
 for(const view of ['album','hammer','monster','bingo'])assert.ok(subnav.includes('data-view="'+view+'"'));
 assert.match(subnav,/role="tablist"/);
 assert.match(collection,/id="event-monster"/);
 assert.match(collection,/id="monster-exchange-btn"/);
 assert.match(collection,/const collectionViews=new Set\(\['album','hammer','monster','bingo'\]\)/);
 assert.match(collection,/history\.replaceState\(history\.state,'',url\)/);
 assert.match(nav(collection),/event2-tab/);
});

test('three main Christmas tabs fill the width consistently in all chapters',()=>{
 const hubCss=readFileSync(resolve(root,'css/christmas-event-hub.css'),'utf8');
 for(const page of [portal,collection,ice]){
  assert.match(page,/christmas-event-hub\.css\?v=20261109-unified-tabs-v2/);
  assert.equal(count(nav(page),/<(?:a|button)\b/g),3);
 }
 assert.match(hubCss,/nav\.event-hub-nav\.event-tabs\{[\s\S]*?grid-template-columns:repeat\(3,minmax\(0,1fr\)\)!important/);
 assert.doesNotMatch(hubCss,/grid-template-columns:repeat\(5,minmax\(0,1fr\)\)!important/);
 assert.match(hubCss,/body\.christmas-event-ice nav\.event-hub-nav\.event-tabs > \.event2-tab\[aria-current="page"\]/);
 assert.match(hubCss,/\.event-collection-nav\[hidden\]/);
 assert.match(collection,/id="event-collection-nav"/);
 assert.doesNotMatch(ice,/id="event-collection-nav"/);
});

test('world portal has direct pack, hammer and ice launch links, including room forwarding',()=>{
 for(const key of [
  'hub-cards-tab','hub-packs-tab','hub-ice-tab','hub-shortcut-packs','hub-shortcut-hammer','hub-shortcut-ice'
 ]){
  assert.equal(count(portal,new RegExp('id="'+key+'"','g')),1,key);
  assert.match(portal,new RegExp("'"+key+"'"));
 }
 assert.match(portal,/id="hub-shortcut-hammer"[^>]*href="\.\/weihnachten\.html\?view=hammer"/);
 assert.match(portal,/id="hub-shortcut-ice" href="\.\/Weihnachtsevent2\/index\.html"/);
 assert.match(portal,/const room=ROOM\.test\(provided\|\|''\)\?provided:ROOM\.test\(saved\|\|''\)\?saved:null/);
 assert.match(portal,/url\.searchParams\.set\('room',room\)/);
 assert.match(ice,/sessionStorage\.setItem\('deal-active-room',room\)/);
 assert.match(collection,/sessionStorage\.setItem\("deal-active-room",room\)/);
});

test('portal counters match the expanded 64-card / 40-Bingo Nordpol collection',()=>{
 assert.match(portal,/id="hub-collected">– \/ 64/);
 assert.match(portal,/id="hub-bingos">– \/ 40/);
 assert.match(portal,/id="hub-album-meter"[^>]*>/);
 assert.match(portal,/const collected=clamp\(values\.collected,64\),bingos=clamp\(values\.bingos,40\)/);
 assert.match(portal,/meter\.querySelector\('i'\)\.style\.width=\(collected\/64\*100\)/);
 assert.match(collection,/id="album-grid-third"/);
 assert.match(collection,/id="album-grid-fourth"/);
 assert.match(collection,/id="album-owned-total">0 \/ 64/);
 assert.match(collection,/id="album-bingo-total">0 \/ 40/);
});

test('transitions are native and progressive, with a no-motion fallback',()=>{
 assert.match(shared,/@view-transition\{navigation:auto\}/);
 assert.match(shared,/::view-transition-old\(root\)/);
 assert.match(shared,/::view-transition-new\(root\)/);
 assert.match(shared,/@media\(prefers-reduced-motion:reduce\)/);
 assert.match(shared,/@view-transition\{navigation:none\}/);
 assert.match(shared,/xmas-world-arrive/);
 assert.match(shared,/body\[data-xmas-effects=soft\]/);
 assert.match(shared,/body\[data-xmas-effects=off\]/);
 assert.doesNotMatch(shared,/:is\([^)]*::(?:before|after)/);
 assert.doesNotMatch(shared,/url\(\s*["']?https?:/);
});

test('navigation responsive, ice board remains visible and controls stay accessible',()=>{
 assert.match(shared,/grid-template-columns:repeat\(3,minmax\(0,1fr\)\)!important/);
 assert.match(shared,/@media\(max-width:760px\)/);
 assert.doesNotMatch(shared,/grid-template-columns:repeat\(5,minmax\(0,1fr\)\)!important/);
 assert.match(shared,/\.event2-tab\{grid-column:auto!important\}/);
 assert.match(shared,/focus-visible/);
 assert.match(ice,/id="ice-online-panel"/);
 assert.match(ice,/id="event2-fullscreen"/);
 assert.match(ice,/id="event2-refresh"/);
 assert.match(ice,/online-ice\.js\?v=/);
 assert.match(ice,/class="xmas-universe-ice-ribbon"/);
});

test('rewards, profiles, receipts and backend activity remain delegated to existing handlers',()=>{
 assert.match(collection,/request\('POST','open',\{packId:pack,requestId:getPurchaseId\(pack\)\}\)/);
 assert.match(collection,/request\('POST','hammer\/claim'\)/);
 assert.match(portal,/getCache\(kind,uid\)/);
 assert.match(portal,/if\(loading\)return/);
 assert.match(ice,/id="event-guide-close"/);
 assert.match(ice,/id="event-world-link"/);
 assert.doesNotMatch(shared,/\bfetch\s*\(/);
 assert.doesNotMatch(shared.replace(/\/\*[\s\S]*?\*\//g,''),/firebase|firestore/i);
});
