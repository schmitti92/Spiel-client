import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {createDogSocketActionDispatcher} from '../DOG/socket-actions.js';

const source=readFileSync(new URL('../DOG/app.js',import.meta.url),'utf8');
const begin=source.indexOf('async function sendOnlineDogAction(action){');
const end=source.indexOf('function acceptRemote(room){',begin);
assert.ok(begin>0&&end>begin,'the real DOG client must contain the socket/HTTP switch');

function harness({socketEnabled=true,socketReady=true}={}){
 const http=[],sent=[],timers=[];
 let currentUid='alice';
 const socket={readyState:socketReady?1:3,
  send(raw){sent.push(JSON.parse(raw))}};
 const dispatcher=createDogSocketActionDispatcher({
  timeoutMs:12000,
  setTimer:(fn,ms)=>{const t={fn,ms,cancelled:false};timers.push(t);return t;},
  clearTimer:t=>{if(t)t.cancelled=true}
 });
 const ctx={
  onlineSocket:socket,
  socketHasRoom:socketEnabled,
  socketSupportsDogActions:socketEnabled,
  dogSocketActions:dispatcher,
  acceptedMatchId:'verified-match-id',matchHint:'ignore',
  game:{revision:42},user:()=>({uid:currentUid}),socketAuthenticatedUid:'alice',
  crypto:{randomUUID:()=> 'dog-action-unique-000001'},
  hubRequest:async(path,method,payload)=>{
   http.push({path,method,payload});
   return {code:'123',match:{id:payload.matchId,dog:{revision:43}}};
  }
 };
 vm.runInNewContext(source.slice(begin,end)+
  '\nthis.sendOnlineDogAction=sendOnlineDogAction;',ctx);
 return {ctx,socket,sent,http,timers,dispatcher,
  setUid:uid=>{currentUid=uid},
  send:action=>ctx.sendOnlineDogAction(action)};
}

test('DOG move uses verified Render WebSocket, no per-move HTTP token/GET',async()=>{
 const h=harness();
 const action={type:'exchange',cardId:17};
 const pending=h.send(action);
 assert.equal(h.http.length,0);
 assert.equal(h.sent.length,1);
 assert.equal(h.sent[0].type,'dog_action');
 assert.equal(h.sent[0].expectedRevision,42);
 assert.equal(h.sent[0].matchId,'verified-match-id');
 assert.equal(h.sent[0].actionId,'dog-action-unique-000001');
 assert.deepEqual(h.sent[0].action,action);
 assert.equal(h.dispatcher.stats().outstanding,1);
 const consumed=h.dispatcher.receive({
  type:'dog_action_result',actionId:h.sent[0].actionId,
  room:{code:'123',match:{dog:{revision:43}}}
 },h.socket);
 assert.equal(consumed,true);
 const room=await pending;
 assert.equal(room.match.dog.revision,43);
 assert.equal(h.dispatcher.stats().outstanding,0);
 assert.equal(h.http.length,0,'successful WebSocket move needs no separate HTTP request');
});

test('Old Render without action capability immediately uses original authenticated HTTP endpoint',async()=>{
 const h=harness({socketEnabled:false});
 const result=await h.send({type:'move',pieceId:0});
 assert.equal(h.sent.length,0,'never waits for unsupported WebSocket feature');
 assert.equal(h.http.length,1);
 assert.equal(h.http[0].path,'/dog/action');
 assert.equal(h.http[0].method,'POST');
 assert.equal(h.http[0].payload.actionId,'dog-action-unique-000001');
 assert.equal(result.match.dog.revision,43);
});

test('Disconnected Render socket uses HTTP immediately, retaining the current actionId',async()=>{
 const h=harness({socketReady:false});
 await h.send({type:'exchange',cardId:1});
 assert.equal(h.http.length,1);
 assert.equal(h.sent.length,0);
});

