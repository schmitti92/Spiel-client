import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const src=read('dog-boss-result-report.js');
function load(extra={}){
 const window=extra.window||{};
 runInNewContext(src,{...extra,window},{timeout:1000});
 return window.DogBossResultReport;
}
const fakeView=(win=false)=>({
 gate:10,name:'Der Aschewächter',phase:win?'victory':'cooldown',
 startedAt:1_900_000_000_000,endsAt:1_900_000_135_000,attempt:2,
 cooldownUntil:1_900_000_735_000,
 result:{win,damage:win?1200:900,bossHp:1000,
  hpRemaining:win?0:100,rareCritical:false},
 roster:[
  {uid:'a',weaponLevel:3,armorLevel:2},{uid:'b',weaponLevel:2,armorLevel:3},
  {uid:'c',weaponLevel:1,armorLevel:1}],
 members:[
  {uid:'a',name:'Chris',heroClass:'krieger',isMe:true},
  {uid:'b',name:'Nova',heroClass:'magierin'},
  {uid:'c',name:'Titan',heroClass:'waechter'}],
 teamHealth:{heroes:[
  {uid:'a',hp:111,maxHp:160},
  {uid:'b',hp:85,maxHp:160},
  {uid:'c',hp:25,maxHp:145}]},
 miniGames:{version:14,rounds:[
  {round:0,kind:'math'},{round:1,kind:'dodge'},{round:2,kind:'chain'}],
 exchange:{durationMs:135000,
  stages:[
   {round:0,kind:'math',completed:true,defensive:false,playerResults:[
    {uid:'a',correct:6,max:8},{uid:'b',correct:8,max:8},{uid:'c',correct:0,max:8}]},
   {round:1,kind:'dodge',completed:true,defensive:true,playerResults:[
    {uid:'a',correct:3,max:3},{uid:'b',correct:1,max:3},{uid:'c',correct:0,max:3}]},
   {round:2,kind:'chain',completed:true,defensive:false,playerResults:[
    {uid:'a',correct:7,max:10},{uid:'b',correct:10,max:10},{uid:'c',correct:4,max:10}]}
  ],
  strikes:[
   {uid:'c',slot:2,round:0,kind:'hero-strike',amount:100,atMs:16500},
   {uid:'a',slot:0,round:0,kind:'hero-strike',amount:200,atMs:13500},
   {uid:'b',slot:1,round:0,kind:'hero-strike',amount:150,atMs:15100},
   {uid:'a',slot:0,round:1,kind:'boss-strike',amount:20,atMs:43000},
   {uid:'b',slot:1,round:1,kind:'boss-strike',amount:30,atMs:45500},
   {uid:'c',slot:2,round:1,kind:'boss-strike',amount:60,atMs:47500},
   {uid:'a',slot:0,round:2,kind:'hero-strike',amount:90,atMs:122000},
   {uid:'b',slot:1,round:2,kind:'hero-strike',amount:120,atMs:126000}
  ]}}
});
test('the end report uses only a server-confirmed verdict and exact final boss HP',()=>{
 const {model}=load();
 const loss=model(fakeView());
 assert.equal(loss.result.win,false);
 assert.equal(loss.result.damage,900);
 assert.equal(loss.result.bossRemaining,100);
 assert.equal(loss.result.bossHp,1000);
 assert.equal(loss.teamHp,221);
 assert.equal(loss.teamMax,465);
 assert.equal(loss.rows.length,3);
 assert.equal(loss.rows[0].hp,111);
 assert.equal(loss.rows[0].attack,290);
 assert.equal(loss.rows[0].taken,20);
 assert.equal(loss.rows[1].attack,270);
 assert.equal(loss.rows[2].attack,100);
 assert.equal(loss.score.correct,39);
 assert.equal(loss.score.max,63);
 assert.equal(loss.score.percent,62);
 assert.equal(loss.score.grade,'Gut');
 assert.equal(loss.stages.length,3);
 assert.equal(loss.stages[2].percent,70);
 assert.equal(loss.replay.length,8);
 assert.equal(loss.replay[0].uid,'a','replay order uses confirmed timestamps');
 assert.equal(loss.replay.at(-1).uid,'b');
 assert.ok(loss.tips.some(x=>x.includes('100 LP')));
 assert.equal(loss.rows.reduce((sum,p)=>sum+p.attack,0),660);
 assert.notEqual(loss.rows.reduce((sum,p)=>sum+p.attack,0),loss.result.damage,
  'cinematic hit subtotal is not falsely passed off as final stochastic result');
 const win=model(fakeView(true));
 assert.equal(win.result.win,true);
 assert.equal(win.result.bossRemaining,0);
 assert.ok(win.tips.some(x=>x.includes('besiegt')));
 assert.equal(model({...fakeView(),phase:'fighting'}),null);
 assert.equal(model({...fakeView(),result:null}),null);
 const bypassed={...fakeView(),phase:'waiting',developerBossCooldownDisabled:true};
 assert.equal(model(bypassed).result.win,false,
  'developer cooldown bypass must not hide an already completed defeat');
 assert.equal(model({...bypassed,developerBossCooldownDisabled:false}),null);
 assert.equal(model({...bypassed,startedAt:0}),null);
});

