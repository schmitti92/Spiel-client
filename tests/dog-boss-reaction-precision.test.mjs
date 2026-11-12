import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const epoch=1_900_000_000_000;
function makeElement(tag='div'){
 const listeners=new Map(),classes=new Set();
 return {tag,textContent:'',hidden:false,disabled:false,children:[],className:'',
  offsetWidth:100,attrs:{},dataset:{},style:{setProperty(k,v){this[k]=v}},
  classList:{add:x=>classes.add(x),remove:x=>classes.delete(x),
   toggle:(x,v)=>v?classes.add(x):classes.delete(x),contains:x=>classes.has(x)},
  addEventListener:(name,fn)=>listeners.set(name,fn),
  dispatch:(name,event={})=>listeners.get(name)?.(event),
  click(){if(!this.disabled)this.dispatch('click')},
  setAttribute(k,v){this.attrs[k]=v},
  append(...c){this.children.push(...c)},
  replaceChildren(...c){this.children=c},
  get firstElementChild(){return this.children[0]||null}
 };
}
function setup(version){
 let serverTime=epoch+77_000;
 const window={},document={createElement:makeElement,hidden:false};
 runInNewContext(read('dog-boss-mini-ui.js'),{window,document,Date,Promise});
 const root=makeElement('section'),requests=[];
 const ui=window.DogBossMinigames.create(root,
  (round,value,step,tapAt)=>{requests.push({round,value,step,tapAt});return Promise.resolve(true);},
  null,()=>serverTime);
 const reaction={kind:'reaction',round:3,startMs:77000,endMs:85000,
  zoneRadius:version===9?.058:.115,difficulty:1,maxSteps:3};
 const rounds=[
  {kind:'math',round:0,startMs:0,endMs:12000,maxSteps:8,puzzles:[]},
  {kind:'dodge',round:1,startMs:26000,endMs:41000,maxSteps:3,lanes:2,attacks:[]},
  {kind:'target',round:2,startMs:55000,endMs:63000,maxSteps:3,lanes:3,stepMs:1200,initialIndex:0},
  reaction];
 const view={startedAt:epoch,phase:'fighting',miniGames:{version,rounds,myAnswers:{}}};
 return {root,ui,view,requests,setNow:n=>{serverTime=n}};
}
test('v9 draws an exact narrow hitbox and triggers on pointerdown at real synchronized time',async()=>{
 const {root,ui,view,requests,setNow}=setup(9);
 let click=-1;
 for(let offset=0;offset<8000;offset+=5){
  const t=offset/1000,cycle=.68*t+(.075+.004)*t*t;
  const fraction=1-Math.abs(1-cycle%2);
  if(Math.abs(fraction-.5)<.02){click=77_000+offset;break}
 }
 assert.ok(click>0);
 setNow(epoch+click);
 ui.update(view,epoch+click,true);
 assert.ok(root.classList.contains('is-precise-reaction'));
 const body=root.children[1];
 const bar=body.children.find(e=>e.className.includes('mini-meter'));
 assert.ok(bar.className.includes('is-precision'));
 assert.equal(bar.style['--timing-width'],'11.6%');
 const button=body.children.find(e=>e.className==='mini-choice mini-reaction');
 assert.ok(button);
 button.dispatch('pointerdown',{isPrimary:true});
 button.click();
 await Promise.resolve();await Promise.resolve();
 assert.equal(requests.length,1,'pointerdown plus click must never score two hits');
 assert.equal(requests[0].tapAt,epoch+click);
 assert.equal(requests[0].step,0);
 assert.ok(bar.classList.contains('is-tap'));
 assert.match(root.children[2].textContent,/Server|KONTER|überprüft/i);
});
test('M-04 v14 records three real taps immediately, submitting only once',async()=>{
 const {root,ui,view,requests,setNow}=setup(14);
 view.miniGames.rounds[3].zoneRadius=.058;
 setNow(epoch+77010);ui.update(view,epoch+77010,true);
 const body=root.children[1];
 const button=body.children.find(e=>e.className==='mini-choice mini-reaction');
 const marks=body.children.find(e=>e.className==='mini-reaction-steps').children;
 assert.equal(marks.length,3);
 const taps=[];
 for(let ms=77000;ms<84800;ms+=10){
  const t=(ms-77000)/1000,cycles=.68*t+(.075+.004)*t*t;
  const fraction=1-Math.abs(1-cycles%2);
  if(Math.abs(fraction-.5)>.02)continue;
  if(!taps.length||ms-taps.at(-1)>=550)taps.push(ms);
  if(taps.length===3)break;
 }
 assert.equal(taps.length,3);
 for(let i=0;i<3;i++){
  setNow(epoch+taps[i]);ui.update(view,epoch+taps[i],true);
  button.dispatch('pointerdown',{isPrimary:true});
  button.click();
  if(i<2){
   assert.equal(requests.length,0,'clicks must not be blocked by a network request');
   assert.ok(marks[i].classList.contains('is-local'));
   assert.equal(button.disabled,false);
  }
 }
 await Promise.resolve();await Promise.resolve();
 assert.equal(requests.length,1);
 assert.deepEqual([...requests[0].value],[1,1,1]);
 assert.deepEqual([...requests[0].tapAt],taps.map(ms=>epoch+ms));
 assert.ok(button.disabled);
 view.miniGames.myAnswers[3]={attempts:[{step:0,correct:true},
  {step:1,correct:false},{step:2,correct:true}]};
 ui.update(view,epoch+84400,true);
 assert.match(root.children[2].textContent,/SERVER BESTÄTIGT · 2 \/ 3/);
 assert.ok(marks[0].classList.contains('is-safe'));
 assert.ok(marks[1].classList.contains('is-miss'));
});
test('M-04 ignores double taps and flushes two captures once at round end',async()=>{
 const {root,ui,view,requests,setNow}=setup(14);
 setNow(epoch+77500);ui.update(view,epoch+77500,true);
 const button=root.children[1].children.find(e=>e.className==='mini-choice mini-reaction');
 button.dispatch('pointerdown',{isPrimary:true});
 button.click();
 setNow(epoch+77700);button.dispatch('pointerdown',{isPrimary:true});
 setNow(epoch+78500);ui.update(view,epoch+78500,true);
 button.dispatch('pointerdown',{isPrimary:true});
 assert.match(root.children[2].textContent,/2 \/ 3 KONTER ERFASST/);
 assert.equal(requests.length,0);
 setNow(epoch+85500);ui.update(view,epoch+85500,true);
 await Promise.resolve();await Promise.resolve();
 assert.equal(requests.length,1);
 assert.deepEqual([...requests[0].value],[1,1]);
 assert.deepEqual([...requests[0].tapAt],[epoch+77500,epoch+78500]);
 ui.update(view,epoch+85600,true);
 assert.equal(requests.length,1);
});

