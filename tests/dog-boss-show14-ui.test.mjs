import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const read=file=>readFileSync(new URL('../'+file,import.meta.url),'utf8');
const at=1_900_000_000_000;
function fakeUI(version=7){
 const nodes=new Map();
 function node(id){
  if(nodes.has(id))return nodes.get(id);
  const classes=new Set();
  const el={id,hidden:false,children:[],textContent:'',offsetWidth:50,dataset:{},
   attrs:{},style:{setProperty(k,v){this[k]=v;}},
   setAttribute(k,v){this.attrs[k]=v;},
   classList:{add:k=>classes.add(k),remove:k=>classes.delete(k),
    toggle:(k,v)=>v?classes.add(k):classes.delete(k),contains:k=>classes.has(k)},
   querySelectorAll(){return Array.from({length:4},(_,i)=>node('step-'+i));},
   replaceChildren(...children){this.children=children;},
   append(...children){this.children.push(...children);}};
  nodes.set(id,el);return el;
 }
 const document={createElement:t=>node('auto-'+t+'-'+nodes.size),
  createDocumentFragment:()=>({append(){}})};
 const root={querySelector:q=>node(q.startsWith('#')?q.slice(1):q)};
 const window={};
 runInNewContext(read('dog-boss-live-ui.js'),{window,document,Date});
 const schedules=version===7?[[0,12000],[26000,34000],[48000,56000],[70000,78000]]:
  [[0,12000],[19000,27000],[34000,42000],[49000,57000]];
 const total=version===7?92000:64000;
 const names=['math','dodge','target','reaction'];
 const rounds=schedules.map(([startMs,endMs],i)=>({
  round:i,kind:names[i],startMs,endMs,maxSteps:i===0?8:3}));
 const stages=names.map((kind,i)=>({round:i,kind,defensive:i===1||i===3,
  completed:true,correct:3,max:9,bonusPercent:2,bonusDamage:135,
  shield:i===1?88:i===3?74:null}));
 const view={phase:'fighting',startedAt:at,endsAt:at+total,
  bossHp:1500,members:[{uid:'a',name:'Held'}],roster:[{uid:'a'}],
  miniGames:{version,rounds,myAnswers:{},
   exchange:{version,durationMs:total,shield:74,
    cumulativeExtraDamage:270,stages}}};
 return{ui:window.DogBossLiveUI.create(root),node,view};
}
test('14-second scene keeps combat readable until the final spectacular 5s countdown',()=>{
 const {ui,node,view}=fakeUI();
 ui.update(view,at+12100);
 assert.equal(node('live-cinematic').hidden,false);
 assert.equal(node('cinematic-grand-countdown').hidden,true);
 assert.equal(node('live-cinematic').dataset.showVersion,'7');
 assert.equal(node('live-cinematic').dataset.showPhase,'prepare');
 assert.match(node('cinematic-header').textContent,/SAMMELT KRAFT/);
 ui.update(view,at+17000);
 assert.equal(node('cinematic-grand-countdown').hidden,true);
 assert.equal(node('live-cinematic').dataset.showPhase,'prepare');
 ui.update(view,at+19000);
 assert.equal(node('live-cinematic').dataset.showPhase,'impact');
 assert.match(node('cinematic-header').textContent,/TRIFFT/);
 ui.update(view,at+20400);
 assert.equal(node('live-cinematic').dataset.showPhase,'result');
 ui.update(view,at+23000);
 assert.equal(node('cinematic-grand-countdown').hidden,false);
 assert.equal(node('cinematic-grand-digit').textContent,'3');
 assert.equal(node('live-cinematic').dataset.showPhase,'countdown');
 assert.equal(node('.live-challenge').classList.contains('is-cinematic-countdown'),true);
 assert.equal(node('cinematic-grand-label').textContent,'NÄCHSTE RUNDE IN');
 assert.match(node('cinematic-grand-next').textContent,/Ausweichen/);
 assert.equal(node('cinematic-grand-ring').style['--show-sweep'],'360.00deg');
 ui.update(view,at+24000);
 assert.equal(node('cinematic-grand-digit').textContent,'2');
 ui.update(view,at+25850);
 assert.equal(node('cinematic-grand-digit').textContent,'1');
 ui.update(view,at+26000);
 assert.equal(node('live-cinematic').hidden,true);
 assert.equal(node('cinematic-grand-countdown').hidden,true);
 assert.equal(node('.live-challenge').classList.contains('is-cinematic-countdown'),false);
 assert.equal(node('cinematic-start-flash').hidden,false);
 ui.update(view,at+26950);
 assert.equal(node('cinematic-start-flash').hidden,true);
});
test('last interlude counts down to finale rather than claiming another minigame',()=>{
 const {ui,node,view}=fakeUI();
 ui.update(view,at+78100);
 assert.equal(node('cinematic-grand-countdown').hidden,true);
 ui.update(view,at+89000);
 assert.equal(node('cinematic-grand-countdown').hidden,false);
 assert.equal(node('cinematic-grand-label').textContent,'FINALE IN');
 assert.match(node('cinematic-grand-next').textContent,/Finale Auswertung/);
 ui.update(view,at+89000);
 assert.equal(node('cinematic-grand-digit').textContent,'3');
 ui.update(view,at+92001);
 assert.equal(node('cinematic-grand-countdown').hidden,true);
});
test('existing 64s battles retain their own 7s scene without grand countdown',()=>{
 const {ui,node,view}=fakeUI(6);
 ui.update(view,at+13000);
 assert.equal(node('cinematic-grand-countdown').hidden,true);
 assert.equal(node('live-cinematic').hidden,false);
 assert.equal(node('live-cinematic').dataset.showVersion,'legacy');
 assert.equal(node('cinematic-countdown').textContent,'6,0 s');
 ui.update(view,at+19000);
 assert.equal(node('live-cinematic').hidden,true);
});
test('new frontend exposes dramatic and accessible time display without new requests',()=>{
 const css=read('dog-boss-show-14.css'),js=read('dog-boss-live-ui.js');
 for(const asset of ['dog-boss10.html','dog-group-boss.html']){
  const html=read(asset);
  for(const id of ['cinematic-grand-countdown','cinematic-grand-ring',
    'cinematic-grand-digit','cinematic-grand-label','cinematic-grand-next'])
   assert.ok(html.includes('id="'+id+'"'),asset+' missing '+id);
  assert.match(html,/dog-boss-show-14\.css/);
 }
 for(const token of ['data-battle-version="7"','boss-show-hero-charge',
  'boss-show-boss-strike','boss-show-number','prefers-reduced-motion:reduce',
  'data-show-phase="countdown"'])assert.ok(css.includes(token),token);
 assert.doesNotMatch(js,/XMLHttpRequest|\bfetch\(/);
});

test('the real 14s strike is centered and countdown occupies the minigame field',()=>{
 const css=read('dog-boss-show-14.css');
 for(const name of ['boss-show-hero-charge','boss-show-boss-strike',
  'boss-show-hero-bolt','boss-show-boss-impact','boss-show-shield-flash']){
  const frame=css.split('@keyframes '+name+'{')[1]?.split('\n}')[0]||'';
  assert.ok(frame,'missing animation '+name);
  assert.match(frame,/0%,(?:28|43|44|46)%/,'first part must not hit: '+name);
  assert.match(frame,/5[0123]%/,'impact must occur near scene midpoint: '+name);
 }
 for(const asset of ['dog-boss10.html','dog-group-boss.html']){
  const html=read(asset);
  const mini=html.indexOf('id="mini-game"');
  const ring=html.indexOf('id="cinematic-grand-countdown"');
  const cinema=html.indexOf('id="live-cinematic"');
  assert.ok(mini>0&&mini<ring&&ring<cinema,
   'countdown must live in minigame panel before cinematic overlay: '+asset);
 }
 assert.match(css,/live-challenge\.is-cinematic-countdown/);
 const {ui,view,node}=fakeUI();
 ui.update(view,at+34100);
 assert.equal(node('cinematic-grand-countdown').hidden,true);
 ui.update(view,at+45000);
 assert.equal(node('cinematic-grand-countdown').hidden,false);
 assert.equal(node('.live-challenge').classList.contains('is-defense'),true);
 ui.update(view,at+48000);
 assert.equal(node('.live-challenge').classList.contains('is-defense'),false);
});

test('between minigames the right panel shows each player and their confirmed personal reward',()=>{
 const {ui,node,view}=fakeUI();
 view.members=[
  {uid:'a',name:'Chris',isMe:true},
  {uid:'b',name:'Nova'},
  {uid:'c',name:'Titan'}
 ];
 view.roster=view.members.map(m=>({uid:m.uid,name:m.name}));
 view.miniGames.exchange.stages[0].playerResults=[
  {uid:'a',correct:6,max:8,bonusDamage:66,bonusPercent:4.5},
  {uid:'b',correct:8,max:8,bonusDamage:90,bonusPercent:6},
  {uid:'c',correct:0,max:8,bonusDamage:0,bonusPercent:0}
 ];
 view.miniGames.exchange.stages[0].bonusDamage=156;
 ui.update(view,at+12100);
 assert.equal(node('v3-round-results').hidden,false);
 assert.equal(node('live-mini-prompt').hidden,true);
 assert.match(node('v3-results-title').textContent,/Blitz-Mathe/);
 const rows=node('v3-results-rows').children;
 assert.equal(rows.length,3);
 assert.equal(rows[0].children[0].textContent,'Chris');
 assert.equal(rows[0].children[1].textContent,'6 / 8');
 assert.match(rows[0].children[2].children[0].textContent,/66 Zusatzschaden/);
 assert.equal(rows[1].children[1].textContent,'8 / 8');
 assert.match(rows[1].children[2].children[0].textContent,/90 Zusatzschaden/);
 assert.match(node('v3-results-total').textContent,/156 Zusatzschaden/);
 // Same rows are not rebuilt every animation frame.
 const row=node('v3-results-rows').children[0];
 ui.update(view,at+18000);
 assert.equal(node('v3-results-rows').children[0],row);
 // The final three seconds belong to the existing prominent countdown.
 ui.update(view,at+23000);
 assert.equal(node('v3-round-results').hidden,true);
 assert.equal(node('cinematic-grand-countdown').hidden,false);
 ui.update(view,at+26000);
 assert.equal(node('v3-round-results').hidden,true);
 // Personal defensive rewards show actual LP saved and shield points.
 view.miniGames.exchange.stages[1].playerResults=[
  {uid:'a',correct:3,max:3,protectionPoints:25,savedHp:37},
  {uid:'b',correct:1,max:3,protectionPoints:8,savedHp:12},
  {uid:'c',correct:0,max:3,protectionPoints:0,savedHp:0}
 ];
 ui.update(view,at+34100);
 assert.equal(node('v3-round-results').hidden,false);
 assert.match(node('v3-results-title').textContent,/Ausweichen/);
 assert.match(node('v3-results-rows').children[0].children[2].children[0].textContent,/37 LP geschützt/);
 assert.match(node('v3-results-rows').children[1].children[2].children[1].textContent,/8 \/ 25 Schutzpunkte/);
 assert.match(node('v3-results-total').textContent,/49 LP bewahrt/);
 ui.update(view,at+45000);
 assert.equal(node('v3-round-results').hidden,true);
});
test('round scoreboard waits for server results and does not invent players scores',()=>{
 const {ui,node,view}=fakeUI();
 ui.update(view,at+12100);
 assert.equal(node('v3-round-results').hidden,false);
 assert.match(node('v3-results-rows').children[0].textContent,/Warte auf die bestätigte Einzelwertung/);
 assert.doesNotMatch(node('v3-results-total').textContent,/\+\d/);
 const css=read('dog-boss-battle-v3.css');
 assert.match(css,/\.v3-round-results\[hidden\]/);
 for(const file of ['dog-boss10.html','dog-group-boss.html']){
  const html=read(file);
  assert.match(html,/id="v3-round-results"/);
  assert.match(html,/id="v3-results-rows"/);
  assert.match(html,/id="v3-results-total"/);
 }
});

test('fifth Finalschlag is playable at 101s, shows individual earned bonus, then three-second victory countdown',()=>{
 const {ui,node,view}=fakeUI();
 const specs=[[0,12000,'math',8],[26000,41000,'dodge',3],
  [55000,65000,'target',10],[79000,87000,'reaction',3],
  [101000,111000,'target',10]];
 view.miniGames.version=12;
 view.miniGames.rounds=specs.map(([startMs,endMs,kind,maxSteps],round)=>
  ({round,kind,startMs,endMs,maxSteps}));
 view.miniGames.exchange.version=12;
 view.miniGames.exchange.durationMs=125000;
 view.miniGames.exchange.stages=view.miniGames.rounds.map((r,i)=>({
  round:i,kind:r.kind,defensive:i===1||i===3,completed:true,
  correct:i===4?7:3,max:i===4?10:9,bonusPercent:i===4?3.5:2,
  bonusDamage:i===4?35:10,shield:i%2?86:null,
  playerResults:i===4?[{uid:'a',correct:7,max:10,bonusDamage:35}]:[]
 }));
 view.endsAt=at+125000;
 ui.update(view,at+101200);
 assert.equal(node('live-round-label').textContent,'RUNDE 5 / 5');
 assert.equal(node('v3-round-results').hidden,true);
 ui.update(view,at+111100);
 assert.equal(node('v3-round-results').hidden,false);
 assert.match(node('v3-results-title').textContent,/Finaler Schlag/);
 assert.equal(node('v3-results-rows').children[0].children[1].textContent,'7 / 10');
 assert.match(node('v3-results-total').textContent,/35 Zusatzschaden/);
 ui.update(view,at+121999);
 assert.equal(node('cinematic-grand-countdown').hidden,true);
 ui.update(view,at+122000);
 assert.equal(node('cinematic-grand-countdown').hidden,false);
 assert.equal(node('cinematic-grand-digit').textContent,'3');
 assert.equal(node('cinematic-grand-label').textContent,'FINALE IN');
 ui.update(view,at+125000);
 assert.equal(node('v3-round-results').hidden,true);
});
