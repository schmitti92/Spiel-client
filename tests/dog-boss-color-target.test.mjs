import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const epoch=1_900_000_000_000;
const options=[
 {color:'blue',symbol:'star'}, {color:'red',symbol:'star'},
 {color:'blue',symbol:'moon'}, {color:'red',symbol:'moon'},
 {color:'green',symbol:'flame'}, {color:'yellow',symbol:'shield'}
];
function element(tag='div'){
 const callbacks=new Map(),classes=new Set();
 return {tag,children:[],dataset:{},className:'',textContent:'',
  disabled:false,hidden:false,offsetWidth:40,
  style:{setProperty(k,v){this[k]=v}},
  classList:{add:x=>classes.add(x),remove:x=>classes.delete(x),
   toggle:(x,enabled)=>enabled?classes.add(x):classes.delete(x),
   contains:x=>classes.has(x)},
  addEventListener:(type,cb)=>callbacks.set(type,cb),
  click(){if(!this.disabled)callbacks.get('click')?.()},
  setAttribute(){},append(...nodes){this.children.push(...nodes)},
  replaceChildren(...nodes){this.children=nodes},
  get firstElementChild(){return this.children[0]||null}
 };
}
function fixture(){
 let current=epoch+55_100;
 const document={createElement:element,hidden:false},window={};
 runInNewContext(read('dog-boss-mini-ui.js'),{window,document,Date,Promise});
 const requests=[],root=element('section');
 const ui=window.DogBossMinigames.create(root,
  (round,answer,step)=>{requests.push({round,answer,step});return Promise.resolve(true)},
  null,()=>current);
 const puzzles=Array.from({length:10},()=>({
  mode:'both',targetColor:'blue',targetSymbol:'star',
  prompt:'TRIFF BLAU + STERN!',options
 }));
 const rounds=[
  {round:0,kind:'math',startMs:0,endMs:12000,maxSteps:8,puzzles:[]},
  {round:1,kind:'dodge',startMs:26000,endMs:41000,maxSteps:3,lanes:2,attacks:[]},
  {round:2,kind:'target',startMs:55000,endMs:65000,maxSteps:10,puzzles},
  {round:3,kind:'reaction',startMs:79000,endMs:87000,maxSteps:3,difficulty:1,zoneRadius:.06}
 ];
 const view={phase:'fighting',startedAt:epoch,miniGames:{version:10,rounds,myAnswers:{}}};
 return {root,ui,view,requests,setNow:n=>{current=epoch+n}};
}
test('v10 presents six colored symbol buttons and 10s sprint timer without server wait',async()=>{
 const {root,ui,view,requests}=fixture();ui.update(view,epoch+55100,true);
 assert.equal(root.classList.contains('is-color-target'),true);
 const body=root.children[1],cells=body.children.find(x=>x.className==='mini-color-grid');
 assert.ok(cells);assert.equal(cells.dataset.count,'6');
 assert.equal(cells.children.length,6);
 assert.match(body.children.find(x=>x.className==='mini-color-question').textContent,/BLAU.*STERN/);
 assert.match(body.children.find(x=>x.className==='mini-color-hud').children[0].textContent,/10 s/);
 for(let i=0;i<9;i++)cells.children[i%2].click();
 assert.equal(requests.length,0,'nine local taps require no backend writes');
 assert.match(body.children[0].textContent,/9 \/ 10 beantwortet/);
 cells.children[0].click();await Promise.resolve();await Promise.resolve();
 assert.equal(requests.length,1,'ten taps submit one batch');
 assert.equal(requests[0].round,2);assert.equal(requests[0].step,0);
 assert.deepEqual([...requests[0].answer],[0,1,0,1,0,1,0,1,0,0]);
 cells.children[0].click();await Promise.resolve();
 assert.equal(requests.length,1,'no duplicate post on accidental extra tap');
});
test('partial v10 answers flush once on reaching the 10s boundary',async()=>{
 const {root,ui,view,requests,setNow}=fixture();ui.update(view,epoch+55400,true);
 const cells=root.children[1].children.find(x=>x.className==='mini-color-grid');
 cells.children[0].click();cells.children[1].click();cells.children[2].click();
 assert.equal(requests.length,0);
 setNow(65050);ui.update(view,epoch+65050,true);
 await Promise.resolve();await Promise.resolve();
 assert.equal(requests.length,1);
 assert.deepEqual([...requests[0].answer],[0,1,2]);
 assert.equal(root.hidden,true,'cinematic interlude replaces minigame');
});

