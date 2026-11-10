import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

const source=readFileSync(new URL('../js/moin-autoplay.js',import.meta.url),'utf8');

function harness({name='David',uid='david',pictures=39,oldEndpoint=false}={}){
 const calls=[],storage=new Map(),events=new Map(),documentEvents=new Map(),timers=new Map();
 const buttonEvents=new Map();
 const button={
  hidden:false,disabled:false,attributes:{},classList:{toggle(){}},
  addEventListener:(type,fn)=>buttonEvents.set(type,fn),
  setAttribute(key,value){this.attributes[key]=value}
 };
 let playerUid=uid,playerName=name,best=pictures,timerId=0;
 const document={
  hidden:false,
  createElement:()=>button,
  getElementById:id=>id==='studio-refresh'?{parentElement:{},insertAdjacentElement(){}}:null,
  querySelector:()=>null,
  addEventListener:(event,fn)=>documentEvents.set(event,fn),
  body:{append(){}}
 };
 const window={
  SPIELPORTAL_CONFIG:{apiBase:'https://example.invalid'},
  SpielOnline:{openLogin:()=>calls.push({kind:'login'})},
  addEventListener:(event,fn)=>events.set(event,fn)
 };
 const sandbox={window,document,localStorage:{
  getItem:key=>storage.has(key)?storage.get(key):null,
  setItem:(key,value)=>storage.set(key,value)
 },g:{id:'game-1',revision:1,phase:'open',players:[{id:uid,name}],caseCount:4,values:[1,2,3,4],opened:[]},
 busy:false,lastError:'',
 user:()=>playerUid?{uid:playerUid,getIdToken:async()=> 'token-'+playerUid}:null,
 myId:()=>playerUid,turn:()=>playerUid,free:i=>i!==0,
 action:async(type,values)=>calls.push({kind:'game-action',type,...values}),
 fetch:async(url)=>{
  calls.push({kind:'fetch',url});
  if(url.includes('/unlocks'))return {ok:true,status:200,json:async()=>oldEndpoint?{ok:true,kniffelChristmasDice:best>=20}:{ok:true,dealAutoplay:best>=40}};
  if(url.includes('/me'))return {ok:true,status:200,json:async()=>({ok:true,state:{completed:0,maxRewarded:best}})};
  throw Error('Unexpected URL '+url);
 },
 setTimeout:(fn,ms)=>{const id=++timerId;timers.set(id,{fn,ms});return id},
 clearTimeout:id=>timers.delete(id),
 setInterval:()=>1,
 console
 };
 runInNewContext(source,sandbox);
 return {
  button,calls,storage,sandbox,
  setPictures:n=>{best=n},
  click:()=>buttonEvents.get('click')(),
  tick:async()=>{
   for(const [id,t] of [...timers]){timers.delete(id);await t.fn()}
  },
  event:type=>events.get(type)?.(),
  changeProfile:(nextUid,nextName)=>{
   playerUid=nextUid;playerName=nextName;
   sandbox.g.players=[{id:nextUid,name:nextName}];
   events.get('spielonline-change')?.();
  }
 };
}
const flush=async()=>{for(let i=0;i<8;i++)await Promise.resolve()};

test('picture 39 locks autoplay, picture 40 enables manual opt-in and one legal case opening',async()=>{
 const h=harness();
 await flush();
 assert.match(h.button.textContent,/Autoplay · Bild 40/);
 assert.equal(h.button.attributes['aria-pressed'],'false');
 assert.equal(h.calls.filter(x=>x.kind==='fetch').length,1);
 h.click();await flush();
 assert.match(h.button.textContent,/Autoplay · Bild 40/);
 h.setPictures(40);
 h.click();await flush();
 assert.equal(h.button.textContent,'▶ Autoplay AUS','reward is not enabled without player consent');
 h.click();
 assert.equal(h.button.textContent,'⏸ Autoplay AN');
 await h.tick();
 const opens=h.calls.filter(x=>x.kind==='game-action');
 assert.equal(opens.length,1);
 assert.equal(opens[0].type,'open');
 assert.ok([1,2,3].includes(opens[0].case));
 assert.equal(h.storage.get('deal-autoplay-open:david'),'true');
});

test('autoplay permission and settings do not bleed between player accounts',async()=>{
 const h=harness({pictures:40});
 await flush();h.click();
 assert.equal(h.button.textContent,'⏸ Autoplay AN');
 h.setPictures(12);
 h.changeProfile('other','Other');
 await flush();
 assert.match(h.button.textContent,/Autoplay · Bild 40/);
 assert.equal(h.button.attributes['aria-pressed'],'false');
 await h.tick();
 assert.equal(h.calls.filter(x=>x.kind==='game-action').length,0);
 h.setPictures(40);
 h.changeProfile('david','David');
 await flush();
 assert.equal(h.button.textContent,'⏸ Autoplay AN','the original account retains its own choice');
});

test('older server fallback checks authenticated maxRewarded after image reset',async()=>{
 const h=harness({pictures:40,oldEndpoint:true});
 await flush();
 assert.equal(h.button.textContent,'▶ Autoplay AUS');
 assert.equal(h.calls.filter(x=>x.kind==='fetch').length,2);
});

test('existing Moin and Vanessa autoplay exceptions keep their previous settings',async()=>{
 for(const name of ['moin','Vanessa']){
  const h=harness({name,pictures:0});
  await flush();
  assert.equal(h.button.textContent,'▶ Autoplay AUS');
  assert.equal(h.calls.filter(x=>x.kind==='fetch').length,0);
 }
});