test('Lost socket ACK falls back to HTTP with exactly the same immutable actionId',async()=>{
 const h=harness();
 const result=h.send({type:'seven',cardId:27});
 assert.equal(h.http.length,0);
 assert.equal(h.timers.length,1);
 assert.equal(h.timers[0].ms,12000);
 h.timers[0].fn();
 const room=await result;
 assert.equal(room.match.dog.revision,43);
 assert.equal(h.http.length,1);
 assert.equal(h.http[0].payload.actionId,h.sent[0].actionId,
  'idempotent server replay means a lost ACK never applies the move twice');
 assert.equal(h.dispatcher.stats().outstanding,0);
});

test('Socket close resolves waiting move over HTTP without an extra 12-second stall',async()=>{
 const h=harness();
 const result=h.send({type:'move',pieceId:0});
 h.dispatcher.disconnected(h.socket);
 await result;
 assert.equal(h.http.length,1);
 assert.equal(h.dispatcher.stats().outstanding,0);
});

test('Authoritative DOG rule rejection NEVER retries over HTTP and never causes another Firestore read',async()=>{
 const h=harness();
 const result=h.send({type:'exchange',cardId:100});
 const consumed=h.dispatcher.receive({
  type:'dog_action_error',actionId:h.sent[0].actionId,
  error:'DOG_RULE_REJECTED',status:409
 },h.socket);
 assert.equal(consumed,true);
 await assert.rejects(result,e=>e.status===409&&e.message==='DOG_RULE_REJECTED');
 assert.equal(h.http.length,0);
});

test('An unauthenticated or not-yet-bound socket recovers using the original HTTP action route',async()=>{
 const h=harness();
 const pending=h.send({type:'move',pieceId:1});
 h.dispatcher.receive({
  type:'dog_action_error',actionId:h.sent[0].actionId,
  error:'NOT_CONNECTED',status:401
 },h.socket);
 await pending;
 assert.equal(h.http.length,1);
});

test('Reply from a stale socket cannot satisfy a move pending on a different authenticated connection',async()=>{
 const h=harness();
 const stale={readyState:1};
 const result=h.send({type:'move',pieceId:1});
 h.dispatcher.receive({
  type:'dog_action_result',actionId:h.sent[0].actionId,
  room:{secret:'wrong-session'}
 },stale);
 assert.equal(h.dispatcher.stats().outstanding,1);
 h.dispatcher.receive({
  type:'dog_action_result',actionId:h.sent[0].actionId,room:{code:'123'}
 },h.socket);
 const r=await result;
 assert.equal(r.code,'123');
 assert.equal(r.secret,undefined);
 assert.equal(h.http.length,0);
});

test('Move and research actions share one safe dispatcher; socket room subscription remains primary',()=>{
 assert.match(source,/sendOnlineDogAction\(move\)/);
 assert.match(source,/sendOnlineDogAction\(action\)/);
 assert.match(source,/if\(socket\?\.readyState===1&&socketHasRoom&&socketSupportsDogActions&&\s*socketAuthenticatedUid===user\(\)\?\.uid\)/);
 assert.match(source,/data\.type==='dog_capabilities'/);
 assert.match(source,/dogSocketActions\.receive\(data,socket\)/);
 assert.match(source,/dogSocketActions\.disconnected\(socket\)/);
 assert.match(source,/const DOG_DISCONNECTED_READ_MS=30000/);
 assert.match(source,/if\(\(!socketReady\|\|firstRoomTimedOut\)/);
 const html=readFileSync(new URL('../DOG/index.html',import.meta.url),'utf8');
 assert.match(html,/app\.js\?v=\d+/);
});

test('A Firebase login switch during socket failure must never replay another player\'s move',async()=>{
 const h=harness();
 const pending=h.send({type:'move',pieceId:1});
 h.setUid('bob');
 h.dispatcher.disconnected(h.socket);
 await assert.rejects(pending,/PROFILE_CHANGED/);
 assert.equal(h.http.length,0,
  'no action from Alice may be retried with Bob\'s bearer token');
});
