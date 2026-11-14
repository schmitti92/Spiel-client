import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Script,createContext} from 'node:vm';

// A lightweight fake browser: executes the *real* finale slot script with
// virtual DOM nodes, state events, a reduced-motion clock and a stub API.
const src=readFileSync(new URL('../js/monster-slots-final.js',import.meta.url),'utf8');
const app=readFileSync(new URL('../js/app.js',import.meta.url),'utf8');
const helper=app.slice(app.indexOf('function dealSlotReelsFor('),app.indexOf('// Show the next Banker'));
function browserFixture(customPrizes=null){
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
 const reels=Array.from({length:6},()=>makeReel()),lamps=Array.from({length:6},()=>new Node('lamp'));
 const root=new Node('root');root.hidden=true;
 const sharedCaption=new Node('shared-caption');sharedCaption.hidden=true;
 root.querySelector=q=>q==='.monster-slot-shared-caption'?sharedCaption:null;
 root.querySelectorAll=q=>{
  if(q==='.monster-slot-reel')return reels.map(e=>e.reel);
  if(q==='.monster-slot-progress span')return lamps;
  return [];
 };
 const status=new Node('display-status'),accept=new Node('accept'),finale=new Node('finale'),banker=new Node('banker');
 finale.hidden=true; // The suitcase ceremony has just finished before the slots open.
 const dom={'monster-slot-status':status,'monster-slot-accept':accept,'finale-cinema':finale,'cent-reward':banker};
 const listeners=new Map(),store=new Map(),requests=[];
 const document={hidden:false,activeElement:new Node('prior'),body:{append(){}},addEventListener(){},
  createElement:type=>type==='section'?root:new Node(type),getElementById:id=>dom[id]||null
 };
 const timers=new Map();let clock=0,timerId=0;
 const epoch=Date.now();
 class ServerDate extends Date{static now(){return epoch+clock}}
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
 const g={id:'11111111-1111-4111-8111-111111111111',phase:'final',monsterSlotsVersion:1,slotRewardVersion:3,
  finalValues:[{id:'host',payout:3000000},{id:'guest',payout:2000000},{id:'quiet',payout:1000000}]};
 const fillPrizes=(items,count)=>Array.from({length:count},(_,i)=>items[i]||{kind:'cash',id:null,label:(i+1)+',00 €',amountCents:(i+1)*100,quantity:1});
 const fetch=async(_url,options)=>{
  const uid=options.headers.Authorization.slice(7),
   {gameId,operation,expectedTurn,expectedUid,expectedStartedAt}=JSON.parse(options.body);
  if(operation){
   requests.push({uid,gameId,operation,expectedTurn,expectedUid,expectedStartedAt});
   const current=g.monsterSlotShow;
   if(operation==='spin'){
    const count=current.reels;
    const prizeItems=customPrizes||[
     {kind:'joker',id:null,label:'1× Joker',quantity:1},
     {kind:'cash',id:null,label:'10,00 €',amountCents:1000,quantity:1},
     {kind:'chest',id:'wood',label:'Holzkiste',quantity:1}
    ];
    g.monsterSlotShow={...current,phase:'rolling',startedAt:Date.now()-12000,prizes:fillPrizes(prizeItems,count)};
   }else if(current.turn==='runner'){
    g.monsterSlotShow={phase:'ready',turn:'champion',uid:'host',reels:3,
     runnerUid:'guest',championUid:'host',activatedAt:Date.now(),startedAt:null,prizes:[]};
   }else{
    g.monsterSlotShow={phase:'ceremony',turn:'complete',uid:null,reels:0,
     runnerUid:'guest',championUid:'host',finishedAt:Date.now(),prizes:[]};
   }
   g.revision=(g.revision||0)+1;
   return {ok:true,json:async()=>({ok:true,game:g})};
  }
  requests.push({uid,gameId});
  const count=window.dealSlotReelsFor(g,uid);
  const items=customPrizes||[{kind:'joker',id:null,label:'1× Joker',quantity:1},
   {kind:'minigame',id:null,label:'2× Minispiel-Gutschein',quantity:2},
   {kind:'cash',id:null,label:'10,00 €',amountCents:1000,quantity:1}];
  return {ok:true,json:async()=>({ok:true,gameId,guaranteed:count,prizes:fillPrizes(items,count)})};
 };
 async function flush(){for(let i=0;i<15;i++)await Promise.resolve()}
 const context=createContext({window,document,g,fetch,console,Date:ServerDate,code:'123',render:()=>{},sessionStorage:{
  getItem:key=>store.get(key)||null,setItem:(key,val)=>store.set(key,val)
 },matchMedia:()=>({matches:true}),setTimeout:setFakeTimeout,clearTimeout:id=>timers.delete(id),
  Event:class{constructor(type){this.type=type}}
 });
 new Script(helper,{filename:'deal-slot-ranking-helper.js'}).runInContext(context);
 new Script(src,{filename:'monster-slots-final.js'}).runInContext(context);
 const summary=root.children.find(n=>n.id==='monster-slot-reward-summary');
 const summaryContent=summary?.children[0];
 return {window,document,g,root,accept,reels,banker,finale,requests,store,emit,flush,advance,
  now:()=>epoch+clock,skipTimers:ms=>{clock+=ms},
  summary,summaryButton:summaryContent?.children.at(-1),
  summaryPrizes:summaryContent?.children[3],summaryCardsPanel:summaryContent?.children[4],
  summaryCards:summaryContent?.children[4]?.children[2]};
}

