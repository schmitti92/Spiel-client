import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {Script} from 'node:vm';

const base=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const read=path=>readFileSync(resolve(base,path),'utf8');
const page=read('weihnachten.html');
const loader=read('js/christmas-card-image-loader.js');
const css=read('css/christmas-pack-cinema.css');
const inline=page.match(/<script>([\s\S]*?)<\/script>/)?.[1]||'';

function mockLoader(){
 const requests=[],timeouts=new Map();
 let serial=0;
 class FakeImage {
  constructor(){this.complete=false;this.naturalWidth=0;this.onload=null;this.onerror=null;}
  set src(value){this._src=value;requests.push(this)}
  get src(){return this._src}
  decode(){return Promise.resolve()}
 }
 const context={
  window:{},
  Image:FakeImage,
  setTimeout:(fn,ms)=>{const id=++serial;timeouts.set(id,{fn,ms});return id},
  clearTimeout:id=>timeouts.delete(id)
 };
 new Script(loader,{filename:'christmas-card-image-loader.js'}).runInNewContext(context);
 return {api:context.window.ChristmasCardImages,requests,timeouts};
}
test('new art loader is network/API-free and linked before the inline Christmas page',()=>{
 assert.doesNotThrow(()=>new Script(loader));
 assert.doesNotMatch(loader,/\bfetch\s*\(/);
 const executable=loader.replace(/\/\*[\s\S]*?\*\//g,'').replace(/^\s*\/\/.*$/gm,'');
 assert.doesNotMatch(executable,/\bFirestore\b|\bfirebase\b/i);
 assert.match(page,/js\/christmas-card-image-loader\.js\?v=20261109-cards-retry-v2/);
 assert.match(inline,/ChristmasCardImages\?\.prefetch\(array,0,christmasCardImage,2\)/);
 assert.match(inline,/const artworkPromise=window\.ChristmasCardImages\?\.load\(artwork\)/);
 assert.match(inline,/await artworkPromise/);
 assert.match(inline,/bigImage\.src=artResult\.src/);
 assert.match(inline,/window\.ChristmasCardImages\?\.guard\(img\)/);
 assert.match(css,/card-back-winter\.svg/);
});
test('large card is decoded before its promise resolves; same asset is downloaded once',async()=>{
 const {api,requests}=mockLoader();
 const first=api.load('./big-winter-picture.png');
 const second=api.load('./big-winter-picture.png');
 assert.equal(requests.length,1,'same path must be reused in a single pack');
 assert.equal(first,second);
 let revealed=false;void first.then(()=>{revealed=true});
 await Promise.resolve();
 assert.equal(revealed,false,'card must not appear while image is still downloading');
 requests[0].naturalWidth=1400;
 requests[0].complete=true;
 requests[0].onload();
 assert.equal((await first).src,'./big-winter-picture.png');
 assert.equal(revealed,true);
});
test('only two upcoming cards are prefetched, not the entire 96-card album',()=>{
 const {api,requests}=mockLoader();
 const cards=Array.from({length:50},(_,i)=>({id:i}));
 api.prefetch(cards,0,c=>'./card-'+c.id+'.png',2);
 assert.deepEqual(requests.map(x=>x.src),['./card-0.png','./card-1.png']);
 api.prefetch(cards,1,c=>'./card-'+c.id+'.png',2);
 assert.deepEqual(requests.map(x=>x.src),['./card-0.png','./card-1.png','./card-2.png']);
});
test('failed artwork shows a winter card rather than blank and can be retried later',async()=>{
 const {api,requests}=mockLoader();
 const a=api.load('./temporarily-missing.png');
 requests[0].onerror();
 const result=await a;
 assert.equal(result.ok,false);
 assert.equal(result.src,api.FALLBACK);
 void api.load('./temporarily-missing.png');
 assert.equal(requests.length,2,'network errors must not permanently poison cache');
 const image={
  _src:'./temporarily-missing.png',title:'',dataset:{},
  classList:{items:new Set(),add(x){this.items.add(x)},remove(x){this.items.delete(x)}},
  getAttribute(){return this._src},
  set src(v){this._src=v},
  get src(){return this._src}
 };
 api.guard(image);image.onerror();
 assert.match(image.src,/temporarily-missing\.png\?art_retry=1$/);
 image.onerror();
 assert.equal(image.src,api.FALLBACK);
 assert.match(image.title,/nicht geladen/);
 assert.ok(image.classList.items.has('card-art-unavailable'));
});
test('all 96 awarded card IDs have an existing exact image path in GitHub',()=>{
 const cardsChunk=page.slice(page.indexOf('const cards=[['),page.indexOf('const albumAsset=file=>'));
 const hammerChunk=page.slice(page.indexOf('const hammerBingoArtwork=[['),page.indexOf('function renderHammerCardPreviews()'));
 const cardFiles=Array.from(cardsChunk.matchAll(/\[\s*"([^"]+)"\s*,\s*"[^"]+"\s*\]/g),x=>x[1]);
 const hammerFiles=Array.from(hammerChunk.matchAll(/\[\s*"([^"]+)"\s*,\s*"[^"]+"\s*\]/g),x=>x[1]);
 assert.equal(cardFiles.length,64);
 assert.equal(hammerFiles.length,32);
 for(let n=1;n<=96;n++){
  let file;
  if(n<=32)file='assets/weihnachts_event/'+cardFiles[n-1]+'.png';
  else if(n<=64)file='Weihnachtsevent2/Weihnachtsbilder/'+hammerFiles[n-33];
  else file='Weihnachtsevent2/Weihnachtsbilder/'+cardFiles[n-33];
  assert.ok(existsSync(resolve(base,file)),'card '+n+' missing image '+file);
 }
});
test('image resolution is still cancel-safe if the user skips before a slow image loads',async()=>{
 const start=inline.indexOf('async function revealNext(){');
 const end=inline.indexOf("next.addEventListener('click'",start);
 assert.ok(start>0&&end>start);
 const source=inline.slice(start,end);
 assert.match(source,/if\(token!==revealMotionToken\|\|revealState!==state\)return;/);
 assert.ok((source.match(/token!==revealMotionToken/g)||[]).length>=2,
  'must recheck cancellation after image decode as well as gift intro');
 assert.match(source,/artResult=await artworkPromise/);
 assert.match(source,/ChristmasCardImages\?\.prefetch\(state\.cards,index\+1,christmasCardImage,2\)/);
});

