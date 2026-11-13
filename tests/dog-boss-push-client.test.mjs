import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

const load=name=>readFileSync(new URL('../'+name,import.meta.url),'utf8');
async function flush(){for(let i=0;i<20;i++)await Promise.resolve()}
function harness(query='?gate=20&dogpush=1'){
 const sockets=[],timers=new Map(),changes=[];let next=1,allowChange=true;
 class FakeWS{
  constructor(url){this.url=url;this.readyState=0;this.sent=[];sockets.push(this)}
  send(s){this.sent.push(JSON.parse(s))}
  close(){this.readyState=3;this.onclose?.()}
  open(){this.readyState=1;this.onopen?.()}
  recv(p){this.onmessage?.({data:JSON.stringify(p)})}
 }
 const window={};
 const ctx={window,location:{search:query},URLSearchParams,WebSocket:FakeWS,
  setTimeout:(fn,ms)=>{const id=next++;timers.set(id,{fn,ms});return id},
  clearTimeout:id=>timers.delete(id)};
 runInNewContext(load('dog-boss-push-client.js'),ctx);
 const user={uid:'hero-a',getIdToken:async()=>'test-token'};
 const client=window.DogBossPushClient.create({
  api:'https://serverfinal-ynbe.onrender.com',gate:20,
  getUser:()=>user,onChanged:()=>{
   if(!allowChange)return false;
   changes.push('changed');return true;
  }
 });
 return {client,sockets,timers,changes,flush,
  allow:v=>{allowChange=v},
  runTimer:(ms)=>{const entry=[...timers.entries()].find(([,t])=>t.ms===ms);
   assert.ok(entry,'missing timer '+ms);timers.delete(entry[0]);entry[1].fn()}};
}
test('Boss push is enabled by default; explicit dogpush=0 disables the socket',async()=>{
 const h=harness('?gate=20');
 assert.ok(h.client,'signed-in player receives normal boss notifications');
 await h.client.start();await flush();
 assert.equal(h.sockets.length,1);
 const disabled=harness('?gate=20&dogpush=0');
 assert.equal(disabled.client,null);
 assert.equal(disabled.sockets.length,0);
 h.client.stop();
});
test('S-04 private websocket subscription, change coalescing and reconnect',async()=>{
 const h=harness();
 await h.client.start();await flush();
 assert.equal(h.sockets.length,1);
 const ws=h.sockets[0];
 assert.equal(ws.url,'wss://serverfinal-ynbe.onrender.com/dog/updates');
 assert.equal(ws.url.includes('test-token'),false,'token must never occur in URL');
 ws.open();
 assert.deepEqual(JSON.parse(JSON.stringify(ws.sent)),
  [{type:'subscribe',idToken:'test-token',gate:20}]);
 assert.equal(h.client.active(),false,'not connected until server authorizes');
 ws.recv({type:'subscribed',gate:20});
 assert.equal(h.client.active(),true);
 ws.recv({type:'changed',seq:1});
 ws.recv({type:'changed',seq:2});
 ws.recv({type:'changed',seq:2});
 assert.equal(h.changes.length,0);
 assert.equal(h.timers.size,1);
 h.runTimer(250);
 assert.equal(h.changes.length,1,'many updates cause one GET callback');
 ws.close();
 assert.equal(h.client.active(),false);
 assert.equal(h.timers.size,1,'HTTP fallback remains while reconnecting');
 h.runTimer(2000);await flush();
 assert.equal(h.sockets.length,2);
 h.client.stop();
 assert.equal(h.client.active(),false);
});
test('S-04 explicit authorization denial stops reconnect loop and extra team reads',async()=>{
 const h=harness();
 await h.client.start();await flush();
 const ws=h.sockets[0];ws.open();
 ws.recv({type:'error',code:'DENIED'});
 ws.close();
 assert.equal(h.client.active(),false);
 assert.equal(h.timers.size,0,'no repeated unauthorized subscription attempts');
 await h.client.start();
 assert.equal(h.sockets.length,1,'denied identity is not retried automatically');
});

