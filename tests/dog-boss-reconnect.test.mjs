import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

const read=file=>readFileSync(new URL('../'+file,import.meta.url),'utf8');
const spin=async()=>{for(let i=0;i<20;i++)await Promise.resolve()};
function simulate(file){
 let time=1_800_000_000_000,offlineGet=false,offlinePost=true,submit=null,canPlay=false;
 const calls=[],delays=[],storage=new Map(),elements=new Map(),listeners=new Map();
 let ticker=null;
 const startedAt=time-4000;
 const view={
  ok:true,gate:file==='dog-boss10.js'?10:20,
  phase:'fighting',isMember:true,eligible:true,
  startedAt,endsAt:startedAt+30000,serverNow:time,
  bossHp:12000,roster:[{uid:'hero-a'}],
  members:[{uid:'hero-a',name:'Held A',ready:true,reacted:false,eligible:true}],
  miniGames:{rounds:[
   {kind:'dodge',round:0,startMs:3000,endMs:10000,lanes:2},
   {kind:'math',round:1,startMs:10000,endMs:17000,question:'5 + 8 = ?',options:[13,12,14]},
   {kind:'target',round:2,startMs:17000,endMs:24000,lanes:3}
  ],myAnswers:{},completedBy:{}},
  participantCount:1,ready:['hero-a'],reactions:[]
 };
 function make(tag='div'){
  const callbacks={};
  return {tag,style:{width:'',setProperty(){}},hidden:false,disabled:false,
   textContent:'',className:'',href:'',children:[],handlers:callbacks,
   classList:{toggle(){},add(){},remove(){}},
   setAttribute(){},append(...xs){this.children.push(...xs)},
   replaceChildren(...xs){this.children=[...xs]},
   addEventListener(type,fn){callbacks[type]=fn}
  };
 }
 function el(id){if(!elements.has(id))elements.set(id,make(id));return elements.get(id);}
 const doc={hidden:false,getElementById:el,createElement:make,addEventListener(){}};
 const win={
  SPIELPORTAL_CONFIG:{apiBase:'https://test.invalid'},
  SpielOnline:{state:()=>({status:'online',
   user:{uid:'hero-a',getIdToken:async()=>'good-token'},
   profile:{setupComplete:true}})},
  DogBossMinigames:{create(_target,fn){submit=fn;return {update(_v,_time,allowed){canPlay=allowed}}}},
  DogBossCombatFX:{create(){return {update(){}}}},
  addEventListener(){},
  setInterval(fn,ms){assert.equal(ms,250);ticker=fn;return 1}
 };
 const fetchMock=async(url,options)=>{
  calls.push({url,method:options.method||'GET'});
  if(options.method==='POST'){
   if(offlinePost)throw Error('NETWORK_LOST');
   return {ok:true,json:async()=>({ok:true,view:{...view,serverNow:time},result:{correct:false}})};
  }
  if(offlineGet)throw Error('GET_NETWORK_LOST');
  return {ok:true,json:async()=>({...view,serverNow:time})};
 };
 const storageMock={
  getItem(k){return storage.get(k)||null},
  setItem(k,v){storage.set(k,String(v))},
  removeItem(k){storage.delete(k)}
 };
 class AbortMock{constructor(){this.signal={};this.abort=()=>{}}}
 const scope={
  window:win,document:doc,location:{search:'?room=123&gate=20'},
  URLSearchParams,localStorage:storageMock,AbortController:AbortMock,
  fetch:fetchMock,crypto:{randomUUID:()=>'123e4567-e89b-42d3-a456-426614174001'},
  Date:{now:()=>time},setTimeout(_fn,delay){delays.push(delay);return delays.length},
  clearTimeout(){},console
 };
 runInNewContext(read(file),scope);
 return {view,el,calls,delays,storage,spin,
  tick(ms){time+=ms;ticker();},
  submit(round,value){assert.ok(submit);submit(round,value)},
  failGet(value){offlineGet=value},
  allowPost(value){offlinePost=!value},
  canPlay(){return canPlay},
  refresh(){el('refresh').handlers.click()},
  now(){return time},
  getCount(){return calls.filter(x=>x.method==='GET').length},
  postCount(){return calls.filter(x=>x.method==='POST').length}
 };
}
for(const file of ['dog-boss10.js','dog-group-boss.js']){
 test(file+': disconnected round does not block the next minigame',async()=>{
  const h=simulate(file);
  await spin();
  assert.match(h.el('phase').textContent,/Kampf läuft/);
  assert.equal(h.canPlay(),true);
  h.submit(0,1);await spin();
  assert.equal(h.postCount(),1);
  assert.ok(h.delays.includes(4500),'minigame timeout must be shorter than a round');
  assert.equal(h.canPlay(),false,'pending response must block duplicate round actions');
  assert.equal(h.storage.size,1,'unconfirmed receipt must remain for replay');
  // Advance just beyond round one; the shared timer clears only the
  // expired minigame, and the second task can be sent immediately.
  h.tick(6300);await spin();
  assert.equal(h.storage.size,0,'stale minigame receipt should expire');
  assert.equal(h.canPlay(),true,'next round should be playable');
  h.submit(1,2);await spin();
  assert.equal(h.postCount(),2,'next round request was not blocked');
 });
 test(file+': a confirmed POST snapshot prevents an immediate redundant status GET',async()=>{
  const h=simulate(file);
  await spin();
  assert.equal(h.getCount(),1,'initial GET');
  h.allowPost(true);
  h.submit(0,1);
  await spin();
  assert.equal(h.postCount(),1);
  assert.equal(h.getCount(),1,'POST response already refreshed the full battle view');
  h.tick(1000);await spin();
  h.tick(1100);await spin();
  assert.equal(h.getCount(),1,'less than 3 seconds after the POST: no duplicate Firestore GET');
  h.tick(1100);await spin();
  assert.equal(h.getCount(),2,'normal status polling resumes after the 3-second throttle');
  h.refresh();await spin();
  assert.equal(h.getCount(),3,'manual forced refresh remains available');
 });
 test(file+': brief GET failure preserves encounter and throttles polling',async()=>{
  const h=simulate(file);await spin();
  const before=h.getCount();assert.equal(before,1);
  h.failGet(true);h.refresh();await spin();
  assert.match(h.el('phase').textContent,/Kampf läuft/,'keep prior verified boss view');
  assert.match(h.el('status').textContent,/Verbindung unterbrochen/);
  const after=h.getCount();assert.equal(after,before+1);
  for(let i=0;i<15;i++)h.tick(250);
  await spin();
  assert.ok(h.getCount()<=after+1,'failed GET must not trigger a 250-ms fetch storm');
 });
}

