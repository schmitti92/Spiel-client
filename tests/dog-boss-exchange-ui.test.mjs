import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const source=read('dog-boss-live-ui.js'),css=read('dog-boss-live.css');
const startedAt=1_900_000_000_000;
function fixture(){
 const nodes=new Map(),classes=new Map();
 function node(id){
  if(nodes.has(id))return nodes.get(id);
  const tags=new Set();classes.set(id,tags);
  const output={id,hidden:false,textContent:'',style:{},children:[],offsetWidth:50,
   classList:{
    add:x=>tags.add(x),remove:x=>tags.delete(x),contains:x=>tags.has(x),
    toggle:(x,yes)=>yes?tags.add(x):tags.delete(x)},
   querySelectorAll:()=>Array.from({length:4},(_,i)=>node('step-'+i)),
   replaceChildren(...parts){this.children=parts},
   setAttribute(){}};
  nodes.set(id,output);
  return output;
 }
 const root={querySelector:query=>node(query.startsWith('#')?
  query.slice(1):query)};
 const document={
  createElement:tag=>({...node('el-'+tag),style:{},className:''}),
  createDocumentFragment:()=>({children:[],append(...a){this.children.push(...a)}})
 };
 const window={};
 runInNewContext(source,{window,document,Date});
 const rounds=[
  {kind:'math',round:0,startMs:0,endMs:8000,maxSteps:8},
  {kind:'dodge',round:1,startMs:10000,endMs:18000,maxSteps:3},
  {kind:'target',round:2,startMs:20000,endMs:28000,maxSteps:3},
  {kind:'reaction',round:3,startMs:30000,endMs:38000,maxSteps:3}
 ];
 const stages=[
  {round:0,kind:'math',defensive:false,completed:true,
   correct:18,max:24,bonusPercent:4.5,shield:null},
  {round:1,kind:'dodge',defensive:true,completed:true,
   correct:6,max:9,bonusPercent:0,shield:92},
  {round:2,kind:'target',defensive:false,completed:true,
   correct:7,max:9,bonusPercent:2.3,shield:null},
  {round:3,kind:'reaction',defensive:true,completed:true,
   correct:3,max:9,bonusPercent:0,shield:75}
 ];
 const view={phase:'fighting',startedAt,bossHp:1533,
  members:[{uid:'c',name:'Chris',isMe:true}],
  miniGames:{version:3,rounds,myAnswers:{},
   exchange:{version:3,durationMs:40000,shield:100,stages}}};
 return {nodes,classes,node,ui:window.DogBossLiveUI.create(root),
  derive:window.DogBossLiveUI.battleModel,view};
}
test('Four rounds share one screen, without replacing the main battle stage',()=>{
 for(const file of ['dog-boss10.html','dog-group-boss.html']){
  const html=read(file);
  assert.match(html,/id="live-shield-value"/);
  assert.match(html,/id="live-shield-fill"/);
  assert.match(html,/id="live-stage-announcement"/);
  assert.match(html,/class="live-exchange-beams"/);
  assert.equal((html.match(/class="live-exchange-bolt live-exchange-bolt-/g)||[]).length,3);
  assert.match(html,/class="live-exchange-counterbolt"/);
  assert.match(html,/class="live-exchange-shield-dome"/);
  assert.match(html,/data-step="3"/);
  assert.match(html,/id="combat-scene"/);
  assert.match(html,/id="mini-game"/);
  assert.ok(html.indexOf('id="combat-scene"')<html.indexOf('id="mini-game"'));
 }
 assert.match(css,/live-team-shield/);
 assert.match(css,/live-exchange-attack/);
 assert.match(css,/live-exchange-defense/);
 assert.match(css,/exchange-boss-lunge/);
 assert.match(css,/exchange-shield-flash/);
 assert.match(css,/exchange-hero-bolt/);
 assert.match(css,/exchange-boss-bolt/);
 assert.match(css,/exchange-team-shield/);
 assert.match(css,/--exchange-offset/);
 assert.match(css,/prefers-reduced-motion/);
});
test('First 2s exchange shows server-scored group attack and creates one strike scene',()=>{
 const {ui,view,node,classes}=fixture();
 ui.update(view,startedAt+8700);
 assert.equal(node('live-stage-announcement').hidden,false);
 assert.match(node('live-stage-title').textContent,/GEMEINSAMER ANGRIFF/);
 assert.match(node('live-stage-score').textContent,/18 \/ 24 Treffer/);
 assert.match(node('live-stage-score').textContent,/4,5 % Extraangriff/);
 assert.equal(node('live-round-label').textContent,'ZWISCHENSEQUENZ 1 / 4');
 assert.ok(classes.get('combat-scene').has('live-exchange-attack'));
 assert.equal(node('step-3').hidden,false);
 assert.equal(node('live-shield-value').textContent,'100 / 100');
 ui.update(view,startedAt+9000);
 assert.ok(classes.get('combat-scene').has('live-exchange-attack'));
 ui.update(view,startedAt+11300);
 assert.equal(node('live-stage-announcement').hidden,true);
 assert.equal(node('live-round-label').textContent,'RUNDE 2 / 4');
 assert.equal(node('live-mini-prompt').hidden,true);
 assert.ok(!classes.get('combat-scene').has('live-exchange-attack'));
});
test('Boss retaliation and team defense show the confirmed shared shield value',()=>{
 const {ui,view,node,classes}=fixture();
 view.miniGames.exchange.shield=92;
 ui.update(view,startedAt+18800);
 assert.equal(node('live-shield-value').textContent,'92 / 100');
 assert.equal(node('live-shield-fill').style.width,'92%');
 assert.match(node('live-stage-title').textContent,/BOSS SCHLÄGT ZURÜCK/);
 assert.match(node('live-stage-score').textContent,/92 \/ 100/);
 assert.ok(classes.get('combat-scene').has('live-exchange-defense'));
 view.miniGames.exchange.shield=75;
 ui.update(view,startedAt+38600);
 assert.match(node('live-stage-score').textContent,/75 \/ 100/);
 assert.equal(node('live-shield-fill').style.width,'75%');
});
test('Older three-game fights do not show a fictitious shield exchange',()=>{
 const {ui,view,node}=fixture();
 view.miniGames.version=2;
 view.miniGames.rounds=view.miniGames.rounds.slice(0,3);
 view.miniGames.exchange=null;
 ui.update(view,startedAt+18000);
 assert.equal(node('step-3').hidden,true);
 assert.equal(node('live-stage-announcement').hidden,true);
 assert.equal(node('live-round-label').textContent,'RUNDE 3 / 3');
 assert.equal(node('live-shield-value').textContent,'100 / 100');
});


test('Three named team heroes perform the attack; empty success does not fake a boss hit',()=>{
 const {ui,view,node,classes}=fixture();
 view.roster=[{uid:'c',name:'Chris'},{uid:'d',name:'David'},{uid:'v',name:'Vanessa'}];
 view.members.push({uid:'d',name:'David',isMe:false},
  {uid:'v',name:'Vanessa',isMe:false});
 ui.update(view,startedAt+8500);
 assert.match(node('live-stage-subtitle').textContent,/Chris, David, Vanessa/);
 view.miniGames.exchange.stages[0].correct=0;
 view.miniGames.exchange.stages[0].bonusPercent=0;
 ui.update(view,startedAt+8900);
 assert.match(node('live-stage-subtitle').textContent,/Kein Treffer/);
 assert.ok(classes.get('combat-scene').has('live-exchange-miss'));
 ui.update(view,startedAt+11400);
 assert.ok(!classes.get('combat-scene').has('live-exchange-miss'));
});

test('Second defensive blow displays actual shield damage and visual shield fracture',()=>{
 const {ui,view,node,classes}=fixture();
 view.miniGames.exchange.shield=75;
 ui.update(view,startedAt+38500);
 assert.match(node('live-stage-score').textContent,/−17 Schildpunkte/);
 assert.equal(node('live-shield-value').textContent,'75 / 100');
 assert.ok(classes.get('combat-scene').has('live-exchange-guard-damaged'));
 ui.update(view,startedAt+39990);
 assert.equal(node('live-stage-announcement').hidden,false);
 ui.update(view,startedAt+40010);
 assert.equal(node('live-stage-announcement').hidden,true);
 assert.ok(!classes.get('combat-scene').has('live-exchange-guard-damaged'));
});
