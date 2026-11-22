import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const code=readFileSync(new URL('../DOG/app.js',import.meta.url),'utf8');
const begin=code.indexOf('function startSocket(){');
const end=code.indexOf('async function initOnline(){',begin);
assert.ok(begin>=0&&end>begin);
const socketCode=code.slice(begin,end);

function rig(){
 let now=100000,reads=0;
 const sockets=[],heartbeats=[];
 class Socket{
  readyState=0;
  constructor(url){this.url=url;sockets.push(this);}
  send(value){this.sent=(this.sent||[]).concat(value);}
  close(){this.readyState=3;this.onclose?.();}
 }
 const ctx={
  onlineSocket:null,onlineHeartbeat:null,emojiSocketReady:false,
  socketAwaitingFirstRoomAt:0,socketHasRoom:false,socketLastHealthyAt:0,
  socketAuthenticatedUid:null,socketSupportsDogActions:false,
  dogSocketActions:{receive:()=>false,disconnected:()=>{}},
  DOG_SOCKET_CONNECT_MS:15000,DOG_SOCKET_STALE_MS:95000,
  apiBase:'https://render.invalid',hubCode:'123',acceptedMatchId:'match1',
  user:()=>({uid:'alice',getIdToken:async()=> 'test-token'}),
  Date:{now:()=>now},WebSocket:Socket,
  setTimeout:fn=>fn,clearTimeout:()=>{},
  setInterval:(fn,ms)=>{heartbeats.push({fn,ms});return fn},
  clearInterval:()=>{},
  acceptRemote:()=>{},showDogEmoji:()=>{},showDogEmojiError:()=>{},
  refreshOnline:()=>{reads++;return Promise.resolve()}
 };
 vm.runInNewContext(socketCode,ctx,{filename:'DOG/app-socket.js'});
 return {ctx,sockets,heartbeats,reads:()=>reads,now:n=>{now=n}};
}

test('joining DOG over WebSocket performs zero duplicate HTTP document reads',async()=>{
 const h=rig();h.ctx.startSocket();
 assert.equal(h.reads(),0);
 assert.equal(h.sockets.length,1);
 const socket=h.sockets[0];
 socket.readyState=1;await socket.onopen();
 socket.onmessage({data:JSON.stringify({type:'room',room:{code:'123'}})});
 assert.equal(h.ctx.socketHasRoom,true);
 assert.equal(h.reads(),0,'receiving an initial room snapshot never hits Firestore HTTP');
 assert.equal(h.heartbeats.at(-1).ms,30000);
});

test('pong keeps DOG alive without HTTP reads and hung socket is closed for fallback',async()=>{
 const h=rig();h.ctx.startSocket();
 const socket=h.sockets[0];socket.readyState=1;await socket.onopen();
 socket.onmessage({data:JSON.stringify({type:'room',room:{code:'123'}})});
 h.now(170000);socket.onmessage({data:JSON.stringify({type:'pong'})});
 h.now(200000);h.heartbeats[0].fn();
 assert.equal(socket.readyState,1);
 assert.equal(h.reads(),0);
 h.now(270001);h.heartbeats[0].fn();
 assert.equal(socket.readyState,3,'unresponsive server must permit reconnection and HTTP recovery');
 assert.equal(h.ctx.onlineSocket,null);
});

test('a rejected illegal move does not reread Firebase, stale and failed requests still recover',async()=>{
 const h=rig();h.ctx.startSocket();const socket=h.sockets[0];
 socket.readyState=1;await socket.onopen();
 socket.onmessage({data:JSON.stringify({type:'room',room:{code:'123'}})});
 h.ctx.reconcileRejectedDogAction({status:409,message:'DOG_RULE_REJECTED'});
 h.ctx.reconcileRejectedDogAction({status:409,message:'NOT_PLAYER_TURN'});
 assert.equal(h.reads(),0);
 h.ctx.reconcileRejectedDogAction({status:409,message:'DOG_STALE_REVISION'});
 assert.equal(h.reads(),1);
 h.ctx.reconcileRejectedDogAction({status:503,message:'LOBBY_ERROR'});
 assert.equal(h.reads(),2);
 socket.close();
 h.ctx.reconcileRejectedDogAction({status:409,message:'DOG_RULE_REJECTED'});
 assert.equal(h.reads(),3,'disconnected clients must not remain stale');
});

test('successful socket startup does not issue initial HTTP GET and fallback remains bounded',()=>{
 assert.doesNotMatch(code,/await refreshOnline\(\);\s*startSocket\(\);/);
 assert.match(code,/const DOG_DISCONNECTED_READ_MS=30000/);
 assert.match(code,/const DOG_FIRST_ROOM_GRACE_MS=12000/);
 assert.match(code,/if\(\(!socketReady\|\|firstRoomTimedOut\)\&\&Date\.now\(\)-lastFallbackRoomReadAt>=DOG_DISCONNECTED_READ_MS\)/);
});
