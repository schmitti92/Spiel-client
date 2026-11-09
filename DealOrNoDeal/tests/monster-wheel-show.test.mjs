import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Script,runInNewContext} from 'node:vm';

const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const js=read('js/monster-wheel-show.js');
const wheel=read('js/monster-wheel.js');
const css=read('css/monster-wheel-show.css');
const page=read('weihnachten.html');

function director(reduced=true){
 const classList=()=>({names:new Set(),
  add(n){this.names.add(n)},remove(n){this.names.delete(n)},contains(n){return this.names.has(n)}});
 const el=()=>({hidden:false,textContent:'',dataset:{},style:{setProperty(){},removeProperty(){}},
  classList:classList(),replaceChildren(){},appendChild(){},offsetWidth:440});
 const keys=['monster-stage','monster-show-countdown','monster-show-phase','monster-show-timer','monster-show-confetti','monster-wheel-prize'];
 const elements=Object.fromEntries(keys.map(id=>[id,el()]));
 let timeouts=0;
 const context={window:{matchMedia:()=>({matches:reduced}),setTimeout:callback=>{timeouts++;callback()}},
  document:{getElementById:id=>elements[id],createDocumentFragment:()=>({appendChild(){}}),
   createElement:()=>({style:{setProperty(){}},className:''})},console};
 new Script(js).runInNewContext(context);
 return {api:context.window.ChristmasMonsterShow,elements,get timeouts(){return timeouts}};
}
test('Monster-Wheel show is visual-only and includes all required theatre assets',()=>{
 assert.doesNotThrow(()=>new Script(js));
 assert.match(page,/monster-wheel-show\.css\?v=20261109-monster-show-v1/);
 assert.match(page,/monster-wheel-show\.js\?v=20261109-monster-show-v1/);
 assert.ok(page.indexOf('monster-wheel.js?v=20261109-full-photo-v1')<page.indexOf('monster-wheel-show.js?v=20261109-monster-show-v1'));
 for(const id of ['monster-show-countdown','monster-show-phase','monster-show-timer','monster-show-confetti']){
  assert.equal([...page.matchAll(new RegExp('id="'+id+'"','g'))].length,1,id);
 }
 assert.match(css,/monster-show-confetti-fall/);
 assert.match(css,/monster-show-sweep/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
 assert.doesNotMatch(js,/\bfetch\s*\(|XMLHttpRequest|WebSocket|request\s*\(|localStorage|sessionStorage/i);
 assert.doesNotMatch(css,/url\(/i,'no extra artwork downloads or wrong wheel textures');
 assert.match(wheel,/const target=targetAngle\(index,catalog\)/);
 assert.match(wheel,/currentDegrees\+=360\*7\+forward/);
});
test('show controller goes ready → confirming → 3-2-1 → spinning → winning without changing credits',async()=>{
 const d=director();
 assert.ok(d.api);
 assert.equal(d.elements['monster-stage'].dataset.showPhase,'ready');
 d.api.awaiting();
 assert.equal(d.elements['monster-stage'].dataset.showPhase,'confirming');
 await d.api.countdown();
 assert.equal(d.timeouts,4,'only local countdown timers');
 assert.equal(d.elements['monster-show-countdown'].hidden,true);
 d.api.spinning(8000);
 assert.equal(d.elements['monster-stage'].dataset.showPhase,'spinning');
 assert.equal(d.elements['monster-show-timer'].classList.contains('is-running'),true);
 d.api.winner({kind:'pack',icon:'🎁'});
 assert.equal(d.elements['monster-stage'].dataset.showPhase,'winning');
 assert.equal(d.elements['monster-show-countdown'].textContent,'🎁');
 assert.equal(d.elements['monster-show-confetti'].hidden,true,'reduced-motion visuals must be light');
 assert.equal(d.elements['monster-wheel-prize'].classList.contains('monster-show-result-arrive'),true);
 d.api.reset();
 assert.equal(d.elements['monster-stage'].dataset.showPhase,'ready');
 assert.equal(d.elements['monster-show-countdown'].hidden,true);
});
test('monster spin server request is before countdown, which is before wheel animation and prize reveal',()=>{
 const start=page.indexOf("monsterSpinStart.addEventListener('click',async()=>");
 assert.ok(start>0);
 const block=page.slice(start,page.indexOf("window.addEventListener('spielonline-change'",start));
 const positions=[
  "request('POST','monster/spin'",
  'committed=true;clearMonsterSpinRequestId();',
  'await window.ChristmasMonsterShow?.countdown()',
  'window.ChristmasMonsterShow?.spinning(duration)',
  'await window.ChristmasMonsterVisuals.spin(spin.prize.index,duration)',
  'monsterShowPrize(spin)'
 ].map(x=>block.indexOf(x));
 assert.ok(positions.every(x=>x>=0),positions.join(','));
 for(let i=1;i<positions.length;i++)assert.ok(positions[i]>positions[i-1],'wrong step order: '+positions.join(','));
 assert.match(block,/requestId:monsterSpinRequestId\(\)/);
 assert.match(block,/if\(!committed&&!/);
 assert.match(block,/monsterSpinBusy=true;monsterControls\(\)/);
 assert.match(block,/finally\{monsterSpinBusy=false;monsterControls\(\)\}/);
});
