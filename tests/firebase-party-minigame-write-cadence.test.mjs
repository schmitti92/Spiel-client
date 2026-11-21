import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

// No actual browser, WebSocket, Firestore or HTTP server is contacted.
const moduleSource=relative=>readFileSync(new URL('../'+relative,import.meta.url),'utf8');
const loadSourceModule=relative=>import('data:text/javascript;base64,'+
 Buffer.from(moduleSource(relative),'utf8').toString('base64'));

function fakeBrowser(){
 const original={document:globalThis.document,window:globalThis.window,
  location:globalThis.location,setInterval:globalThis.setInterval,
  clearInterval:globalThis.clearInterval,now:Date.now};
 const handlers=new Map(),intervals=[];
 let iframe=null,now=100000;
 const raise=(type,data)=>{
  const handler=handlers.get(type);
  if(!handler)throw Error('Missing event handler '+type);
  return handler({origin:location.origin,source:iframe.contentWindow,data});
 };
 globalThis.location={origin:'https://example.test'};
 globalThis.document={createElement(name){
  assert.equal(name,'iframe');
  iframe={style:{},contentWindow:{postMessage(){}},
   events:new Map(),setAttribute(){},remove(){},
   addEventListener(type,fn){this.events.set(type,fn)}};
  return iframe;
 }};
 globalThis.window={addEventListener(name,fn){handlers.set(name,fn)},
  removeEventListener(name){handlers.delete(name)}};
 globalThis.setInterval=(fn,delay)=>{intervals.push({fn,delay});return intervals.length};
 globalThis.clearInterval=()=>{};
 Date.now=()=>now;
 return {
  iframe:()=>iframe,
  load:()=>iframe.events.get('load')(),
  emit:raise,
  tick:()=>intervals.forEach(x=>x.fn()),
  advance:ms=>{now+=ms},
  restore:()=>{globalThis.document=original.document;globalThis.window=original.window;
   globalThis.location=original.location;globalThis.setInterval=original.setInterval;
   globalThis.clearInterval=original.clearInterval;Date.now=original.now;}
 };
}

const flush=()=>new Promise(resolve=>setImmediate(resolve));

test('Snake: checkpoints are >=600ms apart, final result is immediate, no real Firebase calls',async()=>{
 const module=await loadSourceModule('snake-arena-online-bridge.js');
 assert.equal(module.SNAKE_STATE_CHECKPOINT_MS,600);
 assert.equal(module.SNAKE_TIMEOUT_PROBE_MS,3000);
 const browser=fakeBrowser();
 try{
  const room={code:'123',serverNow:100000,
   players:[{uid:'alice',me:true,seat:1}],
   match:{members:[{uid:'alice',seat:1}],challenge:{id:'snake-1',
    order:['snake-arena'],index:0,phase:'countdown',startAt:0,
    snake:{players:[{seat:1,seq:0,score:0,alive:true}]}}}};
  const calls=[];
  const bridge=module.mountSnakeOriginal({container:{replaceChildren(){}},
   getRoom:()=>room,acceptRoom(){},onError:e=>{throw e},
   request:async(path,method,body)=>{calls.push({path,body,time:Date.now()});return {room:{}}}});
  browser.load();
  browser.emit('message',{type:'snake-arena:configured',challengeId:'snake-1'});
  const state=(score,finished=false)=>browser.emit('message',{
   type:'snake-arena:state',challengeId:'snake-1',score,survived:score,finished});
  state(10);await flush();
  let saved=calls.filter(c=>c.path.endsWith('/challenge-snake-state'));
  assert.equal(saved.length,1);
  browser.advance(80);state(20);await flush();
  assert.equal(calls.filter(c=>c.path.endsWith('/challenge-snake-state')).length,1);
  browser.advance(510);browser.tick();await flush();
  assert.equal(calls.filter(c=>c.path.endsWith('/challenge-snake-state')).length,1);
  browser.advance(20);browser.tick();await flush();
  saved=calls.filter(c=>c.path.endsWith('/challenge-snake-state'));
  assert.equal(saved.length,2);
  assert.equal(saved[1].body.score,20);
  assert.ok(saved[1].time-saved[0].time>=600);
  browser.advance(25);state(30,true);await flush();
  saved=calls.filter(c=>c.path.endsWith('/challenge-snake-state'));
  assert.equal(saved.length,3,'finished packet must not wait for next checkpoint');
  assert.equal(saved[2].body.finished,true);
  assert.equal(saved[2].body.score,30);
  assert.equal(saved[2].time-saved[1].time,25);
  bridge.destroy();
 }finally{browser.restore();}
});

test('Lava: movement is checkpointed at 350ms, idle ticks at >=1800ms',async()=>{
 const module=await loadSourceModule('lava-arena-online-bridge.js');
 assert.equal(module.LAVA_STATE_CHECKPOINT_MS,350);
 assert.equal(module.LAVA_IDLE_TICK_MS,1800);
 const browser=fakeBrowser();
 try{
  const room={code:'123',serverNow:100000,
   players:[{uid:'alice',me:true,seat:1}],
   match:{members:[{uid:'alice',seat:1}],challenge:{id:'lava-1',
    order:['lava-arena'],index:0,phase:'countdown',startAt:0,
    lava:{players:[{seat:1,seq:0}],tiles:[]}}}};
  const calls=[];
  const bridge=module.mountLavaOriginal({container:{replaceChildren(){}},
   getRoom:()=>room,acceptRoom(){},onError:e=>{throw e},
   request:async(path,method,body)=>{calls.push({path,body,time:Date.now()});return {room:{}}}});
  browser.load();
  browser.emit('message',{type:'lava-arena:configured',challengeId:'lava-1'});
  await flush();
  const state=(seq,x)=>browser.emit('message',{type:'lava-arena:state',
   challengeId:'lava-1',seq,player:{x,y:80,jump:0}});
  await state(1,100);await flush();
  browser.advance(90);await state(2,103);await flush();
  assert.equal(calls.filter(c=>c.path.endsWith('/challenge-lava-state')).length,1);
  browser.advance(270);await state(3,105);await flush();
  const writes=calls.filter(c=>c.path.endsWith('/challenge-lava-state'));
  assert.equal(writes.length,2);
  assert.ok(writes[1].time-writes[0].time>=350);
  browser.advance(700);browser.tick();await flush();
  assert.equal(calls.filter(c=>c.path.endsWith('/challenge-lava-tick')).length,1);
  browser.advance(900);browser.tick();await flush();
  const ticks=calls.filter(c=>c.path.endsWith('/challenge-lava-tick'));
  assert.equal(ticks.length,2);
  assert.ok(ticks[1].time-ticks[0].time>=1800);
  bridge.destroy();
 }finally{browser.restore();}
});

test('production hub imports cache-busted bridges and keeps WebSocket handling intact',()=>{
 const hub=moduleSource('hub-lobby.js'),page=moduleSource('hub-lobby.html');
 assert.match(hub,/snake-arena-online-bridge\.js\?v=38/);
 assert.match(hub,/lava-arena-online-bridge\.js\?v=14/);
 assert.match(page,/hub-lobby\.js\?v=20261121-firebase-checkpoints/);
 assert.match(hub,/startWatch\(\)/);
 assert.match(hub,/acceptRoom/);
});