test('heavy artwork has extended load time and explicit retry for pack reveals',()=>{
 const {api,requests,timeouts}=mockLoader();
 void api.load('./heavy-hammer-card.png');
 assert.equal(requests.length,1);
 assert.ok([...timeouts.values()].some(t=>t.ms===45000),'allow 45 seconds for slow cards');
 assert.ok(![...timeouts.values()].some(t=>t.ms===15000),'no premature fallback');
 assert.match(page,/id="reveal-image-retry"/);
 assert.match(inline,/ChristmasCardImages\?\.retry\(img,artwork\)/);
 assert.match(inline,/if\(artResult\.ok\)revealAutoTimer=setTimeout/);
 assert.match(inline,/bigImage\.dataset\.cardArtwork=artwork/);
 assert.match(inline,/ChristmasCardImages\.show\(img,artwork\)/);
 assert.match(css,/#reveal-overlay #reveal-image-retry/);
});

test('all 32 heavy Hammer-Bingo cards have compact, real WebP art for the pack show',()=>{
 let total=0;
 for(let number=33;number<=64;number++){
  const name='card-'+String(number).padStart(2,'0')+'.webp';
  const file=resolve(base,'Weihnachtsevent2/Weihnachtsbilder',name);
  assert.ok(existsSync(file),'missing compact card '+number);
  const bytes=readFileSync(file);
  assert.equal(bytes.toString('ascii',0,4),'RIFF','WebP envelope '+number);
  assert.equal(bytes.toString('ascii',8,12),'WEBP','WebP format '+number);
  assert.ok(bytes.length<400000,'card '+number+' should be mobile-friendly, not multi-MB PNG');
  total+=bytes.length;
 }
 assert.ok(total<7000000,'32 card images should use <7 MB together');
 assert.match(inline,/card-'\+String\(index\+1\)\.padStart\(2,'0'\)\+'\.webp'/);
 assert.match(page,/christmas-pack-cinema\.css\?v=20261109-card-art-webp-v2/);
});
