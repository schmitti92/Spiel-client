import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const source=readFileSync(new URL('../DOG/christmas-intro-gate.js',import.meta.url),'utf8');
const app=readFileSync(new URL('../DOG/app.js',import.meta.url),'utf8');
const begin=source.indexOf('export function mountChristmasLinks(){');
const end=source.indexOf('export function guardChristmasEventPage(){',begin);
assert.ok(begin>=0&&end>begin,'load the live eligibility gate function');

async function rig({victory=false,reply=null,delayedInitial=false}={}){
 let now=1000000,uid='vanessa',calls=0,shown=0,resolveInitial=null;
 const windows={},docs={},dialog={open:true,handlers:{},addEventListener(name,fn){this.handlers[name]=fn;},
  close(){this.open=false;this.handlers.close?.();}};
 const context={
  window:{addEventListener:(name,fn)=>{windows[name]=fn;}},
  document:{
   getElementById:id=>victory&&id==='winner'?dialog:null,
   documentElement:{classList:{remove(){},toggle(){}} },
   addEventListener:(name,fn)=>{docs[name]=fn;},
   hidden:false
  },
  profile:()=>({user:{uid}}),
  api:async()=>{
   calls++;
   if(delayedInitial&&calls===1)
    return new Promise(resolve=>{resolveInitial=resolve});
   return reply||{eligible:false,completed:false,introReady:false};
  },
  introVisible:false,
  showChristmasIntro:()=>{shown++;context.introVisible=true},
  Date:{now:()=>now},
  setTimeout(){},queueMicrotask,
  console
 };
 vm.runInNewContext(source.slice(begin,end).replace('export function','function')+
  '\nthis.__mountChristmasLinks=mountChristmasLinks;',context);
 context.__mountChristmasLinks();
 const tick=async()=>{for(let i=0;i<5;i++)await Promise.resolve();};
 await tick();
 return {windows,docs,dialog,clock:ms=>{now+=ms;},calls:()=>calls,shown:()=>shown,
  releaseInitial:value=>resolveInitial?.(value),
  switchUid:id=>{uid=id},tick};
}

test('DOG focus after 20 seconds does not generate another intro Firebase read',async()=>{
 const h=await rig();
 assert.equal(h.calls(),1,'the first server-backed eligibility query must run');
 h.clock(21000);h.windows.focus();await h.tick();
 assert.equal(h.calls(),1,'old 20-second focus check is eliminated');
 h.clock(98000);h.docs.visibilitychange();await h.tick();
 assert.equal(h.calls(),1,'under two minutes still reuse verified status');
 h.clock(2000);h.windows.focus();await h.tick();
 assert.equal(h.calls(),2,'a later deliberate return can refresh entitlement');
});

test('verified DOG victory and a changed signed-in account force refresh immediately',async()=>{
 const h=await rig();
 h.clock(500);
 h.windows['dog-match-finished']();await h.tick();
 assert.equal(h.calls(),2,'a real victory must bypass the idle cache');
 h.switchUid('david');
 h.windows['spielonline-change']();await h.tick();
 assert.equal(h.calls(),3,'another player cannot inherit old unlock status');
});

test('a completed match is announced just once per match ID',()=>{
 assert.match(app,/lastAnnouncedFinishedMatchId=null/);
 assert.match(app,/game\?\.phase==='finished'&&lastAnnouncedFinishedMatchId!==acceptedMatchId/);
 assert.match(app,/lastAnnouncedFinishedMatchId=acceptedMatchId;\s*window\.dispatchEvent\(new Event\('dog-match-finished'\)\)/);
 assert.match(source,/ELIGIBILITY_FOCUS_MIN_MS=120000/);
});

test('Closing the DOG winner dialog reuses the fresh POST-victory server entitlement instead of a second Firebase GET',async()=>{
 const h=await rig({victory:true,reply:{
  eligible:true,completed:false,introReady:true
 }});
 assert.equal(h.calls(),1);
 h.windows['dog-match-finished']();
 await h.tick();
 assert.equal(h.calls(),2,'winning action always forces fresh entitlement check');
 assert.equal(h.shown(),0,'film cannot start over the open winner ceremony');
 h.dialog.close();
 await h.tick();
 assert.equal(h.calls(),2,'dialog close is a presentation event, not another Firestore read');
 assert.equal(h.shown(),1,'verified film launches immediately after ceremony closes');
});

test('Stale winner entitlement triggers a fresh server check before showing Christmas',async()=>{
 const h=await rig({victory:true,reply:{
  eligible:true,completed:false,introReady:true
 }});
 h.windows['dog-match-finished']();await h.tick();
 assert.equal(h.calls(),2);
 h.clock(61000);
 h.dialog.close();await h.tick();
 assert.equal(h.calls(),3,'one-minute-expired victory proof cannot unlock without rechecking');
 assert.equal(h.shown(),1,'fresh verification still launches film');
});

test('In-flight pre-victory entitlement must not authorize film or create an extra close-request',async()=>{
 const h=await rig({victory:true,delayedInitial:true,reply:{
  eligible:true,completed:false,introReady:true
 }});
 assert.equal(h.calls(),1,'initial eligibility pending');
 h.windows['dog-match-finished']();
 h.dialog.close();
 await h.tick();
 assert.equal(h.calls(),1,'closing while verification pending does not start a duplicate GET');
 assert.equal(h.shown(),0,'pre-victory status cannot reveal the film');
 h.releaseInitial({eligible:false,completed:false,introReady:false});
 // The queued forced refresh runs in a later microtask after the old
 // Promise resolves; wait for this complete async chain, not only for the
 // first observed network call.
 await h.tick();
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(h.calls(),2,'original pre-victory read triggers one post-victory forced follow-up');
 assert.equal(h.shown(),1,'only the post-victory server result authorizes the intro');
});

test('The winner film is never shown on hub pages without the real winner dialog',async()=>{
 const h=await rig({reply:{eligible:true,completed:false,introReady:true}});
 h.windows['dog-match-finished']();
 await h.tick();
 assert.equal(h.shown(),0);
 assert.equal(h.calls(),2,'server may check unlock but must not create unverified victory UI');
});

test('DOG game HTML loads the optimized winner eligibility script instead of an old cached version',()=>{
 const html=readFileSync(new URL('../DOG/index.html',import.meta.url),'utf8');
 assert.match(html,/christmas-intro-gate\.js\?v=20261122-single-win-check/);
 assert.doesNotMatch(html,/christmas-intro-gate\.js\?v=23/);
});
