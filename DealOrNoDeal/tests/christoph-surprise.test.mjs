import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext,Script} from 'node:vm';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const source=read('js/christoph-surprise.js');
const css=read('css/christoph-surprise.css');
const pages=['lobby.html','game.html','weihnachten.html','weihnachtswelt.html','weihnachtsmuetzen.html','shop.html'];

function fixture(){
 const calls=[],events=new Map(),local=new Map(),links=[],nodes=new Map();
 let uid='david';
 const claimed=new Map();
 const button={
  disabled:false,handlers:{},addEventListener(type,fn){this.handlers[type]=fn},
  focus(){},isConnected:true
 };
 const status={textContent:''};
 const modal={
  hidden:true,attributes:{},
  setAttribute(key,value){this.attributes[key]=value},
  querySelector:selector=>selector==='#christoph-surprise-thanks'?button:status
 };
 const user=()=>({uid,getIdToken:async()=>uid+'-token'});
 const doc={
  readyState:'complete',hidden:false,currentScript:{src:'https://game.example/DealOrNoDeal/js/christoph-surprise.js'},
  head:{append(el){links.push(el)}},body:{append(el){nodes.set(el.id,el)}},
  activeElement:null,
  createElement(tag){return tag==='link'?{rel:'',href:''}:modal},
  addEventListener(type,fn){events.set('document:'+type,fn)}
 };
 const win={
  SPIELPORTAL_CONFIG:{apiBase:'https://backend.example'},
  SpielOnline:{state:()=>({status:'online',user:user()})},
  addEventListener(type,fn){events.set(type,fn)}
 };
 const mockFetch=async(url,{method='GET',headers}={})=>{
  calls.push({url,method,authorization:headers.Authorization});
  const who=headers.Authorization.slice('Bearer '.length).replace('-token','');
  const previous=claimed.get(who);
  let result;
  if(url.endsWith('/status'))result={ok:true,id:'christoph-gruss-2026-11',claimed:!!previous,acknowledged:!!previous?.ack};
  else if(url.endsWith('/claim')){
   if(!previous)claimed.set(who,{ack:false,monster:2,hats:2});
   result={ok:true,id:'christoph-gruss-2026-11',claimed:true,acknowledged:false};
  }else if(url.endsWith('/ack')){
   claimed.get(who).ack=true;
   result={ok:true,id:'christoph-gruss-2026-11',claimed:true,acknowledged:true};
  }else throw Error('Unexpected request '+url);
  return {ok:true,json:async()=>result};
 };
 runInNewContext(source,{
  window:win,document:doc,URL,localStorage:{
   getItem:key=>local.has(key)?local.get(key):null,
   setItem:(key,value)=>local.set(key,value)
  },fetch:mockFetch,setInterval:()=>null,console
 });
 return {calls,events,button,modal,claimed,local,setUid:v=>uid=v};
}
async function flush(){for(let i=0;i<5;i++)await new Promise(resolve=>setImmediate(resolve))}

test('greeting JavaScript is valid and installed on every game and Christmas page',()=>{
 assert.doesNotThrow(()=>new Script(source));
 for(const path of pages){
  assert.match(read(path),/js\/christoph-surprise\.js\?v=20261110-gift-v1/);
 }
 assert.match(read('Weihnachtsevent2/index.html'),/\.\.\/js\/christoph-surprise\.js\?v=20261110-gift-v1/);
 assert.match(css,/#christoph-surprise\[hidden\]/);
 assert.match(css,/#christoph-surprise-thanks/);
 assert.match(source,/<strong>2×<\/strong><span>Monster-Rad-Drehungen<\/span>/);
 assert.match(source,/<strong>2×<\/strong><span>Weihnachtsmützen-Jackpot-Gutscheine<\/span>/);
 assert.match(source,/ich euch sehr gerne habe/);
});

test('players get a verified surprise and it only disappears after server ack',async()=>{
 const h=fixture();
 await flush();
 assert.equal(h.calls.length,2,'status then claim');
 assert.equal(h.calls[0].method,'GET');
 assert.equal(h.calls[1].method,'POST');
 assert.equal(h.modal.hidden,false);
 assert.equal(h.claimed.get('david').monster,2);
 assert.equal(h.claimed.get('david').hats,2);
 h.button.handlers.click();
 await flush();
 assert.equal(h.modal.hidden,true);
 assert.equal(h.claimed.get('david').ack,true);
 assert.ok([...h.local.keys()][0].endsWith(':david'));
 h.events.get('pageshow')();await flush();
 assert.equal(h.calls.length,3,'acknowledged players are not repolled');
});

test('account switching never shows a prior player gift and credits independent profiles',async()=>{
 const h=fixture();await flush();
 h.button.handlers.click();await flush();
 h.setUid('vanessa');
 h.events.get('spielonline-change')();
 await flush();
 assert.equal(h.modal.hidden,false);
 assert.equal(h.claimed.get('vanessa').monster,2);
 assert.equal(h.claimed.get('vanessa').hats,2);
 assert.equal(h.claimed.get('david').monster,2);
 h.button.handlers.click();await flush();
 assert.equal(h.local.size,2);
});
