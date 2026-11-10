import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {runInNewContext,Script} from 'node:vm';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const read=name=>readFileSync(resolve(root,name),'utf8');
const source=read('dog-boss-ui.js');
const spin=async()=>{for(let i=0;i<18;i++)await Promise.resolve()};
const basic=({now=1_800_000_000_000,phase='ready',joined=true}={})=>({
 ok:true,gate:1,boss:'Der Aschewächter',bossHp:6000,bossMaxHp:6000,
 phase,serverNow:now,updatedAt:now,cooldownUntil:phase==='cooldown'?now+600000:0,
 cooldownRemainingMs:phase==='cooldown'?600000:0,attempt:1,
 isMember:joined,canJoin:true,canFight:joined&&phase==='ready',
 members:joined?[{uid:'A',name:'Helden A'}]:[],
 heroes:joined?{A:{hp:104,maxHp:104,guard:false}}:{},
 log:[]
});
function harness(options={}){
 let clock=options.now||1_800_000_000_000;
 let activeUid=options.uid||'A';
 let server=options.view||basic({now:clock});
 let blockStorage=false,postMode='normal',pendingResolve;
 const nodes=new Map(),links=new Map(),calls=[],events=new Map(),timers=new Map(),intervals=new Map(),storage=new Map();
 let seq=0;
 const moveButtons=['attack','power','guard','special'].map(move=>{
  const e=element('button');e.dataset.move=move;return e;
 });
 function element(tag='div'){
  const cls=new Set(),handlers={};
  return {tag,className:'',textContent:'',disabled:false,hidden:false,href:'',
   open:false,dataset:{},handlers,children:[],attributes:{},offsetWidth:100,
   style:{width:''},
   classList:{
    contains:k=>cls.has(k),add:k=>cls.add(k),remove:k=>cls.delete(k),
    toggle:(k,on)=>{if(on)cls.add(k);else cls.delete(k);}
   },
   setAttribute(k,v){this.attributes[k]=String(v);},
   getAttribute(k){return this.attributes[k]??this.href;},
   addEventListener(k,cb){handlers[k]=cb;},
   replaceChildren(...children){this.children=[...children];},
   append(...children){this.children.push(...children);}
  };
 }
 function el(id){
  if(!nodes.has(id))nodes.set(id,element(id));
  return nodes.get(id);
 }
 for(const [id,path] of [
  ['boss-back','./dog-expedition.html'],['boss-forge-link','./dog-forge.html'],
  ['boss-defeat-forge','./dog-forge.html'],['boss-victory-back','./dog-expedition.html']]){
  const n=el(id);n.href=path;n.attributes.href=path;links.set(id,n);
 }
 const on=(name,fn)=>{const handlers=events.get(name)||[];handlers.push(fn);events.set(name,handlers)};
 const doc={
  hidden:false,getElementById:el,createElement:element,
  querySelectorAll(q){return q==='[data-move]'?moveButtons:[];},
  addEventListener:on
 };
 const win={
  SPIELPORTAL_CONFIG:{apiBase:'https://tests.invalid'},
  SpielOnline:{state(){return activeUid?{status:'online',
   user:{uid:activeUid,getIdToken:async()=>activeUid},
   profile:{name:'Held '+activeUid,setupComplete:true}}:null;}},
  addEventListener:on
 };
 class AbortCtrl{
  constructor(){const cbs=[];this.signal={aborted:false,
   addEventListener(name,cb){if(name==='abort')cbs.push(cb)}};
   this.abort=()=>{this.signal.aborted=true;for(const cb of cbs)cb()};
  }
 }
 const storageApi={
  getItem(key){return storage.get(key)||null},
  setItem(key,value){if(blockStorage)throw Error('STORAGE_DENIED');storage.set(key,String(value))},
  removeItem(key){storage.delete(key)}
 };
 const network=async(url,req)=>{
  const method=req.method,route=url.split('/').at(-1);
  const call={url,method,route,uid:req.headers.Authorization.replace('Bearer ',''),req};
  calls.push(call);
  if(method==='GET')return {ok:true,json:async()=>({...server,serverNow:clock})};
  if(postMode==='blocked')return new Promise((_,reject)=>req.signal.addEventListener('abort',()=>reject(Error('AbortError'))));
  if(postMode==='delayed')return new Promise(resolve=>{pendingResolve=payload=>resolve({ok:true,json:async()=>payload})});
  if(postMode==='error')return {ok:false,json:async()=>({error:'BOSS_COOLDOWN_ACTIVE'})};
  if(postMode==='stale')return {ok:false,json:async()=>({error:'BOSS_STATE_STALE'})};
  const payload=route==='join'?{...server,isMember:true,members:[{uid:'A',name:'Helden A'}],
    result:{type:'join'},replayed:false}:route==='reaction-start'?{
    ...server,reactionChallenge:{turn:server.bossTurn||0,attempt:server.attempt,
     startAt:clock,targetAt:clock+1700,expiresAt:clock+3000},
    reactionRules:{durationMs:3000,targetMs:1700,maxBonusPct:10},
    result:{type:'reaction-start'},replayed:false
   }:route==='restart'?
    {...server,phase:'ready',bossHp:6000,cooldownUntil:0,attempt:server.attempt+1,
    result:{type:'restart'},replayed:false}:{
    ...server,phase:'fighting',bossHp:5500,bossTurn:(server.bossTurn||0)+1,
    reactionChallenge:null,
    result:{type:'combat',damage:500,retaliation:12,
     ...(JSON.parse(req.body)?.move==='reaction'?
      {reactionGrade:'perfekt',reactionBonusPct:10}:{})},
    replayed:postMode==='replay'};
  server=payload;
  return {ok:true,json:async()=>({...payload,serverNow:clock})};
 };
 const context={window:win,document:doc,location:{search:'?room=123'},
  URLSearchParams,Date:{now:()=>clock},AbortController:AbortCtrl,
  localStorage:storageApi,fetch:network,
  crypto:{randomUUID:()=>'123e4567-e89b-42d3-a456-426614174001'},
  setTimeout(fn,ms){const id=++seq;timers.set(id,{fn,ms});return id},
  clearTimeout(id){timers.delete(id)},
  setInterval(fn,ms){intervals.set(ms,fn);return ms},
  clearInterval(ms){intervals.delete(ms)}
 };
 runInNewContext(source,context);
 const emit=name=>{for(const cb of events.get(name)||[])cb()};
 const click=e=>{const n=typeof e==='string'?el(e):e;
  assert.equal(typeof n.handlers.click,'function','missing click handler for '+e);
  n.handlers.click();
 };
 return {el,links,moveButtons,calls,emit,click,storage,timers,intervals,
  get:()=>calls.filter(x=>x.method==='GET'),posts:()=>calls.filter(x=>x.method==='POST'),
  setTime(n){clock=n},advance(ms){clock+=ms},setServer(v){server=v},
  account(uid){activeUid=uid;emit('spielonline-change')},
  blockStorage(v){blockStorage=v},mode(v){postMode=v},
  finishPost(payload){assert.ok(pendingResolve,'waiting POST');pendingResolve(payload)},
  getClock(){return clock},context
 };
}
test('Boss page uses dedicated independent scripts and original illustration',()=>{
 const html=read('dog-boss.html'),css=read('dog-boss.css');
 assert.ok(html.includes('dog-boss-ui.js?v=20261110-boss-v4'));
 assert.ok(html.includes('dog-boss.css?v=20261110-boss-v4'));
 assert.ok(html.includes('./dog-boss-art/aschewaechter.svg'));
 assert.ok(read('dog-boss-art/aschewaechter.svg').startsWith('<svg'));
 assert.ok(css.includes('.boss-defeat-panel'));
 assert.ok(css.includes('.boss-countdown'));
 assert.ok(css.includes('@media(prefers-reduced-motion:reduce)'));
 assert.ok(css.includes('[hidden]'));
 assert.doesNotThrow(()=>new Script(source));
});
test('Boss gate navigation retains existing room across forge and expedition',async()=>{
 const h=harness();await spin();
 assert.equal(h.el('boss-back').href,'./dog-expedition.html?room=123');
 assert.equal(h.el('boss-forge-link').href,'./dog-forge.html?room=123');
 assert.equal(h.el('boss-defeat-forge').href,'./dog-forge.html?room=123');
 assert.equal(h.el('boss-victory-back').href,'./dog-expedition.html?room=123');
 const expedition=read('dog-materials-ui.js'),forge=read('dog-forge-ui.js');
 assert.ok(expedition.includes("['boss-launch','boss-from-storage']"));
 assert.ok(forge.includes("if($('forge-boss'))$('forge-boss').href"));
});
test('Shared 10-minute cooldown is calculated locally from the server timestamp',async()=>{
 const initial=1_800_000_000_000,h=harness({now:initial,
  view:basic({now:initial,phase:'cooldown'})});
 await spin();
 assert.equal(h.el('boss-defeat-panel').hidden,false);
 assert.equal(h.el('boss-countdown').textContent,'10:00');
 assert.equal(h.el('boss-restart').hidden,true);
 assert.ok(h.moveButtons.every(x=>x.disabled));
 h.advance(3*60000+1000);
 h.intervals.get(1000)();
 assert.equal(h.el('boss-countdown').textContent,'06:59');
 assert.equal(h.get().length,1,'countdown triggers no server reads');
 h.advance(7*60000);
 h.intervals.get(1000)();
 assert.equal(h.el('boss-countdown').textContent,'00:00');
 assert.equal(h.el('boss-restart').hidden,false);
 assert.equal(h.el('boss-restart').disabled,false);
 assert.equal(h.get().length,1);
});
test('Defeat never resets itself; restart is sent only after explicit click',async()=>{
 const now=1_800_000_000_000,h=harness({
  now,view:basic({now,phase:'cooldown'})
 });
 await spin();h.advance(600001);h.intervals.get(1000)();
 assert.equal(h.posts().length,0);
 h.click('boss-restart');await spin();
 assert.equal(h.posts().length,1);
 assert.equal(h.posts()[0].route,'restart');
 assert.equal(h.el('boss-defeat-panel').hidden,true);
 assert.equal(h.el('boss-attempt').textContent,'2');
 assert.equal(h.el('boss-hp-text').textContent,'6.000 / 6.000 LP');
});
test('A pending request ID must be saved before any damage is submitted',async()=>{
 const h=harness();await spin();h.blockStorage(true);
 h.click(h.moveButtons[0]);await spin();
 assert.equal(h.posts().length,0);
 assert.match(h.el('boss-status').textContent,/nicht gespeichert/);
});
test('One original combat action can be safely replayed after a timeout',async()=>{
 const h=harness();await spin();
 h.mode('blocked');h.click(h.moveButtons[0]);await spin();
 assert.equal(h.posts().length,1);
 const original=JSON.parse(h.storage.get('dog:boss:pending:A'));
 assert.ok(original.id.startsWith('boss-'));
 const timeout=[...h.timers.values()].find(x=>x.ms===20000);
 assert.ok(timeout,'20-second request timeout exists');
 timeout.fn();await spin();
 assert.equal(h.el('boss-pending-wrap').hidden,false);
 assert.equal(h.storage.has('dog:boss:pending:A'),true);
 h.mode('replay');h.click('boss-retry');await spin();
 assert.equal(h.posts().length,2);
 assert.equal(JSON.parse(h.posts()[1].req.body).requestId,original.id);
 assert.equal(h.storage.has('dog:boss:pending:A'),false);
});
test('The battle refresh interval avoids Firebase reads every second',async()=>{
 const h=harness();await spin();
 assert.equal(h.get().length,1);
 assert.equal(h.intervals.has(1000),true);
 assert.equal(h.intervals.has(60000),true);
 for(let i=0;i<10;i++)h.intervals.get(1000)();
 assert.equal(h.get().length,1);
 h.advance(60001);h.intervals.get(60000)();await spin();
 assert.equal(h.get().length,2);
});

