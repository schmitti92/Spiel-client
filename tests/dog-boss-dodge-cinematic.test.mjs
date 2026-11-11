import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const read=file=>readFileSync(new URL('../'+file,import.meta.url),'utf8');
const at=1_900_000_000_000;
function fixture(){
 const created=[];
 const element=(tag='div')=>{
  const classes=new Set();
  const node={tag,children:[],textContent:'',hidden:false,offsetWidth:80,style:{
   setProperty(k,v){this[k]=v;}},dataset:{},attrs:{},className:'',
   classList:{add:k=>classes.add(k),remove:k=>classes.delete(k),
    toggle:(k,v)=>v?classes.add(k):classes.delete(k),contains:k=>classes.has(k)},
   setAttribute(k,v){this.attrs[k]=v;},getAttribute(k){return this.attrs[k];},
   append(...x){this.children.push(...x);},
   replaceChildren(...x){this.children=x;},
   remove(){this.removed=true;},
   querySelector(sel){return this.children.find(c=>
    sel==='.'+String(c.className).split(' ')[0])||null;}};
  created.push(node);return node;
 };
 const root=element();
 root.style.setProperty=(k,v)=>{root.style[k]=v;};
 const fields=new Map();
 for(const name of ['#combat-hero-line','#combat-cue','#combat-flash',
 '#combat-boss','.monster-art']){
  const node=element();fields.set(name,node);
 }
 root.querySelector=k=>fields.get(k)||null;
 const document={createElement:element};
 const window={};
 runInNewContext(read('dog-boss-combat-fx.js'),{window,document});
 const fx=window.DogBossCombatFX.create(root,10);
 const dodge={kind:'dodge',round:1,startMs:15000,endMs:23000,lanes:2,
  attacks:[{step:0,startMs:15000,impactMs:16760,dangerIndex:1,secondDangerIndex:null},
   {step:1,startMs:17666,impactMs:19426,dangerIndex:0,secondDangerIndex:null},
   {step:2,startMs:20333,impactMs:22093,dangerIndex:1,secondDangerIndex:null}]};
 const view={phase:'fighting',startedAt:at,endsAt:at+60000,gate:10,name:'Aschewächter',
  members:[{uid:'a',name:'Chris',isMe:true},{uid:'b',name:'Nova',isMe:false}],
  roster:[{uid:'a'},{uid:'b'}],
  miniGames:{version:5,rounds:[
   {kind:'math',round:0,startMs:0,endMs:8000},dodge,
   {kind:'target',round:2,startMs:30000,endMs:38000},
   {kind:'reaction',round:3,startMs:45000,endMs:53000}],
   dodgeActions:[],myAnswers:{}}};
 return {fx,root,fields,view,created};
}
test('after pressing left the own hero jumps left, while teammates can jump right',()=>{
 const {fx,fields,view}=fixture();
 fx.update(view,at+15200);
 fx.previewDodge(view,1,0,0,at+15250);
 const heroes=fields.get('#combat-hero-line').children;
 assert.equal(heroes.length,2);
 assert.equal(heroes[0].attrs['data-dodge-direction'],'left');
 assert.equal(heroes[0].style['--dodge-move-x'],'-56px');
 assert.ok(heroes[0].classList.contains('battle-dodge-leap'));
 view.miniGames.dodgeActions=[
  {uid:'a',round:1,step:0,choice:0,correct:true,at:at+15250},
  {uid:'b',round:1,step:0,choice:1,correct:false,at:at+15280}];
 fx.update(view,at+16000);
 assert.equal(heroes[1].attrs['data-dodge-direction'],'right');
 assert.equal(heroes[1].style['--dodge-move-x'],'56px');
 assert.equal(heroes[0].children.length,3,'result waits until boss impact');
 fx.update(view,at+16920);
 assert.ok(heroes[0].classList.contains('battle-dodge-success'));
 assert.ok(heroes[1].classList.contains('battle-dodge-hit'));
 assert.match(heroes[0].children.at(-1).textContent,/AUSGEWICHEN.*LINKS/);
 assert.match(heroes[1].children.at(-1).textContent,/GETROFFEN.*RECHTS/);
});
test('new strike resets badges and takes its own target from server clock',()=>{
 const {fx,view,root,fields}=fixture();
 view.miniGames.dodgeActions=[
  {uid:'a',round:1,step:0,choice:0,correct:true,at:at+15150}];
 fx.update(view,at+17100);
 assert.equal(root.dataset.dodgeStrike,'impact');
 const layer=root.children.find(child=>child.className==='battle-dodge-layer');
 assert.ok(layer&&!layer.hidden);
 assert.equal(layer.style['--dodge-hit-x'],'85%');
 fx.update(view,at+18000);
 assert.equal(root.dataset.dodgeStrike,'warning');
 assert.equal(layer.style['--dodge-hit-x'],'62%');
 const hero=fields.get('#combat-hero-line').children[0];
 assert.equal(hero.classList.contains('battle-dodge-success'),false);
 view.miniGames.dodgeActions.push(
  {uid:'a',round:1,step:1,choice:1,correct:true,at:at+18020});
 fx.update(view,at+19600);
 assert.match(hero.children.at(-1).textContent,/AUSGEWICHEN/);
});
test('60 second fight has seven-second full-screen results, including final interlude',()=>{
 const nodes=new Map();
 function node(key){
  if(nodes.has(key))return nodes.get(key);
  const flags=new Set();
  const o={id:key,textContent:'',hidden:false,children:[],style:{
   setProperty(k,v){this[k]=v}},dataset:{},offsetWidth:10,
   classList:{add:x=>flags.add(x),remove:x=>flags.delete(x),
    toggle:(x,v)=>v?flags.add(x):flags.delete(x),
    contains:x=>flags.has(x)},
   replaceChildren(...x){this.children=x},setAttribute(){},
   querySelectorAll:()=>Array.from({length:4},(_,i)=>node('step-'+i))};
  nodes.set(key,o);return o;
 }
 const root={querySelector:sel=>node(sel.startsWith('#')?sel.slice(1):sel)};
 const window={};const document={createElement:()=>node('created-'+nodes.size),
  createDocumentFragment:()=>({append(){}})};
 runInNewContext(read('dog-boss-live-ui.js'),{window,document,Date});
 const ui=window.DogBossLiveUI.create(root);
 const rounds=[{kind:'math',round:0,startMs:0,endMs:8000,maxSteps:8},
  {kind:'dodge',round:1,startMs:15000,endMs:23000,maxSteps:3},
  {kind:'target',round:2,startMs:30000,endMs:38000,maxSteps:3},
  {kind:'reaction',round:3,startMs:45000,endMs:53000,maxSteps:3}];
 const stages=rounds.map((r,i)=>({round:i,kind:r.kind,defensive:i%2===1,
  completed:true,correct:3,max:9,bonusPercent:1.5,bonusDamage:100,
  shield:i%2===1?92:null}));
 const view={phase:'fighting',startedAt:at,endsAt:at+60000,bossHp:1533,
  members:[{uid:'a',name:'Chris',isMe:true}],roster:[{uid:'a'}],
  miniGames:{version:5,rounds,myAnswers:{},
   exchange:{version:5,durationMs:60000,shield:92,stages}}};
 ui.update(view,at+9000);
 assert.equal(node('live-cinematic').hidden,false);
 assert.equal(node('live-stage-announcement').hidden,true);
 assert.equal(node('cinematic-countdown').textContent,'6,0 s');
 assert.equal(node('combat-scene').dataset.battleVersion,'5');
 ui.update(view,at+59000);
 assert.equal(node('live-cinematic').hidden,false);
 assert.equal(node('cinematic-countdown').textContent,'1,0 s');
 ui.update(view,at+60001);
 assert.equal(node('live-cinematic').hidden,true);
});
test('sprite motion and impact effects are local, accessible and respect reduced motion',()=>{
 const css=read('dog-boss-dodge-cinematic.css');
 for(const token of ['dodge-hero-side-step','battle-dodge-verdict','dodge-boss-slam',
  'data-battle-version="5"','prefers-reduced-motion:reduce'])assert.ok(css.includes(token));
 assert.doesNotMatch(css,/\bfetch\(|XMLHttpRequest|https?:\/\//);
 for(const page of ['dog-boss10.html','dog-group-boss.html']){
  const html=read(page);
  assert.match(html,/dog-boss-dodge-cinematic\.css/);
  assert.match(html,/dog-boss-combat-fx\.js/);
 }
});

test('boss weapon actually swings from the monster to the server-targeted lane',()=>{
 const {fx,root,fields,view}=fixture();
 fx.update(view,at+15100);
 const layer=root.children.find(child=>child.className==='battle-dodge-layer');
 const hammer=layer.children.find(child=>child.className==='battle-boss-weapon');
 const trail=layer.children.find(child=>child.className==='battle-weapon-trail');
 const impact=layer.children.find(child=>child.className==='battle-weapon-impact');
 assert.ok(hammer&&trail&&impact,'dedicated visible weapon, travel trail and ground crater');
 assert.equal(hammer.attrs['data-weapon'],'warhammer');
 assert.ok(hammer.classList.contains('battle-weapon-swing'));
 assert.equal(root.dataset.bossSwing,'windup');
 assert.equal(layer.style['--dodge-hit-x'],'85%','hammer targets the dangerous right lane');
 assert.equal(layer.style['--boss-swing-offset'],'-100ms');
 assert.equal(root.style['--boss-swing-offset'],'-100ms',
  'boss body and separate weapon layer must share one server-timed strike');
 assert.ok(fields.get('#combat-boss').classList.contains('battle-boss-strike'),
  'body moves in sync with held weapon');
 fx.update(view,at+16900);
 assert.equal(root.dataset.bossSwing,'impact');
 assert.equal(layer.style['--boss-swing-offset'],'-100ms',
  'the animation must not restart on subsequent updates');
 fx.update(view,at+18000);
 assert.equal(layer.style['--dodge-hit-x'],'62%',
  'the next blow is now aimed to the dangerous left field');
 assert.equal(layer.style['--boss-swing-offset'],'-334ms',
  'the second swing jumps to its own server-clock offset');
 assert.equal(root.dataset.bossSwing,'windup');
});
test('when two fields are unsafe, primary hammer and secondary shockwave both show',()=>{
 const {fx,root,view}=fixture();
 const dodge=view.miniGames.rounds[1];
 dodge.lanes=3;
 dodge.attacks[0].dangerIndex=0;
 dodge.attacks[0].secondDangerIndex=2;
 fx.update(view,at+15100);
 const layer=root.children.find(child=>child.className==='battle-dodge-layer');
 const shock=layer.children.find(child=>
  child.className==='battle-weapon-impact battle-weapon-impact-secondary');
 assert.ok(shock&&!shock.hidden);
 assert.equal(layer.style['--dodge-hit-x'],'54%');
 assert.equal(layer.style['--dodge-secondary-x'],'92%');
 assert.ok(shock.classList.contains('battle-weapon-swing'));
 // Two safe-guarded lanes have only a visual indicator, never a client HP calculation.
 assert.equal(view.miniGames.myAnswers[1],undefined);
});
test('reconnect resumes the currently active hammer swing without replaying older hits',()=>{
 const {fx,root,view}=fixture();
 fx.update(view,at+17200);
 const layer=root.children.find(child=>child.className==='battle-dodge-layer');
 assert.equal(layer.style['--boss-swing-offset'],'-2200ms');
 assert.equal(root.dataset.bossSwing,'impact');
 fx.update(view,at+23100);
 assert.equal(layer.hidden,true);
 assert.equal(root.dataset.bossSwing,'idle');
 assert.equal(root.dataset.dodgeStrike,'idle');
});
test('warhammer artwork is self-contained and responsive with reduced-motion fallback',()=>{
 const art=read('dog-boss-art/ashen-warhammer.svg');
 const css=read('dog-boss-weapon.css');
 assert.match(art,/viewBox="0 0 180 280"/);
 assert.match(art,/Glühender Kriegshammer/);
 assert.ok(!art.includes('<script')&&!art.includes('href="http'));
 for(const name of ['boss-hammer-to-lane','boss-hammer-body-lunge',
  'boss-hammer-ground-impact','--boss-swing-offset',
  'data-effects="off"','prefers-reduced-motion:reduce'])assert.ok(css.includes(name),name);
 assert.match(css,/66%\{left:var\(--dodge-hit-x/);
 for(const page of ['dog-boss10.html','dog-group-boss.html']){
  assert.match(read(page),/dog-boss-weapon\.css/);
 }
});
