import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Script} from 'node:vm';

const read=name=>readFileSync(new URL('../'+name,import.meta.url));
const js=read('js/monster-wheel.js').toString('utf8');
const demo=read('js/monster-wheel-demo.js').toString('utf8');
const css=read('css/monster-wheel.css').toString('utf8');
const html=read('weihnachten.html').toString('utf8');
const asset='Weihnachtsevent2/Weihnachtsbilder/file_0000000077288210bd94623e0d40c452.png';

function simulator(){
 const disc={clientWidth:440,offsetWidth:440,style:{setProperty(){}} ,
  classList:{present:new Set(),toggle(name,isOn){if(isOn)this.present.add(name);else this.present.delete(name)},
  contains(name){return this.present.has(name)}},
  replaceChildren(){},append(){}};
 const prizeList={replaceChildren(){},append(){}};
 const stage={classList:{add(){},remove(){}}};
 const ctx={window:{addEventListener(){}},
  document:{getElementById:id=>({'monster-wheel-disc':disc,'monster-prize-list':prizeList,'monster-stage':stage})[id],
   querySelectorAll:()=>[],
   createElement:()=>({style:{},dataset:{},classList:{toggle(){}},append(){}})},
  setTimeout:cb=>{cb();return 1},
  matchMedia:()=>({matches:true}),
  console,Math};
 new Script(js,{filename:'monster-wheel.js'}).runInNewContext(ctx);
 new Script(demo,{filename:'monster-wheel-demo.js'}).runInNewContext(ctx);
 return {visual:ctx.window.ChristmasMonsterVisuals,catalog:ctx.window.ChristmasMonsterDemo.catalog,disc};
}
test('uploaded transparent PNG is exactly the final 25-field wheel image',()=>{
 const png=read(asset);
 assert.equal(png.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
 assert.equal(png.readUInt32BE(16),1254);
 assert.equal(png.readUInt32BE(20),1254);
 assert.equal(png[25],6,'must retain actual transparency');
 assert.match(css,/file_0000000077288210bd94623e0d40c452\.png/);
 assert.match(css,/\.monster-disc\.is-baked-art\{/);
 assert.match(css,/\.monster-disc\.is-baked-art::after\{display:none!important\}/);
 assert.match(css,/\.monster-disc\.is-baked-art \.monster-wheel-segment\{display:none!important\}/);
 assert.match(css,/\.monster-disc\.is-baked-art ~ \.monster-wheel-center\{display:none!important\}/);
 assert.match(html,/monster-wheel\.js\?v=20261109-full-photo-v1/);
 assert.match(html,/monster-wheel\.css\?v=20261109-full-photo-v1/);
});
test('all 25 authored reward sectors clockwise are identical to the backend-provided 25-slot catalog',()=>{
 const {visual,catalog,disc}=simulator();
 assert.equal(catalog.length,25);
 assert.equal(visual.matchesArtwork(catalog),true);
 assert.equal(Array.from(visual.artworkSlots).join('|'),Array.from(catalog,s=>s.id).join('|'));
 assert.equal(catalog[0].id,'cash-random-1');
 assert.equal(catalog[12].id,'premium-3');
 assert.equal(catalog[22].id,'cash-10m');
 visual.setCatalog(catalog);
 assert.ok(disc.classList.contains('is-baked-art'));
 const modified=Array.from(catalog);
 [modified[0],modified[1]]=[modified[1],modified[0]];
 assert.equal(visual.matchesArtwork(modified),false,'if backend slots change, never display incorrect baked art');
 visual.setCatalog(modified);
 assert.equal(disc.classList.contains('is-baked-art'),false);
});
test('fixed pointer points to wedge CENTER; avoid old half-segment alignment bug',async()=>{
 const {visual,catalog,disc}=simulator();
 visual.setCatalog(catalog);
 assert.equal(visual.targetAngle(0),0,'100–2M test field at 12 oclock');
 for(let i=0;i<25;i++){
  const target=visual.targetAngle(i);
  const expected=((360-i*(360/25))%360+360)%360;
  assert.ok(Math.abs(target-expected)<1e-8,'wrong stop at '+i);
  const selected=visual.artworkSlots[i];
  assert.equal(selected,catalog[i].id,'wrong text label at '+i);
 }
 await visual.spin(12,8000);
 const angle=Number(disc.style.transform.match(/rotate\(([\d.]+)deg\)/)?.[1]);
 assert.ok(Number.isFinite(angle));
 assert.ok(Math.abs((angle%360)-visual.targetAngle(12))<1e-8,
  'premium pack must stop exactly at its pictured prize');
 const older=Array.from(catalog);
 [older[0],older[1]]=[older[1],older[0]];
 visual.setCatalog(older);
 assert.ok(Math.abs(visual.targetAngle(0)-352.8)<1e-8,
  'fallback dynamic sectors keep their original half-slice offset');
});
