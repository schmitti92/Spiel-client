import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Script} from 'node:vm';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const htmls=[read('dog-boss10.html'),read('dog-group-boss.html')];
const presenter=read('dog-boss-preflight.js');
const css=read('dog-boss-preflight.css');
const svg=read('dog-boss-art/boss-preflight-background.svg');

test('Both bosses have the same cinematic pre-fight screen and all controls',()=>{
 const required=['boss-preflight','preflight-title','preflight-boss-image',
  'preflight-hp','preflight-story','preflight-team-members','preflight-ready-counter',
  'preflight-reward','preflight-ready','preflight-start','preflight-retry',
  'preflight-message','preflight-equipment-title'];
 for(const html of htmls){
  assert.match(html,/<main class="stage" data-screen="preflight">/);
  assert.match(html,/dog-boss-preflight\.css\?v=/);
  assert.match(html,/dog-boss-preflight\.js\?v=/);
  assert.ok(html.indexOf('dog-boss-preflight.js')<Math.max(html.indexOf('src="./dog-boss10.js'),html.indexOf('src="./dog-group-boss.js')), 'presenter before boss script');
  for(const id of required)assert.ok(html.includes('id="'+id+'"'),'missing '+id);
  assert.match(html,/id="ready-button"/);
  assert.match(html,/id="start-button"/);
  assert.match(html,/id="react-button"/);
  assert.match(html,/id="mini-game"/);
  assert.match(html,/id="outcome"/);
  const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
  assert.equal(new Set(ids).size,ids.length,'repeated HTML ids');
 }
});

test('All ten group bosses load their own allowlisted illustration and descriptive scene',()=>{
 assert.doesNotThrow(()=>new Script(presenter));
 for(const gate of [10,20,30,40,50,60,70,80,90,100]){
  assert.match(presenter,new RegExp(gate+":'[^']+\\.svg'"));
 }
 assert.match(css,/boss-preflight-background\.svg/);
 assert.match(svg,/<svg[^>]+xmlns="http:\/\/www\.w3\.org\/2000\/svg"/);
 assert.match(svg,/id="lava"/);
});

