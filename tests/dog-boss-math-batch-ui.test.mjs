import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

const source=readFileSync(new URL('../dog-boss-mini-ui.js',import.meta.url),'utf8');
function createElement(tag){
 const styles={};
 const el={tag,children:[],listeners:{},textContent:'',disabled:false,
  style:{setProperty:(key,val)=>{styles[key]=val}},
  classList:{add(){},remove(){},toggle(){}},
  append(...children){this.children.push(...children)},
  replaceChildren(...children){this.children=children},
  addEventListener(type,callback){this.listeners[type]=callback},
  click(){this.listeners.click?.()},
  get firstElementChild(){return this.children[0]||null}
 };
 return el;
}
function fixture(){
 const window={};
 const document={createElement,hidden:false};
 runInNewContext(source,{window,document,Date,Promise});
 const root=createElement('section'),requests=[];
 const ui=window.DogBossMinigames.create(root,(round,answer,step)=>{
  requests.push({round,answer,step});return Promise.resolve();
 });
 const puzzles=Array.from({length:8},(_,i)=>({
  question:(i+2)+' + 3 = ?',options:[i+5,i+6,i+7]
 }));
 const view={phase:'fighting',startedAt:1_800_000_000_000,
  miniGames:{version:2,rounds:[
   {round:0,kind:'math',startMs:3000,endMs:11000,maxSteps:8,puzzles,
    hint:'Eight tasks'},
   {round:1,kind:'reaction',startMs:11000,endMs:19000,maxSteps:3,
    zoneRadius:.1,difficulty:1},
   {round:2,kind:'target',startMs:19000,endMs:27000,maxSteps:3,
    lanes:3,initialIndex:0,stepMs:1000}],myAnswers:{}}};
 return {root,ui,view,requests};
}
test('Eight arithmetic choices advance immediately without eight server calls',async()=>{
 const {root,ui,view,requests}=fixture();
 ui.update(view,view.startedAt+3400,true);
 const body=root.children[1],question=body.children[1],counter=body.children[0];
 assert.equal(question.textContent,'2 + 3 = ?');
 const buttons=body.children.slice(2);
 assert.equal(buttons.length,3);
 for(let i=0;i<8;i++){
  buttons[i%3].click();
  assert.equal(counter.textContent,(i+1)+' / 8 beantwortet');
  if(i<7)assert.equal(question.textContent,(i+3)+' + 3 = ?');
  assert.equal(requests.length,0,'no per-tap network calls');
 }
 await Promise.resolve();await Promise.resolve();
 assert.equal(requests.length,1);
 assert.equal(requests[0].round,0);
 assert.equal(requests[0].step,0);
 assert.deepEqual([...requests[0].answer],[0,1,2,0,1,2,0,1]);
 // Another click cannot send a second math result.
 buttons[0].click();
 await Promise.resolve();
 assert.equal(requests.length,1);
});
test('A partially solved sprint submits once as the eight-second window ends',async()=>{
 const {root,ui,view,requests}=fixture();
 ui.update(view,view.startedAt+3300,true);
 const buttons=root.children[1].children.slice(2);
 buttons[0].click();buttons[1].click();buttons[2].click();
 assert.equal(requests.length,0);
 ui.update(view,view.startedAt+11010,true);
 await Promise.resolve();await Promise.resolve();
 assert.equal(requests.length,1);
 assert.deepEqual([...requests[0].answer],[0,1,2]);
});
test('Client never decides arithmetic success locally; only server scores it',()=>{
 assert.match(source,/onSubmit\(round,answers,0\)/);
 assert.match(source,/one server transaction per math sprint|One server transaction per math sprint/);
 assert.doesNotMatch(source,/correctIndex/);
 assert.match(source,/mathChoices\.push\(value\)/);
 assert.match(source,/round\.kind==='math'&&mathChoices\.length/);
});