test('Boss phases and warning are displayed only from authoritative server data',async()=>{
 const now=1_800_000_000_000;
 const stage2={...basic({now,phase:'fighting'}),bossHp:2890,
  bossPhase:2,bossPhaseName:'Die Glut erwacht',bossCharged:true,
  bossTelegraph:'⚠️ Achtung: Eine Flammenexplosion trifft den nächsten handelnden Helden!'};
 const h=harness({now,view:stage2});
 await spin();
 assert.equal(h.el('boss-phase-label').textContent,'PHASE 2 VON 3');
 assert.equal(h.el('boss-phase-name').textContent,'Die Glut erwacht');
 assert.match(h.el('boss-telegraph').textContent,/Flammenexplosion/);
 assert.equal(h.el('boss-telegraph').classList.contains('is-warning'),true);
 assert.equal(h.el('boss-art-stage').classList.contains('boss-charging'),true);
 assert.equal(h.el('boss-art-stage').dataset.phase,'2');
 assert.equal(h.el('boss-hp-text').textContent,'2.890 / 6.000 LP');
 assert.equal(h.get().length,1,'phase warning uses existing GET, not extra reads');
});
test('Inferno and defeated phase show different visuals without a false warning',async()=>{
 const now=1_800_000_000_000;
 const h=harness({now,view:{...basic({now,phase:'fighting'}),bossPhase:3,bossHp:1350,
  bossPhaseName:'Das letzte Inferno',bossCharged:false,
  bossTelegraph:'🔥 Das Inferno tobt!'}});
 await spin();
 assert.equal(h.el('boss-phase-label').textContent,'PHASE 3 VON 3');
 assert.equal(h.el('boss-monster').classList.contains('boss-monster-inferno'),true);
 assert.equal(h.el('boss-telegraph').classList.contains('is-warning'),false);
 assert.match(h.el('boss-tactical-tip').textContent,/Gegenschläge/);
 const cooldown={...basic({now,phase:'cooldown'}),bossPhase:3,bossHp:1300,
  bossPhaseName:'Das letzte Inferno',bossCharged:false,
  bossTelegraph:'💀 Der nächste Kampf ist gesperrt.'};
 h.setServer(cooldown);h.click('boss-refresh');await spin();
 assert.equal(h.el('boss-defeat-panel').hidden,false);
 assert.equal(h.el('boss-art-stage').classList.contains('boss-charging'),false);
 assert.ok(h.moveButtons.every(b=>b.disabled));
});
test('Boss phase UI is responsive and accessible when animations are reduced',()=>{
 const html=read('dog-boss.html'),css=read('dog-boss.css');
 for(const id of ['boss-phase-status','boss-phase-label','boss-phase-name',
  'boss-telegraph','boss-tactical-tip','boss-art-stage'])
  assert.ok(html.includes('id="'+id+'"'),id);
 assert.ok(html.includes('aria-live="polite"'));
 assert.ok(css.includes('.boss-phase-ruler'));
 assert.ok(css.includes('.boss-telegraph.is-warning'));
 assert.ok(css.includes('@media(prefers-reduced-motion:reduce)'));
 assert.ok(source.includes("view?.bossCharged&&view?.phase==='fighting'"));
 assert.ok(source.includes('bossPhase=Math.min(3'));
 assert.ok(source.includes("payload.result?.chargedAttack"));
});

