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
  assert.match(controller,/battleV3\?\.update\(view,frameNow\)/);
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
  assert.match(html,/dog-boss-battle-v3\.js\?v=[A-Za-z0-9_-]+/);
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
 assert.ok(heroes[1].children.some(x=>x.textContent==='AUSGEWICHEN!'));
 assert.match(log.textContent,/AUSGEWICHEN!/);
});

test('v12 runs all five minigames; the extra 10-second Finalschlag triggers three closing hits before the result',()=>{
 const {derive}=load(),v=view();
 v.miniGames.version=12;
 v.miniGames.rounds=[...rounds,
  {round:4,kind:'target',startMs:101000,endMs:111000,maxSteps:10}];
 v.endsAt=begin+125000;
 assert.equal(derive(v,begin+100999).kind,'countdown');
 assert.equal(derive(v,begin+101000).kind,'minigame');
 assert.equal(derive(v,begin+110999).kind,'minigame');
 assert.equal(derive(v,begin+111000).kind,'hero-strike');
 assert.equal(derive(v,begin+112000).uid,'chris');
 assert.equal(derive(v,begin+116500).uid,'nova');
 assert.equal(derive(v,begin+120500).uid,'titan');
 assert.equal(derive(v,begin+121999).kind,'hero-strike');
 assert.equal(derive(v,begin+122000).kind,'countdown');
 assert.equal(derive(v,begin+124999).kind,'countdown');
 assert.equal(derive(v,begin+125000).kind,'result');
 const legacy=view();
 assert.equal(derive(legacy,begin+101000).kind,'result',
  'already active four-minigame battles keep their historical timeline');
 const sheet=read('dog-boss-battle-v3.css');
 assert.match(sheet,/mini-tactical\.is-final-attack/);
 for(const p of ['dog-boss10.html','dog-group-boss.html']){
  const html=read(p);
  assert.match(html,/dog-boss-mini-ui\.js\?v=[A-Za-z0-9_-]+/);
  assert.match(html,/dog-boss-live-ui\.js\?v=[A-Za-z0-9_-]+/);
  assert.match(html,/dog-boss-battle-v3\.js\?v=[A-Za-z0-9_-]+/);
 }
});

// K-01: all movement beats are tied to the authoritative strike timestamp,
// even when a late server event is not exactly at the scripted 54% position.
test('K-01 choreography puts contact at the official timestamp, then recovers',()=>{
 const {derive}=load(),v=view();
 v.miniGames.version=14;
 v.combat={version:1,events:[{
  eventId:'g10-t1900000000000-a1:1',
  round:0,slot:0,uid:'chris',kind:'hero-strike',
  atMs:14500,amount:230
 }]};
 const inspect=offset=>derive(v,begin+offset);
 assert.equal(inspect(12100).beat,'prepare');
 assert.equal(inspect(13600).beat,'windup');
 assert.equal(inspect(14499).beat,'swing');
 assert.equal(inspect(14499).impact,false);
 assert.equal(inspect(14500).beat,'impact');
 assert.equal(inspect(14500).impact,true);
 assert.equal(inspect(14500).confirmedDamage,230);
 assert.equal(inspect(14950).beat,'recovery');
 assert.equal(inspect(15300).beat,'recovery');
 const after=inspect(15400);
 assert.equal(after.uid,'chris');
 assert.equal(after.beat,'recovery');
 assert.equal(inspect(12100).impactAtMs,14500,
  'official impact is used even before local impact time');
 assert.equal(v.endsAt-begin,101000,'old fight timing is untouched');
});

