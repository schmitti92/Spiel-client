import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const start=1_900_000_000_000;
function mock(version=7){
 const nodes=new Map();
 function node(id){
  if(nodes.has(id))return nodes.get(id);
  const flags=new Set();
  const item={id,textContent:'',hidden:false,children:[],dataset:{},offsetWidth:32,attrs:{},
   style:{setProperty(name,val){this[name]=val}},
   classList:{add:k=>flags.add(k),remove:k=>flags.delete(k),
    toggle:(k,v)=>v?flags.add(k):flags.delete(k),contains:k=>flags.has(k)},
   setAttribute(k,v){this.attrs[k]=v},append(...x){this.children.push(...x)},
   replaceChildren(...x){this.children=x},
   querySelectorAll(){return Array.from({length:4},(_,i)=>node('step-'+i))}};
  nodes.set(id,item);return item;
 }
 const window={};
 const document={createElement:()=>node('created-'+nodes.size)};
 runInNewContext(read('dog-boss-live-ui.js'),{window,document,Date});
 const root={querySelector:s=>node(s.startsWith('#')?s.slice(1):s)};
 const ui=window.DogBossLiveUI.create(root);
 const times=version===7?[[0,12000],[26000,34000],[48000,56000],[70000,78000]]:
  [[0,12000],[19000,27000],[34000,42000],[49000,57000]];
 const rounds=times.map(([from,to],i)=>({round:i,kind:['math','dodge','target','reaction'][i],
  startMs:from,endMs:to,maxSteps:i===0?8:3}));
 const stages=rounds.map((r,i)=>({round:i,kind:r.kind,defensive:!!(i%2),
  completed:true,correct:12,max:24,shield:i%2?94:null,
  bonusPercent:3.5,bonusDamage:95}));
 const view={phase:'fighting',startedAt:start,attempt:1,bossHp:2000,bossLiveHp:1750,
  members:[{uid:'a',name:'Chris'}],roster:[{uid:'a'}],
  teamHealth:{maxHp:190,hp:179,heroes:[{uid:'a',maxHp:190,hp:179}]},
  miniGames:{version,rounds,myAnswers:{},
   exchange:{version,durationMs:version===7?92000:64000,shield:94,stages,
    cumulativeExtraDamage:190}}};
 return {node,ui,view};
}
test('v7 extends each of four cinematic windows to fourteen seconds',()=>{
 const {ui,view,node}=mock();
 for(const [open,close] of [[12000,26000],[34000,48000],[56000,70000],[78000,92000]]){
  ui.update(view,start+open);
  assert.equal(node('live-cinematic').hidden,false,'scene starts at '+open);
  assert.equal(node('cinematic-countdown').textContent,'14,0 s');
  assert.equal(node('cinematic-grand-countdown').hidden,true,'score and combat stay unobstructed');
  ui.update(view,start+close-3200);
  assert.equal(node('live-cinematic').hidden,false,'fight display remains active');
  assert.equal(node('cinematic-grand-countdown').hidden,true,'final ring not too early');
  ui.update(view,start+close-3000);
  assert.equal(node('cinematic-grand-countdown').hidden,false,'three-second show starts exactly');
  assert.equal(node('cinematic-grand-digit').textContent,'3');
  assert.equal(node('cinematic-grand-ring').style['--show-sweep'],'360.00deg');
  assert.equal(node('live-cinematic').dataset.showPhase,'countdown');
  ui.update(view,start+close-2100);
  assert.equal(node('cinematic-grand-digit').textContent,'3');
  ui.update(view,start+close-100);
  assert.equal(node('cinematic-grand-digit').textContent,'1');
  ui.update(view,start+close);
  assert.equal(node('live-cinematic').hidden,true,'scene ends exactly');
  assert.equal(node('cinematic-grand-countdown').hidden,true);
 }
});
test('server-clocked next-round start flashes LOS without blocking gameplay',()=>{
 const {ui,view,node}=mock();
 for(const at of [26000,48000,70000]){
  ui.update(view,start+at);
  assert.equal(node('cinematic-start-flash').hidden,false,'LOS at '+at);
  ui.update(view,start+at+800);
  assert.equal(node('cinematic-start-flash').hidden,false);
  ui.update(view,start+at+901);
  assert.equal(node('cinematic-start-flash').hidden,true);
 }
 ui.update(view,start+0);
 assert.equal(node('cinematic-start-flash').hidden,true,'first round is not a transition');
});
test('older 64-second battles are untouched by 14s show, ring and LOS',()=>{
 const {ui,view,node}=mock(6);
 ui.update(view,start+12000);
 assert.equal(node('live-cinematic').hidden,false);
 assert.equal(node('cinematic-countdown').textContent,'7,0 s');
 assert.equal(node('cinematic-grand-countdown').hidden,true);
 assert.equal(node('live-cinematic').dataset.showVersion,'legacy');
 ui.update(view,start+19000);
 assert.equal(node('live-cinematic').hidden,true);
 assert.equal(node('cinematic-start-flash').hidden,true);
});
test('boss pages load the responsive motion-safe ring without API polling',()=>{
 const stylesheet=read('dog-boss-show-14.css');
 const logic=read('dog-boss-live-ui.js');
 for(const token of ['cinematic-grand-ring','boss-show-final-pulse','boss-show-launch-word',
  'data-battle-version="7"','prefers-reduced-motion:reduce'])
  assert.ok(stylesheet.includes(token),token);
 assert.doesNotMatch(logic,/Math\.random\s*\(|\bfetch\s*\(|XMLHttpRequest/);
 for(const p of ['dog-boss10.html','dog-group-boss.html']){
  const html=read(p);
  assert.match(html,/id="cinematic-grand-countdown"/);
  assert.match(html,/id="cinematic-start-flash"/);
  assert.match(html,/dog-boss-show-14\.css/);
 }
});