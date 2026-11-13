import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

const script=readFileSync(new URL('../dog-boss-invites.js',import.meta.url),'utf8');
const microtasks=async()=>{for(let i=0;i<25;i++)await Promise.resolve()};
function fixture({pathname='/Spiel-client/dog-tor-map.html',query='?room=123',online=true}={}){
 const timers=new Map(),ticks=new Map(),listeners=new Map(),sockets=[],redirects=[],added=[];
 let seq=0;
 class Element{
  constructor(name){this.nodeName=name;this.children=[];this.events=new Map();this.style={};this.dataset={};this.hidden=false;this.isConnected=true;}
  setAttribute(key,value){this[key]=value;}
  append(...nodes){this.children.push(...nodes);}
  addEventListener(type,cb){this.events.set(type,cb);}
  remove(){this.isConnected=false;}
  click(){this.events.get('click')?.();}
 }
 class WS{
  constructor(url){this.url=url;this.readyState=0;this.sent=[];sockets.push(this);}
  send(data){this.sent.push(JSON.parse(data));}
  open(){this.readyState=1;this.onopen?.();}
  message(data){this.onmessage?.({data:JSON.stringify(data)});}
  close(){this.readyState=3;this.onclose?.();}
 }
 const page='https://schmitti92.github.io'+pathname+query;
 const location={href:page,pathname,search:query,assign:url=>redirects.push(url)};
 const user={uid:'hero-b',getIdToken:async()=> 'secret-token'};
 const window={
  SPIELPORTAL_CONFIG:{apiBase:'https://serverfinal-ynbe.onrender.com'},
  SpielOnline:{state:()=>online?{status:'online',user}:{status:'guest',user:null}},
  addEventListener:(type,cb)=>listeners.set('window:'+type,cb)
 };
 const document={
  hidden:false,currentScript:{src:'https://schmitti92.github.io/Spiel-client/dog-boss-invites.js'},
  createElement:tag=>new Element(tag),
  body:{append:element=>added.push(element)},
  querySelector:()=>null,
  addEventListener:(type,cb)=>listeners.set('document:'+type,cb)
 };
 const ctx={window,document,location,URL,URLSearchParams,WebSocket:WS,Date,
  setTimeout:(cb,ms)=>{const id=++seq;timers.set(id,{cb,ms});return id;},
  clearTimeout:id=>timers.delete(id),
  setInterval:(cb,ms)=>{const id=++seq;ticks.set(id,{cb,ms});return id;},
  clearInterval:id=>ticks.delete(id)
 };
 runInNewContext(script,ctx);
 const emit=(type)=>listeners.get(type)?.();
 const tick=(times=1)=>{for(let i=0;i<times;i++)for(const [id,t] of [...ticks]){if(ticks.has(id))t.cb();}};
 return {sockets,redirects,added,user,document,emit,tick,timers,ticks,microtasks,
  connect:async()=>{
   await microtasks();
   const ws=sockets.at(-1);assert.ok(ws,'expected authenticated socket');
   ws.open();assert.deepEqual(JSON.parse(JSON.stringify(ws.sent)),[
    {type:'subscribe',idToken:'secret-token',gate:0,scope:'team'}
   ]);ws.message({type:'subscribed',gate:0});return ws;
  }
 };
}
test('online 100-Tore team member receives arena-entry invitation and may decline without navigating',async()=>{
 const f=fixture();
 const socket=await f.connect();
 assert.equal(socket.url,'wss://serverfinal-ynbe.onrender.com/dog/updates');
 assert.equal(socket.url.includes('secret-token'),false);
 socket.message({type:'invite',gate:10,reason:'entered'});
 assert.equal(f.added.length,1);
 const dialog=f.added[0];
 assert.match(dialog.children[0].textContent,/Boss 10/);
 assert.match(dialog.children[1].textContent,/hat die Bossarena betreten/);
 assert.equal(f.ticks.size,1);
 dialog.children[2].children[1].click();
 assert.equal(f.redirects.length,0);
 assert.equal(f.ticks.size,0,'declining cancels automatic redirect');
 socket.message({type:'invite',gate:10,reason:'ready'});
 assert.equal(f.added.length,1,'duplicate ready signal must not reopen a closed invite');
});
test('one server-ready hint moves another player after six seconds to the correct boss arena',async()=>{
 const f=fixture({query:'?room=123'});
 const socket=await f.connect();
 socket.message({type:'invite',gate:20,reason:'ready'});
 assert.match(f.added[0].children[1].textContent,/Ein Mitspieler ist bereit/);
 f.tick(5);
 assert.equal(f.redirects.length,0);
 f.tick(1);
 assert.equal(f.redirects.length,1);
 const target=new URL(f.redirects[0]);
 assert.ok(target.pathname.endsWith('/dog-group-boss.html'));
 assert.equal(target.searchParams.get('gate'),'20');
 assert.equal(target.searchParams.get('room'),'123');
 assert.equal(f.ticks.size,0);
});
test('anonymous users never subscribe, and an active boss arena does not open a second team subscription',async()=>{
 const offline=fixture({online:false});await microtasks();
 assert.equal(offline.sockets.length,0);
 const arena=fixture({pathname:'/Spiel-client/dog-boss10.html'});
 await microtasks();
 assert.equal(arena.sockets.length,0);
});
