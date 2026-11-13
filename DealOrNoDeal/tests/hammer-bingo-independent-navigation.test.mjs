import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=file=>readFileSync(new URL('../'+file,import.meta.url),'utf8');

test('Hammer-Bingo is again visible and directly reachable from the Christmas world and DOG season 2',()=>{
 const hub=read('weihnachtswelt.html');
 assert.match(hub,/<a id="hub-hammer-bingo-tab" href="\.\/weihnachten\.html\?view=hammer">🔨 Hammer-Bingo<\/a>/);
 assert.match(hub,/<a id="hub-shortcut-hammer-bingo" href="\.\/weihnachten\.html\?view=hammer">/);
 assert.match(hub,/<a class="hub-launch" id="hub-enter-hammer-bingo" href="\.\/weihnachten\.html\?view=hammer">/);
 assert.match(hub,/<a href="\.\/weihnachten\.html\?view=hammer">🔨 Hammer-Bingo \(separat\)<\/a>/);
 assert.match(hub,/Hammer-Bingo bleibt eigenständig und zählt nicht für DOG-Turnier oder DOG-Super-Slots/);
});

test('Hammer-Bingo keeps its own working page and is no longer redirected to DOG collection',()=>{
 const legacy=read('weihnachten.html');
 assert.match(legacy,/\['monster','hats','hammer'\]\.includes\(view\)/);
 assert.match(legacy,/data-view="hammer" aria-controls="event-hammers"/);
 assert.match(legacy,/<section id="event-hammers" aria-labelledby="hammer-heading">/);
 assert.match(legacy,/body\[data-view=hammer\] #event-hammers\{display:block\}/);
 assert.match(legacy,/if\(\['album','packs','bingo'\]\.includes\(view\)\)/);
 assert.doesNotMatch(legacy,/\['album','packs','hammer','bingo'\]\.includes\(view\)/);
 assert.match(legacy,/const collectionViews=new Set\(\['album','hammer','monster','hats','bingo'\]\)/);
});

test('DOG career and tournament only observe six DOG boards, never legacy Hammer-Bingo progress',()=>{
 const dog=read('js/dog-album-season2.js');
 assert.match(dog,/progress\.completedTotal/);
 assert.match(dog,/progress\.superSlotTickets/);
 assert.doesNotMatch(dog,/hammerBingoProgress|hammerBingoClaimed|hammerBingoCycles|hammerProgress/);
 const hub=read('weihnachtswelt.html');
 assert.match(hub,/Nur DOG-Sammelkarten zählen – kein Hammer-Bingo/);
});
