import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

const load=name=>readFileSync(new URL('../'+name,import.meta.url),'utf8');
async function flush(){for(let i=0;i<20;i++)await Promise.resolve()}
function harness(query='?gate=20&dogpush=1'){
 const sockets=[],timers=new Map(),changes=[];let next=1;
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
  getUser:()=>user,onChanged:()=>changes.push('changed')
 });
 return {client,sockets,timers,changes,flush,
  runTimer:(ms)=>{const entry=[...timers.entries()].find(([,t])=>t.ms===ms);
   assert.ok(entry,'missing timer '+ms);timers.delete(entry[0]);entry[1].fn()}};
}
test('S-04 is off by default and never creates a socket',()=>{
 const h=harness('?gate=20');
 assert.equal(h.client,null);
 assert.equal(h.sockets.length,0);
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
  assert.match(source,/onChanged:\(\)=>\{if\(!document.hidden&&!working\)void reload\(true\)/);
 }
});