test('E-01 only a full server-confirmed outcome opens the mandatory finish report',()=>{
 const {model}=load();
 const victory=fakeView(true),defeat=fakeView(false);
 assert.equal(model(victory)?.result.win,true);
 assert.equal(model(defeat)?.result.win,false);
 assert.equal(model({...defeat,phase:'waiting',
  developerBossCooldownDisabled:true})?.result.win,false,
  'administrator bypass still exposes the real, previous defeat');
 for(const incomplete of [
  {...victory,phase:'fighting'},
  {...victory,phase:'victory',result:null},
  {...defeat,phase:'cooldown',result:{}},
  {...victory,phase:'victory',result:{...victory.result,win:false}},
  {...defeat,phase:'cooldown',result:{...defeat.result,win:true}},
  {...defeat,phase:'waiting',developerBossCooldownDisabled:false},
  {...defeat,phase:'waiting',developerBossCooldownDisabled:true,startedAt:0},
  {...victory,endsAt:victory.startedAt},
  {...victory,roster:[]}
 ])assert.equal(model(incomplete),null,
  'unconfirmed or contradictory battle states must not manufacture a result');
});
test('minigame grade is bounded 0–100 with explicit maximum and missing-data handling',()=>{
 const {grade,model}=load();
 assert.equal(grade(0),'Schwach');
 assert.equal(grade(24),'Ausbaufähig');
 assert.equal(grade(40),'Ordentlich');
 assert.equal(grade(60),'Gut');
 assert.equal(grade(80),'Sehr gut');
 assert.equal(grade(95),'Hervorragend');
 assert.equal(grade(100),'Maximum');
 const older=fakeView();
 older.miniGames.exchange.stages=[];
 older.miniGames.exchange.strikes=[];
 const m=model(older);
 assert.equal(m.score.percent,null);
 assert.equal(m.score.grade,'Nicht verfügbar');
 assert.equal(m.rows.every(p=>p.hp!==null),true);
 assert.equal(m.replay.length,0);
 assert.ok(!m.tips.some(x=>x.includes('von 0 möglichen')));
});
test('M-06 end report uses the verified equal-weight grade instead of raw 39/63 hit ratio',()=>{
 const {model}=load();
 const view=fakeView();
 view.miniGames.exchange.evaluation={
  weighting:'equal',weightPercentPerGame:20,completedRounds:5,
  games:5,teamPercent:55.8,perfect:false,
  rounds:[{percent:75},{percent:66.7},{percent:70},
   {percent:0},{percent:67.3}],
  players:[{uid:'a',percent:67.3},{uid:'b',percent:100},{uid:'c',percent:0}]
 };
 const report=model(view);
 assert.equal(report.score.correct,39);
 assert.equal(report.score.max,63);
 assert.equal(report.score.percent,55.8);
 assert.equal(report.score.grade,'Gut');
 assert.equal(report.score.equalWeight,true);
 assert.equal(report.score.perfect,false);
 assert.deepEqual(report.rows.map(x=>x.percentage),[67.3,100,0]);
 assert.deepEqual(report.stages.slice(0,3).map(x=>x.percent),[75,66.7,70]);
 assert.equal(report.result.damage,900,'combat damage cannot change with the grade');
 const incomplete=fakeView();
 incomplete.miniGames.exchange.evaluation={...view.miniGames.exchange.evaluation,
  completedRounds:4,teamPercent:null};
 assert.equal(model(incomplete).score.percent,62,
  'pending evaluation must not invent its final percentage');
 const perfect=fakeView(true);
 perfect.miniGames.exchange.evaluation={...view.miniGames.exchange.evaluation,
  teamPercent:100,perfect:true};
 assert.equal(model(perfect).score.grade,'Maximum');
 assert.equal(model(perfect).score.perfect,true);
});