test('S-05 out-of-order, lost and repeated hints produce one catch-up',async()=>{
 const h=harness();await h.client.start();await flush();
 const ws=h.sockets[0];ws.open();ws.recv({type:'subscribed',gate:20});
 ws.recv({type:'changed',seq:3}); // gap
 ws.recv({type:'changed',seq:2}); // delayed message
 ws.recv({type:'changed',seq:3}); // duplicate
 ws.recv({type:'changed',seq:5}); // another gap
 assert.equal(h.client.stats().gaps,2);
 assert.equal(h.client.stats().duplicates,2);
 assert.equal(h.client.stats().pending,true);
 assert.equal(h.timers.size,1,'one coalesced request planned');
 h.runTimer(250);
 assert.equal(h.changes.length,1,'one official GET for all changes');
 assert.equal(h.client.stats().pending,false);
});
test('S-05 queued hints survive user action or hidden tab',async()=>{
 const h=harness();await h.client.start();await flush();
 const ws=h.sockets[0];ws.open();ws.recv({type:'subscribed',gate:20});
 h.allow(false);
 ws.recv({type:'changed',seq:1});h.runTimer(250);
 assert.equal(h.changes.length,0);
 assert.equal(h.client.stats().pending,true);
 assert.equal(h.client.flush(),false);
 h.allow(true);
 assert.equal(h.client.flush(),true);
 assert.equal(h.changes.length,1);
 assert.equal(h.client.flush(),false,'no duplicate GET');
});
test('S-05 recovery reconciles exactly once on WS reconnect',async()=>{
 const h=harness();await h.client.start();await flush();
 const first=h.sockets[0];first.open();first.recv({type:'subscribed',gate:20});
 assert.equal(h.client.stats().recoveries,0);
 first.close();
 assert.equal(h.client.active(),false);
 h.runTimer(2000);await flush();
 const second=h.sockets[1];second.open();second.recv({type:'subscribed',gate:20});
 assert.equal(h.client.stats().recoveries,1);
 assert.equal(h.client.stats().pending,true);
 h.runTimer(250);
 assert.equal(h.changes.length,1);
 second.recv({type:'changed',seq:1});
 second.recv({type:'changed',seq:1});
 h.runTimer(250);
 assert.equal(h.changes.length,2);
 assert.equal(h.client.stats().duplicates,1);
});

test('S-04 integration retains the original status GET polling as fallback',()=>{
 for(const [name,html] of [['dog-boss10.js','dog-boss10.html'],
  ['dog-group-boss.js','dog-group-boss.html']]){
  const source=load(name),page=load(html);
  assert.match(page,/dog-boss-push-client\.js\?v=/);
  assert.ok(page.indexOf('dog-boss-push-client.js')<page.indexOf('src="./'+name));
  assert.match(source,/push\?\.active\?\.\(\)/);
  assert.match(source,/const pollDelay=/);
  assert.match(source,/void reload\(exchangeWindow===true\)/);
  assert.match(source,/push\?\.start\?\.\(\)/);
  assert.match(source,/if\(document\.hidden\|\|working\|\|inflight\)return false/);
  assert.match(source,/push\?\.flush\?\.\(\)/);
 }
});

test('S-04 repeated failed websocket sessions back off to avoid repeated team reads',async()=>{
 const h=harness();
 await h.client.start();await flush();
 for(const delay of [2000,4000,8000,16000,30000]){
  const ws=h.sockets.at(-1);
  ws.open();
  ws.recv({type:'subscribed',gate:20});
  // On a reconnect, one pending 250-ms reconciliation may coexist with
  // the reconnect timer. Settle it before measuring backoff behavior.
  if([...h.timers.values()].some(t=>t.ms===250))h.runTimer(250);
  ws.close();
  assert.equal(h.client.active(),false);
  assert.equal([...h.timers.values()].find(t=>t.ms===delay)?.ms,delay);
  assert.equal(h.client.stats().nextRetryMs,delay);
  h.runTimer(delay);await flush();
 }
 const ws=h.sockets.at(-1);
 ws.open();ws.recv({type:'subscribed',gate:20});
 ws.close();
 assert.equal(h.client.stats().nextRetryMs,30000,'reconnect cost is bounded');
 h.client.stop();
 assert.equal(h.timers.size,0,'no deferred socket attempts after leaving the page');
});

test('S-04 failed websocket authentication never changes the HTTP fallback',async()=>{
 const h=harness();
 await h.client.start();await flush();
 const ws=h.sockets[0];
 ws.close();
 assert.equal(h.client.active(),false);
 assert.equal(h.client.stats().nextRetryMs,2000);
 assert.equal(h.changes.length,0,'no hidden state requests from the client socket');
 h.client.stop();
 assert.equal(h.timers.size,0);
});