for(const file of ['dog-boss10.js','dog-group-boss.js']){
 test(file+': S-03 POST response replaces redundant immediate GET, but polling resumes',async()=>{
  const h=simulate(file);
  await spin();
  assert.equal(h.getCount(),1);
  h.allowPost(true);
  h.tick(2000);await spin();
  assert.equal(h.getCount(),1,'the pre-action refresh throttle still applies');
  h.submit(0,1);await spin();
  assert.equal(h.postCount(),1,'the minigame action is sent once');
  const afterPost=h.getCount();
  h.tick(1500);await spin();
  assert.equal(h.getCount(),afterPost,
   'already-current POST snapshot prevents an unnecessary GET');
  h.tick(2200);await spin();
  assert.equal(h.getCount(),afterPost+1,
   'regular fresh status GET still runs after the safety interval');
  h.refresh();await spin();
  assert.equal(h.getCount(),afterPost+2,
   'manual forced refresh remains possible immediately');
 });
}

test('Boss 10 and group bosses reconcile the shared opening sooner without excess idle reads',()=>{
 for(const arena of ['dog-boss10.js','dog-group-boss.js']){
  const source=readFileSync(new URL('../'+arena,import.meta.url),'utf8');
  for(const feature of [
   'readyBurstUntil=Date.now()+6000',
   "const delay=exchangeWindow?(extendedScene?2800:850):dodgeActive?850:openingFight?1200:",
   'const extendedScene=exchangeWindow&&view?.miniGames?.version>=7',
   "view?.phase==='fighting'?2800",
   "view.miniGames.rounds.some((r,i)=>",
   'const windowEnd=next?.startMs??(view.endsAt-view.startedAt)',
   "view?.miniGames?.version>=3",
   "void reload(exchangeWindow===true)",
   'waitingReady&&Date.now()<readyBurstUntil?900',
   'waitingReady?3800:15000',
   'now()<(view.startedAt||0)+5000',
   'if(document.hidden)return'
  ])assert.ok(source.includes(feature),arena+' missing '+feature);
 }
 // Old: up to 9 reads during each 12s burst; new: 7 reads/6s burst.
 assert.ok(Math.ceil(6000/900)<Math.ceil(12000/1400));
});