test('Preparation view is display-only and never bypasses authenticated commands',()=>{
 assert.doesNotMatch(presenter,/fetch\(|XMLHttpRequest|WebSocket|localStorage|setInterval|setTimeout/);
 assert.doesNotMatch(presenter,/bossHp\s*=|sharedBosses|dogUnlocked|phase\s*=\s*'victory'/);
 assert.match(presenter,/real\.click\(\)/);
 assert.match(presenter,/proxy\.disabled\|\|real\.disabled\|\|real\.hidden/);
 assert.match(presenter,/stage\.dataset\.screen=screen/);
 assert.match(presenter,/view\?\.bossHp/);
 assert.match(presenter,/view\?\.members/);
 for(const script of ['dog-boss10.js','dog-group-boss.js']){
  const source=read(script);
  assert.match(source,/DogBossPreflight\?\.create\(/);
  assert.match(source,/preflight\?\.update\(view,now\(\)\)/);
  assert.match(source,/command\('ready'\)/);
  assert.match(source,/command\('start'\)/);
  assert.match(source,/command\('minigame'/);
 }
 assert.match(css,/\.stage\[data-screen="preflight"\]>\.arena/);
 assert.match(css,/\.stage\[data-screen="battle"\]>\.boss-preflight/);
});

test('Real original controls govern preflight proxies and each combat phase',()=>{
 const listeners=new Map();
 const nodes=new Map();
 const fake=(id)=>{if(!nodes.has(id)){
  const element={id,textContent:'',disabled:false,hidden:false,
   dataset:{},children:[],src:'',style:{},clicks:0,
   addEventListener:(type,fn)=>listeners.set(id+':'+type,fn),
   click(){this.clicks++;const fn=listeners.get(id+':click');if(fn)fn()},
   append(...children){this.children.push(...children)},
   replaceChildren(...children){this.children=children}
  };
  nodes.set(id,element);
 }return nodes.get(id)};
 const stage=fake('stage');
 const document={getElementById:fake,querySelector:selector=>
  selector==='main.stage'?stage:null,
  createElement:tag=>({...fake('generated-'+Math.random()),tag}),
  createDocumentFragment:()=>({children:[],append(...children){this.children.push(...children)}})};
 const window={};
 new Script(presenter).runInNewContext({window,document,Date,Number,Array,Object,JSON});
 const ready=fake('ready-button'),start=fake('start-button'),retry=fake('retry-button');
 const preview=window.DogBossPreflight.create(10);
 ready.textContent='✅ Ich bin bereit';start.textContent='⚔️ Mit 1 Helden starten';retry.textContent='↻ Wiederholen';
 const members=[{uid:'chris',name:'Chris',isMe:true,eligible:true,ready:false},
  {uid:'nova',name:'Nova',eligible:true,ready:true},
  {uid:'titan',name:'Titan',eligible:true,ready:true}];
 preview.update({phase:'waiting',bossHp:25000,members,eligible:true},1000);
 assert.equal(stage.dataset.screen,'preflight');
 assert.match(fake('preflight-hp').textContent,/25\.000/);
 assert.equal(fake('preflight-ready').disabled,false);
 fake('preflight-ready').click();
 assert.equal(ready.clicks,1);
 ready.disabled=true;start.hidden=false;start.disabled=false;
 preview.update({phase:'waiting',bossHp:25000,members,eligible:true},1000);
 assert.equal(fake('preflight-ready').disabled,true);
 assert.equal(fake('preflight-start').hidden,false);
 fake('preflight-start').click();assert.equal(start.clicks,1);
 start.disabled=true;
 preview.update({phase:'fighting',bossHp:25000,members},2000);
 assert.equal(stage.dataset.screen,'battle');
 assert.equal(fake('preflight-start').disabled,true);
 preview.update({phase:'victory',bossHp:25000,members},35000);
 assert.equal(stage.dataset.screen,'battle');
 preview.update({phase:'cooldown',bossHp:25000,members,cooldownUntil:650000},40000);
 assert.equal(stage.dataset.screen,'battle');
 retry.hidden=false;retry.disabled=false;
 preview.update({phase:'cooldown',bossHp:25000,members,cooldownUntil:650000},660000);
 assert.equal(stage.dataset.screen,'preflight');
 assert.equal(fake('preflight-retry').hidden,false);
 fake('preflight-retry').click();
 assert.equal(retry.clicks,1);
});


test('Landscape fullscreen fits preflight into a viewport-height stage',()=>{
 assert.match(css,/@media \(orientation:landscape\) and \(min-width:900px\) and \(min-height:600px\)/);
 assert.match(css,/\.stage\[data-screen="preflight"\]\s*\{[^}]*height:100vh;height:100dvh;/);
 assert.match(css,/grid-template-rows:auto minmax\(0,1fr\)/);
 assert.match(css,/\.stage\[data-screen="preflight"\]>\.boss-preflight\s*\{[^}]*grid-template-rows:auto auto auto minmax\(0,1fr\) auto;/);
 assert.match(css,/\.preflight-layout\s*\{[^}]*grid-template-rows:minmax\(0,1fr\) auto;/);
 assert.match(css,/\.preflight-bottom\s*\{margin-top:0;/);
 assert.match(css,/@media \(orientation:landscape\) and \(min-width:900px\) and \(min-height:600px\) and \(max-height:720px\)/);
 assert.match(css,/@media \(max-width:879px\)/);
 assert.match(css,/body:has\(\.stage\[data-screen="preflight"\]\)\{overflow-y:auto\}/);
});

test('Reward shelf spans two columns and supports four honest future reward slots',()=>{
 assert.match(css,/grid-template-areas:"monster details team" "monster rewards rewards"/);
 assert.match(css,/\.preflight-rewards\{grid-area:rewards;min-width:0\}/);
 assert.match(css,/\.preflight-reward-grid\{grid-template-columns:repeat\(4,minmax\(0,1fr\)\)/);
 for(const html of htmls){
  const scene=html.slice(html.indexOf('<section class="boss-preflight"'),html.indexOf('<header class="opening">'));
  const team=scene.indexOf('<section class="preflight-team"');
  const reward=scene.indexOf('<section class="preflight-panel preflight-rewards">');
  const bottom=scene.indexOf('<div class="preflight-bottom">');
  assert.ok(team>0&&reward>team&&bottom>reward,'rewards belong beneath team/info, before bottom controls');
  assert.equal((scene.match(/class="preflight-reward-reserve"/g)||[]).length,2);
  assert.match(scene,/data-reward-slot="3"/);
  assert.match(scene,/data-reward-slot="4"/);
  assert.match(scene,/Reserveplätze zeigen keine zugesagten Gewinne/);
  assert.match(html,/dog-boss-preflight\.css\?v=20261111-v3-tablet-fit/);
 }
});
