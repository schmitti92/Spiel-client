import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const read=file=>readFileSync(new URL('../'+file,import.meta.url),'utf8');

test('Both boss arenas expose real shared LP and tap-to-focus combat controls',()=>{
 for(const page of ['dog-boss10.html','dog-group-boss.html']){
  const html=read(page);
  for(const id of ['boss-hp','live-hp-fill','live-group-hp-track',
   'live-hero-health','live-shield-value','combat-camera','combat-fx',
   'combat-boss-damage','combat-team-damage','live-cinematic','mini-game']){
   assert.ok(html.includes('id="'+id+'"'),page+' missing '+id);
  }
  assert.match(html,/❤️ GRUPPEN-LP/);
  assert.match(html,/dog-boss-endgame\.css/);
  assert.match(html,/dog-boss-director\.js/);
 }
});
test('Endgame UI never calculates damage or performs polling',()=>{
 const css=read('dog-boss-endgame.css'),camera=read('dog-boss-director.js');
 const live=read('dog-boss-live-ui.js');
 for(const script of [camera,live]){
  assert.doesNotMatch(script,/\bfetch\s*\(|XMLHttpRequest|Math\.random\s*\(/);
 }
 assert.match(live,/view\?\.teamHealth/);
 assert.match(live,/view\?\.bossLiveHp/);
 assert.match(live,/lastHeroVitalsKey/);
 assert.match(css,/\.combat-damage-pop/);
 assert.match(css,/\.combat-hero-hp-track/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
 assert.match(css,/@media\(max-width:620px\)/);
});
function fakeUi(){
 const nodes=new Map();
 function node(id){
  if(nodes.has(id))return nodes.get(id);
  const classes=new Set(),handlers=new Map();
  const elem={id,children:[],textContent:'',hidden:false,style:{
   setProperty(k,v){this[k]=v;}},dataset:{},attrs:{},offsetWidth:42,
   setAttribute(k,v){this.attrs[k]=v;},getAttribute(k){return this.attrs[k];},
   replaceChildren(...parts){this.children=parts;},
   append(...parts){this.children.push(...parts);},
   querySelectorAll(){return Array.from({length:4},(_,i)=>node('step-'+i));},
   querySelector(sel){return node(sel);},
   addEventListener(name,fn){handlers.set(name,fn);},
   dispatch(name,evt){handlers.get(name)?.(evt);},
   classList:{add:x=>classes.add(x),remove:x=>classes.delete(x),
    toggle:(x,value)=>value?classes.add(x):classes.delete(x),
    contains:x=>classes.has(x)}};
  nodes.set(id,elem);return elem;
 }
 const root={querySelector:sel=>node(sel.startsWith('#')?sel.slice(1):sel)};
 const document={createElement:tag=>node('auto-'+tag+'-'+nodes.size),
  createDocumentFragment:()=>({children:[],append(...parts){this.children.push(...parts);}})};
 return {node,root,document};
}
test('server HP changes repaint the bars and show numbers without fake hits',()=>{
 const {node,root,document}=fakeUi(),window={};
 runInNewContext(read('dog-boss-live-ui.js'),{window,document,Date});
 const ui=window.DogBossLiveUI.create(root);
 const at=1_900_000_000_000;
 const rounds=[{round:0,kind:'math',startMs:0,endMs:8000,maxSteps:8},
  {round:1,kind:'dodge',startMs:12500,endMs:20500,maxSteps:3},
  {round:2,kind:'target',startMs:25000,endMs:33000,maxSteps:3},
  {round:3,kind:'reaction',startMs:37500,endMs:45500,maxSteps:3}];
 const view={phase:'fighting',startedAt:at,attempt:1,bossHp:1533,
  bossLiveHp:1533,roster:[{uid:'a'},{uid:'b'},{uid:'c'}],
  members:[{uid:'a',name:'A'},{uid:'b',name:'B'},{uid:'c',name:'C'}],
  teamHealth:{hp:446,maxHp:446,heroes:[{uid:'a',hp:145,maxHp:145},
   {uid:'b',hp:152,maxHp:152},{uid:'c',hp:149,maxHp:149}]},
  miniGames:{version:4,rounds,myAnswers:{},exchange:{version:4,
   durationMs:50000,shield:100,stages:rounds.map((r,i)=>({
    round:i,kind:r.kind,defensive:i%2===1,completed:false,correct:null,
    max:9,shield:null,bonusDamage:null}))}}};
 ui.update(view,at+1000);
 assert.equal(node('live-shield-value').textContent,'446 / 446 LP');
 assert.equal(node('live-hp-fill').style.width,'100.00%');
 assert.equal(node('live-hero-health').children.length,3);
 view.teamHealth={hp:335,maxHp:446,heroes:[{uid:'a',hp:109,maxHp:145},
   {uid:'b',hp:114,maxHp:152},{uid:'c',hp:112,maxHp:149}]};
 view.bossLiveHp=1131;
 view.miniGames.exchange.stages[0].completed=true;
 view.miniGames.exchange.stages[0].correct=12;
 view.miniGames.exchange.stages[1].completed=true;
 view.miniGames.exchange.stages[1].shield=75;
 view.miniGames.exchange.shield=75;
 ui.update(view,at+22000);
 assert.equal(node('live-shield-value').textContent,'335 / 446 LP');
 assert.equal(node('live-hp-fill').style.width,(100*1131/1533).toFixed(2)+'%');
 assert.match(node('combat-boss-damage').children[0].textContent,/402 LP/);
 assert.match(node('combat-team-damage').children[0].textContent,/111 LP/);
 assert.equal(node('live-hero-health').children.length,3);
});
test('camera and hero inspection only change visual focus and use known LP',()=>{
 const {node,root,document}=fakeUi(),window={};
 runInNewContext(read('dog-boss-director.js'),{window,document});
 const director=window.DogBossDirector.create(root);
 director.update({phase:'fighting',startedAt:1234,attempt:1,
  bossHp:1533,bossLiveHp:1131,
  members:[{uid:'a',name:'Chris'}],
  teamHealth:{hp:109,maxHp:145,heroes:[{uid:'a',hp:109,maxHp:145}]}});
 node('combat-camera').dispatch('click',{stopPropagation(){}});
 assert.equal(node('combat-scene').dataset.camera,'boss');
 assert.match(node('combat-focus-label').textContent,/1\.131 \/ 1\.533 LP/);
 node('combat-fx').dispatch('click',{stopPropagation(){}});
 assert.equal(node('combat-scene').dataset.effects,'off');
 assert.equal(node('combat-fx').attrs['aria-pressed'],'false');
 const hero={getAttribute:k=>k==='data-hero-uid'?'a':null};
 node('combat-scene').dispatch('click',{target:{closest:s=>s==='.combat-hero'?hero:null}});
 assert.equal(node('combat-scene').dataset.camera,'team');
 assert.match(node('combat-focus-label').textContent,/Chris · 109 \/ 145 LP/);
});
