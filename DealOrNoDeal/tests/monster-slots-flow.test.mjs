import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Script,createContext} from 'node:vm';

// A lightweight fake browser: executes the *real* finale slot script with
// virtual DOM nodes, state events, a reduced-motion clock and a stub API.
const src=readFileSync(new URL('../js/monster-slots-final.js',import.meta.url),'utf8');
function browserFixture(){
 class Node{
  constructor(name='node'){this.name=name;this.hidden=false;this.disabled=false;this.isConnected=true;
   this.dataset={};this.children=[];this.events=new Map();this.classList={
    set:new Set(),add:(n)=>this.classList.set.add(n),remove:(n)=>this.classList.set.delete(n),
    contains:(n)=>this.classList.set.has(n)
   }}
  addEventListener(type,fn){this.events.set(type,fn)}
  click(){if(!this.disabled)this.events.get('click')?.()}
  replaceChildren(...c){this.children=c}
  append(...c){this.children.push(...c)}
  remove(){this.isConnected=false}
  contains(node){return this.children.includes(node)}
  focus(){this.focused=true}
  setAttribute(){}
  querySelector(){return null}
 }
 function makeReel(){
  const reel=new Node('reel'),track=new Node('track'),status=new Node('status');
  const win=new Node('win'),art=new Node('art'),quantity=new Node('quantity'),name=new Node('name');
  const map=new Map([['.monster-slot-track',track],['.monster-slot-state',status],['.monster-slot-prize',win]]);
  reel.querySelector=q=>map.get(q)||null;
  win.querySelector=q=>({'.monster-slot-art':art,'.monster-slot-quantity':quantity,'.monster-slot-prize-name':name})[q];
  return {reel,win,name,quantity,status};
 }
 const reels=[makeReel(),makeReel(),makeReel()],lamps=Array.from({length:3},()=>new Node('lamp'));
 const root=new Node('root');root.hidden=true;root.querySelectorAll=q=>{
  if(q==='.monster-slot-reel')return reels.map(e=>e.reel);
  if(q==='.monster-slot-progress span')return lamps;
  return [];
 };
 const status=new Node('display-status'),accept=new Node('accept'),finale=new Node('finale'),banker=new Node('banker');
 const dom={'monster-slot-status':status,'monster-slot-accept':accept,'finale-cinema':finale,'cent-reward':banker};
 const listeners=new Map(),store=new Map(),requests=[];
 const document={hidden:false,activeElement:new Node('prior'),body:{append(){}},
  createElement:type=>type==='section'?root:new Node(type),getElementById:id=>dom[id]||null
 };
 const timers=new Map();let clock=0,timerId=0;
 function setFakeTimeout(fn,ms){const id=++timerId;timers.set(id,{when:clock+ms,fn});return id}
 async function advance(ms){
  const until=clock+ms;
  for(let count=0;count<200;count++){
   const next=[...timers].filter(([,timer])=>timer.when<=until).sort((a,b)=>a[1].when-b[1].when)[0];
   if(!next)break;
   clock=next[1].when;timers.delete(next[0]);next[1].fn();
   await flush();
  }
  clock=until;await flush();
 }
 const emit=event=>{for(const fn of listeners.get(event)||[])fn({type:event})};
 const window={SPIELPORTAL_CONFIG:{apiBase:'https://test.example.invalid'},SpielOnline:{state:()=>({
  user:{uid:window.person,getIdToken:async()=>window.person}
 })},person:'host',addEventListener:(e,fn)=>{
   if(!listeners.has(e))listeners.set(e,[]);listeners.get(e).push(fn)
  },dispatchEvent:event=>{emit(event.type);return true}
 };
 const g={id:'11111111-1111-4111-8111-111111111111',phase:'final',monsterSlotsVersion:1};
 const fetch=async(_url,options)=>{
  const uid=options.headers.Authorization.slice(7),{gameId}=JSON.parse(options.body);
  requests.push({uid,gameId});
  return {ok:true,json:async()=>({ok:true,gameId,
   prizes:[{kind:'joker',id:null,label:'1× Joker',quantity:1},
    {kind:'minigame',id:null,label:'2× Minispiel-Gutschein',quantity:2},
    {kind:'cash',id:null,label:'10,00 €',amountCents:1000,quantity:1}]})};
 };
 async function flush(){for(let i=0;i<15;i++)await Promise.resolve()}
 const context=createContext({window,document,g,fetch,console,sessionStorage:{
  getItem:key=>store.get(key)||null,setItem:(key,val)=>store.set(key,val)
 },matchMedia:()=>({matches:true}),setTimeout:setFakeTimeout,clearTimeout:id=>timers.delete(id),
  Event:class{constructor(type){this.type=type}}
 });
 new Script(src,{filename:'monster-slots-final.js'}).runInContext(context);
 return {window,document,g,root,accept,reels,banker,finale,requests,store,emit,flush,advance};
}

test('a three-player finale shows the correct receipt, sequential reels and no duplicate UI reward request',async()=>{
 const b=browserFixture();
 b.banker.hidden=false;
 b.emit('deal-game-state-change');await b.flush();
 assert.equal(b.requests.length,1,'one authenticated API claim per player/game');
 assert.equal(b.root.hidden,true,'banker/one-cent card window must finish first');
 b.banker.hidden=true;b.emit('deal-reward-window-closed');await b.advance(400);
 assert.equal(b.root.hidden,false);
 assert.ok(b.reels.every(r=>r.reel.dataset.phase==='running'),'all reels start together');
 assert.equal(b.accept.disabled,true);
 await b.advance(100);
 assert.deepEqual(b.reels.map(r=>r.reel.dataset.phase),['won','running','running']);
 await b.advance(120);
 assert.deepEqual(b.reels.map(r=>r.reel.dataset.phase),['won','won','running']);
 await b.advance(120);
 assert.deepEqual(b.reels.map(r=>r.reel.dataset.phase),['won','won','won']);
 assert.equal(b.accept.disabled,true,'must wait for result hold');
 await b.advance(150);
 assert.equal(b.accept.disabled,false);
 b.accept.click();
 assert.equal(b.root.hidden,true);
 assert.equal(b.store.get('monster-slots-watched:host:'+b.g.id),'yes');
 b.emit('deal-game-state-change');await b.flush();
 assert.equal(b.requests.length,1,'render and rejoin must not mint new prizes');

 // A second profile sharing this browser sees their own prize claim.
 b.window.person='guest';b.emit('spielonline-change');await b.flush();
 assert.equal(b.requests.length,2);
 assert.equal(b.requests[1].uid,'guest');
 assert.equal(b.root.hidden,false);
 await b.advance(490);b.accept.click();
 assert.equal(b.store.get('monster-slots-watched:guest:'+b.g.id),'yes');

 // New game clears previous presentation and requests a new receipt only at its own finale.
 b.g.id='22222222-2222-4222-8222-222222222222';b.g.phase='select';
 b.emit('deal-game-state-change');await b.flush();
 assert.equal(b.root.hidden,true);
 assert.equal(b.requests.length,2);
 b.g.phase='final';b.emit('deal-game-state-change');await b.flush();
 assert.equal(b.requests.length,3);
 assert.equal(b.requests[2].gameId,b.g.id);
 assert.equal(b.root.hidden,false);
});
