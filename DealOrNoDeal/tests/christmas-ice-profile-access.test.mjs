import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext,Script} from 'node:vm';

const source=readFileSync(new URL('../Weihnachtsevent2/online-ice.js',import.meta.url),'utf8');
const nextTick=()=>new Promise(resolve=>setTimeout(resolve,0));
const iceState=completed=>({
 version:2,completed,maxRewarded:completed,finished:false,
 tileCount:50,tilesRequired:50,opened:[0,1,2],prizes:[],
 balance:1000000000,peekJokers:completed,freeHammers:{single:2,double:0,lucky:0},
 goldenHammerGift2026:true,picture30MonsterSpinsClaimed:true
});

test('profile change during an old GET loads the new player instead of overwriting David progress',async()=>{
 assert.doesNotThrow(()=>new Script(source));
 const buttons=new Map(),requests=[],listeners={};
 const root={
  innerHTML:'',
  querySelector(sel){
   if(!sel.startsWith('#')||!this.innerHTML.includes('id="'+sel.slice(1)+'"'))return null;
   if(!buttons.has(sel))buttons.set(sel,{onclick:null,disabled:false,textContent:'',classList:{add(){},remove(){}}});
   return buttons.get(sel);
  },
  querySelectorAll(){return []}
 };
 const status={textContent:'',hidden:false};
 const a={uid:'first-profile',getIdToken:async()=>'first-token'};
 const david={uid:'david-profile',getIdToken:async()=>'david-token'};
 let authUser=a;
 let releaseFirst;
 const firstResponse=new Promise(resolve=>{releaseFirst=resolve});
 let firstPending=true;
 const context={
  document:{
   getElementById:id=>id==='ice-online'?root:id==='ice-online-status'?status:null,
   addEventListener(){},
  },
  window:{
   SPIELPORTAL_CONFIG:{apiBase:'https://test.invalid'},
   SpielOnline:{state:()=>({status:'online',user:authUser})},
   addEventListener:(type,handler)=>{listeners[type]=handler},
   matchMedia:()=>({matches:true})
  },
  sessionStorage:{getItem(){return null},setItem(){},removeItem(){}},
  localStorage:{getItem(){return null},setItem(){},removeItem(){}},
  fetch:async(_url,init)=>{
   const token=init.headers.Authorization;
   requests.push(token);
   if(token==='Bearer first-token'&&firstPending){
    firstPending=false;
    return firstResponse;
   }
   return {ok:true,json:async()=>({ok:true,started:true,state:token==='Bearer david-token'?iceState(12):iceState(10)})};
  },
  crypto:{randomUUID:()=> 'safe-ice-test-request-0001'},
  AbortController,setTimeout,clearTimeout,console
 };
 runInNewContext(source,context);
 for(let i=0;i<5;i++)await nextTick();
 assert.deepEqual(requests,['Bearer first-token']);
 authUser=david;listeners['spielonline-change']();
 assert.match(root.innerHTML,/aktuelle Spielerprofil geladen/);
 releaseFirst({ok:true,json:async()=>({ok:true,started:true,state:iceState(10)})});
 for(let i=0;i<12;i++)await nextTick();
 assert.deepEqual(requests,['Bearer first-token','Bearer david-token']);
 assert.match(root.innerHTML,/Bild 13 von 70/,'David must see his own picture 13');
 assert.doesNotMatch(root.innerHTML,/Bild 11 von 70/,'old profile must not appear');
 // A second switch after David's successful load must re-fetch even though
 // the page already holds a playable board.
 authUser=a;listeners['spielonline-change']();
 for(let i=0;i<12;i++)await nextTick();
 assert.deepEqual(requests,['Bearer first-token','Bearer david-token','Bearer first-token']);
 assert.match(root.innerHTML,/Bild 11 von 70/);
 assert.doesNotMatch(root.innerHTML,/Bild 13 von 70/);
});

test('profile switch and recovery never auto-reset the server, debit hammers or reuse another profile receipt',()=>{
 assert.match(source,/let activeUserUid=null,authEpoch=0,reloadAfterAccountSwitch=false/);
 assert.match(source,/function syncAccount\(\)/);
 assert.match(source,/authEpoch\+\+/);
 assert.match(source,/if\(user\(\)\?\.uid!==requestedUid\|\|authEpoch!==requestedEpoch\)return/);
 assert.match(source,/if\(user\(\)\?\.uid!==actionUid\|\|authEpoch!==actionEpoch\)return/);
 assert.match(source,/finishAccountRefresh\(\)/);
 assert.match(source,/Deine Bilder, Hammer und Gewinne bleiben online gespeichert/);
 assert.match(source,/ice-login-retry/);
 assert.doesNotMatch(source,/localStorage\.clear\(\)|sessionStorage\.clear\(\)/);
});
