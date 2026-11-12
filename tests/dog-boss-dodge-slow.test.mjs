import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const at=1_900_000_000_000;
function element(tag='div'){
 const classes=new Set(),events={};
 return {tag,className:'',textContent:'',children:[],hidden:false,disabled:false,
  offsetWidth:100,dataset:{},attrs:{},
  style:{setProperty(name,val){this[name]=val}},
  classList:{add:x=>classes.add(x),remove:x=>classes.delete(x),
   toggle:(x,on)=>on?classes.add(x):classes.delete(x),contains:x=>classes.has(x)},
  addEventListener(type,fn){events[type]=fn},
  click(){if(!this.disabled)events.click?.();},
  setAttribute(name,value){this.attrs[name]=value},
  getAttribute(name){return this.attrs[name]},
  append(...nodes){this.children.push(...nodes)},
  replaceChildren(...nodes){this.children=nodes},
  remove(){this.removed=true},
  get firstElementChild(){return this.children[0]||null},
  querySelector(q){return this.children.find(c=>q==='.'+c.className.split(' ')[0])||null}
 };
}
const dodge={kind:'dodge',round:1,startMs:26000,endMs:41000,maxSteps:3,lanes:2,
 attacks:[
  {step:0,startMs:26000,impactMs:29300,dangerIndex:1,secondDangerIndex:null},
  {step:1,startMs:31000,impactMs:34300,dangerIndex:0,secondDangerIndex:null},
  {step:2,startMs:36000,impactMs:39300,dangerIndex:1,secondDangerIndex:null}
 ],hint:'Drei Einschläge! Weiche vor jedem Schlag in ein sicheres Feld aus.'};