test('K-01 stage labels change during the same strike and never invent damage',()=>{
 const node=(name='div')=>{
  const el={name,dataset:{},attrs:{},children:[],textContent:'',hidden:false,
   style:{setProperty(k,v){this[k]=v}},
   classList:{add(){}},
   setAttribute(k,v){el.attrs[k]=v},
   getAttribute(k){return el.attrs[k]},
   append(...items){el.children.push(...items)},
   querySelector:()=>null,querySelectorAll:()=>[]
  };return el;
 };
 const scene=node('scene'),action=node('action'),boss=node('boss');
 const selectors={'#combat-scene':scene,'#combat-boss':boss,
  '#v3-actor-action':action,'#v3-turn-progress':node('progress')};
 const window={};const document={createElement:node};
 runInNewContext(js,{window,document},{timeout:1000});
 const ui=window.DogBossArenaV3.create({
  dataset:{},querySelector:sel=>selectors[sel]||null
 });
 const v=view();
 ui.update(v,begin+12100);
 assert.match(action.textContent,/Position ein/);
 ui.update(v,begin+13000);
 assert.match(action.textContent,/holt zum Angriff aus/);
 ui.update(v,begin+13800);
 assert.match(action.textContent,/schlägt zu/);
 const hit=ui.derive(v,begin+13980);
 ui.update(v,begin+Math.round(hit.impactAtMs));
 assert.match(action.textContent,/prüfe Treffer/,
  'unconfirmed animation never claims a verified hit');
 assert.equal(boss.children.length,0,'no invented damage or popup');
 v.miniGames.version=11;
 v.combat={version:1,events:[{round:0,slot:0,uid:'chris',
  kind:'hero-strike',atMs:13980,amount:400}]};
 ui.update(v,begin+14020);
 assert.match(action.textContent,/trifft/);
 assert.equal(scene.dataset.v3Beat,'impact');
 assert.equal(boss.children.length,1);
});