test('M-07: final report itemizes verified per-hero hits and genuine saved HP, never inventing absent hits',()=>{
 const {model}=load();
 const view=fakeView();
 view.miniGames.exchange.stages[0].playerResults[0].bonusDamage=45;
 view.miniGames.exchange.stages[1].playerResults[0].savedHp=20;
 const result=model(view);
 const chrisAttack=result.stages[0].persons[0];
 assert.equal(chrisAttack.name,'Chris');
 assert.equal(chrisAttack.correct,6);
 assert.equal(chrisAttack.max,8);
 assert.equal(chrisAttack.bonusDamage,45);
 assert.equal(chrisAttack.hit,200,'actual stage strike, not equipment bonus');
 assert.equal(result.stages[0].persons[2].hit,100);
 const chrisDefense=result.stages[1].persons[0];
 assert.equal(chrisDefense.correct,3);
 assert.equal(chrisDefense.savedHp,20);
 assert.equal(chrisDefense.hit,20,'boss hit is separate from shielded HP');
 assert.equal(result.stages[2].persons[2].hit,null,
  'absent strike history must not be reported as a confirmed zero');
 const old={...view,miniGames:{...view.miniGames,exchange:{
  ...view.miniGames.exchange,strikes:[]}}};
 assert.equal(model(old).stages[0].persons[0].hit,null);
 assert.equal(result.result.damage,900,'no combat mechanic is changed');
});
test('single hero loss yields honest tactical advice; report never invents absent teammates',()=>{
 const {model}=load();
 const one=fakeView();
 one.roster=one.roster.slice(0,1);
 one.members=one.members.slice(0,1);
 const report=model(one);
 assert.equal(report.rows.length,1);
 assert.ok(report.tips.some(x=>x.includes('zu dritt')));
 assert.equal(report.rows[0].name,'Chris');
 assert.ok(report.replay.every(x=>x.uid==='a'));
});
function classList(){
 const c=new Set();return {add:x=>c.add(x),remove:x=>c.delete(x),
  toggle:(x,b)=>b?c.add(x):c.delete(x),contains:x=>c.has(x)};
}
function node(tag='div'){
 const handlers={};
 const el={tag,hidden:false,children:[],className:'',textContent:'',
  dataset:{},style:{},attributes:{},offsetWidth:200,href:'',
  classList:classList(),
  setAttribute(k,v){this.attributes[k]=v},
  addEventListener(type,fn){handlers[type]=fn},
  click(){handlers.click?.()},
  append(...nodes){this.children.push(...nodes)},
  replaceChildren(...nodes){this.children=nodes},
  querySelector(sel){return sel.startsWith('#')?this.nodes?.[sel.slice(1)]:null}
 };
 return el;
}
test('result opens automatically, replays only supplied strikes, and closes/reopens without writes',()=>{
 const body=node('main'),open=node('button'),root=node('section');
 const portal=node('body');
 portal.appendChild=el=>{portal.children.push(el);el.portaled=true};
 root.closest=()=>body;
 Object.defineProperty(root,'innerHTML',{
  set(html){
   root.html=html;root.nodes={};
   for(const match of html.matchAll(/id="([^"]+)"/g))
    root.nodes[match[1]]=node('div');
  }
 });
 const nodes={'#boss-result-open':open,'.stage':body};
 const doc={body:portal,querySelector:sel=>nodes[sel]||null,createElement:node};
 const callbacks=[];
 const {create}=load({document:doc,setInterval:(fn)=>{callbacks.push(fn);return 1},
  clearInterval(){},Intl});
 const ui=create(root);
 ui.update(fakeView());
 assert.equal(root.hidden,false);
 assert.equal(body.classList.contains('boss-result-open'),true);
 assert.equal(portal.children.includes(root),true,'the dialog is moved outside the stage');
 assert.equal(portal.classList.contains('dog-boss-report-visible'),true);
 assert.match(root.html,/class="br-dialog" role="dialog" aria-modal="true"/);
 assert.match(root.html,/class="br-scroll"/);
 assert.match(root.html,/id="br-return">✓ Bestätigen/);
 assert.doesNotMatch(root.html,/id="br-forge"|id="br-map"/);
 assert.equal(root.nodes['br-hero-vitals'].children.length,3);
 assert.equal(root.nodes['br-attack-rows'].children.length,3);
 assert.equal(root.nodes['br-strike-rows'].children.length,8);
 assert.equal(root.nodes['br-strike-details'].hidden,false);
 assert.equal(root.nodes['br-strike-rows'].children[0].children[1].textContent,'Chris');
 assert.equal(root.nodes['br-strike-rows'].children[0].children[3].textContent,'−200 LP');
 assert.equal(root.nodes['br-rounds'].children.length,3);
 const firstStage=root.nodes['br-rounds'].children[0];
 assert.ok(firstStage.children.some(x=>x.className==='br-round-personal'),
  'end report displays a compact individual round-by-round reward row');
 const firstDetail=firstStage.children.find(x=>x.className==='br-round-personal');
 assert.match(firstDetail.children[0].textContent,/Chris · 6\/8 richtig/);
 assert.match(firstDetail.children[0].textContent,/200 Boss-LP/);
 assert.equal(root.nodes['br-score-value'].textContent,'62 %');
 assert.match(root.nodes['br-title'].textContent,/NIEDERLAGE/);
 assert.equal(root.nodes['br-final-damage'].textContent,'900 LP');
 assert.equal(root.nodes['br-return'].textContent,''); // test DOM parser cannot populate inner text
 assert.equal(root.nodes['br-replay-start'].disabled,false);
 root.nodes['br-replay-start'].click();
 assert.match(root.nodes['br-replay-caption'].textContent,/Blitz-Mathe/);
 assert.equal(root.nodes['br-replay-hit'].textContent,'−200 LP');
 callbacks[0]();
 assert.equal(root.nodes['br-replay-hit'].textContent,'−150 LP');
 ui.update(fakeView());
 assert.equal(root.hidden,false,'polling must never close the modal');
 assert.equal(open.hidden,true);
 root.click();
 assert.equal(root.hidden,false,'backdrop click must not dismiss the statistics');
 root.nodes['br-return'].click();
 assert.equal(root.hidden,true);
 assert.equal(open.hidden,false);
 assert.equal(portal.classList.contains('dog-boss-report-visible'),false);
 ui.update(fakeView());
 assert.equal(root.hidden,true,'polling does not reopen a dismissed report');
 open.click();
 assert.equal(root.hidden,false);
 assert.equal(portal.classList.contains('dog-boss-report-visible'),true);
 const next={...fakeView(true),attempt:3};
 ui.update(next);
 assert.match(root.nodes['br-title'].textContent,/SIEG/);
 assert.equal(root.hidden,false,'new battle outcome reopens confirmation');
 ui.update({...next,phase:'fighting',result:null});
 assert.equal(root.hidden,false,'transient same-fight status cannot close the report');
 assert.equal(body.classList.contains('boss-result-open'),true);
 const later={...next,phase:'fighting',result:null,
  attempt:4,startedAt:next.startedAt+300000,endsAt:next.endsAt+300000};
 ui.update(later);
 assert.equal(root.hidden,true,'a genuinely new fight retires the old report');
 assert.equal(body.classList.contains('boss-result-open'),false);
 assert.equal(portal.classList.contains('dog-boss-report-visible'),false);
});
test('E-01 finish dialog opens on first confirmed loss/win and admin-bypassed loss, without any client writes',()=>{
 const stage=node('main'),reopen=node('button'),root=node('section');
 const body=node('body');body.appendChild=child=>body.children.push(child);
 root.closest=()=>stage;
 Object.defineProperty(root,'innerHTML',{set(html){
  root.html=html;root.nodes={};
  for(const match of html.matchAll(/id="([^"]+)"/g))
   root.nodes[match[1]]=node('div');
 }});
 const document={body,querySelector:selector=>
  ({'.stage':stage,'#boss-result-open':reopen}[selector]||null),
  createElement:node};
 const {create}=load({document,Intl,setInterval:()=>1,clearInterval(){}});
 const ui=create(root);
 const pending={...fakeView(false),result:null};
 ui.update(pending);
 assert.equal(root.hidden,true,'the countdown ending cannot create a defeat');
 const first=fakeView(false);
 ui.update(first); // first confirmed server response
 assert.equal(root.hidden,false);
 assert.equal(root.dataset.result,'defeat');
 assert.equal(stage.classList.contains('boss-result-open'),true);
 assert.equal(body.children.includes(root),true,'modal is portaled outside arena');
 assert.match(root.html,/role="dialog" aria-modal="true"/);
 assert.match(root.nodes['br-title'].textContent,/NIEDERLAGE/);
 root.nodes['br-return'].click();
 assert.equal(root.hidden,true);
 ui.update(first);
 assert.equal(root.hidden,true,'the same confirmed outcome is not reopened');
 const win={...fakeView(true),attempt:3};
 ui.update(win);
 assert.equal(root.hidden,false,'new confirmed victory opens automatically');
 assert.match(root.nodes['br-title'].textContent,/SIEG/);
 assert.equal(root.dataset.result,'victory');
 root.nodes['br-return'].click();
 const admin={...fakeView(false),phase:'waiting',
  developerBossCooldownDisabled:true,attempt:4};
 ui.update(admin);
 assert.equal(root.hidden,false,'admin cooldown bypass retains result modal');
 assert.match(root.nodes['br-title'].textContent,/NIEDERLAGE/);
 assert.equal(root.dataset.result,'defeat');
 // A later updated fight is a distinct result, not an accidental reopen.
 const next={...fakeView(false),phase:'fighting',result:null,
  attempt:5,startedAt:admin.startedAt+300000,endsAt:admin.endsAt+300000};
 ui.update(next);
 assert.equal(root.hidden,true,'new active battle clears old result');
 assert.equal(body.classList.contains('dog-boss-report-visible'),false);
});
function e02Fixture(){
 const stage=node('main'),open=node('button'),root=node('section');
 const body=node('body'),intervals=[];
 body.appendChild=child=>body.children.push(child);
 root.closest=()=>stage;
 Object.defineProperty(root,'innerHTML',{set(html){
  root.html=html;root.nodes={};
  for(const match of html.matchAll(/id="([^"]+)"/g))
   root.nodes[match[1]]=node('div');
 }});
 const document={body,querySelector:sel=>
  ({'.stage':stage,'#boss-result-open':open}[sel]||null),
  createElement:node};
 const {create}=load({document,Intl,
  setInterval:fn=>{intervals.push(fn);return intervals.length},
  clearInterval(){}});
 return {stage,body,open,root,ui:create(root),intervals};
}
test('E-02 confirmed window survives brief invalid GET, polling, animation ticks and rebuilt layout',()=>{
 const f=e02Fixture(),confirmed=fakeView(false);
 f.ui.update(confirmed);
 assert.equal(f.root.hidden,false);
 const title=f.root.nodes['br-title'].textContent;
 f.ui.update({...confirmed,result:null});
 assert.equal(f.root.hidden,false,'missing result during same encounter is not confirmation');
 assert.equal(f.root.nodes['br-title'].textContent,title);
 f.ui.update({...confirmed,phase:'fighting',result:null});
 assert.equal(f.root.hidden,false,'stale fighting phase must not force-close the result');
 f.ui.update({...confirmed,phase:'waiting',result:null});
 assert.equal(f.root.hidden,false,'temporary waiting phase must not close the result');
 f.stage.classList.remove('boss-result-open');
 f.body.classList.remove('dog-boss-report-visible');
 f.root.hidden=true; // layout swap momentarily hides the overlay
 f.ui.update(confirmed);
 assert.equal(f.root.hidden,false,'next safe render restores the overlay');
 assert.equal(f.stage.classList.contains('boss-result-open'),true);
 assert.equal(f.body.classList.contains('dog-boss-report-visible'),true);
 f.root.nodes['br-replay-start'].click();
 assert.equal(f.intervals.length,1);
 f.intervals[0](); // replay timer must not dismiss the modal
 f.ui.update(confirmed);
 assert.equal(f.root.hidden,false);
 assert.equal(f.open.hidden,true);
 assert.equal(f.root.nodes['br-title'].textContent,title);
});
test('E-02 only confirmation dismisses; final-damage corrections do not re-open the same battle',()=>{
 const f=e02Fixture(),base=fakeView(false);
 const {model}=load();
 assert.equal(model(base).fightId,model({
  ...base,result:{...base.result,damage:905}}).fightId,
  'damage is not part of the stable battle identity');
 f.ui.update(base);
 const changed={...base,result:{...base.result,damage:905}};
 f.ui.update(changed);
 assert.equal(f.root.hidden,false,'server correction updates the existing open report');
 assert.equal(f.root.nodes['br-final-damage'].textContent,'905 LP');
 f.root.nodes['br-return'].click();
 assert.equal(f.root.hidden,true);
 assert.equal(f.open.hidden,false);
 for(const refreshed of [
  base,changed,{...base,result:{...base.result,damage:906}},
  {...base,result:null},{...base,phase:'fighting',result:null},
  {...base,phase:'waiting',result:null}
 ]){
  f.ui.update(refreshed);
  assert.equal(f.root.hidden,true,
   'one confirmed battle must not auto-reopen after confirmation');
 }
 f.open.click();
 assert.equal(f.root.hidden,false,'explicit click to inspect results is allowed');
 f.root.nodes['br-return'].click();
 assert.equal(f.root.hidden,true);
 const newFight={...fakeView(true),
  startedAt:base.startedAt+300000,endsAt:base.endsAt+300000,attempt:3};
 f.ui.update({...newFight,phase:'fighting',result:null});
 assert.equal(f.root.hidden,true,'a new fight resets old modal');
 f.ui.update(newFight);
 assert.equal(f.root.hidden,false,'new confirmed fight has its own mandatory modal');
 assert.match(f.root.nodes['br-title'].textContent,/SIEG/);
});
test('E-02 admin bypass loss holds through temporary phase mismatch until confirmation',()=>{
 const f=e02Fixture(),loss={...fakeView(false),phase:'waiting',
  developerBossCooldownDisabled:true};
 f.ui.update(loss);
 assert.equal(f.root.hidden,false);
 f.ui.update({...loss,developerBossCooldownDisabled:false});
 assert.equal(f.root.hidden,false,'same admin encounter remains visible');
 f.root.nodes['br-return'].click();
 assert.equal(f.root.hidden,true);
 f.ui.update(loss);
 assert.equal(f.root.hidden,true);
});
function e03Store(){
 const values=new Map(),writes=[];
 return {values,writes,
  getItem(key){return values.get(key)??null;},
  setItem(key,value){values.set(key,String(value));writes.push({key,value:String(value)});},
  removeItem(key){values.delete(key);}
 };
}
function e03Fixture(storage,opts={}){
 let account=opts.uid??'a';
 const stage=node('main'),open=node('button'),root=node('section');
 const body=node('body'),intervals=[];
 body.appendChild=child=>body.children.push(child);
 root.closest=()=>stage;
 Object.defineProperty(root,'innerHTML',{set(html){
  root.html=html;root.nodes={};
  for(const match of html.matchAll(/id="([^"]+)"/g))
   root.nodes[match[1]]=node('div');
 }});
 const document={body,querySelector:sel=>
  ({'.stage':stage,'#boss-result-open':open}[sel]||null),createElement:node};
 const window={};
 if(storage!==undefined){
  Object.defineProperty(window,'localStorage',{get(){
   if(opts.blockedGet)throw new Error('localStorage unavailable');
   return storage;
  }});
 }
 if(opts.sessionStore)window.sessionStorage=opts.sessionStore;
 const {create}=load({window,document,Intl,
  setInterval:fn=>{intervals.push(fn);return intervals.length},
  clearInterval(){}});
 return {stage,open,root,body,intervals,ui:create(root,()=>account),
  setUid:id=>{account=id}};
}
test('E-03 confirmed defeat is remembered locally after page reload; voluntary reopening remains possible',()=>{
 const storage=e03Store(),state=fakeView(false);
 const first=e03Fixture(storage);
 first.ui.update(state);
 assert.equal(first.root.hidden,false);
 assert.equal(storage.writes.length,0,'no write before the actual confirmation');
 first.root.nodes['br-return'].click();
 assert.equal(storage.writes.length,1,'only explicit confirmation persists');
 const key='dog:boss:result:ack:v1:a:10',id='10:'+state.startedAt+':2';
 assert.equal(storage.values.get(key),id);
 const second=e03Fixture(storage); // fresh JavaScript context: actual page reload
 second.ui.update(state);
 assert.equal(second.root.hidden,true,'same completed fight must stay acknowledged');
 assert.equal(second.open.hidden,false,'user can still inspect the report');
 assert.equal(second.root.nodes['br-final-damage'].textContent,'900 LP');
 assert.equal(storage.writes.length,1,'reload must not write anything');
 second.ui.update({...state,result:{...state.result,damage:901}});
 assert.equal(second.root.hidden,true,'late result correction must not reopen');
 second.open.click();
 assert.equal(second.root.hidden,false,'a deliberate user action reopens it');
 second.root.nodes['br-return'].click();
 assert.equal(second.root.hidden,true);
 assert.equal(storage.writes.length,2,'re-confirming after voluntary re-open persists the same ID');
});
test('E-03 player switch cannot reuse another account confirmation on one device',()=>{
 const storage=e03Store(),state=fakeView(false);
 const f=e03Fixture(storage,{uid:'a'});
 f.ui.update(state);f.root.nodes['br-return'].click();
 assert.equal(f.root.hidden,true);
 f.setUid('b');
 f.ui.update(state);
 assert.equal(f.root.hidden,false,'another signed-in player must see their own report');
 f.root.nodes['br-return'].click();
 assert.equal(storage.values.size,2);
 assert.equal(storage.values.get('dog:boss:result:ack:v1:b:10'),
  '10:'+state.startedAt+':2');
 f.setUid('a');f.ui.update(state);
 assert.equal(f.root.hidden,true,'switching back restores only player A receipt');
 f.setUid('c');f.ui.update(state);
 assert.equal(f.root.hidden,false,'an unacknowledged third user is not hidden');
});
test('E-03 a newer attempt or another gate always gets a distinct mandatory report',()=>{
 const storage=e03Store(),state=fakeView(false);
 const f=e03Fixture(storage);
 f.ui.update(state);f.root.nodes['br-return'].click();
 const next={...state,attempt:3,
  startedAt:state.startedAt+300000,endsAt:state.endsAt+300000};
 f.ui.update({...next,phase:'fighting',result:null});
 assert.equal(f.root.hidden,true);
 f.ui.update(next);
 assert.equal(f.root.hidden,false,'attempt three has not been acknowledged');
 f.root.nodes['br-return'].click();
 assert.equal(storage.values.get('dog:boss:result:ack:v1:a:10'),
  '10:'+next.startedAt+':3');
 const gate20={...next,gate:20,name:'Zweiter Wächter'};
 f.ui.update(gate20);
 assert.equal(f.root.hidden,false,'gate 20 cannot use gate 10 acknowledgement');
 f.root.nodes['br-return'].click();
 assert.equal(storage.values.size,2,'one small receipt per player per gate');
 const reloaded=e03Fixture(storage);
 reloaded.ui.update(gate20);
 assert.equal(reloaded.root.hidden,true);
});
test('E-03 v15 personal finale is NOT replayed after reload of a confirmed report',()=>{
 const storage=e03Store(),state=fakeView(false);
 state.miniGames.version=15;
 state.combat={finale:{kind:'personal',strikes:[
  {uid:'a',sequence:1,amount:25,hpBefore:125,hpAfter:100},
  {uid:'b',sequence:2,amount:40,hpBefore:100,hpAfter:60}
 ]}};
 // Same authoritative hero-finisher records that the server provides as
 // confirmed exchange strikes. The finale metadata alone is not a strike.
 state.miniGames.exchange.strikes.push(...state.combat.finale.strikes.map(
  (hit,i)=>({...hit,round:4,kind:'hero-finisher',atMs:120000+i*1500})));
 const first=e03Fixture(storage);first.ui.update(state);
 assert.equal(first.root.nodes['br-finale-screen'].hidden,false);
 assert.equal(first.root.nodes['br-return'].disabled,true);
 // Complete cinematic timers; confirmation remains blocked until finished.
 for(let i=0;i<state.combat.finale.strikes.length+2;i++)
  first.intervals[0]();
 assert.equal(first.root.nodes['br-return'].disabled,false);
 first.root.nodes['br-return'].click();
 assert.equal(first.root.hidden,true);
 const reloaded=e03Fixture(storage);
 reloaded.ui.update(state);
 assert.equal(reloaded.root.hidden,true);
 assert.equal(reloaded.root.nodes['br-finale-screen'].hidden,true);
 assert.equal(reloaded.intervals.length,0,'no automatic v15 finale on confirmed reload');
});
test('E-03 blocked localStorage safely falls back to sessionStorage, then in-memory only',()=>{
 const state=fakeView(false),persistent=e03Store(),session=e03Store();
 const a=e03Fixture(persistent,{blockedGet:true,sessionStore:session});
 a.ui.update(state);
 a.root.nodes['br-return'].click();
 assert.equal(a.root.hidden,true);
 assert.equal(session.writes.length,1,'session fallback preserves reload within tab');
 const b=e03Fixture(persistent,{blockedGet:true,sessionStore:session});
 b.ui.update(state);
 assert.equal(b.root.hidden,true);
 const locked={getItem(){throw Error('denied')},setItem(){throw Error('denied')}};
 const c=e03Fixture(locked);
 c.ui.update(state);
 assert.equal(c.root.hidden,false);
 c.root.nodes['br-return'].click();
 assert.equal(c.root.hidden,true,'memory-only acknowledgement works during session');
 c.ui.update(state);
 assert.equal(c.root.hidden,true,'failed storage does not cause an immediate reopen');
 const fresh=e03Fixture(locked);
 fresh.ui.update(state);
 assert.equal(fresh.root.hidden,false,
  'blocked storage cannot promise persistence after a reload');
});
test('E-03 before confirmation or without player identity no local receipt may hide the report',()=>{
 const storage=e03Store(),state=fakeView(false);
 const f=e03Fixture(storage,{uid:''});
 f.ui.update(state);f.root.nodes['br-return'].click();
 assert.equal(storage.writes.length,0,'anonymous viewer is never attributed to another account');
 const fresh=e03Fixture(storage,{uid:'a'});
 fresh.ui.update(state);
 assert.equal(fresh.root.hidden,false,'unconfirmed fight must still appear');
 assert.equal(storage.values.size,0);
});
test('E-04 result accounting separates authoritative final damage from cinematic hits',()=>{
 const {model}=load(),view=fakeView(false),report=model(view);
 assert.equal(report.result.damage,900);
 assert.equal(report.rows.reduce((sum,p)=>sum+p.attack,0),660);
 assert.equal(report.rows[0].percentage,67);
 assert.equal(report.teamHp,221);
 assert.equal(report.teamMax,465);
 assert.equal(report.replay.length,8);
 assert.ok(report.tips.some(x=>x.includes('Chris')&&x.includes('67 %')),
  'the weakest hero receives specific training advice');
 const f=e02Fixture();f.ui.update(view);
 assert.match(f.root.nodes['br-attack-note'].textContent,/8 bestätigte Ereignisse/);
 assert.match(f.root.nodes['br-attack-note'].textContent,/660 LP persönliche Treffer/);
 assert.match(f.root.nodes['br-settlement'].textContent,/Keine gesonderte Server-Aufschlüsselung/);
 assert.equal(f.root.nodes['br-final-damage'].textContent,'900 LP');
 const chris=f.root.nodes['br-attack-rows'].children[0];
 assert.match(chris.children[1].textContent,/3 Treffer · 290 LP/);
 assert.match(chris.children[3].textContent,/67 %/);
 assert.equal(f.root.nodes['br-strike-rows'].children.length,8);
});
test('E-04 reconciliation only displays server-supplied values and old fights stay honest',()=>{
 const f=e02Fixture(),view=fakeView(false);
 view.combat={version:1,events:view.miniGames.exchange.strikes,
  reconciliation:{reconciled:true,appliedDamage:900,overkillDamage:0,
   guardRecovered:40}};
 f.ui.update(view);
 assert.match(f.root.nodes['br-settlement'].textContent,/900 Boss-LP tatsächlich abgezogen/);
 assert.match(f.root.nodes['br-settlement'].textContent,/40 LP Boss-Abwehr/);
 const old={...fakeView(false),miniGames:{version:0,exchange:{stages:[],strikes:[]}}};
 const another=e02Fixture();another.ui.update(old);
 assert.match(another.root.nodes['br-attack-note'].textContent,/keine Einzelangriff-Historie/);
 assert.equal(another.root.nodes['br-strike-details'].hidden,true);
 assert.equal(another.root.nodes['br-final-damage'].textContent,'900 LP');
});
test('both arena screens include conclusion and local replay, with no client-side combat writes',()=>{
 const css=read('dog-boss-result-report.css');
 for(const token of ['dog-boss-report-visible','br-grade-scale','br-attack','br-replay-stage',
  'br-dialog','br-scroll','br-footer-caption',
  'prefers-reduced-motion'])assert.ok(css.includes(token),token);
 assert.doesNotMatch(src,/\bfetch\s*\(|XMLHttpRequest|firebase|Math\.random\(/i);
 assert.match(src,/localStorage/,'E-03 saves only the local confirmation receipt');
 for(const file of ['dog-boss10.html','dog-group-boss.html']){
  const html=read(file);
  assert.match(html,/id="boss-result-report"/);
  assert.match(html,/id="boss-result-open"/);
  assert.match(html,/dog-boss-result-report\.js\?v=/);
  assert.match(html,/dog-boss-result-report\.css\?v=/);
  const controller=read(file==='dog-boss10.html'?'dog-boss10.js':'dog-group-boss.js');
  assert.match(controller,/DogBossResultReport\?\.create/);
  assert.match(controller,/resultReport\?\.update\(view\)/);
 }
});

test('K-05 finale reveals three personal attacks before the single confirmed result',()=>{
 const body=node('main'),open=node('button'),root=node('section');
 const portal=node('body');
 portal.appendChild=el=>{portal.children.push(el)};
 root.closest=()=>body;
 Object.defineProperty(root,'innerHTML',{set(html){
  root.html=html;root.nodes={};
  for(const match of html.matchAll(/id="([^"]+)"/g))
   root.nodes[match[1]]=node('div');
 }});
 const doc={body:portal,querySelector:sel=>
  ({'#boss-result-open':open,'.stage':body}[sel]||null),
  createElement:node};
 const intervals=[];
 const {create}=load({document:doc,
  setInterval:fn=>{intervals.push(fn);return intervals.length},
  clearInterval(){},Intl});
 const ui=create(root);
 const view=fakeView(false);
 view.miniGames.version=15;
 const id='g10-t'+view.startedAt+'-a2';
 const finals=['a','b','c'].map((uid,i)=>({
  eventId:id+':'+(i+1),sequence:i+1,
  round:4,slot:i,uid,kind:'hero-finisher',
  targetId:'boss',amount:10*(i+1),
  hpBefore:100-i*10,hpAfter:90-i*20,
  atMs:135001+i*1500,overkillDamage:0
 }));
 view.combat={version:1,fightId:id,events:finals,
  finale:{kind:'personal',strikes:finals,outcome:'defeat',
   sceneDurationMs:4500},
  reconciliation:{reconciled:true,rawDamage:900,
   appliedDamage:900,stageDamage:840,finisherDamage:60,
   overkillDamage:0,finalBossHp:100}};
 ui.update(view);
 assert.equal(root.hidden,false);
 assert.equal(root.nodes['br-finale-screen'].hidden,false);
 assert.equal(root.nodes['br-return'].disabled,true);
 assert.match(root.nodes['br-finale-step'].textContent,/1 \/ 3/);
 assert.match(root.nodes['br-finale-name'].textContent,/Chris/);
 root.nodes['br-return'].click();
 assert.equal(root.hidden,false,'cannot dismiss before all three attacks');
 ui.update(view);
 assert.match(root.nodes['br-finale-step'].textContent,/1 \/ 3/,
  'polling must not restart the finale');
 intervals[0]();
 assert.match(root.nodes['br-finale-name'].textContent,/Nova/);
 intervals[0]();
 assert.match(root.nodes['br-finale-name'].textContent,/Titan/);
 intervals[0]();
 assert.match(root.nodes['br-finale-name'].textContent,/NIEDERLAGE/);
 assert.equal(root.nodes['br-return'].disabled,true,
  'final decision appears only after all personal hits');
 intervals[0]();
 assert.equal(root.nodes['br-finale-screen'].hidden,true);
 assert.equal(root.nodes['br-return'].disabled,false);
 root.nodes['br-return'].click();
 assert.equal(root.hidden,true);
 ui.update(view);
 assert.equal(root.hidden,true,'a repeated status GET cannot reopen final judgment');
});
