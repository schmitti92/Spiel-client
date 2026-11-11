import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const source=read('dog-boss-live-ui.js');
const css=read('dog-boss-live.css');
const htmls=['dog-boss10.html','dog-group-boss.html'].map(read);
const start=1_900_000_000_000;
const model=()=>({
 phase:'fighting',startedAt:start,bossHp:25000,
 members:[{uid:'chris',name:'Chris',isMe:true,ready:true},
  {uid:'nova',name:'Nova',ready:true},{uid:'titan',name:'Titan',ready:true}],
 roster:[{uid:'chris'},{uid:'nova'},{uid:'titan'}],
 miniGames:{rounds:[{round:0,kind:'reaction',startMs:3000,endMs:10000},
  {round:1,kind:'math',startMs:10000,endMs:17000},
  {round:2,kind:'target',startMs:17000,endMs:24000}],myAnswers:{}}
});
function bootstrap(){
 const document={createElement(tag){return {tag,textContent:'',className:'',style:{},
  classList:{add(){},remove(){}},children:[],replaceChildren(...children){this.children=children}}}};
 const window={};
 runInNewContext(source,{window,document});
 return {ui:window.DogBossLiveUI,document};
}
function fakeDom(){
 const nodes=new Map();
 function element(id){
  if(!nodes.has(id)){
   const classes=new Set();
   nodes.set(id,{id,textContent:'',hidden:false,style:{},
    classList:{add:s=>classes.add(s),remove:s=>classes.delete(s),
     toggle:(s,yes)=>{if(yes)classes.add(s);else classes.delete(s);},
     contains:s=>classes.has(s)},
    calls:0,children:[],
    replaceChildren(...children){this.children=children;this.calls++;},
    querySelectorAll:()=>[0,1,2].map(i=>element('step-'+i))
   });
  }
  return nodes.get(id);
 }
 const root={querySelector:selector=>selector==='.combat-hero-me'?element('me'):
  element(selector.startsWith('#')?selector.slice(1):selector)};
 return {nodes,element,root};
}
test('Live battle UI derives every round only from server clock and answers',()=>{
 const {ui}=bootstrap(),battle=model();
 assert.equal(ui.battleModel(battle,start+1000).roundIndex,0);
 assert.equal(ui.battleModel(battle,start+3200).active.kind,'reaction');
 assert.equal(ui.battleModel(battle,start+11600).active.kind,'math');
 assert.equal(ui.battleModel(battle,start+19000).active.kind,'target');
 assert.equal(ui.battleModel(battle,start+25900).active,null);
 assert.equal(ui.battleModel(battle,start+25900).roundIndex,2);
 assert.equal(ui.battleModel({...battle,phase:'victory',
  result:{hpRemaining:0}},start+45000).knownHp,0);
 assert.equal(ui.battleModel({...battle,phase:'cooldown',
  result:{hpRemaining:14000}},start+45000).knownHp,14000);
 assert.equal(ui.battleModel(battle,start+4000).knownHp,null,
  'Client must not make up intermediate HP');
});