// K-02 uses one reusable layer per hero, class-specific movements/labels,
// and the same confirmed hit timing as K-01; this is a visual-only feature.
test('K-02 class-specific sword, arcane bolt and shield wave share the server clock',()=>{
 const source=read('dog-boss-weapon-strikes.css');
 for(const [hero,fx] of [
  ['krieger','v3-warrior-blade'],
  ['magierin','v3-arcane-projectile'],
  ['waechter','v3-guardian-shockwave']
 ]){
  assert.match(source,new RegExp('data-hero-class="'+hero+'"[^\\n]*v3-class-effect::before'));
  assert.match(source,new RegExp('@keyframes '+fx+'\\{'));
 }
 assert.match(source,/animation-delay:var\(--v3-delay\)/);
 assert.match(source,/animation:none!important;opacity:0!important/);
 assert.doesNotMatch(source,/fetch\s*\(|XMLHttpRequest|Math\.random\(/);
 const actorNode=(uid,hero)=>{
  const el={dataset:{},children:[],style:{setProperty(){}},
   attrs:{'data-hero-uid':uid},getAttribute(key){return this.attrs[key]},
   setAttribute(key,v){this.attrs[key]=v},
   querySelector(name){return this.children.find(c=>c.className===name.slice(1))||null},
   append(child){this.children.push(child)}
  };return el;
 };
 const actors=players.map(p=>actorNode(p.uid,p.heroClass));
 const scene={dataset:{},style:{setProperty(){}},
  querySelectorAll:()=>actors};
 const action={hidden:false,textContent:''};
 const root={dataset:{},querySelector(sel){return ({
  '#combat-scene':scene,'#combat-boss':{dataset:{},style:{setProperty(){}}},
  '#v3-actor-action':action
 })[sel]||null}};
 const doc={createElement:()=>({
  dataset:{},setAttribute(){},className:''
 })};
 const window={};
 runInNewContext(js,{window,document:doc},{timeout:1000});
 const ui=window.DogBossArenaV3.create(root),v=view();
 for(const [ms,uid] of [[13800,'chris'],[17300,'nova'],[20600,'titan']]){
  ui.update(v,begin+ms);
  const hero=actors.find(h=>h.getAttribute('data-hero-uid')===uid);
  assert.equal(hero.children.filter(c=>c.className==='v3-class-effect').length,1);
  ui.update(v,begin+ms+100);
  assert.equal(hero.children.filter(c=>c.className==='v3-class-effect').length,1);
 }
 v.members=[{...players[0],heroClass:'krieger'},
  {...players[1],heroClass:'magierin'},
  {...players[2],heroClass:'waechter'}];
 for(const [ms,word] of [[13800,'Klingenhieb'],[17500,'Magieimpuls'],
  [21100,'Schildstoß']]){
  ui.update(v,begin+ms);
  assert.match(action.textContent,new RegExp(word));
 }
 for(const page of ['dog-boss10.html','dog-group-boss.html'])
  assert.match(read(page),/dog-boss-weapon-strikes\.css\?v=[A-Za-z0-9_-]+/);
});

// K-03: a cinematic swing without server confirmation must never flash as a hit.
test('K-03 only flashes after the official server impact',()=>{
 const {derive}=load(),v=view();
 v.miniGames.version=14;
 v.combat={version:1,events:[]};
 assert.equal(derive(v,begin+14000).impact,false);
 v.combat.events=[{eventId:'fight:1',round:0,slot:0,uid:'chris',
  kind:'hero-strike',atMs:13980,amount:300}];
 assert.equal(derive(v,begin+14000).impact,true);
 assert.equal(derive(v,begin+14000).confirmedDamage,300);
 assert.equal(derive(v,begin+14500).impact,false);
});

// K-04: a fallen hero never performs another attack while teammates retain
// their exact pre-existing individual strike slots.
test('K-04 v15 fallen fighter skips last stage without stopping surviving heroes',()=>{
 const {derive}=load(),v=view();
 v.endsAt=begin+135000;
 v.miniGames.version=15;
 v.miniGames.rounds=[...rounds,{round:4,kind:'chain',
  startMs:101000,endMs:121000}];
 v.combat={version:1,events:[
  {round:3,slot:0,kind:'boss-strike',uid:'chris',
   targetId:'chris',hpAfter:0,atMs:89000}
 ]};
 const dead=derive(v,begin+121900);
 assert.equal(dead.kind,'fallen');
 assert.equal(dead.uid,'chris');
 const alive=derive(v,begin+125000);
 assert.equal(alive.kind,'hero-strike');
 assert.equal(alive.uid,'nova');
 assert.equal(v.endsAt-begin,135000,'new v15 fight preserves 135-second timeline');
});

test('K-06 Aschewächter has dedicated, server-timed ash-spear callouts without extra damage',()=>{
 const make=(kind)=>{const e={kind,dataset:{},children:[],textContent:'',
  style:{setProperty(){}},classList:{add(){}},append(...a){e.children.push(...a)},
  querySelector:()=>null,querySelectorAll:()=>[],getAttribute:()=>null};return e};
 const scene=make('scene'),action=make('action'),boss=make('boss');
 const nodes={'#combat-scene':scene,'#combat-boss':boss,
  '#v3-actor-action':action,'#v3-turn-progress':make('progress')};
 const window={};const document={createElement:make};
 runInNewContext(js,{window,document},{timeout:1000});
 const ui=window.DogBossArenaV3.create({dataset:{},
  querySelector:selector=>nodes[selector]||null});
 const ash=view(10);
 ui.update(ash,begin+42000);
 assert.equal(scene.dataset.v3BossStyle,'ash-storm');
 assert.match(action.textContent,/Aschensturm/);
 ui.update(ash,begin+42700);
 assert.match(action.textContent,/Aschenlanze/);
 ui.update(ash,begin+42980);
 assert.match(action.textContent,/prüfe Treffer/,
  'before server confirmation the ash-spear does not assert damage');
 const later=view(20);
 ui.update(later,begin+42000);
 assert.equal(scene.dataset.v3BossStyle,'shadow-blade');
 assert.match(action.textContent,/dunkle Schatten/);
 assert.doesNotMatch(action.textContent,/Aschensturm|Aschenlanze/,
  'the Aschewächter effect must not leak to other gates');
 const css=read('dog-boss-weapon-strikes.css');
 assert.match(css,/data-v3-boss-style="ash-storm"/);
 assert.match(css,/data-v3-impact="yes"/);
 assert.match(css,/prefers-reduced-motion:reduce/);
 assert.doesNotMatch(js,/\bfetch\s*\(|firebase|Math\.random\(/i);
});

test('K-06b nine group bosses each have an individual cosmetic signature',()=>{
 const {bossStyle,create,derive}=load();
 const ids=[20,30,40,50,60,70,80,90,100];
 const expected=['shadow-blade','crystal-spike','thorn-whip','abyss-trident',
  'dragon-breath','soul-scythe','iron-fist','fortress-ram','final-judgment'];
 assert.deepEqual(ids.map(g=>bossStyle(g)).join(','),expected.join(','));
 assert.equal(bossStyle(10),'ash-storm','Tor 10 keeps the existing Aschenlanze');
 const styles=read('dog-boss-signature-attacks.css');
 for(const style of expected)assert.ok(styles.includes('data-v3-boss-style="'+style+'"'),style);
 for(const keyframe of ['swing','arc','wave','crush'])
  assert.ok(styles.includes('@keyframes k06-boss-'+keyframe),keyframe);
 assert.match(styles,/animation-delay:var\(--v3-delay\)/);
 assert.match(styles,/prefers-reduced-motion:reduce/);
 assert.doesNotMatch(styles,/fetch\s*\(|https?:\/\/|@import/);
 for(const page of ['dog-boss10.html','dog-group-boss.html']){
  assert.match(read(page),/dog-boss-signature-attacks\.css\?v=k06-boss-groups1/);
  assert.match(read(page),/dog-boss-battle-v3\.js\?v=[A-Za-z0-9_-]+/);
 }
 const battle=view(60);
 assert.equal(derive(battle,begin+42000).kind,'boss-strike');
 assert.equal(derive(battle,begin+42000).uid,'chris',
  'cosmetic skin does not affect the server-selected target');
 assert.doesNotMatch(js,/\bfetch\s*\(|firebase|Math\.random\(/i);
});

test('K-07 sound opt-in and confirmed-hit-only audio; automatic camera with manual override',()=>{
 const soundSrc=read('dog-boss-audio.js'),directorSrc=read('dog-boss-director.js');
 const k07css=read('dog-boss-k07.css');
 assert.doesNotMatch(soundSrc,/\bfetch\s*\(|firebase|localStorage|XMLHttpRequest/);
 for(const page of ['dog-boss10.html','dog-group-boss.html']){
  const html=read(page);
  assert.match(html,/id="combat-sound"/);
  assert.match(html,/dog-boss-audio\.js\?v=20261112-k07-audio1/);
  assert.match(html,/dog-boss-k07\.css\?v=[A-Za-z0-9_-]+/);
 }
 assert.match(k07css,/prefers-reduced-motion:reduce/);
 assert.match(k07css,/data-effects="off"/);
 const handlers=new Map();
 const button={textContent:'',attrs:{},addEventListener:(type,fn)=>handlers.set(type,fn),
  setAttribute(k,v){this.attrs[k]=v}};
 const soundWindow={};let created=0,played=0;
 class FakeAudioContext{
  constructor(){created++;this.currentTime=1;this.destination={};this.state='running'}
  resume(){this.state='running';return Promise.resolve()}
  suspend(){this.state='suspended';return Promise.resolve()}
  createOscillator(){return {frequency:{setValueAtTime(){},exponentialRampToValueAtTime(){}},
   connect(){},start(){played++},stop(){},disconnect(){}}}
  createGain(){return {gain:{setValueAtTime(){},exponentialRampToValueAtTime(){}},
   connect(){},disconnect(){}}}
 }
 soundWindow.AudioContext=FakeAudioContext;
 runInNewContext(soundSrc,{window:soundWindow,document:{hidden:false}});
 const audio=soundWindow.DogBossAudio.create({querySelector:s=>
  s==='#combat-sound'?button:null});
 const v=view(),state={kind:'hero-strike',index:0,slot:0,
  confirmed:true,confirmedDamage:150,impact:true,beat:'impact'};
 audio.update(v,state);
 assert.equal(created,0,'audio is off by default and requires a tap');
 handlers.get('click')({stopPropagation(){}});
 assert.equal(audio.isEnabled(),true);
 audio.update(v,{...state,confirmed:false,impact:false});
 assert.equal(played,0,'no hit before server confirmation');
 audio.update(v,state);audio.update(v,state);
 assert.equal(played,1,'one cue per server-confirmed strike');
 handlers.get('click')({stopPropagation(){}});
 assert.equal(audio.isEnabled(),false);
 audio.update(v,{...state,slot:1});
 assert.equal(played,1,'mute disables later cues');
 const cHandlers={};const scene={dataset:{},addEventListener(t,fn){cHandlers[t]=fn}};
 const camera={attrs:{},addEventListener(t,fn){cHandlers['camera-'+t]=fn},
  setAttribute(k,v){this.attrs[k]=v}};
 const fx={addEventListener(){},setAttribute(){}};
 const focus={hidden:true,textContent:''};
 const root={querySelector:s=>({'#combat-scene':scene,'#combat-camera':camera,
  '#combat-fx':fx,'#combat-focus-label':focus}[s]||null)};
 const directorWin={DogBossArenaV3:{derive:(view,now)=>
  ({kind:now===1?'boss-strike':'hero-strike'})}};
 runInNewContext(directorSrc,{window:directorWin});
 const director=directorWin.DogBossDirector.create(root);
 const fight={phase:'fighting',startedAt:100,attempt:1,bossHp:100,
  teamHealth:{hp:30,maxHp:50}};
 director.update(fight,1);
 assert.equal(scene.dataset.camera,'team','boss attack focuses endangered team');
 director.update(fight,2);
 assert.equal(scene.dataset.camera,'boss','hero attack focuses boss');
 cHandlers['camera-click']({stopPropagation(){}});
 director.update(fight,1);
 assert.equal(scene.dataset.camera,'boss','first click manually focuses the boss');
});

test('K-08 both boss pages use identical and intentional stylesheet order',()=>{
 const pages=['dog-boss10.html','dog-group-boss.html'];
 const links=pages.map(page=>[...read(page).matchAll(/<link\s+rel="stylesheet"\s+href="\.\/([^"]+\.css\?v=[^"]+)"/g)]
  .map(x=>x[1].split('?')[0]));
 assert.deepEqual(links[0],links[1],'boss 10 and group boss use the same CSS cascade');
 for(const list of links){
  for(const name of ['dog-boss-battle-v3.css','dog-boss-weapon-strikes.css',
   'dog-boss-signature-attacks.css','dog-boss-k07.css']){
   assert.equal(list.filter(s=>s===name).length,1,name+' must appear exactly once');
  }
  const pos=name=>list.indexOf(name);
  assert.ok(pos('dog-boss-battle-v3.css')<pos('dog-boss-weapon-strikes.css'));
  assert.ok(pos('dog-boss-weapon-strikes.css')<pos('dog-boss-signature-attacks.css'));
  assert.ok(pos('dog-boss-signature-attacks.css')<pos('dog-boss-k07.css'),
   'camera, audio and FX safety overrides must be applied LAST');
 }
 const overrides=read('dog-boss-k07.css');
 assert.match(overrides,/\[data-effects="off"\] \ .combat-stage|\[data-effects="off"\] \.combat-stage/);
 assert.match(overrides,/\.combat-stage::after/);
 assert.match(overrides,/content:none!important/);
 assert.match(overrides,/prefers-reduced-motion:reduce/);
 assert.doesNotMatch(overrides,/\[data-v3-impact="yes"\]\s+\[data-v3-strike-side="boss"\]/,
  'strike side is on the parent scene, not a nested element');
});
test('K-08 timeline, hit confirmation and visual FX share one official event selector',()=>{
 const source=read('dog-boss-battle-v3.js');
 assert.equal((source.match(/const officialStrikes=view=>/g)||[]).length,1);
 assert.equal((source.match(/officialStrikes\(view\)/g)||[]).length,2);
 assert.equal((source.match(/view\.combat\.events:view\?\.miniGames\?\.exchange\?\.strikes/g)||[]).length,1);
 const {derive}=load();
 const v=view();v.miniGames.version=14;
 const scripted=derive(v,begin+14500);
 assert.equal(scripted.confirmed,false);
 v.combat={version:1,events:[{uid:'chris',kind:'hero-strike',
  round:0,slot:0,amount:70,atMs:14500}]};
 const official=derive(v,begin+14500);
 assert.equal(official.confirmed,true);
 assert.equal(official.confirmedDamage,70);
 const legacy=view();legacy.miniGames.version=10;
 legacy.miniGames.exchange={strikes:[{uid:'chris',kind:'hero-strike',
  round:0,slot:0,amount:50,atMs:14500}]};
 assert.equal(derive(legacy,begin+14500).confirmedDamage,50,
  'old battles must still read their historical confirmed strikes');
 assert.doesNotMatch(source,/\bfetch\s*\(|XMLHttpRequest|firebase/i);
});
