import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {runInNewContext} from 'node:vm';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const html=readFileSync(resolve(root,'game.html'),'utf8');
const event=readFileSync(resolve(root,'weihnachten.html'),'utf8');
const begin=html.indexOf('  const christmasArt=[');
const end=html.indexOf('  const showCards=()=>{',begin);
if(begin<0||end<=begin)throw Error('Game Christmas art catalog not found');
const fragment=html.slice(begin,end);
function catalog(){
 let calls=0;
 const context={
  reward:{revealed:[]},
  window:{ChristmasCardImages:{prefetch(){calls++}}}
 };
 const mapped=runInNewContext(fragment+'\n({christmasArt,gameCardArt})',context);
 return {mapped,calls};
}
test('multiplayer pack display resolves every card from christmas-01 through christmas-96',()=>{
 const {mapped,calls}=catalog();
 assert.equal(mapped.christmasArt.length,96);
 assert.equal(calls,1,'already-credited cards are prefetched, not re-awarded');
 const urls=[];
 for(let i=1;i<=96;i++){
  const id='christmas-'+String(i).padStart(2,'0');
  const url=mapped.gameCardArt({id});
  assert.ok(url,'image missing for '+id);
  assert.ok(existsSync(resolve(root,url)),'file missing for '+id+': '+url);
  if(i<=32)assert.match(url,/^assets\/weihnachts_event\/.*\.png$/);
  else if(i<=64)assert.equal(url,'Weihnachtsevent2/Weihnachtsbilder/card-'+i+'.webp');
  else assert.match(url,/^Weihnachtsevent2\/Weihnachtsbilder\/images(?:-\d+)?\.jpeg$/);
  urls.push(url);
 }
 assert.equal(new Set(urls).size,96,'each card has its own image');
 assert.equal(mapped.gameCardArt({id:'christmas-97'}),null);
 assert.equal(mapped.gameCardArt({id:'other'}),null);
});
test('banker bonus and finale share reliable cards without icon-only broken image fallback',()=>{
 assert.match(html,/christmas-card-image-loader\.js\?v=20261109-cards-retry-v2/);
 assert.match(fragment,/ChristmasCardImages\?\.prefetch\(reward\.revealed\|\|\[\],0,gameCardArt/);
 assert.match(html,/window\.ChristmasCardImages\?\.guard\(picture\)/);
 assert.match(html,/window\.ChristmasCardImages\.show\(picture,url\)/);
 assert.match(html,/window\.ChristmasCardImages\?\.guard\(specialArt\)/);
 assert.match(html,/window\.ChristmasCardImages\.show\(specialArt,url\)/);
 assert.doesNotMatch(html,/picture\.replaceWith\(document\.createTextNode\(rarityIcons/);
 assert.match(html,/if\(directBankerPack\)showCards\(\)/);
 assert.match(html,/special\.forEach\(\(card,i\)=>/);
 assert.match(html,/const artFile=artIndex>=0\?christmasArt\[artIndex\]:null/);
 assert.match(event,/card-'\+String\(index\+1\)\.padStart\(2,'0'\)\+'\.webp'/);
});