test('Multiplayer attacks send the observed boss turn in their replayable receipt',async()=>{
 const now=1_800_000_000_000;
 const h=harness({now,view:{...basic({now,phase:'fighting'}),bossTurn:7}});
 await spin();h.click(h.moveButtons[0]);await spin();
 assert.equal(h.posts().length,1);
 const payload=JSON.parse(h.posts()[0].req.body);
 assert.equal(payload.expectedTurn,7);
 const saved=JSON.parse(h.storage.get('dog:boss:pending:A')||'null');
 assert.equal(saved,null,'completed request clears pending turn receipt');
});
test('Stale multiplayer hit is rejected locally and the next phase warning is fetched',async()=>{
 const now=1_800_000_000_000;
 const h=harness({now,view:{...basic({now,phase:'fighting'}),bossTurn:0}});
 await spin();
 h.setServer({...basic({now,phase:'fighting'}),bossTurn:1,bossHp:2700,
  bossPhase:2,bossCharged:true,bossPhaseName:'Die Glut erwacht',
  bossTelegraph:'⚠️ Flammenexplosion: Der nächste Held sollte verteidigen!'});
 h.mode('stale');h.click(h.moveButtons[0]);
 for(let n=0;n<8;n++){await spin();
  if(h.el('boss-phase-label').textContent==='PHASE 2 VON 3')break;
 }
 assert.equal(h.posts().length,1);
 assert.equal(JSON.parse(h.posts()[0].req.body).expectedTurn,0);
 assert.equal(h.storage.has('dog:boss:pending:A'),false);
 assert.equal(h.get().length,2,'re-fetch the new warning once after a stale hit');
 assert.equal(h.el('boss-phase-label').textContent,'PHASE 2 VON 3');
 assert.equal(h.el('boss-telegraph').classList.contains('is-warning'),true);
 h.mode('normal');h.click(h.moveButtons[2]);await spin();
 assert.equal(JSON.parse(h.posts()[1].req.body).expectedTurn,1);
});

