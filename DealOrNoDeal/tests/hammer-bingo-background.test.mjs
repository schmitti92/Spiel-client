// Browser-free, behavior-focused regression tests for Bingo cinema visibility and focus.
// Run: node --test DealOrNoDeal/tests/hammer-bingo-background.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import vm from 'node:vm';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const source=readFileSync(resolve(root,'js/hammer-bingo-cinematics.js'),'utf8');
const style=readFileSync(resolve(root,'css/hammer-bingo-cinematics.css'),'utf8');
const page=readFileSync(resolve(root,'weihnachten.html'),'utf8');

function harness(){
 const elements=new Map(),listeners={};
 let now=0,serial=1;
 const timers=new Map();
 let document;
 function element(id){
  const classes=new Set();
  const children=[];
  return {
   id,hidden:id==='reveal-overlay'||id==='hammer-cinema',
   style:{setProperty(){}},dataset:{},textContent:'',isConnected:true,
   attributes:{},offsetWidth:500,
   classList:{
    add(...names){names.forEach(name=>classes.add(name));},
    remove(...names){names.forEach(name=>classes.delete(name));},
    toggle(name,force){const active=force===undefined?!classes.has(name):Boolean(force);
     if(active)classes.add(name);else classes.delete(name);return active;},
    contains(name){return classes.has(name);}
   },
   setAttribute(name,value){this.attributes[name]=value;},
   getClientRects(){return [{}];},
   focus(){document.activeElement=this;},
   addEventListener(){},
   append(...nodes){children.push(...nodes);},
   replaceChildren(...nodes){children.splice(0,children.length,...nodes);},
   insertBefore(node){children.unshift(node);},
   querySelectorAll(selector){
    if(id==='hammer-cinema'&&selector.includes('button:not'))
     return [get('hammer-cinema-close'),get('hammer-cinema-next')];
    return [];
   },
   contains(node){return node===this||id==='hammer-cinema'&&
     [get('hammer-cinema-next'),get('hammer-cinema-close')].includes(node);}
  };
 }
 function get(id){
  if(!elements.has(id))elements.set(id,element(id));
  return elements.get(id);
 }
 document={
  readyState:'loading',hidden:false,body:get('body'),
  activeElement:get('body'),
  getElementById:get,
  createElement:tag=>element(tag),
  createElementNS:(ns,tag)=>element(tag),
  querySelectorAll:()=>[],
  querySelector:()=>null,
  addEventListener(name,callback){listeners[name]=callback;}
 };
 const ctx=vm.createContext({
  document,
  window:{matchMedia:()=>({matches:false})},
  Date:{now:()=>now},
  setTimeout(callback,ms){
   const key=serial++;timers.set(key,{callback,at:now+ms});return key;
  },
  clearTimeout(key){timers.delete(key);}
 });
 vm.runInContext(source,ctx,{timeout:1000,filename:'hammer-bingo-cinematics.js'});
 listeners.DOMContentLoaded();
 function tick(ms){
  const until=now+ms;
  for(let attempts=0;attempts<1000;attempts++){
   const next=[...timers.entries()]
    .filter(([,entry])=>entry.at<=until)
    .sort((a,b)=>a[1].at-b[1].at)[0];
   if(!next){now=until;return;}
   now=next[1].at;timers.delete(next[0]);next[1].callback();
  }
  throw Error('Unbounded setTimeout loop');
 }
 const payload={
  awarded:[{board:3,line:0,hammers:{single:1}}],
  preClaimCards:{},
  artwork:Array.from({length:32},(_,index)=>'art_'+index+'.png'),
  hammerProgress:{boards:[{board:3,cycle:1}]}
 };
 return {get,document,ctx,listeners,tick,payload,
  celebrate(){return ctx.window.HammerBingoCinematics.celebrate(payload);}};
}

test('an actual Bingo scene remains visible while the tab is backgrounded',()=>{
 const h=harness();
 assert.equal(h.celebrate(),1);
 assert.equal(h.get('hammer-cinema').hidden,false);
 assert.equal(h.get('body').classList.contains('hammer-cinema-active'),true);
 h.tick(1600);
 h.document.hidden=true;
 h.listeners.visibilitychange();
 h.tick(25000);
 assert.equal(h.get('hammer-cinema').hidden,false,'reward must not auto-close unseen');
 h.document.hidden=false;
 h.listeners.visibilitychange();
 h.tick(3799);
 assert.equal(h.get('hammer-cinema').hidden,false);
 h.tick(1);
 assert.equal(h.get('hammer-cinema').hidden,true);
 assert.equal(h.get('body').classList.contains('hammer-cinema-active'),false);
});

test('multiple background/foreground transitions do not duplicate close timers',()=>{
 const h=harness();h.celebrate();
 for(let index=0;index<3;index++){
  h.tick(350);
  h.document.hidden=true;h.listeners.visibilitychange();
  h.tick(3000);
  h.document.hidden=false;h.listeners.visibilitychange();
 }
 h.tick(4349);
 assert.equal(h.get('hammer-cinema').hidden,false);
 h.tick(1);
 assert.equal(h.get('hammer-cinema').hidden,true);
 h.tick(15000);
 assert.equal(h.get('hammer-cinema').hidden,true);
});

test('Bingo dialog traps keyboard focus and Escape closes the scene',()=>{
 const h=harness();h.celebrate();
 const next=h.get('hammer-cinema-next'),close=h.get('hammer-cinema-close');
 assert.equal(h.document.activeElement,next);
 let prevented=0;
 h.listeners.keydown({key:'Tab',shiftKey:false,preventDefault(){prevented++;}});
 assert.equal(h.document.activeElement,close);
 h.listeners.keydown({key:'Tab',shiftKey:true,preventDefault(){prevented++;}});
 assert.equal(h.document.activeElement,next);
 assert.equal(prevented,2);
 h.listeners.keydown({key:'Escape',preventDefault(){prevented++;}});
 assert.equal(h.get('hammer-cinema').hidden,true);
 assert.equal(prevented,3);
});

test('cinematic blocks accidental clicks behind modal; no payout code was added',()=>{
 assert.match(style,/\.hammer-cinema\{[\s\S]*?pointer-events:auto/);
 assert.match(style,/body\.hammer-cinema-active\{overflow:hidden!important\}/);
 assert.match(page,/hammer-cinema__stage" role="dialog" aria-modal="true"/);
 assert.match(source,/visibilityChanged\(\)/);
 assert.match(source,/closeRemaining/);
 assert.doesNotMatch(source,/\bfetch\s*\(|\bXMLHttpRequest\s*\(/);
 assert.match(page,/request\('POST','hammer\/claim'\)/);
});
