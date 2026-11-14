import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const app=readFileSync(new URL('../DealOrNoDeal/js/app.js',import.meta.url),'utf8');
const core=readFileSync(new URL('../DealOrNoDeal/js/core.js',import.meta.url),'utf8');

function isolatedPoll(slotInterval){
 const a=app.indexOf('async function poll(){'),b=app.indexOf('function pollDelay(){',a);
 assert.ok(a>0&&b>a,'real Deal polling function must exist');
 const calls=[];
 const runtime={
  code:'803',user:()=>({uid:'simulated'}),document:{hidden:false},
  polling:false,lastHttpSafetySync:0,g:{id:'match_1',revision:4},
  lastStateChange:0,sharedSlotRecoveryInterval:()=>slotInterval,
  request:async(method,path)=>{calls.push({method,path});return {game:{id:'match_1',revision:4}}},
  Date,render:()=>{throw Error('Unchanged revision should not render')},
  window:{dispatchEvent:()=>{}},Event:class Event{},
  $:()=>({textContent:''})
 };
 vm.runInNewContext(app.slice(a,b),runtime,{filename:'isolated-deal-poll.js'});
 return {calls,poll:()=>runtime.poll(),runtime};
}

test('Active slot recovery labels HTTP GET, preserving exact fetch behavior',async()=>{
 const h=isolatedPoll(3000);
 await h.poll();
 assert.equal(h.calls.length,1);
 assert.equal(h.calls[0].method,'GET');
 assert.equal(h.calls[0].path,'?syncReason=slot');
 assert.equal(h.runtime.polling,false);
});

test('Normal safety polling remains the original room GET without a query',async()=>{
 const h=isolatedPoll(0);
 await h.poll();
 assert.equal(h.calls.length,1);
 assert.equal(h.calls[0].path,'');
 assert.equal(h.runtime.polling,false);
});

test('No polling interval, reconnect, heartbeat, authentication or endpoint changed',()=>{
 assert.match(core,/async function request\(method,path,body\)/);
 assert.match(core,/getIdToken\(\)/);
 assert.match(app,/const slotPollMs=sharedSlotRecoveryInterval\(\)/);
 assert.match(app,/Date\.now\(\)-lastHttpSafetySync>=\(slotPollMs\|\|60000\)/);
 assert.match(app,/function dealSocketHealthy\(\)/);
 assert.match(app,/async function refreshDealSocketAuth\(\)/);
 assert.match(app,/if\(!dealSocketHealthy\(\)\|\|Date\.now/);
});