const rounds=[
 {kind:'math',round:0,startMs:0,endMs:12000,maxSteps:8,puzzles:[]},
 dodge,
 {kind:'target',round:2,startMs:55000,endMs:63000,maxSteps:3,lanes:3,initialIndex:0,stepMs:1200},
 {kind:'reaction',round:3,startMs:77000,endMs:85000,maxSteps:3,zoneRadius:.1}
];
function miniFixture(clockNow=null){
 const document={createElement:element,hidden:false};
 const window={};runInNewContext(read('dog-boss-mini-ui.js'),{window,document,Promise,Date});
 const root=element('section'),requests=[];
 const ui=window.DogBossMinigames.create(root,(round,value,step)=>{
  requests.push({round,value,step});return Promise.resolve(true);
 },null,clockNow);
 // Each fixture owns its own round/attack objects; the legacy-v7 test
 // must not shorten the timing window used by subsequent v8 assertions.
 const independent=rounds.map(r=>({
  ...r,...(r.attacks?{attacks:r.attacks.map(a=>({...a}))}:{})
 }));
 const view={phase:'fighting',startedAt:at,miniGames:{
  version:8,rounds:independent,myAnswers:{}
 }};
 return {root,ui,view,requests};
}
function visualFixture(){
 const root=element('section');
 const fields=new Map();
 for(const name of ['#combat-hero-line','#combat-cue','#combat-flash',
  '#combat-boss','.monster-art'])fields.set(name,element());
 root.querySelector=key=>fields.get(key)||null;
 const document={createElement:element},window={};
 runInNewContext(read('dog-boss-combat-fx.js'),{window,document});
 const fx=window.DogBossCombatFX.create(root,10);
 const view={phase:'fighting',startedAt:at,endsAt:at+99000,
  name:'Aschewächter',gate:10,roster:[{uid:'a'}],
  members:[{uid:'a',name:'Held A',isMe:true}],
  miniGames:{version:8,rounds,dodgeActions:[],myAnswers:{}}};
 return {root,fields,fx,view};
}
test('every v8 dodge strike grants 3.3s to decide and has a visible shrinking bar',()=>{
 const {root,ui,view}=miniFixture();
 ui.update(view,at+26000,true);
 assert.ok(root.classList.contains('is-slow-dodge'));
 const body=root.children[1];
 const bar=body.children.find(e=>e.className==='mini-dodge-decision-track');
 assert.ok(bar);
 const fill=bar.children[0],warning=body.children.find(e=>e.className==='mini-dodge-warning');
 assert.equal(warning.textContent,'⚠️ SCHLAG 1/3 · 3.3 s');
 assert.equal(fill.style.width,'100.0%');
 ui.update(view,at+29250,true);
 assert.equal(warning.textContent,'⚠️ SCHLAG 1/3 · 0.1 s');
 assert.ok(fill.classList.contains('is-urgent'));
 const choices=body.children.find(e=>e.className==='mini-dodge-lanes').children;
 assert.equal(choices.length,2);
 assert.ok(choices.every(button=>!button.disabled),'choice still open before impact');
 ui.update(view,at+29300,true);
 assert.ok(choices.every(button=>button.disabled),'late clicks disallowed at impact');
 ui.update(view,at+31000,true);
 assert.equal(warning.textContent,'⚠️ SCHLAG 2/3 · 3.3 s');
 assert.equal(fill.style.width,'100.0%');
 assert.ok(choices.every(button=>!button.disabled));
 ui.update(view,at+36000,true);
 assert.equal(warning.textContent,'⚠️ SCHLAG 3/3 · 3.3 s');
 ui.update(view,at+41000,true);
 assert.ok(!root.classList.contains('is-slow-dodge'));
});
test('warhammer and each hero have full-length synchronized 5s strike animations',()=>{
 const {fx,root,fields,view}=visualFixture();
 fx.update(view,at+26100);
 const layer=root.children.find(c=>c.className==='battle-dodge-layer');
 assert.ok(layer&&!layer.hidden);
 assert.equal(layer.style['--boss-swing-time'],'5000ms');
 assert.equal(root.style['--boss-swing-time'],'5000ms');
 assert.equal(layer.style['--boss-swing-offset'],'-100ms');
 view.miniGames.dodgeActions=[{
  uid:'a',round:1,step:0,choice:0,correct:true,at:at+26500
 }];
 fx.update(view,at+28000);
 const hero=fields.get('#combat-hero-line').children[0];
 assert.equal(hero.attrs['data-dodge-direction'],'left');
 assert.equal(hero.style['--dodge-move-delay'],'-1500ms',
  'late remote result joins correct timestamp rather than replaying dodge');
 fx.update(view,at+29350);
 assert.equal(root.dataset.dodgeStrike,'impact');
 assert.ok(hero.classList.contains('battle-dodge-success'));
 fx.update(view,at+31100);
 assert.equal(layer.style['--boss-swing-offset'],'-100ms');
 assert.equal(layer.style['--dodge-hit-x'],'62%');
 assert.equal(root.dataset.dodgeStrike,'warning');
});
test('v8 longer animation CSS and legacy V7 battle are isolated',()=>{
 const css=read('dog-boss-dodge-slow.css');
 for(const token of ['data-battle-version="8"','slow-dodge-hero-leap',
  '4.4s','5s','1.6s','mini-dodge-decision-fill',
  'prefers-reduced-motion:reduce'])assert.ok(css.includes(token),token);
 const show=read('dog-boss-show-14.css');
 assert.ok(show.includes('[data-battle-version="8"]'),'same 14s interlude for v8');
 assert.ok(show.includes('[data-battle-version="7"]'),'v7 shows remain unchanged');
 for(const p of ['dog-boss10.html','dog-group-boss.html']){
  const html=read(p);
  assert.match(html,/dog-boss-dodge-slow\.css/);
  assert.match(html,/dog-boss-mini-ui\.js\?v=[A-Za-z0-9_-]+/);
  assert.match(html,/dog-boss-combat-fx\.js\?v=20261112-strike2/);
 }
 const old=miniFixture();
 old.view.miniGames.version=7;
 old.view.miniGames.rounds[1]={...dodge,startMs:26000,endMs:34000,
  attacks:dodge.attacks.map((x,i)=>({
   ...x,startMs:26000+Math.floor(i*8000/3),
   impactMs:26000+Math.floor((i+.66)*8000/3)
  }))};
 old.ui.update(old.view,at+26000,true);
 assert.ok(!old.root.classList.contains('is-slow-dodge'));
 assert.ok(!old.root.children[1].children.some(e=>e.className==='mini-dodge-decision-track'));
});

