import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

const read=name=>readFileSync(new URL('../'+name,import.meta.url),'utf8');
const BASE=1_900_000_000_000;
function element(tag='div'){
 const handlers=new Map(),classes=new Set();
 const node={tag,children:[],className:'',textContent:'',hidden:false,
  disabled:false,dataset:{},offsetWidth:75,attrs:{},style:{
   setProperty(name,value){this[name]=value}},
  classList:{
   add:(...names)=>names.forEach(x=>classes.add(x)),
   remove:(...names)=>names.forEach(x=>classes.delete(x)),
   toggle:(name,yes)=>yes?classes.add(name):classes.delete(name),
   contains:name=>classes.has(name)},
  setAttribute(key,value){this.attrs[key]=value},
  addEventListener(type,fn){handlers.set(type,fn)},
  dispatch(type,event={}){return handlers.get(type)?.(event)},
  click(event){if(!this.disabled)this.dispatch('click',event)},
  append(...children){this.children.push(...children)},
  replaceChildren(...children){this.children=children},
  setPointerCapture(){},releasePointerCapture(){},
  get firstElementChild(){return this.children[0]||null}
 };
 return node;
}
function makeFixture(onSubmit=()=>Promise.resolve(true)){
 let ms=0,requestCalls=[];
 const win={},doc={createElement:element,hidden:false};
 runInNewContext(read('dog-boss-mini-ui.js'),
  {window:win,document:doc,Promise,Date},{timeout:1000});
 const root=element('section');
 const ui=win.DogBossMinigames.create(root,(...args)=>{
  requestCalls.push(args);return onSubmit(...args);
 },null,()=>BASE+ms);
 const math=Array.from({length:8},(_,i)=>({
  question:'Aufgabe '+i,options:[2+i,3+i,4+i]}));
 const colors=Array.from({length:10},(_,i)=>({
  mode:i%2?'symbol':'color',prompt:'Treffer '+i,
  targetColor:'red',targetSymbol:'star',
  options:[{color:'red',symbol:'star'},{color:'blue',symbol:'shield'},
   {color:'green',symbol:'flame'},{color:'yellow',symbol:'moon'}]}));
 const rounds=[
  {round:0,kind:'math',startMs:0,endMs:12000,maxSteps:8,puzzles:math},
  {round:1,kind:'dodge',startMs:26000,endMs:41000,maxSteps:3,lanes:2,
   attacks:[{startMs:26000,impactMs:29200,dangerIndex:0,secondDangerIndex:null},
    {startMs:31000,impactMs:34600,dangerIndex:1,secondDangerIndex:null},
    {startMs:36500,impactMs:40100,dangerIndex:0,secondDangerIndex:null}]},
  {round:2,kind:'target',startMs:55000,endMs:65000,maxSteps:10,puzzles:colors},
  {round:3,kind:'reaction',startMs:79000,endMs:87000,maxSteps:3,
   zoneRadius:.058,difficulty:1},
  {round:4,kind:'chain',startMs:101000,endMs:121000,maxSteps:10,
   lanes:3,puzzles:Array.from({length:10},(_,i)=>({target:i%3}))}
 ];
 const view={phase:'fighting',startedAt:BASE,endsAt:BASE+135000,
  miniGames:{version:15,rounds,myAnswers:{}}};
 const update=(at=ms,allowed=true)=>{ms=at;ui.update(view,BASE+at,allowed)};
 const body=()=>root.children[1];
 const find=cls=>body().children.find(node=>node.className===cls);
 const flush=async()=>{for(let i=0;i<12;i++)await Promise.resolve()};
 return {root,view,ui,rounds,requestCalls,update,body,find,flush,
  setTime:at=>{ms=at}};
}
test('M-08 Android-style click and keyboard produce a single local reaction input even after delayed synthetic click',async()=>{
 const f=makeFixture();
 f.update(79050);
 const button=f.find('mini-choice mini-reaction');
 const steps=f.find('mini-reaction-steps').children;
 button.dispatch('pointerdown',{isPrimary:true,pointerId:1});
 assert.equal(steps.filter(x=>x.classList.contains('is-local')).length,1);
 f.update(80300);
 // Android may deliver its matching click >700ms after pointerdown.
 button.dispatch('click',{detail:1,isTrusted:true});
 assert.equal(steps.filter(x=>x.classList.contains('is-local')).length,1);
 // Trusted keyboard activation is still allowed after a pointer event.
 button.dispatch('click',{detail:0,isTrusted:true});
 assert.equal(steps.filter(x=>x.classList.contains('is-local')).length,2);
 f.update(82000);
 button.dispatch('pointerdown',{isPrimary:false,pointerId:2});
 assert.equal(steps.filter(x=>x.classList.contains('is-local')).length,2,
  'secondary multitouch contact cannot score');
 button.dispatch('pointerdown',{isPrimary:true,pointerId:1});
 button.dispatch('click',{detail:1,isTrusted:true});
 await f.flush();
 assert.equal(f.requestCalls.length,1);
 assert.equal(f.requestCalls[0][0],3);
 assert.deepEqual([...f.requestCalls[0][1]],[1,1,1]);
 assert.deepEqual([...f.requestCalls[0][3]],[BASE+79050,BASE+80300,BASE+82000]);
 assert.equal(steps.filter(x=>x.classList.contains('is-local')).length,3);
 f.update(83000);
 await f.flush();
 assert.equal(f.requestCalls.length,1,'no duplicate POST for old confirmation');
});
test('M-08 chain swipe and keyboard ignore late pointer-click, cancellation, secondary touch and detached controls',async()=>{
 const f=makeFixture();
 f.update(101100);
 const stage=f.find('mini-chain-stage');
 const lanes=stage.children.find(x=>x.className==='mini-chain-arena').children;
 const progress=f.find('mini-chain-progress').children;
 const touch=(lane,id=1)=>{
  lanes[lane].dispatch('pointerdown',{isPrimary:true,pointerId:id,preventDefault(){}});
  lanes[lane].dispatch('pointerup',{pointerId:id,preventDefault(){}});
 };
 touch(0);
 assert.equal(progress.filter(x=>x.classList.contains('is-provisional')).length,1);
 f.update(103000);
 lanes[0].dispatch('click',{detail:1,isTrusted:true});
 assert.equal(progress.filter(x=>x.classList.contains('is-provisional')).length,1,
  'delayed swipe click cannot count twice');
 lanes[1].dispatch('click',{detail:0,isTrusted:true});
 assert.equal(progress.filter(x=>x.classList.contains('is-provisional')).length,2);
 lanes[2].dispatch('pointerdown',{isPrimary:true,pointerId:2,preventDefault(){}});
 lanes[2].dispatch('pointercancel',{pointerId:2});
 lanes[2].dispatch('pointerup',{pointerId:2,preventDefault(){}});
 assert.equal(progress.filter(x=>x.classList.contains('is-provisional')).length,2);
 lanes[2].dispatch('pointerdown',{isPrimary:false,pointerId:3,preventDefault(){}});
 lanes[2].dispatch('pointerup',{pointerId:3,preventDefault(){}});
 assert.equal(progress.filter(x=>x.classList.contains('is-provisional')).length,2);
 for(let i=2;i<10;i++)touch(i%3);
 await f.flush();
 assert.equal(f.requestCalls.length,1);
 assert.equal(f.requestCalls[0][0],4);
 assert.equal(f.requestCalls[0][1].length,10);
 f.update(121200);
 lanes[0].dispatch('click',{detail:1,isTrusted:true});
 await f.flush();
 assert.equal(f.requestCalls.length,1);
});
test('M-08 a dodge tap scheduled just before an immediate stage switch cannot be misrouted to the next round',async()=>{
 const f=makeFixture();
 f.update(26050);
 const lanes=f.find('mini-dodge-lanes').children;
 const oldButton=lanes[1];
 oldButton.click({detail:1,isTrusted:true});
 // A synchronized tick may replace the whole stage before Promise.resolve.
 f.update(55300);
 oldButton.dispatch('click',{detail:1,isTrusted:true});
 await f.flush();
 assert.equal(f.requestCalls.length,1);
 assert.equal(f.requestCalls[0][0],1,'the click belongs to Dodge round 1');
 assert.equal(f.requestCalls[0][1],1);
 assert.equal(f.requestCalls[0][2],0);
});
test('M-08 all ten color decisions are local: an unknown network result stays pending, GET receipt prevents a duplicate',async()=>{
 let calls=0;
 const f=makeFixture(()=>{calls++;return Promise.reject(new Error('mobile-offline'))});
 f.update(55300);
 const grid=f.find('mini-color-grid');
 for(let i=0;i<10;i++)grid.children[i%4].click({detail:1,isTrusted:true});
 await f.flush();
 assert.equal(calls,1,'ten taps use one POST');
 assert.equal(f.requestCalls.length,1);
 assert.equal(f.find('mini-color-progress').children.length,10);
 assert.match(f.find('mini-color-verdict').textContent,/SERVER PRÜFT/);
 // GET returned a fully verified batch after POST response was lost.
 f.view.miniGames.myAnswers[2]={attempts:Array.from({length:10},(_,step)=>({
  step,correct:step%2===0}))};
 f.update(55500);
 await f.flush();
 f.update(55800);
 await f.flush();
 assert.equal(calls,1,'confirmed server state must retire ambiguous local batch');
 assert.match(f.find('mini-color-verdict').textContent,/SERVER BESTÄTIGT/);
 assert.ok(grid.children.every(node=>node.disabled));
});
test('M-08 busy controller does not send a second math POST; completed GET stops retries',async()=>{
 let busy=true,transmissions=0;
 const f=makeFixture(()=>{
  if(busy)return false;
  transmissions++;return Promise.resolve(true);
 });
 f.update(250);
 const answers=f.body().children.filter(x=>x.className==='mini-choice mini-math');
 for(let i=0;i<8;i++)answers[i%3].click({detail:1,isTrusted:true});
 await f.flush();
 assert.equal(transmissions,0);
 assert.equal(f.requestCalls.length,1,'one attempt while controller busy');
 busy=false;f.update(700);await f.flush();
 assert.equal(transmissions,1);
 f.view.miniGames.myAnswers[0]={attempts:Array.from({length:8},(_,step)=>({
  step,correct:true}))};
 f.update(1100);await f.flush();
 f.update(1500);await f.flush();
 assert.equal(transmissions,1);
 assert.match(f.root.children[2].textContent,/SERVER BESTÄTIGT/);
});
test('M-08 touch affordances exist for both boss pages without new network/polling',()=>{
 for(const page of ['dog-boss10.html','dog-group-boss.html']){
  const html=read(page);
  assert.match(html,/dog-boss-chain-breaker\.css/);
  assert.match(html,/dog-boss-reaction-precision\.css/);
  assert.match(html,/dog-boss-color-target\.css/);
  assert.match(html,/dog-boss-math-endgame\.css/);
  assert.match(html,/dog-boss-dodge-slow\.css/);
 }
 assert.match(read('dog-boss-chain-breaker.css'),/touch-action:none/);
 assert.match(read('dog-boss-reaction-precision.css'),/touch-action:manipulation/);
 assert.match(read('dog-boss-color-target.css'),/touch-action:manipulation/);
 const ui=read('dog-boss-mini-ui.js');
 assert.doesNotMatch(ui,/\bfetch\s*\(|XMLHttpRequest|firebase\./i);
});