test('Loss window shows exact server-calculated reason and concrete forge improvements',async()=>{
 const now=1_800_000_000_000;
 const report={category:'attack',title:'⚔️ Eure Angriffskraft reicht noch nicht',
  summary:'Ihr habt 1.200 von 6.000 Boss-LP abgezogen (20 %). 4.800 LP blieben übrig.',
  recommendation:'Verbessert vor allem Waffen, Angriffskraft und Zerstörung in der Schmiede.',
  bossDamage:1200,bossRemaining:4800,bossProgressPct:20,teamActions:6,
  averageDamage:200,estimatedMoreActions:24};
 const h=harness({now,view:{...basic({now,phase:'cooldown'}),
  bossHp:4800,defeatAnalysis:report}});
 await spin();
 assert.equal(h.el('boss-defeat-analysis').hidden,false);
 assert.equal(h.el('boss-defeat-analysis').dataset.reason,'attack');
 assert.match(h.el('boss-analysis-title').textContent,/Angriffskraft/);
 assert.match(h.el('boss-analysis-summary').textContent,/1.200 von 6.000/);
 assert.equal(h.el('boss-analysis-fill').style.width,'20%');
 assert.equal(h.el('boss-analysis-track').attributes['aria-valuenow'],'20');
 assert.match(h.el('boss-analysis-metrics').textContent,/24 weitere Aktionen/);
 assert.match(h.el('boss-analysis-advice').textContent,/Waffen/);
 assert.equal(h.get().length,1,'report reuses existing battle data, no extra request');
});
test('Defense diagnosis survives page refresh and disappears after retry',async()=>{
 const now=1_800_000_000_000;
 const report={category:'defense',title:'🛡️ Eure Abwehr muss länger durchhalten',
  summary:'Ihr habt 5.700 von 6.000 Boss-LP abgezogen (95 %). 300 LP blieben übrig.',
  recommendation:'Verbessert Rüstung, Vitalität und Widerstandskraft.',
  bossProgressPct:95,teamActions:10,averageDamage:570,estimatedMoreActions:1};
 const h=harness({now,view:{...basic({now,phase:'cooldown'}),
  bossHp:300,defeatAnalysis:report}});
 await spin();
 assert.equal(h.el('boss-defeat-analysis').dataset.reason,'defense');
 assert.match(h.el('boss-analysis-advice').textContent,/Rüstung/);
 h.click('boss-refresh');await spin();
 assert.equal(h.el('boss-analysis-fill').style.width,'95%');
 assert.equal(h.el('boss-defeat-analysis').hidden,false);
 h.advance(600001);h.intervals.get(1000)();
 h.click('boss-restart');await spin();
 assert.equal(h.el('boss-defeat-panel').hidden,true);
 assert.equal(h.el('boss-defeat-analysis').hidden,true);
});
test('Old defeats without a recorded diagnosis do not display guessed advice',async()=>{
 const now=1_800_000_000_000;
 const h=harness({now,view:basic({now,phase:'cooldown'})});
 await spin();
 assert.equal(h.el('boss-defeat-analysis').hidden,true);
 assert.equal(h.el('boss-defeat-panel').hidden,false);
});
test('Analysis panel remains accessible and compact on small screens',()=>{
 const html=read('dog-boss.html'),css=read('dog-boss.css');
 for(const id of ['boss-defeat-analysis','boss-analysis-title','boss-analysis-summary',
  'boss-analysis-track','boss-analysis-fill','boss-analysis-metrics','boss-analysis-advice']){
  assert.ok(html.includes('id="'+id+'"'),id);
 }
 assert.ok(html.includes('aria-label="Auswertung des verlorenen Bosskampfs"'));
 assert.ok(css.includes('.boss-defeat-analysis[data-reason="defense"]'));
 assert.ok(css.includes('overflow-y:auto'));
 assert.ok(css.includes('@media(max-width:560px)'));
 assert.ok(source.includes("defeat?view.defeatAnalysis:null"));
});

