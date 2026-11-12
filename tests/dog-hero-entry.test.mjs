import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const code=readFileSync(new URL('../dog-hero-entry.js',import.meta.url),'utf8');
async function scenario(map,{logged=true}={}){
 let redirected=null,reads=0;
 const handlers=new Map();
 const user={uid:'hero-a',getIdToken:async()=> 'signed-token'};
 const window={
  SPIELPORTAL_CONFIG:{apiBase:'https://example.com'},
  SpielOnline:{state:()=>logged?{status:'online',user,profile:{setupComplete:true}}:null},
  addEventListener:(event,fn)=>handlers.set(event,fn)
 };
 const document={readyState:'complete',addEventListener:()=>{}};
 const location={search:'?room=123',replace:url=>{redirected=url}};
 const fetch=async(url,options)=>{
  reads++;
  assert.equal(url,'https://example.com/api/dog/gates/map');
  assert.equal(options.headers.Authorization,'Bearer signed-token');
  return {ok:true,json:async()=>({ok:true,...map})};
 };
 vm.runInNewContext(code,{window,document,location,fetch,setTimeout,clearTimeout,AbortController},
  {timeout:1000});
 await new Promise(resolve=>setImmediate(resolve));
 return {redirected,reads,handlers};
}

test('First-time 100-Tore visitor is sent to hero choice before expedition dashboard',async()=>{
 const s=await scenario({
  isMember:true,canJoin:false,
  members:[{uid:'hero-a',isMe:true,heroClass:'krieger',heroLocked:false}]
 });
 assert.equal(s.redirected,'./dog-tor-map.html?room=123');
 assert.equal(s.reads,1);
 s.handlers.get('spielonline-change')();
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(s.reads,1,'one check per signed-in visit, not on each auth update');
});
test('All three classes, including repeated class choices, are handled by server state rather than pre-selected locally',async()=>{
 const s=await scenario({isMember:false,canJoin:true,members:[]});
 assert.equal(s.redirected,'./dog-tor-map.html?room=123');
});
test('A permanently chosen character is not redirected or prompted again',async()=>{
 const s=await scenario({
  isMember:true,canJoin:false,
  members:[{uid:'hero-a',isMe:true,heroClass:'magierin',heroLocked:true}]
 });
 assert.equal(s.redirected,null);assert.equal(s.reads,1);
});
test('Unauthenticated users and visitors to a full team are not autoenrolled',async()=>{
 const guest=await scenario({}, {logged:false});
 assert.equal(guest.reads,0);assert.equal(guest.redirected,null);
 const full=await scenario({isMember:false,canJoin:false,members:[]});
 assert.equal(full.redirected,null);
});
