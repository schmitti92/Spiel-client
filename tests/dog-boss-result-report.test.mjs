import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const src=read('dog-boss-result-report.js');
function load(extra={}){
 const window={};
 runInNewContext(src,{window,...extra},{timeout:1000});
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
 const forge=node('a'),map=node('a');
 forge.href='/dog-ascension.html';map.href='/dog-tor-map.html';
 root.closest=()=>body;
 Object.defineProperty(root,'innerHTML',{
  set(html){
   root.html=html;root.nodes={};
   for(const match of html.matchAll(/id="([^"]+)"/g))
    root.nodes[match[1]]=node('div');
  }
 });
 const nodes={'#boss-result-open':open,'#to-forge':forge,'#to-map':map,
  '.stage':body};
 const doc={querySelector:sel=>nodes[sel]||null,createElement:node};
 const callbacks=[];
 const {create}=load({document:doc,setInterval:(fn)=>{callbacks.push(fn);return 1},
  clearInterval(){},Intl});
 const ui=create(root);
 ui.update(fakeView());
 assert.equal(root.hidden,false);
 assert.equal(body.classList.contains('boss-result-open'),true);
 assert.equal(root.nodes['br-hero-vitals'].children.length,3);
 assert.equal(root.nodes['br-attack-rows'].children.length,3);
 assert.equal(root.nodes['br-rounds'].children.length,3);
 assert.equal(root.nodes['br-score-value'].textContent,'62 %');
 assert.match(root.nodes['br-title'].textContent,/NIEDERLAGE/);
 assert.equal(root.nodes['br-final-damage'].textContent,'900 LP');
 assert.equal(root.nodes['br-forge'].href,forge.href);
 root.nodes['br-replay-start'].click();
 assert.match(root.nodes['br-replay-caption'].textContent,/Blitz-Mathe/);
 assert.equal(root.nodes['br-replay-hit'].textContent,'−200 LP');
 callbacks[0]();
 assert.equal(root.nodes['br-replay-hit'].textContent,'−150 LP');
 root.nodes['br-return'].click();
 assert.equal(root.hidden,true);
 assert.equal(open.hidden,false);
 ui.update(fakeView());
 assert.equal(root.hidden,true,'polling does not reopen a dismissed report');
 open.click();
 assert.equal(root.hidden,false);
 const next={...fakeView(true),attempt:3};
 ui.update(next);
 assert.match(root.nodes['br-title'].textContent,/SIEG/);
 ui.update({...next,phase:'fighting',result:null});
 assert.equal(root.hidden,true);
 assert.equal(body.classList.contains('boss-result-open'),false);
});
test('both arena screens include conclusion and local replay, with no client-side combat writes',()=>{
 const css=read('dog-boss-result-report.css');
 for(const token of ['boss-result-open','br-grade-scale','br-attack','br-replay-stage',
  'prefers-reduced-motion'])assert.ok(css.includes(token),token);
 assert.doesNotMatch(src,/\bfetch\s*\(|XMLHttpRequest|localStorage|firebase|Math\.random\(/i);
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
