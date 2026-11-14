import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';

const source=readFileSync(new URL('../hub-game-bridge.js',import.meta.url),'utf8');
const MATCH='123e4567-e89b-12d3-a456-426614174000';

function simulate(room){
  const http=[],timers=[],elements=[];
  const listeners={};
  const document={
    hidden:false,readyState:'complete',
    getElementById:id=>elements.find(x=>x.id===id)||null,
    createElement(tag){
      return {tag,style:{},hidden:false,children:[],append(...xs){this.children.push(...xs)},
        setAttribute(){},addEventListener(type,fn){this[type]=fn}};
    },
    addEventListener(type,fn){listeners[type]=fn},
    body:{append(el){elements.push(el)}},
    documentElement:{append(el){elements.push(el)}}
  };
  const user={getIdToken:async()=> 'fixture-id-token'};
  const window={SPIELPORTAL_CONFIG:{apiBase:'https://local-test.invalid'},
    SpielOnline:{state:()=>({status:'online',user})},addEventListener(){}};
  const setInterval=(fn,ms)=>{timers.push({fn,ms,kind:'interval'});return timers.length};
  const setTimeout=(fn,ms)=>{timers.push({fn,ms,kind:'timeout'});return timers.length};
  const currentRoom={...room};
  const fetch=async(url,options)=>{
    http.push({url,method:options?.method||'GET'});
    return {ok:true,json:async()=>({ok:true,room:currentRoom})};
  };
  const context={window,document,fetch,setInterval,setTimeout,clearInterval(){},clearTimeout(){},
    AbortController,URL,Date,confirm:()=>false,alert(){},
    location:{href:'https://example.invalid/Barikade/barikade.html?hub=ABC23D&match='+MATCH,assign(){}}};
  vm.runInNewContext(source,context,{filename:'hub-game-bridge.js'});
  const button=document.getElementById('spiel-hub-abort');
  return {http,timers,button,currentRoom};
}

test('Hub game bridge uses only the existing sync request to decide host controls',async()=>{
  const scenario=simulate({code:'ABC23D',phase:'playing',host:true,match:{id:MATCH}});
  assert.ok(scenario.button,'abort button is installed');
  assert.equal(scenario.button.hidden,true,'host stays hidden until authorized server reply');
  assert.equal(scenario.timers.some(t=>t.kind==='interval'&&t.ms===6000),false,
    'remove the redundant six-second host timer');
  assert.equal(scenario.timers.some(t=>t.kind==='interval'&&t.ms===7000),true,
    'retain match completion reconciliation');
  await scenario.timers.find(t=>t.kind==='timeout'&&t.ms===1800).fn();
  assert.equal(scenario.button.hidden,false,'the actual host still sees the abort button');
  assert.equal(scenario.http.length,1);
  assert.deepEqual(scenario.http.map(x=>x.method),['POST']);
  assert.ok(scenario.http[0].url.endsWith('/api/hub/rooms/ABC23D/sync'));
});

test('Other players do not receive host controls; completed rounds hide them',async()=>{
  const scenario=simulate({code:'ABC23D',phase:'playing',host:false,match:{id:MATCH}});
  await scenario.timers.find(t=>t.kind==='timeout'&&t.ms===1800).fn();
  assert.equal(scenario.button.hidden,true,'non-host has no abort authority');
  scenario.currentRoom.host=true;
  await scenario.timers.find(t=>t.kind==='interval'&&t.ms===7000).fn();
  assert.equal(scenario.button.hidden,false,'live host rights follow the server response');
  scenario.currentRoom.phase='lobby';
  scenario.currentRoom.match=null;
  scenario.currentRoom.lastCompleted={id:MATCH,status:'completed'};
  await scenario.timers.find(t=>t.kind==='interval'&&t.ms===7000).fn();
  assert.equal(scenario.button.hidden,true,'completed game hides abort');
  assert.equal(scenario.http.every(x=>x.method==='POST'&&x.url.endsWith('/sync')),true);
});
