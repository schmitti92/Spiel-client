import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const source=readFileSync(new URL('../DOG/christmas-intro-gate.js',import.meta.url),'utf8');
const app=readFileSync(new URL('../DOG/app.js',import.meta.url),'utf8');
const begin=source.indexOf('export function mountChristmasLinks(){');
const end=source.indexOf('export function guardChristmasEventPage(){',begin);
assert.ok(begin>=0&&end>begin,'load the live eligibility gate function');

async function rig(){
 let now=1000000,uid='vanessa',calls=0;
 const windows={},docs={};
 const context={
  window:{addEventListener:(name,fn)=>{windows[name]=fn;}},
  document:{
   getElementById:()=>null,
   documentElement:{classList:{remove(){},toggle(){}} },
   addEventListener:(name,fn)=>{docs[name]=fn;},
   hidden:false
  },
  profile:()=>({user:{uid}}),
  api:async()=>{calls++;return {eligible:false,completed:false,introReady:false}},
  introVisible:false,
  Date:{now:()=>now},
  setTimeout(){},queueMicrotask,
  console
 };
 vm.runInNewContext(source.slice(begin,end).replace('export function','function')+
  '\nthis.__mountChristmasLinks=mountChristmasLinks;',context);
 context.__mountChristmasLinks();
 const tick=async()=>{for(let i=0;i<5;i++)await Promise.resolve();};
 await tick();
 return {windows,docs,clock:ms=>{now+=ms;},calls:()=>calls,
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
