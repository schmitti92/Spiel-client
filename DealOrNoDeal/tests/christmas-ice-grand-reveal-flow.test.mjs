import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

const source=readFileSync(new URL('../Weihnachtsevent2/online-ice.js',import.meta.url),'utf8');

const mockState=(completed,finished)=>({
 completed,maxRewarded:completed,balance:1000000000,finished,
 tilesRequired:25,tileCount:25,opened:finished?Array.from({length:25},(_,i)=>i):Array.from({length:24},(_,i)=>i),
 prizes:finished?[{number:completed,kind:'joker',peekJokers:1}]:[],
 freeHammers:{single:0,double:0,lucky:0},
 peekJokers:1,goldenHammerGift2026:true
});
async function boot(state,{onPost=null}={}){
 const buttons=new Map(),tiles=new Map(),postActions=[];
 const status={textContent:'',hidden:false};
 let requests=0;
 const root={
  innerHTML:'',
  querySelector(selector){
   // Expose an element only when its actual button exists in the HTML.
   if(!['#v44-prev','#v44-nextpage','#v44-big-reveal-continue','#v44-gift-open','#v44-celebration-close'].includes(selector))return null;
   const id=selector.slice(1);
   if(!this.innerHTML.includes('id="'+id+'"'))return null;
   if(!buttons.has(id))buttons.set(id,{disabled:false,textContent:'',onclick:null});
   return buttons.get(id);
  },
  querySelectorAll(selector){
   if(selector!=='[data-tile]')return [];
   const matches=[...this.innerHTML.matchAll(/<button data-tile="(\\d+)"([^>]*)>/g)];
   tiles.clear();
   return matches.map(match=>{
    const tile={dataset:{tile:match[1]},disabled:/\\bdisabled\\b/.test(match[2]),onclick:null};
    tiles.set(Number(match[1]),tile);
    return tile;
   });
  }
 };
 const user={uid:'test-player',getIdToken:async()=>'mock-token'};
 const context={
  document:{
   getElementById(id){return id==='ice-online'?root:id==='ice-online-status'?status:null},
   addEventListener(){},hidden:false
  },
  window:{
   SPIELPORTAL_CONFIG:{apiBase:'https://example.invalid'},
   SpielOnline:{state:()=>({status:'online',user})},
   addEventListener(){},
   matchMedia:()=>({matches:true})
  },
  localStorage:{getItem:()=>null,setItem(){},removeItem(){}},
  sessionStorage:{getItem:()=>null,setItem(){},removeItem(){}},
  fetch:async(_url,request)=>{
   requests++;
   if(request.method==='GET')return {ok:true,json:async()=>({ok:true,started:true,state})};
   assert.equal(request.method,'POST');
   const body=JSON.parse(request.body);
   postActions.push(body);
   assert.ok(onPost,'no unexpected POST requests');
   return {ok:true,json:async()=>onPost(body)};
  },
  crypto:{randomUUID:()=> 'test-action-id-0001'},
  AbortController,
  setTimeout,clearTimeout,
  console
 };
 runInNewContext(source,context);
 // The existing boot sequence fetches once, then renders on resolution.
 for(let i=0;i<12;i++)await new Promise(resolve=>setTimeout(resolve,0));
 return {root,buttons,tiles,postActions,get requests(){return requests}};
}
test('picture 15 has 25 ice tiles and awaits the confirmed star reveal',async()=>{
 const play=await boot(mockState(14,false));
 assert.equal(play.requests,1);
 assert.match(play.root.innerHTML,/Bild 15 von 70/);
 assert.match(play.root.innerHTML,/25 Eisfelder: Finde den versteckten Stern/);
 assert.doesNotMatch(play.root.innerHTML,/id="v44-big-reveal-continue"/);
 assert.doesNotMatch(play.root.innerHTML,/class="v44-big-reveal"/);
});
test('confirmed picture 15 star reveals the whole photo before the saved prize',async()=>{
 const play=await boot(mockState(15,true));
 assert.equal(play.requests,1);
 assert.match(play.root.innerHTML,/class="v44-big-reveal"/);
 assert.match(play.root.innerHTML,/🌟 Bild freigelegt!/);
 assert.match(play.root.innerHTML,/Weihnachtsbilder\/.*jpg/);
 assert.match(play.root.innerHTML,/id="v44-big-reveal-continue"/);
 assert.doesNotMatch(play.root.innerHTML,/id="v44-gift-open"/);
 play.buttons.get('v44-big-reveal-continue').onclick();
 assert.doesNotMatch(play.root.innerHTML,/class="v44-big-reveal"/);
 assert.match(play.root.innerHTML,/id="v44-gift-open"/);
 play.buttons.get('v44-gift-open').onclick();
 assert.match(play.root.innerHTML,/Kofferblick-Joker/);
 assert.equal(play.requests,1,'visual transitions never debit or redraw prizes');
});
test('picture 70 completion is also recovered with a large image',async()=>{
 const play=await boot(mockState(70,true));
 assert.match(play.root.innerHTML,/class="v44-big-reveal"/);
 assert.match(play.root.innerHTML,/Bild 70 von 70 abgeschlossen/);
 assert.match(play.root.innerHTML,/Alle Eisblöcke entfernt!/);
 assert.equal(play.requests,1);
});

test('newly loaded Christmas ice fields are clickable and submit a strike to the server',async()=>{
 const start=mockState(14,false);
 // Two unopened fields. This tests an actual click rather than just searching the HTML.
 start.opened=Array.from({length:23},(_,i)=>i);
 const next={...start,opened:[...start.opened,23]};
 const play=await boot(start,{onPost:body=>{
  assert.equal(body.type,'strike');
  assert.equal(body.index,23);
  assert.equal(body.hammer,'single');
  assert.equal(body.expectedPicture,15);
  return {ok:true,state:next,result:{targets:[23],found:false,gift:null,completed:14}};
 }});
 assert.equal(play.requests,1,'initial load only uses one GET');
 const tile=play.tiles.get(23);
 assert.ok(tile,'unopened field must exist');
 assert.equal(tile.disabled,false,'field must be active as soon as GET finishes');
 assert.equal(typeof tile.onclick,'function','click listener must be attached');
 tile.onclick();
 for(let i=0;i<10;i++)await new Promise(resolve=>setTimeout(resolve,0));
 assert.equal(play.postActions.length,1,'click must send exactly one authorized strike');
 assert.equal(play.requests,2,'one GET and one POST, no extra reads');
 assert.match(play.root.innerHTML,/24\/25 Eisfelder/);
});