test('previous v8 reaction remains wide and does not require a tap timestamp',async()=>{
 const {root,ui,view,requests,setNow}=setup(8);
 setNow(epoch+78000);
 ui.update(view,epoch+78000,true);
 assert.equal(root.classList.contains('is-precise-reaction'),false);
 const body=root.children[1],bar=body.children.find(e=>e.className.includes('mini-meter'));
 assert.ok(!bar.className.includes('is-precision'));
 const button=body.children.find(e=>e.className==='mini-choice mini-reaction');
 button.click();await Promise.resolve();await Promise.resolve();
 assert.equal(requests.length,1);
 assert.equal(requests[0].tapAt,null);
});
test('both boss pages load v9 synchronized Konter styles and logic without network per animation frame',()=>{
 const css=read('dog-boss-reaction-precision.css');
 const source=read('dog-boss-mini-ui.js');
 for(const token of ['is-precision','--timing-width','mini-meter-fill','prefers-reduced-motion:reduce'])
  assert.ok(css.includes(token),token);
 assert.doesNotMatch(source,/\bfetch\s*\(|XMLHttpRequest|Math\.random\s*\(/);
 for(const name of ['dog-boss10.html','dog-group-boss.html']){
  const html=read(name);
  assert.match(html,/dog-boss-reaction-precision\.css/);
  assert.match(html,/dog-boss-mini-ui\.js/);
 }
});