test('Server-confirmed answer triggers one attack animation, never a fake damage value',()=>{
 const {ui}=bootstrap(),{root,element}=fakeDom(),display=ui.create(root);
 const b=model();
 display.update(b,start+10500);
 assert.equal(element('live-hit-effects').calls,0);
 assert.equal(element('live-mini-prompt').hidden,true);
 assert.equal(element('live-round-label').textContent,'RUNDE 2 / 3');
 assert.equal(element('live-hp-fill').style.width,'100%');
 b.miniGames.myAnswers[1]={correct:true,at:start+11600};
 display.update(b,start+11900);
 assert.equal(element('live-hit-effects').calls,1);
 assert.match(element('live-hit-effects').children[2].textContent,/Chris greift an/);
 assert.match(element('live-feedback').textContent,/Richtig/);
 assert.doesNotMatch(element('live-feedback').textContent,/[0-9]+\s+Schaden/);
 display.update(b,start+12200);
 assert.equal(element('live-hit-effects').calls,1,'same server action is not replayed');
 display.update(b,start+15200);
 assert.equal(element('live-hit-effects').calls,1,'old feedback is not replayed');
 const c=model();
 c.miniGames.myAnswers[1]={correct:false,at:start+12000};
 const next=ui.create(fakeDom().root);
 next.update(c,start+12400);
 assert.doesNotMatch(source,/fetch\(|XMLHttpRequest|localStorage|Math\.random\(/);
});

test('Late reconnect does not replay old attacks, and result is not obscured',()=>{
 const {ui}=bootstrap(),{root,element}=fakeDom(),display=ui.create(root);
 const b=model();
 b.miniGames.myAnswers[0]={correct:true,at:start+4000};
 display.update(b,start+16000);
 assert.equal(element('live-hit-effects').calls,0);
 display.update({...b,phase:'victory',result:{hpRemaining:0}},start+31000);
 assert.equal(element('live-mini-prompt').hidden,true);
 assert.equal(element('live-hp-fill').style.width,'0.0%');
 assert.match(element('live-challenge-heading').textContent,/BOSS BESIEGT/);
});

test('Both group boss pages have one battlefield with boss left, heroes middle and mini panel right',()=>{
 for(const html of htmls){
  assert.match(html,/class="arena arena-live"/);
  assert.match(html,/class="live-battlefield"/);
  assert.match(html,/class="live-challenge"/);
  assert.match(html,/id="live-hit-effects"/);
  assert.match(html,/id="live-hp-fill"/);
  assert.match(html,/id="live-round-steps"/);
  assert.match(html,/id="live-feedback"/);
  assert.match(html,/id="mini-game"/);
  assert.match(html,/id="combat-hero-line"/);
  assert.match(html,/id="combat-boss"/);
  assert.match(html,/dog-boss-live\.css\?v=/);
  assert.match(html,/dog-boss-live-ui\.js\?v=/);
  const indexBoss=html.indexOf('id="combat-boss"');
  const indexHero=html.indexOf('id="combat-hero-line"');
  const indexMini=html.indexOf('id="mini-game"');
  assert.ok(indexBoss<indexHero&&indexHero<indexMini);
  const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(x=>x[1]);
  assert.equal(ids.length,new Set(ids).size,'No duplicate IDs');
 }
 assert.match(css,/grid-template-columns:minmax\(0,1\.77fr\) minmax\(300px,\.9fr\)/);
 assert.match(css,/\.arena-live \.combat-boss\s*\{\s*left:1%;right:auto/);
 assert.match(css,/\.arena-live \.combat-hero-line\s*\{\s*left:44%/);
 assert.match(css,/\.arena-live \.live-challenge\s*\{/);
 assert.match(css,/@media \(orientation:landscape\) and \(min-width:900px\) and \(min-height:510px\)/);
 assert.match(css,/height:100vh;height:100dvh/);
 assert.match(css,/\.stage\[data-screen="battle"\]>\.squad>\.heroes,\s*\.stage\[data-screen="battle"\]>\.squad>\.note\{display:none\}/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
});

test('Existing minigame submit and multiplayer command paths are unchanged',()=>{
 const mini=read('dog-boss-mini-ui.js');
 for(const kind of ['dodge','reaction','math','target'])
  assert.match(mini,new RegExp("round.kind==='"+kind+"'"));
 for(const file of ['dog-boss10.js','dog-group-boss.js']){
  const controller=read(file);
  assert.match(controller,/DogBossLiveUI\?\.create\(\$\('arena'\)\)/);
  assert.match(controller,/liveUi\?\.update\(view,now\(\)\)/);
  assert.match(controller,/command\('minigame',false,\{round,answer\}\)/);
  assert.match(controller,/function acknowledgePending\(uid,state\)/);
  assert.match(controller,/DogBossCombatFX\?\.create\(\$\('combat-scene'\)/);
 }
});