test('M-03 explains color-only versus symbol-only targets and keeps taps provisional',()=>{
 const {root,ui,view,requests}=fixture();
 const four=options.slice(0,4);
 view.miniGames.rounds[2].puzzles=Array.from({length:10},(_,i)=>({
  mode:i%2?'symbol':'color',targetColor:'blue',targetSymbol:'star',
  prompt:i%2?'TRIFF STERN!':'TRIFF BLAU!',options:four
 }));
 ui.update(view,epoch+55100,true);
 const body=root.children[1],find=name=>body.children.flatMap(x=>[x,...x.children]).find(x=>x.className===name);
 assert.match(find('mini-color-rule').textContent,/NUR FARBE/);
 assert.match(find('mini-color-guide').textContent,/Symbol ist egal/);
 assert.match(find('mini-color-level').textContent,/1\/10 · 4 FELDER/);
 const cells=find('mini-color-grid');
 cells.children[0].click();
 assert.match(find('mini-color-rule').textContent,/NUR SYMBOL/);
 assert.match(find('mini-color-guide').textContent,/Farbe ist egal/);
 assert.match(find('mini-color-verdict').textContent,/RICHTIG.*VORLÄUFIG/);
 const marks=find('mini-color-progress').children;
 assert.equal(marks.length,10);
 assert.ok(marks[0].classList.contains('is-provisional'));
 assert.ok(!marks[0].classList.contains('is-confirmed'));
 assert.equal(requests.length,0);
});
test('M-03 displays eight-field combined rule, then only server-confirmed final score',async()=>{
 const {root,ui,view,requests}=fixture();
 const eight=[...options,{color:'pink',symbol:'bolt'},{color:'purple',symbol:'crown'}];
 view.miniGames.rounds[2].puzzles=Array.from({length:10},()=>({
  mode:'both',targetColor:'blue',targetSymbol:'star',
  prompt:'TRIFF BLAU + STERN!',options:eight
 }));
 ui.update(view,epoch+55100,true);
 const body=root.children[1],find=name=>body.children.flatMap(x=>[x,...x.children]).find(x=>x.className===name);
 assert.match(find('mini-color-level').textContent,/8 FELDER/);
 assert.match(find('mini-color-rule').textContent,/FARBE UND SYMBOL/);
 assert.match(find('mini-color-guide').textContent,/beide Merkmale/);
 for(let i=0;i<10;i++)find('mini-color-grid').children[i%2].click();
 await Promise.resolve();await Promise.resolve();
 assert.equal(requests.length,1);
 assert.match(find('mini-color-verdict').textContent,/WARTE AUF SERVER/);
 assert.ok(find('mini-color-progress').children[0].classList.contains('is-provisional'));
 view.miniGames.myAnswers[2]={attempts:Array.from({length:10},(_,i)=>({
  step:i,correct:i%2===0
 }))};
 ui.update(view,epoch+59500,true);
 assert.match(find('mini-color-verdict').textContent,/SERVER BESTÄTIGT · 5 \/ 10/);
 assert.ok(find('mini-color-progress').children[0].classList.contains('is-confirmed'));
 assert.ok(find('mini-color-grid').children.every(button=>button.disabled));
});
test('M-03 closes controls on server-confirmed partial batches after reconnect',()=>{
 const {root,ui,view,requests}=fixture();
 view.miniGames.myAnswers[2]={attempts:[{step:0,correct:true},{step:1,correct:false}]};
 ui.update(view,epoch+55100,true);
 const body=root.children[1],find=name=>body.children.flatMap(x=>[x,...x.children]).find(x=>x.className===name);
 const tiles=find('mini-color-grid').children;
 assert.ok(tiles.every(button=>button.disabled));
 assert.match(find('mini-color-verdict').textContent,/SERVER BESTÄTIGT · 1 \/ 2/);
 tiles[0].click();
 assert.equal(requests.length,0);
 assert.ok(find('mini-color-progress').children[0].classList.contains('is-confirmed'));
});

test('old v9 moving target path remains intact',()=>{
 const {root,ui,view}=fixture();
 view.miniGames.version=9;
 view.miniGames.rounds[2]={round:2,kind:'target',
  startMs:55000,endMs:63000,maxSteps:3,lanes:3,initialIndex:0,stepMs:1000};
 ui.update(view,epoch+55700,true);
 const buttons=root.children[1].children.filter(x=>x.className==='mini-choice mini-target');
 assert.equal(buttons.length,3);
 assert.equal(root.classList.contains('is-color-target'),false);
});
test('both boss arenas load fast target art and current 135s five-minigame rules without per-frame network',()=>{
 const source=read('dog-boss-mini-ui.js'),css=read('dog-boss-color-target.css');
 assert.match(source,/targetChoices\.push\(value\)/);
 assert.match(source,/flushTarget\(\)/);
 assert.doesNotMatch(source,/\bfetch\s*\(/);
 for(const token of ['mini-color-grid','mini-color-target','mini-color-question',
  'prefers-reduced-motion:reduce'])assert.ok(css.includes(token),token);
 for(const page of ['dog-boss10.html','dog-group-boss.html']){
  const html=read(page);
  assert.match(html,/dog-boss-color-target\.css/);
  assert.match(html,/135 Sekunden/);
 }
});
