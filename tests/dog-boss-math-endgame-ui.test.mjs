import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const read=file=>readFileSync(new URL('../'+file,import.meta.url),'utf8');
const source=read('dog-boss-mini-ui.js');
function element(tag){
 const classes=new Set(),listeners={};
 return {tag,className:'',children:[],textContent:'',hidden:false,disabled:false,
  style:{setProperty(key,value){this[key]=value;}},attrs:{},
  setAttribute(k,v){this.attrs[k]=v;},
  classList:{add:k=>classes.add(k),remove:k=>classes.delete(k),
   contains:k=>classes.has(k),toggle:(k,active)=>active?classes.add(k):classes.delete(k)},
  append(...parts){this.children.push(...parts);},
  replaceChildren(...parts){this.children=parts;},
  addEventListener(type,callback){listeners[type]=callback;},
  click(){if(!this.disabled)listeners.click?.();},
  get firstElementChild(){return this.children[0]||null}};
}
const start=1_900_000_000_000;
function fixture(version=5){
 const window={},document={createElement:element,hidden:false};
 runInNewContext(source,{window,document,Date,Promise});
 const root=element('section'),requests=[];
 const ui=window.DogBossMinigames.create(root,(round,answer,step)=>{
  requests.push({round,answer,step});
  return Promise.resolve(true);
 });
 const puzzles=[
  ['7 + 4 = ?',[10,11,12]],
  ['26 + 19 = ?',[44,45,46]],
  ['57 − 29 = ?',[27,28,29]],
  ['6 × 7 = ?',[41,42,43]],
  ['72 ÷ 8 = ?',[8,9,10]],
  ['8 × 9 + 7 = ?',[78,79,80]],
  ['(12 + 8) × 4 = ?',[79,80,81]],
  ['(12 × 8 + 12) ÷ 3 = ?',[35,36,37]]
 ].map(([question,options])=>({question,options}));
 const view={phase:'fighting',startedAt:start,miniGames:{
  version,rounds:[{round:0,kind:'math',startMs:0,endMs:8000,maxSteps:8,puzzles,
   hint:'8 tasks'},
   {round:1,kind:'dodge',startMs:15000,endMs:23000,lanes:2,maxSteps:3,
    attacks:Array.from({length:3},(_,step)=>({
     step,startMs:15000+Math.floor(step*8000/3),
     impactMs:15000+Math.floor((step+.66)*8000/3),
     dangerIndex:step%2,secondDangerIndex:null}))},{round:2,kind:'target',startMs:30000,endMs:38000,maxSteps:3,
    lanes:3,stepMs:1300,initialIndex:0},
   {round:3,kind:'reaction',startMs:45000,endMs:53000,maxSteps:3,
    zoneRadius:.1,difficulty:1}],
  myAnswers:{}}};
 return {root,ui,view,requests};
}
test('eight progressively harder questions light eight runes without inventing correctness',async()=>{
 const {root,ui,view,requests}=fixture();
 ui.update(view,start+800,true);
 const lead=root.children[0],body=root.children[1],hud=lead.children[2];
 assert.ok(root.classList.contains('is-math-battle'));
 assert.equal(lead.children[0].textContent,'✦ RUNENPRÜFUNG');
 assert.equal(body.children[1].textContent,'7 + 4 = ?');
 assert.equal(hud.className,'mini-math-hud');
 const [topline,runes,timer]=hud.children;
 assert.equal(runes.children.length,8);
 assert.equal(topline.children[0].textContent,'STUFE 1 / 8 · LEICHT');
 assert.equal(topline.children[1].textContent,'8 s');
 assert.equal(timer.children[0].style.width,'90.0%');
 const buttons=body.children.slice(2);
 assert.equal(buttons.length,3);
 for(let step=1;step<=8;step++){
  buttons[(step-1)%3].click();
  assert.equal(body.children[0].textContent,step+' / 8 beantwortet');
  assert.equal(runes.children.filter(c=>c.classList.contains('is-complete')).length,step);
  if(step<8){
   assert.equal(body.children[1].textContent,view.miniGames.rounds[0].puzzles[step].question);
   assert.match(topline.children[0].textContent,new RegExp('STUFE '+(step+1)+' / 8'));
   assert.ok(runes.children[step].classList.contains('is-current'));
  }
  assert.equal(requests.length,0,'answers must not be sent per tap');
 }
 await Promise.resolve();await Promise.resolve();
 assert.equal(requests.length,1);
 assert.deepEqual([...requests[0].answer],[0,1,2,0,1,2,0,1]);
 assert.equal(topline.children[0].textContent,'8 / 8 · ABGESCHICKT');
 assert.ok(!runes.children.some(c=>c.classList.contains('is-wrong')||c.classList.contains('is-correct')),
  'completed rune is not an unverified success');
});
test('later challenges remove math styling; old v2 fights keep their compact layout',()=>{
 const fresh=fixture();
 fresh.ui.update(fresh.view,start+1000,true);
 fresh.ui.update(fresh.view,start+16000,true);
 assert.ok(!fresh.root.classList.contains('is-math-battle'));
 const old=fixture(2);
 old.view.miniGames.rounds=[
  {...old.view.miniGames.rounds[0],startMs:3000,endMs:11000},
  {...old.view.miniGames.rounds[1],startMs:11000,endMs:19000},
  {...old.view.miniGames.rounds[2],startMs:19000,endMs:27000}];
 old.ui.update(old.view,start+3400,true);
 assert.equal(old.root.children[1].children.length,5);
 assert.equal(old.root.children[0].children.length,2);
 assert.ok(!old.root.classList.contains('is-math-battle'));
});
test('math CSS maintains large touch choices and responsive, motion-safe layout',()=>{
 const css=read('dog-boss-math-endgame.css');
 for(const token of ['.mini-math-hud','.mini-math-runes','.mini-math-rank',
  '.mini-math-time-fill','rune-math-swap',
  '@media(max-width:620px)','@media(prefers-reduced-motion:reduce)'])
  assert.ok(css.includes(token),token);
 assert.doesNotMatch(css,/fetch\(|XMLHttpRequest|https?:\/\//);
 for(const page of ['dog-boss10.html','dog-group-boss.html']){
  assert.match(read(page),/dog-boss-math-endgame\.css/);
  assert.match(read(page),/dog-boss-mini-ui\.js\?v=20261111-math-v1/);
 }
});

test('v6 extends only maths to 12 seconds and submits once at the later deadline',async()=>{
 const {root,ui,view,requests}=fixture(6);
 const windows=[[0,12000],[19000,27000],[34000,42000],[49000,57000]];
 view.miniGames.rounds.forEach((round,i)=>{
  round.startMs=windows[i][0];round.endMs=windows[i][1];
 });
 ui.update(view,start+9000,true);
 const hud=root.children[0].children[2],body=root.children[1];
 assert.equal(root.hidden,false,'maths must remain active beyond the former 8s cutoff');
 assert.equal(body.children[1].textContent,'7 + 4 = ?');
 assert.equal(hud.children[0].children[1].textContent,'3 s');
 assert.equal(hud.children[2].children[0].style.width,'25.0%');
 body.children[2].click();
 ui.update(view,start+11890,true);
 await Promise.resolve();await Promise.resolve();
 assert.equal(requests.length,1,'partial answers flush only once at new 12s deadline');
 assert.deepEqual([...requests[0].answer],[0]);
 ui.update(view,start+13000,true);
 assert.equal(root.classList.contains('is-math-battle'),false);
});