test('Reaction button opens a 3-second server-issued timing challenge, not an instant attack',async()=>{
 const h=harness();await spin();
 assert.equal(h.el('boss-reaction-start').disabled,false);
 h.click('boss-reaction-start');await spin();
 assert.equal(h.posts().length,1);
 assert.equal(h.posts()[0].route,'reaction-start');
 assert.equal(h.el('boss-reaction-challenge').hidden,false);
 assert.equal(h.el('boss-reaction-time').textContent,'3,0 s');
 assert.ok(h.moveButtons.every(b=>b.disabled),'other attacks disabled during timing');
 h.advance(1700);h.intervals.get(50)();
 assert.equal(h.el('boss-reaction-pointer').style.left,'56.7%');
 assert.match(h.el('boss-reaction-message').textContent,/GOLDENE TREFFERZONE/);
 h.click('boss-reaction-hit');await spin();
 assert.equal(h.posts().length,2);
 assert.equal(h.posts()[1].route,'act');
 assert.equal(JSON.parse(h.posts()[1].req.body).move,'reaction');
 assert.equal(JSON.parse(h.posts()[1].req.body).expectedTurn,0);
 assert.equal(h.el('boss-reaction-challenge').hidden,true);
 assert.match(h.el('boss-status').textContent,/\+10 %/);
});
test('Reaction window expires after 3 seconds without auto-attacking or resetting the ticket',async()=>{
 const h=harness();await spin();
 h.click('boss-reaction-start');await spin();
 h.advance(3001);h.intervals.get(50)();
 assert.equal(h.el('boss-reaction-challenge').hidden,true);
 assert.equal(h.posts().length,1,'an expired challenge never sends a combat action');
 assert.equal(h.el('boss-reaction-start').disabled,true);
 assert.equal(h.moveButtons[0].disabled,false,'ordinary equipment attack remains possible');
});
test('Reaction timing challenge can be resumed without extra writes but cancels when app hides',async()=>{
 const h=harness();await spin();
 h.click('boss-reaction-start');await spin();
 h.click('boss-reaction-dismiss');
 assert.equal(h.el('boss-reaction-challenge').hidden,true);
 h.advance(400);
 h.click('boss-reaction-start');
 assert.equal(h.posts().length,1,'same server-issued challenge is reused');
 assert.equal(h.el('boss-reaction-challenge').hidden,false);
 h.doc.hidden=true;h.emit('visibilitychange');
 assert.equal(h.el('boss-reaction-challenge').hidden,true);
 assert.equal(h.posts().length,1);
});
test('Reaction UI has mobile-size tap controls, feedback and safe receipt replay support',()=>{
 const html=read('dog-boss.html'),css=read('dog-boss.css');
 for(const id of ['boss-reaction-start','boss-reaction-heading','boss-reaction-challenge',
  'boss-reaction-pointer','boss-reaction-perfect','boss-reaction-time',
  'boss-reaction-hit','boss-reaction-dismiss','boss-reaction-message']){
  assert.ok(html.includes('id="'+id+'"')||html.includes('class="'+id+'"'),id);
 }
 assert.ok(css.includes('#boss-reaction-hit{width:100%;min-height:67px'));
 assert.ok(css.includes('@media(max-width:640px)'));
 assert.ok(css.includes('[hidden]{display:none!important}'));
 assert.ok(source.includes("'reaction-start'"));
 assert.ok(source.includes("'reaction'"));
 assert.ok(source.includes('setInterval(reactionTick,50)'));
});