test('all three profiles watch the same runner-up then champion Slot show before ceremony',async()=>{
 const b=browserFixture();
 b.banker.hidden=true;
 b.g.monsterSlotShow={phase:'ready',turn:'runner',uid:'guest',reels:1,
  runnerUid:'guest',championUid:'host',activatedAt:Date.now(),startedAt:null,prizes:[]};
 b.window.person='quiet';
 b.emit('deal-game-state-change');await b.flush();
 assert.equal(b.root.hidden,false,'third place sees the shared slot as spectator');
 assert.equal(b.root.dataset.reels,'1');
 assert.equal(b.accept.disabled,true,'spectator must not trigger the runner-up spin');
 assert.equal(b.requests.length,0,'spectator never requests or credits a personal prize');

 b.window.person='guest';b.emit('spielonline-change');await b.flush();
 assert.equal(b.accept.disabled,false,'runner-up may press spin');
 b.accept.click();await b.flush();
 assert.equal(b.requests[0]?.operation,'spin');
 assert.equal(b.requests[0]?.expectedTurn,'runner');
 assert.equal(b.requests[0]?.expectedUid,'guest');
 assert.equal(b.root.dataset.reels,'1');
 assert.equal(b.summary.hidden,false,'all spectators can view the server-stored prize');
 assert.equal(b.summaryButton.disabled,false,'runner-up confirms their own gift');

 b.window.person='quiet';b.emit('spielonline-change');await b.flush();
 assert.equal(b.summaryButton.disabled,true,'spectators can see but cannot confirm');
 b.window.person='guest';b.emit('spielonline-change');await b.flush();
 assert.equal(b.summaryButton.disabled,false);
 b.summaryButton.click();await b.flush();
 assert.equal(b.requests[1]?.operation,'confirm');
 assert.equal(b.requests[1]?.expectedTurn,'runner');
 assert.equal(b.requests[1]?.expectedUid,'guest');
 assert.equal(b.g.monsterSlotShow.turn,'champion','winner follows runner-up');

 b.window.person='host';b.emit('spielonline-change');await b.flush();
 assert.equal(b.accept.disabled,false);
 b.accept.click();await b.flush();
 assert.equal(b.requests[2]?.operation,'spin');
 assert.equal(b.requests[2]?.expectedTurn,'champion');
 assert.equal(b.requests[2]?.expectedUid,'host');
 assert.equal(b.summaryPrizes.children.length,3,'champion receives three real server-settled prizes');
 b.summaryButton.click();await b.flush();
 assert.equal(b.requests[3]?.operation,'confirm');
 assert.equal(b.g.monsterSlotShow.phase,'ceremony');
 assert.equal(b.root.hidden,true,'the Slot overlay closes before the ceremony');
 assert.equal(b.requests.length,4,'viewing the entire finale needs only four authorized actions');
});

