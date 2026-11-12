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
  derive:window.DogBossLiveUI.battleModel,
  roundRewards:window.DogBossLiveUI.roundRewards,view};
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


test('Shield energy remains unchanged after the server settles a battle',()=>{
 const {ui,view,node,classes}=fixture();
 view.miniGames.exchange.shield=75;
 view.phase='cooldown';
 view.result={hpRemaining:400};
 ui.update(view,startedAt+41000);
 assert.equal(node('live-shield-value').textContent,'75 / 100');
 assert.equal(node('live-shield-fill').style.width,'75%');
 assert.equal(node('live-stage-announcement').hidden,true);
 assert.equal(classes.get('combat-scene').has('live-exchange-attack'),false);
 assert.equal(classes.get('combat-scene').has('live-exchange-defense'),false);
});


function cinematicFixture(){
 const context=fixture(),view=context.view;
 view.endsAt=startedAt+50000;
 view.miniGames.version=4;
 view.miniGames.rounds.forEach((round,index)=>{
  const bounds=[[0,8000],[12500,20500],[25000,33000],[37500,45500]][index];
  round.startMs=bounds[0];round.endMs=bounds[1];
 });
 const exchange=view.miniGames.exchange;
 exchange.version=4;exchange.durationMs=50000;
 exchange.cumulativeExtraDamage=231;
 exchange.stages[0].bonusDamage=231;
 exchange.stages[2].bonusDamage=107;
 return context;
}
test('50-second animation has four 4.5s video-like score windows with readable central totals',()=>{
 for(const file of ['dog-boss10.html','dog-group-boss.html']){
  const html=read(file);
  assert.match(html,/id="live-cinematic"/);
  assert.match(html,/id="cinematic-score"/);
  assert.match(html,/id="cinematic-bonus"/);
  assert.match(html,/id="cinematic-cumulative"/);
  assert.match(html,/id="cinematic-progress"/);
  assert.match(html,/id="timer" role="timer">01:39/);
 }
 assert.match(css,/\.arena-live \.live-cinematic\s*\{/);
 assert.match(css,/\.arena-live \.live-cinematic-score\s*\{/);
 assert.match(css,/\.arena-live \.live-cinematic-bonus strong\s*\{/);
 assert.match(css,/\.arena-live \.live-cinematic\[hidden\]\{display:none\}/);
 const {ui,view,node}=cinematicFixture();
 ui.update(view,startedAt+7500);
 assert.equal(node('live-cinematic').hidden,true);
 ui.update(view,startedAt+8000);
 assert.equal(node('live-cinematic').hidden,false);
 assert.equal(node('live-stage-announcement').hidden,true);
 assert.match(node('cinematic-header').textContent,/TEAM SCHLÄGT ZU/);
 assert.equal(node('cinematic-score').textContent,'18 / 24');
 assert.equal(node('cinematic-bonus').textContent,'+231');
 assert.match(node('cinematic-bonus-detail').textContent,/Finale Wertung folgt/);
 assert.match(node('cinematic-cumulative').textContent,/Gesamtbonus: \+231/);
 assert.match(node('cinematic-next').textContent,/Ausweichen/);
 assert.equal(node('cinematic-countdown').textContent,'4,5 s');
 ui.update(view,startedAt+11800);
 assert.equal(node('live-cinematic').hidden,false,'result stays readable after 3.8s');
 ui.update(view,startedAt+12500);
 assert.equal(node('live-cinematic').hidden,true);
 assert.equal(node('live-round-label').textContent,'RUNDE 2 / 4');
});
test('Defense scene highlights 100-point team shield and 25-point block calculation',()=>{
 const {ui,view,node,classes}=cinematicFixture();
 view.miniGames.exchange.shield=92;
 ui.update(view,startedAt+21000);
 assert.equal(node('live-cinematic').hidden,false);
 assert.match(node('cinematic-header').textContent,/BOSS GREIFT AN/);
 assert.equal(node('cinematic-score').textContent,'92 / 100');
 assert.equal(node('cinematic-bonus').textContent,'17 / 25');
 assert.match(node('cinematic-bonus-detail').textContent,/−8 Schildpunkte/);
 assert.ok(classes.get('combat-scene').has('live-exchange-defense'));
 view.miniGames.exchange.shield=75;
 ui.update(view,startedAt+46500);
 assert.equal(node('cinematic-score').textContent,'75 / 100');
 assert.equal(node('cinematic-bonus').textContent,'8 / 25');
 assert.match(node('cinematic-next').textContent,/Finale Auswertung/);
 ui.update(view,startedAt+50001);
 assert.equal(node('live-cinematic').hidden,true);
});
test('M-06 live interlude shows server-normalized accuracy and only final official team score',()=>{
 const {ui,view,node}=cinematicFixture();
 view.miniGames.version=15;
 view.endsAt=startedAt+135000;
 const rounds=view.miniGames.rounds;
 const frames=[[0,12000],[26000,41000],[55000,65000],[79000,87000]];
 for(let i=0;i<4;i++){rounds[i].startMs=frames[i][0];rounds[i].endMs=frames[i][1];}
 rounds[2].maxSteps=10;
 rounds.push({kind:'chain',round:4,startMs:101000,endMs:121000,maxSteps:10});
 const stages=view.miniGames.exchange.stages;
 stages[4]={round:4,kind:'chain',defensive:false,completed:true,
  correct:7,max:10,bonusPercent:3.5,bonusDamage:110,
  playerResults:[{uid:'c',correct:7,max:10,bonusDamage:110}]};
 stages[0].playerResults=[{uid:'c',correct:6,max:8,bonusDamage:150}];
 view.roster=[{uid:'c',name:'Chris'}];
 view.miniGames.exchange.version=15;
 view.miniGames.exchange.durationMs=135000;
 const evaluation={
  weighting:'equal',weightPercentPerGame:20,completedRounds:4,
  teamPercent:null,perfect:null,
  rounds:[
   {completed:true,percent:75,players:[{uid:'c',correct:6,max:8,percent:75}]},
   {completed:true,percent:100,players:[{uid:'c',correct:3,max:3,percent:100}]},
   {completed:true,percent:50,players:[{uid:'c',correct:5,max:10,percent:50}]},
   {completed:true,percent:66.7,players:[{uid:'c',correct:2,max:3,percent:66.7}]},
   {completed:false,percent:null,players:null}]
 };
 view.miniGames.exchange.evaluation=evaluation;
 stages[4].completed=false;
 ui.update(view,startedAt+88000);
 assert.match(node('v3-results-subtitle').textContent,/20 % Gewicht/);
 assert.match(node('live-stage-score').textContent,/Genauigkeit/);
 assert.doesNotMatch(node('v3-results-note').textContent,/Gesamtleistung/);
 stages[4].completed=true;
 evaluation.completedRounds=5;
 evaluation.teamPercent=68.3;
 evaluation.perfect=false;
 evaluation.rounds[4]={completed:true,percent:70,
  players:[{uid:'c',correct:7,max:10,percent:70}]};
 ui.update(view,startedAt+122500);
 assert.match(node('v3-results-note').textContent,/Gesamtleistung: 68,3 %/);
 assert.match(node('v3-results-note').textContent,/alle 5 Minispiele je 20 %/);
 view.phase='victory';
 view.result={win:true,damage:900,bossHp:1000,hpRemaining:0};
 ui.update(view,startedAt+136000);
 assert.match(node('live-feedback').textContent,/Fünf-Spiele-Leistung: 68,3 %/);
});

test('M-07: server bonus, saved LP and applied LP are distinguished per hero and impact time',()=>{
 const {roundRewards,view}=fixture();
 const round={round:0,kind:'math'};
 const stage={completed:true,defensive:false,playerResults:[
  {uid:'c',correct:6,max:8,bonusDamage:150},
  {uid:'d',correct:0,max:8,bonusDamage:0}
 ]};
 assert.equal(roundRewards(view,round,{...stage,completed:false},5000),null);
 view.miniGames.exchange.strikes=[
  {round:0,uid:'c',kind:'hero-strike',amount:375,atMs:8700},
  {round:0,uid:'d',kind:'hero-strike',amount:90,atMs:9300},
  {round:1,uid:'c',kind:'boss-strike',amount:14,atMs:21300}
 ];
 const pending=roundRewards(view,round,stage,8600);
 assert.equal(pending[0].correct,6);
 assert.equal(pending[0].max,8);
 assert.equal(pending[0].earnedBonus,150);
 assert.equal(pending[0].appliedDamage,null,'future hit is not yet dealt');
 assert.equal(pending[0].strikePending,true);
 assert.equal(pending[1].earnedBonus,0);
 assert.equal(roundRewards(view,round,stage,9000)[0].appliedDamage,375);
 assert.equal(roundRewards(view,round,stage,9000)[1].appliedDamage,null);
 assert.equal(roundRewards(view,round,stage,9400)[1].appliedDamage,90,
  'a missed minigame does not suppress the equipment-based base hit');
 const defense={completed:true,defensive:true,playerResults:[
  {uid:'c',correct:2,max:3,savedHp:23,protectionPoints:17}
 ]};
 const safe=roundRewards(view,{round:1},defense,20000)[0];
 assert.equal(safe.savedHp,23);
 assert.equal(safe.receivedDamage,null);
 assert.equal(safe.strikePending,true);
 assert.equal(roundRewards(view,{round:1},defense,22000)[0].receivedDamage,14);
 assert.equal(roundRewards(view,{round:1},defense,22000)[0].savedHp,23,
  'received damage and protected LP are different valid server quantities');
 const missed=roundRewards(view,{round:2},
  {completed:true,defensive:false,playerResults:[
   {uid:'c',correct:0,max:0,fallen:true,bonusDamage:0}]},50000)[0];
 assert.equal(missed.fallen,true);
 assert.equal(missed.earnedBonus,0);
 assert.equal(missed.appliedDamage,null);
});
test('Previous 40-second fights still use their original short result scene',()=>{
 const {ui,view,node}=fixture();
 ui.update(view,startedAt+9000);
 assert.equal(node('live-cinematic').hidden,true);
 assert.equal(node('live-stage-announcement').hidden,false);
 ui.update(view,startedAt+12000);
 assert.equal(node('live-stage-announcement').hidden,true);
});
