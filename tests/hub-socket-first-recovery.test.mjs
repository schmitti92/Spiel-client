import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const source=readFileSync(new URL('../hub-lobby.js',import.meta.url),'utf8');
const begin=source.indexOf('let pendingRoomRecovery=null');
const end=source.indexOf("window.addEventListener('spielonline-change'",begin);
assert.ok(begin>=0&&end>begin,'recovery handler must be present');
const snippet=source.slice(begin,end);

function sandbox(){
 const sockets=[],timeouts=[],ops={gets:0,restores:0,pollStarts:0,retries:0,notices:[]};
 let activeUid='alice';
 class FakeSocket{
  constructor(url){this.url=url;this.readyState=0;this.sent=[];this.closed=false;sockets.push(this);}
  async open(){this.readyState=1;if(this.onopen)await this.onopen();}
  send(data){this.sent.push(JSON.parse(data));}
  emit(value){this.onmessage?.({data:JSON.stringify(value)});}
  fail(){this.onerror?.(new Error('network'));}
  close(){this.closed=true;this.readyState=3;}
 }
 const users={
  alice:{uid:'alice',getIdToken:async()=> 'verified-token-alice'},
  bob:{uid:'bob',getIdToken:async()=> 'verified-token-bob'}
 };
 const state={
  WebSocket:FakeSocket,API:'https://dog.example.test',room:null,code:null,
  activeProfile:()=>activeUid?{user:users[activeUid]}:null,
  request:async path=>{ops.gets++;assert.equal(path,'/rooms/123');return {room:{code:'123',revision:6,me:'verified-http'}};},
  activateRoom:found=>{ops.restores++;state.room=found;state.code=found.code;},
  pollStart:()=>{ops.pollStarts++;},
  render:()=>{},el:()=>({value:''}),
  notice:message=>{ops.notices.push(message)},
  Date:{now:()=>120000},JSON,
  setTimeout:(fn,ms)=>{const handle={fn,ms,cancelled:false};timeouts.push(handle);return handle;},
  clearTimeout:handle=>{if(handle)handle.cancelled=true;}
 };
 const ctx=vm.createContext(state);
 vm.runInContext(snippet,ctx,{filename:'hub-recovery.js'});
 vm.runInContext("pendingRoomRecovery='123'",ctx);
 return {ctx,state,sockets,timeouts,ops,
  run:()=>ctx.recoverPendingRoom(),
  setUser:uid=>{activeUid=uid;},
  pending:()=>vm.runInContext('pendingRoomRecovery',ctx),
  fireTimer:ms=>{const timer=timeouts.find(x=>!x.cancelled&&x.ms===ms);assert.ok(timer,'pending '+ms+'ms timer');timer.fn();}};
}

test('Reentering DOG waiting room recovers via authenticated socket with ZERO extra HTTP room GETs',async()=>{
 const h=sandbox();
 const pending=h.run();
 assert.equal(h.sockets.length,1);
 assert.equal(h.sockets[0].url,'wss://dog.example.test/hub');
 await h.sockets[0].open();
 assert.deepEqual(h.sockets[0].sent,[{
  type:'subscribe',code:'123',profileIdToken:'verified-token-alice'
 }]);
 const view={code:'123',revision:9,me:'alice',match:{game:'dog'}};
 h.sockets[0].emit({type:'room',room:view});
 await pending;
 assert.equal(h.ops.gets,0,'no Firestore-backed HTTP room read on healthy socket');
 assert.equal(h.ops.restores,1);
 assert.equal(h.ops.pollStarts,1);
 assert.equal(h.state.room.revision,9);
 assert.equal(h.pending(),null);
 assert.equal(h.sockets[0].closed,true,'temporary subscribe is released');
});

test('Socket failure keeps the original authenticated Firestore-backed GET fallback',async()=>{
 const h=sandbox(),promise=h.run();
 h.sockets[0].fail();
 await promise;
 assert.equal(h.ops.gets,1);
 assert.equal(h.ops.restores,1);
 assert.equal(h.state.room.me,'verified-http');
 assert.equal(h.ops.pollStarts,1);
});

test('Socket grace timeout releases watcher and falls back to existing HTTP recovery',async()=>{
 const h=sandbox(),promise=h.run();
 h.fireTimer(6000);
 await promise;
 assert.equal(h.sockets[0].closed,true);
 assert.equal(h.ops.gets,1);
 assert.equal(h.ops.restores,1);
});

test('An invalid or unauthorized websocket reply cannot bypass membership validation',async()=>{
 const h=sandbox(),promise=h.run();
 await h.sockets[0].open();
 h.sockets[0].emit({type:'room',room:{code:'999',revision:50,me:'wrong-room'}});
 assert.equal(h.ops.restores,0);
 h.sockets[0].emit({type:'error',error:'NOT_A_MEMBER'});
 await promise;
 assert.equal(h.ops.gets,1,'authoritative HTTP handler still checks membership');
 assert.equal(h.state.room.me,'verified-http');
});

test('Profile switching during an asynchronous socket result never exposes the old profile room',async()=>{
 const h=sandbox(),promise=h.run();
 await h.sockets[0].open();
 h.setUser('bob');
 h.sockets[0].emit({type:'room',room:{code:'123',revision:8,me:'alice-private-cards'}});
 await promise;
 assert.equal(h.ops.restores,0);
 assert.equal(h.ops.gets,0,'old profile room was rejected before fallback');
 assert.equal(h.pending(),'123');
 assert.equal(h.state.room,null);
 assert.ok(h.timeouts.some(x=>x.ms===2000&&!x.cancelled),'new user is scheduled for verified retry');
});

test('A stale profile token is never sent after account changes while fetching it',async()=>{
 const h=sandbox(),promise=h.run();
 // The websocket snapshot alone must not let a disconnected profile's
 // previous token authorize a different user's room.
 h.setUser('bob');
 await h.sockets[0].open();
 assert.equal(h.sockets[0].sent.length,0);
 await promise;
 assert.equal(h.ops.restores,0);
 assert.equal(h.pending(),'123');
});

test('No websocket support still restores the existing authenticated HTTP room route',async()=>{
 const h=sandbox();h.state.WebSocket=undefined;
 await h.run();
 assert.equal(h.sockets.length,0);
 assert.equal(h.ops.gets,1);
 assert.equal(h.ops.restores,1);
});

test('Normal persistent stream, membership checks and 30-second disconnected fallback remain intact',()=>{
 assert.match(source,/function startWatch\(\)/);
 assert.match(source,/const HUB_DISCONNECTED_FALLBACK_MS=30000/);
 assert.match(source,/if\(hasRecentHubStream\(now\)\)return/);
 assert.match(snippet,/activeProfile\(\)\?\.user\?\.uid!==recoveryUid/);
 assert.match(snippet,/if\(!restored\)\{/);
 assert.doesNotMatch(snippet,/request\('\/rooms','POST'/);
});

test('DOG waiting-room HTML loads the new websocket-first recovery asset version',()=>{
 const html=readFileSync(new URL('../hub-lobby.html',import.meta.url),'utf8');
 assert.match(html,/hub-lobby\.js\?v=20261122-dog-socket-first/);
 assert.doesNotMatch(html,/hub-lobby\.js\?v=20261121-firebase-writes-hotfix/);
});