test('a three-player finale shows each reel then the combined summary without duplicate reward requests',async()=>{
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
 assert.deepEqual(b.reels.map(r=>r.reel.dataset.phase),['won','running','running','running','running','running']);
 await b.advance(120);
 assert.deepEqual(b.reels.map(r=>r.reel.dataset.phase),['won','won','running','running','running','running']);
 await b.advance(120);
 assert.deepEqual(b.reels.map(r=>r.reel.dataset.phase),['won','won','won','running','running','running']);
 assert.equal(b.accept.disabled,true,'must wait for result hold');
 await b.advance(120); // 4th reel
 await b.advance(120); // 5th reel
 await b.advance(120); // 6th reel
 assert.deepEqual(b.reels.map(r=>r.reel.dataset.phase),Array(6).fill('won'));
 await b.advance(499);
 assert.equal(b.summary.hidden,true,'keep all six prize windows visible');
 await b.advance(1);
 assert.equal(b.summary.hidden,false,'open summary only after every reel stopped');
 assert.equal(b.summaryPrizes.children.length,6,'all six prizes appear together');
 assert.equal(b.summaryCardsPanel.hidden,true,'summary without packs has no empty cards panel');
 assert.equal(b.summaryButton.disabled,false);
 b.summaryButton.click();
 assert.equal(b.root.hidden,true);
 assert.equal(b.store.get('monster-slots-watched:host:'+b.g.id),'yes');
 b.emit('deal-game-state-change');await b.flush();
 assert.equal(b.requests.length,1,'render and rejoin must not mint new prizes');

 // A second profile sharing this browser sees their own prize claim.
 b.window.person='guest';b.emit('spielonline-change');await b.flush();
 assert.equal(b.requests.length,2);
 assert.equal(b.requests[1].uid,'guest');
 assert.equal(b.root.hidden,false);
 assert.equal(b.root.dataset.reels,'2','runner-up sees two reels');
 assert.equal(b.reels[1].reel.hidden,false);
 assert.equal(b.reels[2].reel.hidden,true);
 await b.advance(2340);b.summaryButton.click();
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



test('every won pack displays all cards at once, including NEW and duplicates',async()=>{
 const newCard={id:'dog2-001',name:'Drachenritter',image:'DOG_01_11.png',series:'DOG & Königreich',rarity:'legendary',isNew:true};
 const duplicate={id:'dog2-002',name:'Doppeltes Motiv',image:'DOG_02.png',series:'DOG & Königreich',rarity:'common',isNew:false};
 const special={id:'dog2-003',name:'Ritterburg',image:'DOG_03.png',series:'DOG & Königreich',rarity:'epic',isNew:false};
 const b=browserFixture([
  {kind:'pack',id:'small',quantity:2,label:'2× Normalpaket',
   openedPacks:[
    {packId:'small',packName:'DOG Normalpaket',hasNew:true,revealed:[newCard,duplicate]},
    {packId:'small',packName:'DOG Normalpaket',hasNew:false,revealed:[duplicate]}
   ]},
  {kind:'pack',id:'premium',quantity:1,label:'1× Premiumpaket',
   openedPacks:[{packId:'premium',packName:'DOG Premiumpaket',hasNew:false,revealed:[special]}]},
  {kind:'cash',quantity:1,label:'5,00 €',amountCents:500}
 ]);
 b.banker.hidden=true;
 b.emit('deal-game-state-change');await b.flush();
 await b.advance(700);
 assert.deepEqual(b.reels.map(r=>r.reel.dataset.phase),Array(6).fill('won'));
 assert.equal(b.summary.hidden,true,'all six prizes remain visible before summary');
 await b.advance(499);
 assert.equal(b.summary.hidden,true,'no premature card reveal');
 await b.advance(1);
 assert.equal(b.summary.hidden,false);
 assert.equal(b.summaryPrizes.children.length,6,'all six paid prizes are shown');
 assert.equal(b.summaryCardsPanel.hidden,false);
 assert.equal(b.summaryCards.children.length,4,'every card from all three packs is visible immediately');
 assert.deepEqual(b.summaryCards.children.map(c=>c.children[2].textContent),
  ['Drachenritter','Doppeltes Motiv','Doppeltes Motiv','Ritterburg']);
 assert.deepEqual(b.summaryCards.children.map(c=>c.children[1].textContent),
  ['🌟 NEU','DOPPELT','DOPPELT','DOPPELT']);
 assert.ok(b.summaryCards.children.every(c=>c.children[0].children[0].src.includes('Sammelalbum_Saison_2_Bilder')));
 assert.match(b.summaryCardsPanel.children[1].textContent,/1 neu · 3 doppelt/);
 assert.equal(b.requests.length,1,'the summary must use the settled receipt without additional API calls');
 b.summaryButton.click();
 assert.equal(b.root.hidden,true);
 assert.equal(b.store.get('monster-slots-watched:host:'+b.g.id),'yes');
});

test('duplicate-only packs still appear in the same summary without opening animations',async()=>{
 const duplicate={id:'dog2-002',name:'Vorhandene Karte',image:'DOG_02.png',rarity:'common',isNew:false};
 const b=browserFixture([
  {kind:'pack',id:'small',quantity:1,label:'1× Normalpaket',
   openedPacks:[{packId:'small',packName:'DOG Normalpaket',hasNew:false,revealed:[duplicate]}]},
  {kind:'joker',quantity:1,label:'1× Kofferblick-Joker'},
  {kind:'cash',quantity:1,label:'5,00 €',amountCents:500}
 ]);
 b.banker.hidden=true;
 b.emit('deal-game-state-change');await b.flush();
 await b.advance(2340);
 assert.equal(b.summary.hidden,false);
 assert.equal(b.summaryCards.children.length,1,'duplicates must not disappear from the overview');
 assert.equal(b.summaryCards.children[0].children[1].textContent,'DOPPELT');
 assert.equal(b.summaryPrizes.children.length,6);
 assert.equal(b.requests.length,1);
});

test('a tied finale never requests Monster Slots and a later unique winner can still claim',async()=>{
 const b=browserFixture();
 b.g.finalValues=[{id:'host',payout:1000000},{id:'guest',payout:1000000}];
 b.emit('deal-game-state-change');await b.flush();
 assert.equal(b.requests.length,0,'draw must not call the reward API');
 assert.equal(b.root.hidden,true,'draw must not open Slot machine');
 b.g.finalValues[1].payout=500000;
 b.emit('deal-game-state-change');await b.flush();
 assert.equal(b.requests.length,1,'unique highest payout still gets normal Slot reward flow');
});


test('podium UI allows only first and unique second to claim, with 6/2 visual reels',async()=>{
 const b=browserFixture();
 b.banker.hidden=true;
 b.window.person='quiet';b.emit('deal-game-state-change');await b.flush();
 assert.equal(b.requests.length,0,'third place cannot claim, even if the frontend receives a final event');
 assert.equal(b.root.hidden,true,'loser never sees any slot machine');
 b.window.person='guest';b.emit('spielonline-change');await b.flush();
 assert.equal(b.requests.length,1,'second place may claim exactly once');
 assert.equal(b.root.dataset.reels,'2');
 assert.equal(b.reels.filter(r=>r.reel.hidden===false).length,2);
 await b.advance(1100);
 assert.equal(b.summary.hidden,false,'both runner-up reels finish together before summary');
 assert.equal(b.summaryPrizes.children.length,2);
 b.summaryButton.click();
 assert.equal(b.store.get('monster-slots-watched:guest:'+b.g.id),'yes');
 b.window.person='host';b.emit('spielonline-change');await b.flush();
 assert.equal(b.requests.length,2);
 assert.equal(b.root.dataset.reels,'6');
 assert.equal(b.reels.filter(r=>r.reel.hidden===false).length,6);
 await b.advance(2340);
 assert.equal(b.summaryPrizes.children.length,6);
});

test('two-player loser never receives a runner-up spin, and tied second prizes are not duplicated',async()=>{
 const b=browserFixture();
 b.banker.hidden=true;
 b.g.finalValues=[{id:'host',payout:5000000},{id:'guest',payout:1000000}];
 b.window.person='guest';b.emit('deal-game-state-change');await b.flush();
 assert.equal(b.requests.length,0);
 b.window.person='host';b.emit('spielonline-change');await b.flush();
 assert.equal(b.requests.length,1);
 assert.equal(b.root.dataset.reels,'6');
 b.g.id='22222222-2222-4222-8222-222222222222';
 b.g.finalValues=[{id:'host',payout:5000000},{id:'guest',payout:2000000},{id:'quiet',payout:2000000},{id:'fourth',payout:1000000}];
 b.window.person='guest';b.emit('spielonline-change');await b.flush();
 assert.equal(b.requests.length,1,'two players tied for second receive no spin');
});


test('scheduled shared Slots open and spin together without resetting an existing spectator window',async()=>{
 const b=browserFixture();
 b.banker.hidden=true;
 b.window.person='quiet';
 const readyAt=b.now()+2200;
 b.g.monsterSlotShow={phase:'ready',turn:'runner',uid:'guest',reels:1,
  runnerUid:'guest',championUid:'host',activatedAt:b.now(),showAt:readyAt,startedAt:null,prizes:[]};
 b.emit('deal-game-state-change');await b.flush();
 assert.equal(b.root.hidden,false,'all viewers see the shared stage preparation');
 assert.equal(b.root.dataset.phase,'preparing','reels wait for the server showAt');
 assert.equal(b.accept.disabled,true,'cannot start before the synchronized opening');
 await b.advance(2199);
 assert.equal(b.root.dataset.phase,'preparing','cabinet must not enter ready before showAt');
 await b.advance(1);
 assert.equal(b.root.hidden,false,'all viewers open at the server-stamped moment');
 assert.equal(b.root.dataset.phase,'ready');
 const startAt=b.now()+3200;
 b.g.monsterSlotShow={...b.g.monsterSlotShow,phase:'rolling',startedAt:startAt,
  prizes:[{kind:'joker',quantity:1,label:'1× Joker'}]};
 b.emit('deal-game-state-change');await b.flush();
 assert.equal(b.root.dataset.phase,'countdown');
 assert.equal(b.reels[0].reel.dataset.phase,'ready','no premature reel movement');
 await b.advance(3199);
 assert.equal(b.reels[0].reel.dataset.phase,'ready');
 await b.advance(1);
 assert.equal(b.root.dataset.phase,'rolling');
 assert.equal(b.reels[0].reel.dataset.phase,'running');
 b.emit('deal-game-state-change');await b.flush();
 assert.equal(b.reels[0].reel.dataset.phase,'running','duplicate broadcast must not reset live spin');
 await b.advance(3000);
 assert.equal(b.reels[0].reel.dataset.phase,'won','reel must stop at same absolute time');
 assert.equal(b.requests.length,0,'spectators do not request or settle personal prizes');
});

test('spectator keeps the same card tiles after recovery becomes available, without duplicate payouts',async()=>{
 const card={id:'dog2-001',name:'Drachenritter',image:'DOG_01_11.png',
  rarity:'legendary',isNew:true};
 const packs=[0,1,2].map(i=>({kind:'pack',id:'small',
  label:'DOG Kartenpaket',quantity:1,openedPacks:[{packId:'small',
   packName:'DOG Normalpaket',revealed:[{...card,id:'dog2-'+i}]}]}));
 const b=browserFixture(packs);
 b.banker.hidden=true;
 b.g.monsterSlotShow={phase:'rolling',turn:'champion',uid:'host',reels:3,
  activatedAt:b.now(),startedAt:b.now()-12000,prizes:packs};
 b.window.person='quiet';
 b.emit('deal-game-state-change');await b.flush();
 assert.equal(b.summary.hidden,false);
 assert.equal(b.summaryCards.children.length,3);
 assert.equal(b.summaryButton.disabled,true);
 const firstTile=b.summaryCards.children[0];
 b.root.scrollTop=325;
 await b.advance(30100);
 assert.equal(b.summaryCards.children[0],firstTile,'recovery must not re-render card images');
 assert.equal(b.root.scrollTop,325,'the scroll position must survive spectator recovery');
 assert.equal(b.summaryButton.disabled,false,'a spectator can recover the room after 30 seconds');
 assert.match(b.summaryButton.textContent,/bestätigen/);
 assert.equal(b.requests.length,0,'no claim, spin or confirm should be sent by scrolling or waiting');
});

test('second-place winner is announced and confirmed before the champion gets a shared spin',async()=>{
 const b=browserFixture();
 b.banker.hidden=true;
 b.window.person='quiet';
 b.g.monsterSlotShow={phase:'ready',turn:'runner',uid:'guest',reels:1,
  runnerUid:'guest',championUid:'host',activatedAt:b.now(),showAt:b.now()+2200,
  startedAt:null,prizes:[]};
 b.emit('deal-game-state-change');await b.flush();
 assert.equal(b.root.dataset.phase,'preparing');
 assert.match(b.root.querySelector('.monster-slot-shared-caption').textContent,/PLATZ 2/);
 await b.advance(2200);
 assert.equal(b.root.dataset.phase,'ready');
 assert.equal(b.root.dataset.reels,'1','only one reel for second place');
 assert.equal(b.accept.disabled,true,'spectator cannot act for second place');
 b.window.person='guest';b.emit('spielonline-change');await b.flush();
 assert.equal(b.accept.disabled,false);
 b.accept.click();await b.flush();
 assert.equal(b.summary.hidden,false);
 assert.equal(b.summaryButton.disabled,false,'runner has a complete summary to confirm');
 b.summaryButton.click();await b.flush();
 assert.equal(b.g.monsterSlotShow.turn,'champion','winner follows the runner confirmation');
 // Mirror the new server's future opening time and runner acknowledgement.
 b.g.monsterSlotShow.showAt=b.now()+2200;
 b.g.monsterSlotShow.runnerConfirmedAt=b.now();
 b.window.person='quiet';b.emit('spielonline-change');await b.flush();
 assert.equal(b.root.dataset.phase,'preparing');
 assert.match(b.root.querySelector('.monster-slot-shared-caption').textContent,/PLATZ 1/);
 await b.advance(2200);
 assert.equal(b.root.dataset.phase,'ready');
 assert.equal(b.root.dataset.reels,'3','winner now receives three reels');
 assert.equal(b.accept.disabled,true,'spectator still cannot act for winner');
 b.window.person='host';b.emit('spielonline-change');await b.flush();
 assert.equal(b.accept.disabled,false);
});

test('mobile tab resumes the actual server-stage result without replaying delayed animation callbacks',async()=>{
 const b=browserFixture();
 b.banker.hidden=true;b.window.person='quiet';
 b.g.monsterSlotShow={phase:'rolling',turn:'champion',uid:'host',reels:3,
  runnerUid:'guest',championUid:'host',activatedAt:b.now(),startedAt:b.now()+3200,
  prizes:[{kind:'joker',quantity:1,label:'1× Joker'},
   {kind:'chest',id:'wood',quantity:1,label:'Holzkiste'},
   {kind:'cash',quantity:1,label:'100,00 €',amountCents:10000}]};
 b.emit('deal-game-state-change');await b.flush();
 assert.equal(b.root.dataset.phase,'countdown');
 assert.ok(b.reels.every(r=>r.reel.dataset.phase==='ready'));
 // Background throttling: simulated server time advances but JS timers do not.
 b.skipTimers(12000);
 b.emit('deal-game-state-change');await b.flush();
 assert.equal(b.root.dataset.phase,'summary','the returned tab must catch up immediately');
 assert.equal(b.summary.hidden,false);
 assert.ok(b.reels.slice(0,3).every(r=>r.reel.dataset.phase==='won'),'every legacy server-revealed reel is complete');
 assert.equal(b.summaryPrizes.children.length,3);
 b.root.scrollTop=250;
 // Delayed callbacks after returning must never restart spinning or reset scroll.
 await b.advance(0);
 assert.equal(b.root.dataset.phase,'summary');
 assert.equal(b.root.scrollTop,250);
 assert.equal(b.summary.hidden,false);
 assert.equal(b.requests.length,0,'reconciliation is local and must not consume Firestore writes');
});


test('modern shared finale reveals two runner-up prizes before six winner prizes',async()=>{
 const b=browserFixture();
 b.banker.hidden=true;
 b.g.monsterSlotShow={phase:'ready',turn:'runner',uid:'guest',reels:2,
  runnerUid:'guest',championUid:'host',activatedAt:b.now(),startedAt:null,prizes:[]};
 b.window.person='quiet';b.emit('deal-game-state-change');await b.flush();
 assert.equal(b.root.dataset.reels,'2');
 assert.equal(b.reels.filter(x=>!x.reel.hidden).length,2);
 assert.equal(b.accept.disabled,true,'spectator cannot spin for runner-up');
 b.window.person='guest';b.emit('spielonline-change');await b.flush();
 b.accept.click();await b.flush();
 assert.equal(b.requests[0].operation,'spin');
 assert.equal(b.summary.hidden,false,'both stopped prizes must appear in summary');
 assert.equal(b.summaryPrizes.children.length,2);
 b.summaryButton.click();await b.flush();
 assert.equal(b.g.monsterSlotShow.turn,'champion');
 assert.equal(b.g.monsterSlotShow.reels,6);
 b.window.person='quiet';b.emit('spielonline-change');await b.flush();
 assert.equal(b.root.dataset.reels,'6');
 assert.equal(b.reels.filter(x=>!x.reel.hidden).length,6);
 assert.equal(b.accept.disabled,true);
 b.window.person='host';b.emit('spielonline-change');await b.flush();
 b.accept.click();await b.flush();
 assert.equal(b.requests[2].operation,'spin');
 assert.equal(b.summaryPrizes.children.length,6,'all six server prizes are presented');
 assert.ok(b.reels.every(x=>x.reel.dataset.phase==='won'));
 b.summaryButton.click();await b.flush();
 assert.equal(b.g.monsterSlotShow.phase,'ceremony');
 assert.equal(b.requests.length,4,'exactly two spins and two confirmations');
});

test('legacy standalone 3/1 entitlement survives new six/two display code',()=>{
 const b=browserFixture();
 delete b.g.slotRewardVersion;
 const rank=b.window.dealSlotReelsFor;
 assert.equal(rank(b.g,'host'),3);
 assert.equal(rank(b.g,'guest'),1);
 assert.equal(rank(b.g,'quiet'),0);
 b.g.slotRewardVersion=3;
 assert.equal(rank(b.g,'host'),6);
 assert.equal(rank(b.g,'guest'),2);
});
