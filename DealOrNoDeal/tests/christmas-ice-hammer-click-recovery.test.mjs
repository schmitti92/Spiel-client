import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext,Script} from 'node:vm';
const source=readFileSync(new URL('../Weihnachtsevent2/online-ice.js',import.meta.url),'utf8');

const delay=()=>new Promise(resolve=>setTimeout(resolve,0));
async function boot(initial,{fxThrows=false}={}){
 const storage=new Map(),tiles=new Map(),buttons=new Map(),calls=[];
 let backend={...initial,opened:[...initial.opened]};
 const status={textContent:'',hidden:false};
 const root={
  innerHTML:'',
  querySelector(sel){
   if(sel==='.v44-board')return {nodeType:1};
   const id=sel.replace(/^#/,'');
   if(!this.innerHTML.includes('id="'+id+'"'))return null;
   if(!buttons.has(id))buttons.set(id,{disabled:false,textContent:'',onclick:null});
   return buttons.get(id);
  },
  querySelectorAll(sel){
   if(sel==='[data-tile]'){
    tiles.clear();
    return [...this.innerHTML.matchAll(/<button data-tile="(\d+)"([^>]*)>/g)].map(([,number,attr])=>{
     const tile={dataset:{tile:number},disabled:/\bdisabled\b/.test(attr),onclick:null};
     tiles.set(Number(number),tile);return tile;
    });
   }
   return [];
  }
 };
 const window={
  SPIELPORTAL_CONFIG:{apiBase:'https://example.invalid'},
  SpielOnline:{state:()=>({status:'online',user:{uid:'test-player',getIdToken:async()=>'token'}})},
  matchMedia:()=>({matches:true}),addEventListener(){},
  ChristmasIceHammerFX:fxThrows?{cue(){throw Error('Broken decoration')},confirmed(){throw Error('Broken fireworks')}}:undefined,
 };
 const storageApi={
  getItem:key=>storage.get(key)||null,
  setItem:(key,value)=>storage.set(key,String(value)),
  removeItem:key=>storage.delete(key)
 };
 const context={
  document:{getElementById(id){return id==='ice-online'?root:id==='ice-online-status'?status:null},addEventListener(){},hidden:false},
  window,localStorage:storageApi,sessionStorage:storageApi,
  fetch:async(url,init)=>{
   const data=init?.body?JSON.parse(init.body):null;
   calls.push({url,method:init.method,body:data});
   if(init.method==='GET')return {ok:true,json:async()=>({ok:true,started:true,state:backend,pendingAction:{applied:false}})};
   assert.equal(data.type,'strike');
   assert.ok(backend.freeHammers[data.hammer]>0);
   assert.equal(data.expectedPicture,15);
   assert.equal(data.index,23);
   backend={...backend,opened:[...backend.opened,23],freeHammers:{...backend.freeHammers,[data.hammer]:backend.freeHammers[data.hammer]-1}};
   return {ok:true,json:async()=>({ok:true,state:backend,result:{targets:[23],found:false,gift:null}})};
  },
  crypto:{randomUUID:()=> 'hammer-click-test-12345'},
  AbortController,setTimeout,clearTimeout,console
 };
 assert.doesNotThrow(()=>new Script(source));
 runInNewContext(source,context);
 for(let i=0;i<8;i++)await delay();
 return {root,storage,tiles,calls,status,get state(){return backend}};
}
const saved={
 completed:14,maxRewarded:14,finished:false,tileCount:25,tilesRequired:25,
 opened:Array.from({length:23},(_,i)=>i),
 freeHammers:{single:1,double:0,lucky:0},balance:0,
 prizes:[],goldenHammerGift2026:true,peekJokers:0
};

test('an old unresolved action is reconciled on ice click even with zero balance',async()=>{
 const app=await boot(saved);
 assert.equal(app.calls.length,1);
 assert.equal(app.tiles.get(23).disabled,false);
 const pending={uid:'test-player',type:'strike',key:'strike:14:18:single',requestId:'old-hammer-action-1234567',extra:{index:18,hammer:'single'},expectedPicture:15,savedAt:Date.now()};
 app.storage.set('christmasIcePending',JSON.stringify(pending));
 app.storage.set('christmasIcePendingV2',JSON.stringify(pending));
 app.tiles.get(23).onclick();
 for(let i=0;i<8;i++)await delay();
 assert.equal(app.calls.length,2,'old action should only check its receipt');
 assert.equal(app.calls[1].method,'GET');
 assert.match(app.calls[1].url,/pendingId=old-hammer-action-1234567/);
 assert.equal(app.storage.has('christmasIcePending'),false,'already-open old tile unlocks browser');
 assert.equal(app.storage.has('christmasIcePendingV2'),false);
 assert.equal(app.state.freeHammers.single,1,'GET reconciliation spends no hammer');
 app.tiles.get(23).onclick();
 for(let i=0;i<8;i++)await delay();
 assert.equal(app.calls.filter(c=>c.method==='POST').length,1,'subsequent click makes one strike');
 assert.equal(app.state.freeHammers.single,0,'one free hammer is consumed');
 assert.equal(app.state.opened.length,24);
 assert.match(app.root.innerHTML,/24\/25 Eisfelder/);
});
test('hammer visual exceptions never prevent server strike or confirmed ice progress',async()=>{
 const app=await boot(saved,{fxThrows:true});
 assert.equal(app.tiles.get(23).disabled,false);
 app.tiles.get(23).onclick();
 for(let i=0;i<8;i++)await delay();
 assert.equal(app.calls.filter(c=>c.method==='POST').length,1);
 assert.equal(app.state.opened.length,24);
 assert.match(app.root.innerHTML,/24\/25 Eisfelder/);
});
