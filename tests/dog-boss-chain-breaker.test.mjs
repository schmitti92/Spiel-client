import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const epoch=1_900_000_000_000;

function element(tag='div'){
 const events=new Map(),set=new Set();
 const el={tag,children:[],className:'',textContent:'',dataset:{},
  disabled:false,hidden:false,offsetWidth:40,attrs:{},
  style:{setProperty(k,v){this[k]=v}},
  classList:{add:(...v)=>v.forEach(x=>set.add(x)),
   remove:(...v)=>v.forEach(x=>set.delete(x)),
   toggle:(x,y)=>y?set.add(x):set.delete(x),contains:x=>set.has(x)},
  addEventListener:(name,fn)=>events.set(name,fn),
  dispatch(name,data={}){events.get(name)?.(data)},
  setPointerCapture(){},releasePointerCapture(){},
  setAttribute(k,v){this.attrs[k]=v},
  append(...v){this.children.push(...v)},
  replaceChildren(...v){this.children=v},
  get firstElementChild(){return this.children[0]||null}};
 return el;
}
function fixture(){
 let elapsed=101100;
 const requests=[],document={createElement:element,hidden:false},window={};
 runInNewContext(read('dog-boss-mini-ui.js'),{window,document,Date,Promise});
 const root=element('section');
 const ui=window.DogBossMinigames.create(root,(round,answer,step)=>{
  requests.push({round,answer,step});return Promise.resolve(true);
 },null,()=>epoch+elapsed);
 const rounds=[
  {round:0,kind:'math',startMs:0,endMs:12000,maxSteps:8,puzzles:[]},
  {round:1,kind:'dodge',startMs:26000,endMs:41000,maxSteps:3,lanes:2,attacks:[]},
  {round:2,kind:'target',startMs:55000,endMs:65000,maxSteps:10,puzzles:[]},
  {round:3,kind:'reaction',startMs:79000,endMs:87000,maxSteps:3,zoneRadius:.06},
  {round:4,kind:'chain',startMs:101000,endMs:111000,maxSteps:10,lanes:3,
   puzzles:Array.from({length:10},(_,i)=>({target:i%3}))}
 ];
 const view={phase:'fighting',startedAt:epoch,endsAt:epoch+125000,
  miniGames:{version:13,rounds,myAnswers:{}}};
 const update=()=>ui.update(view,epoch+elapsed,true);
 const arena=()=>root.children[1].children.find(x=>x.className==='mini-chain-arena');
 function swipe(index,dx=55,dy=5){
  const b=arena().children[index];
  b.dispatch('pointerdown',{isPrimary:true,pointerId:1,clientX:40,clientY:25,
   preventDefault(){}});
  b.dispatch('pointerup',{pointerId:1,clientX:40+dx,clientY:25+dy,
   preventDefault(){}});
 }
 return {root,ui,view,requests,update,arena,swipe,
  setElapsed:v=>{elapsed=v}};
}
test('Kettenbrecher renders three chains, a single glowing target and accessible keyboard controls',()=>{
 const f=fixture();f.update();
 assert.equal(f.root.hidden,false);
 assert.equal(f.root.classList.contains('is-chain-breaker'),true);
 assert.equal(f.arena().children.length,3);
 assert.equal(f.arena().children.filter(x=>x.classList.contains('is-glowing')).length,1);
 assert.equal(f.arena().children[0].classList.contains('is-glowing'),true);
 assert.match(f.root.children[0].children[0].textContent,/KETTENBRECHER/);
 assert.match(f.arena().children[0].attrs['aria-label'],/Glühende Schwachstelle/);
 assert.match(f.root.children[1].children.find(x=>x.className==='mini-chain-hud').children[0].textContent,/10 s/);
 assert.equal(f.requests.length,0);
});
test('Only deliberate swipes count, wrong cuts do not earn points and ten slashes submit once',async()=>{
 const f=fixture();f.update();
 f.swipe(0,12,8);
 assert.match(f.root.children[1].children[0].textContent,/0 \/ 10/);
 assert.equal(f.requests.length,0);
 const expected=[];
 for(let i=0;i<10;i++){
  const index=i===4?(i+1)%3:i%3;
  expected.push(index);
  f.swipe(index);
  if(i===4)assert.match(f.root.children[2].textContent,/FALSCHE KETTE/);
 }
 await Promise.resolve();await Promise.resolve();
 assert.equal(f.requests.length,1,'no per-swipe server writes');
 assert.equal(f.requests[0].round,4);
 assert.equal(f.requests[0].step,0);
 assert.deepEqual([...f.requests[0].answer],expected);
 f.swipe(0);
 await Promise.resolve();
 assert.equal(f.requests.length,1,'overlapping pointer-ups must not submit twice');
});
test('Keyboard Enter/Space works; partial chain results flush after 10s without faking correctness',async()=>{
 const f=fixture();f.update();
 f.arena().children[0].dispatch('click',{detail:0});
 f.arena().children[1].dispatch('click',{detail:0});
 f.arena().children[2].dispatch('click',{detail:0});
 f.arena().children[0].dispatch('click',{detail:1});
 assert.equal(f.requests.length,0);
 f.setElapsed(111030);f.update();
 await Promise.resolve();await Promise.resolve();
 assert.equal(f.requests.length,1);
 assert.deepEqual([...f.requests[0].answer],[0,1,2]);
 assert.equal(f.root.hidden,true,'combat interlude replaces input after expiry');
 f.update();await Promise.resolve();
 assert.equal(f.requests.length,1);
});
test('Both boss screens load mobile-friendly chain art and keep v12 rune encounters untouched',()=>{
 const js=read('dog-boss-mini-ui.js'),css=read('dog-boss-chain-breaker.css');
 assert.doesNotMatch(js,/\bfetch\s*\(/);
 for(const token of ['mini-chain-arena','is-severed','is-glowing',
  'pointerdown','pointerup','pointercancel','targetChoices','flushTarget()'])
  assert.ok(js.includes(token),token);
 for(const token of ['touch-action:none','chain-spark','chain-snap','prefers-reduced-motion'])
  assert.ok(css.includes(token),token);
 for(const page of ['dog-boss10.html','dog-group-boss.html']){
  const html=read(page);
  assert.match(html,/dog-boss-chain-breaker\.css\?v=20261112-chainbreak1/);
  assert.match(html,/dog-boss-mini-ui\.js\?v=20261112-chainbreak1/);
  assert.match(html,/dog-boss-live-ui\.js\?v=20261112-chainbreak1/);
 }
});