test('M-02 never claims hit before the server has confirmed the dodge outcome',async()=>{
 let now=at+26000;
 const {root,ui,view,requests}=miniFixture(()=>now);
 ui.update(view,now,true);
 const body=root.children[1],lanes=body.children.find(x=>x.className==='mini-dodge-lanes').children;
 const panel=body.children.find(x=>x.className==='mini-dodge-impact');
 const warning=body.children.find(x=>x.className==='mini-dodge-warning');
 assert.equal(panel.attrs['aria-live'],'polite');
 lanes[0].click();
 await Promise.resolve();await Promise.resolve();
 assert.equal(requests.length,1);
 assert.match(panel.textContent,/RICHTUNG ERFASST/);
 assert.ok(lanes.every(x=>x.disabled),'one direction per strike');
 lanes[0].click();
 assert.equal(requests.length,1,'double taps never make duplicate requests');
 now=at+29300;
 ui.update(view,now,true);
 assert.match(warning.textContent,/ERGEBNIS OFFEN/);
 assert.match(panel.textContent,/SERVERERGEBNIS OFFEN/);
 assert.match(root.children[2].textContent,/WARTE AUF SERVERBESTÄTIGUNG/);
 assert.equal(panel.classList.contains('is-pending'),true);
 assert.equal(panel.classList.contains('is-hit'),false);
 assert.ok(lanes.every(x=>x.disabled));
 view.miniGames.myAnswers={1:{attempts:[{step:0,correct:true}]}};
 ui.update(view,now,true);
 assert.match(panel.textContent,/AUSGEWICHEN.*SERVER BESTÄTIGT/);
 assert.equal(panel.classList.contains('is-success'),true);
 now=at+31000;ui.update(view,now,true);
 assert.equal(warning.textContent,'⚠️ SCHLAG 2/3 · 3.3 s');
 assert.equal(panel.classList.contains('is-success'),false,'previous verdict resets');
 assert.ok(lanes.every(x=>!x.disabled));
 view.miniGames.myAnswers[1].attempts.push({step:1,correct:false});
 now=at+34300;ui.update(view,now,true);
 assert.match(panel.textContent,/GETROFFEN.*SERVER BESTÄTIGT/);
 assert.equal(panel.classList.contains('is-hit'),true);
 const marks=body.children.find(x=>x.className==='mini-dodge-history').children;
 assert.equal(marks[0].textContent,'1 ✓');
 assert.equal(marks[1].textContent,'2 ✕');
 assert.match(marks[2].textContent,/3/);
});
test('M-02 stale tap after a confirmed impact cannot submit for previous strike',async()=>{
 let now=at+26000;
 const {root,ui,view,requests}=miniFixture(()=>now);
 ui.update(view,now,true);
 const buttons=root.children[1].children.find(x=>x.className==='mini-dodge-lanes').children;
 now=at+29300; // actual impact, but slow browser has not repainted yet
 buttons[0].click();
 await Promise.resolve();await Promise.resolve();
 assert.equal(requests.length,0,'no stale choice at or after boss impact');
 now=at+31000; // next attack began while UI is still displaying prior one
 buttons[0].click();
 assert.equal(requests.length,0,'does not submit an old step for the new attack');
 ui.update(view,now,true);
 assert.equal(buttons[1].disabled,false,'the next confirmed strike must enable its choices');
 buttons[1].click();
 await Promise.resolve();await Promise.resolve();
 assert.equal(requests.length,1);
 assert.equal(requests[0].step,1,'correct attack index comes from server timings');
});
test('M-02 keeps v7 historical controls and has no new network operations',()=>{
 const css=read('dog-boss-dodge-slow.css');
 assert.match(css,/mini-dodge-impact\.is-pending/);
 assert.match(css,/mini-dodge-impact\.is-success/);
 assert.match(css,/mini-dodge-impact\.is-hit/);
 assert.match(css,/prefers-reduced-motion:reduce/);
 for(const page of ['dog-boss10.html','dog-group-boss.html']){
  const html=read(page);
  assert.match(html,/dog-boss-dodge-slow\.css\?v=20261112-m02-feedback1/);
  assert.match(html,/dog-boss-mini-ui\.js\?v=20261112-m02-feedback1/);
 }
 const original=read('dog-boss-mini-ui.js');
 assert.doesNotMatch(original,/\bfetch\s*\(|XMLHttpRequest|firebase/i);
 const legacy=miniFixture();
 legacy.view.miniGames.version=7;
 legacy.ui.update(legacy.view,at+26000,true);
 assert.ok(!legacy.root.classList.contains('is-slow-dodge'));
});
