import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const read=name=>readFileSync(new URL('../'+name,import.meta.url),'utf8');
const js=read('dog-boss-battle-v3.js'),css=read('dog-boss-battle-v3.css');
const boss=readFileSync(new URL('../dog-boss-art/aschewaechter-battle-v3.webp',import.meta.url));
const begin=1900000000000;
const rounds=[
 {round:0,kind:'math',startMs:0,endMs:12000},
 {round:1,kind:'dodge',startMs:26000,endMs:41000},
 {round:2,kind:'target',startMs:55000,endMs:65000},
 {round:3,kind:'reaction',startMs:79000,endMs:87000},
];
const players=[
 {uid:'chris',name:'Chris',heroClass:'magierin'},
 {uid:'nova',name:'Nova',heroClass:'magierin'},
 {uid:'titan',name:'Titan',heroClass:'magierin'}
];
const view=(gate=10)=>({
 gate,name:'Der Aschewächter',phase:'fighting',startedAt:begin,
 endsAt:begin+101000,attempt:1,members:players,roster:players,
 miniGames:{version:10,rounds}
});
const load=()=>{
 const window={};runInNewContext(js,{window},{timeout:1000});
 return window.DogBossArenaV3;
};
test('new boss asset is the exact, real transparent character sprite and is only assigned to Boss 10',()=>{
 assert.equal(boss.toString('ascii',0,4),'RIFF');
 assert.equal(boss.toString('ascii',8,12),'WEBP');
 assert.ok(boss.byteLength>50000,'the new boss must not be a tiny icon');
 assert.match(css,/aschewaechter-battle-v3\.webp/);
 assert.match(css,/\[data-v3-gate="10"\]/);
 assert.doesNotMatch(css,/fetch\s*\(|XMLHttpRequest|@import|https?:\/\//);
});
test('the same class can appear three times; each party member attacks separately in stable order',()=>{
 const {derive}=load(),v=view();
 for(const [offset,expected] of [[12700,'chris'],[15700,'nova'],[20100,'titan']]){
  const s=derive(v,begin+offset);
  assert.equal(s.kind,'hero-strike');
  assert.equal(s.uid,expected);
 }
 assert.equal(derive(v,begin+23500).kind,'countdown');
 assert.equal(derive(v,begin+26500).kind,'minigame');
});
test('the boss attacks every individual player in the defensive scene',()=>{
 const {derive}=load(),v=view();
 for(const [offset,expected] of [[41800,'chris'],[44800,'nova'],[49500,'titan']]){
  const s=derive(v,begin+offset);
  assert.equal(s.kind,'boss-strike');
  assert.equal(s.uid,expected);
 }
 assert.equal(derive(v,begin+53000).kind,'countdown');
 assert.equal(derive(v,begin+80000).kind,'minigame');
 assert.equal(derive(v,begin+89500).kind,'boss-strike');
});
test('players who are not in the battle roster are not animated as targets',()=>{
 const {derive}=load(),v=view();v.roster=players.slice(0,2);
 assert.equal(derive(v,begin+12700).uid,'chris');
 assert.equal(derive(v,begin+18000).uid,'nova');
 assert.equal(derive(v,begin+19100).uid,'nova');
 assert.notEqual(derive(v,begin+43000).uid,'titan');
});
test('new scene is entirely cosmetic and preserves server-owned time and minigames',()=>{
 assert.doesNotMatch(js,/fetch\s*\(|XMLHttpRequest|localStorage|Math\.random\(|firebase/i);
 assert.match(js,/now-Number\(view\.startedAt\)/);
 assert.match(js,/Array\.isArray\(view\.roster\)/);
 assert.match(css,/grid-template-columns:minmax\(0,1\.75fr\) minmax\(320px,\.98fr\)/);
 assert.match(css,/@media\(max-width:899px\),\(orientation:portrait\)/);
 assert.match(css,/prefers-reduced-motion/);
 assert.match(css,/\.live-challenge-content/);
});
test('both battle pages use only the new visual layer while retaining every required live-game element',()=>{
 for(const path of ['dog-boss10.html','dog-group-boss.html']){
  const html=read(path);
  assert.match(html,/data-arena-design="v3"/);
  assert.match(html,/dog-boss-battle-v3\.css\?v=/);
  assert.match(html,/dog-boss-battle-v3\.js\?v=/);
  for(const old of ['dog-boss-legendary-arena.css','dog-boss-compact-arena.css',
   'dog-boss-cinematic.css','dog-boss-real-heroes.css'])
   assert.doesNotMatch(html,new RegExp('<link[^>]*'+old.replaceAll('.','\\.')+'>'));
  for(const id of ['combat-boss','combat-hero-line','combat-camera',
   'combat-fx','live-boss-hp-track','live-hero-health','mini-game',
   'cinematic-grand-countdown','live-stage-announcement','v3-actor-action',
   'v3-turn-progress','live-recent-damage','retry-button','timer'])
   assert.ok(html.includes('id="'+id+'"'),path+' missing '+id);
  const compat=html.indexOf('class="v3-compat"');
  const hiddenFlow=html.indexOf('class="live-rounds" hidden');
  const squad=html.indexOf('id="boss-squad"');
  assert.ok(compat>=0&&hiddenFlow>compat&&squad>hiddenFlow,
   'hidden legacy round flow remains inside the offscreen compatibility section');
  const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(x=>x[1]);
  assert.equal(new Set(ids).size,ids.length,'duplicate IDs on '+path);
  const controller=read(path==='dog-boss10.html'?'dog-boss10.js':'dog-group-boss.js');
  assert.match(controller,/DogBossArenaV3\?\.create/);
  assert.match(controller,/battleV3\?\.update\(view,now\(\)\)/);
  assert.match(controller,/acknowledgePending/);
  assert.match(controller,/command\('minigame',false,/);
 }
});

test('three seconds are reserved for countdown, leaving eleven for drawn weapons and all three individual strikes',()=>{
 const {derive}=load(),v=view();
 assert.equal(derive(v,begin+22600).kind,'hero-strike');
 assert.equal(derive(v,begin+22999).kind,'hero-strike');
 assert.equal(derive(v,begin+23000).kind,'countdown');
 assert.equal(derive(v,begin+25999).kind,'countdown');
 assert.equal(derive(v,begin+26000).kind,'minigame');
 assert.equal(derive(v,begin+51000).kind,'boss-strike');
 assert.equal(derive(v,begin+52000).kind,'countdown');
 assert.equal(derive(v,begin+55000).kind,'minigame');
 assert.match(js,/SEGMENT_WAIT_MS=3000/);
 assert.match(css,/combat-boss\[data-v3-active="true"\]/);
 for(const page of ['dog-boss10.html','dog-group-boss.html']){
  const html=read(page);
  assert.match(html,/dog-boss-weapon-strikes\.css\?v=/);
  assert.match(html,/dog-boss-battle-v3\.js\?v=20261112-final5-runes1/);
 }
 const effects=read('dog-boss-weapon-strikes.css');
 for(const classname of ['krieger','magierin','waechter'])
  assert.ok(effects.includes('data-weapon="'+classname+'"'));
 assert.match(effects,/v3-floating-damage/);
});

test('damage pops once above the actually hit target and can show a verified block',()=>{
 const createNode=(name='div')=>{
  const node={name,className:'',textContent:'',dataset:{},attrs:{},
   children:[],style:{setProperty(k,v){this[k]=v}},
   classList:{add(c){node.className+=' '+c}},
   setAttribute(k,v){node.attrs[k]=v},
   getAttribute(k){return node.attrs[k]},
   append(...children){node.children.push(...children)},
   querySelector(sel){return node.children.find(c=>
    c.className.split(' ').includes(sel.slice(1)))||null},
   querySelectorAll(sel){return node.children.filter(c=>
    c.className.split(' ').includes(sel.slice(1)))}
  };
  return node;
 };
 const heroes=players.map(p=>{
  const node=createNode('hero');node.className='combat-hero';
  node.setAttribute('data-hero-uid',p.uid);
  return node;
 });
 const scene=createNode('scene');
 scene.querySelectorAll=()=>heroes;
 const boss=createNode('boss');
 const log=createNode('log');
 const elems={
  '#combat-scene':scene,'#combat-boss':boss,
  '#live-recent-damage':log,'#v3-actor-action':createNode('action'),
  '#v3-turn-progress':createNode('progress')
 };
 const root={dataset:{},querySelector:sel=>elems[sel]||null};
 const document={createElement:createNode};
 const window={};runInNewContext(js,{window,document},{timeout:1000});
 const ui=window.DogBossArenaV3.create(root),v=view();
 v.miniGames.version=11;
 v.miniGames.exchange={strikes:[]};
 ui.update(v,begin+14030);
 assert.equal(boss.children.length,0,'never invent damage before server confirms it');
 v.miniGames.exchange.strikes=[{
  round:0,slot:0,uid:'chris',kind:'hero-strike',atMs:13980,amount:128
 }];
 ui.update(v,begin+14030);
 assert.equal(boss.children.length,1);
 assert.equal(boss.children[0].textContent,'−128');
 assert.match(log.textContent,/Chris → Boss: −128 LP/);
 assert.ok(heroes[0].children.some(x=>x.className==='v3-weapon'),
  'selected mage has a rendered weapon');
 ui.update(v,begin+14100);
 assert.equal(boss.children.length,1,'same server strike is never replayed');
 v.miniGames.exchange.strikes.push({
  round:1,slot:0,uid:'chris',kind:'boss-strike',atMs:42980,amount:27
 });
 ui.update(v,begin+43100);
 assert.ok(heroes[0].children.some(x=>x.textContent==='−27'));
 assert.ok(!heroes[1].children.some(x=>x.textContent==='−27'),
  'boss damage is anchored only to its designated hero');
 v.miniGames.exchange.strikes.push({
  round:1,slot:1,uid:'nova',kind:'boss-strike',atMs:46647,amount:0
 });
 ui.update(v,begin+46700);
 assert.ok(heroes[1].children.some(x=>x.textContent==='BLOCK!'));
 assert.match(log.textContent,/BLOCK!/);
});
