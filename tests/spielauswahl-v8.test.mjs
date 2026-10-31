import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const source=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const local=source('spielauswahl-lokal.html');
const online=source('spielauswahl-online.html');
const controller=source('spielauswahl-online.js');
const hub=source('hub-lobby.js');
const bridge=source('hub-game-bridge.js');
const GAME_KEYS=['barikade','skyjo','kreuz','business'];
test('Local mode lands on artwork-rich game selection with no online/auth controls',()=>{
 assert.equal((local.match(/<article class="game/g)||[]).length,4);
 assert.match(local,/Assets\/game-backgrounds\/barikade\.webp/);
 for(const path of ['Barikade/barikade.html?offline=1','Skyjo/skyjo_action_local.html?mode=local',
  'KreuzKunter/kreuzkunter.html?mode=local','Business/business_local.html'])assert.ok(local.includes(path),path);
 assert.doesNotMatch(local,/profile-auth\.js|profile-core\.js|spielauswahl-online\.js/);
 assert.doesNotMatch(local,/href="[^"]*(?:mode=online|business_online)/);
});
test('Online game selection uses four server-protected game buttons, not independent room links',()=>{
 assert.equal((online.match(/<article class="game/g)||[]).length,5);
 for(const g of GAME_KEYS)assert.ok(online.includes('data-select-game="'+g+'"'));
 assert.equal((online.match(/data-select-game=/g)||[]).length,4);
 assert.doesNotMatch(online,/href="(?:Skyjo\/skyjo_action|Business\/business_online|KreuzKunter\/kreuzkunter)/);
 assert.match(controller,/getIdToken\(\)/);
 assert.match(controller,/\/rooms\/'.*?\+code\+'\/select'/s);
});
test('Entering or creating a room navigates to online game-selection home',()=>{
 assert.match(hub,/request\('\/rooms','POST'\);location\.assign\('spielauswahl-online\.html\?room='/);
 assert.match(hub,/request\('\/rooms\/'\+c\+'\/join','POST'\);location\.assign\('spielauswahl-online\.html\?room='/);
 assert.match(hub,/location\.assign\('spielauswahl-lokal\.html'\)/);
 assert.match(bridge,/spielauswahl-online\.html\?room=/);
});
function simulate({host=true,phase='lobby',game=null,choose=false}={}){
 const buttons=GAME_KEYS.map(g=>({dataset:{selectGame:g},disabled:false,listeners:{},addEventListener(t,fn){this.listeners[t]=fn;}}));
 const elements=new Map();
 const el=id=>{if(!elements.has(id))elements.set(id,{textContent:'',value:'',style:{},classList:{toggle(){}},disabled:false,addEventListener(){},focus(){}});return elements.get(id);};
 const navigated=[],requests=[];
 const room={code:'ABC23D',host,phase,game,players:[{name:'Alice',host:true},{name:'Bob',host:false}]};
 const person={uid:host?'alice':'bob',getIdToken:async()=> 'signed-token'};
 const fetch=async(url,opts)=>{
  requests.push({url,opts});
  if(opts.method==='POST')return {ok:true,json:async()=>({ok:true,room:{...room,game:JSON.parse(opts.body).game,phase:'preparing'}})};
  return {ok:true,json:async()=>({ok:true,room})};
 };
 const location={href:'https://example.com/spielauswahl-online.html?room=ABC23D'+(choose?'&choose=1':''),
  replace:u=>navigated.push({type:'replace',url:u}),assign:u=>navigated.push({type:'assign',url:u})};
 const document={hidden:false,querySelectorAll:()=>buttons,getElementById:el,addEventListener(){}};
 const window={SPIELPORTAL_CONFIG:{apiBase:'https://server.example.com'},SpielOnline:{state:()=>({
  status:'online',profile:{setupComplete:true},user:person
 })},addEventListener(){}};
 runInNewContext(controller,{document,window,location,URL,AbortController,fetch,
  setTimeout:()=>1,clearTimeout:()=>{},setInterval:()=>1});
 return {buttons,elements,navigated,requests};
}
const flush=async()=>{await new Promise(resolve=>setImmediate(resolve));await new Promise(resolve=>setImmediate(resolve));};
test('The authenticated host can select Barikade using only existing room code',async()=>{
 const view=simulate({host:true});
 await flush();
 assert.equal(view.buttons.every(b=>b.disabled===false),true);
 await view.buttons[0].listeners.click();
 assert.deepEqual(JSON.parse(view.requests.find(r=>r.opts.method==='POST').opts.body),{game:'barikade'});
 assert.equal(view.requests.filter(r=>r.opts.method==='POST').length,1);
 assert.ok(view.requests.every(r=>r.opts.headers.Authorization==='Bearer signed-token'));
 assert.deepEqual(view.navigated,[{type:'assign',url:'Barikade/barikade_start.html?room=ABC23D'}]);
});
test('Members cannot select a game; host selection updates every member',async()=>{
 const guest=simulate({host:false});
 await flush();
 assert.equal(guest.buttons.every(b=>b.disabled),true);
 await guest.buttons[0].listeners.click();
 assert.equal(guest.requests.filter(r=>r.opts.method==='POST').length,0);
 assert.equal(guest.navigated.length,0);
 const alreadySelected=simulate({host:false,game:'skyjo',phase:'preparing'});
 await flush();
 assert.deepEqual(alreadySelected.navigated,[{type:'replace',url:'Skyjo/skyjo_start.html?room=ABC23D'}]);
});
test('Host can choose a different game without being redirected back to old pre-room',async()=>{
 const view=simulate({host:true,game:'skyjo',phase:'preparing',choose:true});
 await flush();
 assert.deepEqual(view.navigated,[]);
 assert.equal(view.buttons.every(b=>!b.disabled),true);
 await view.buttons[3].listeners.click();
 assert.equal(view.requests.find(r=>r.opts.method==='POST').opts.body,'{"game":"business"}');
 assert.deepEqual(view.navigated,[{type:'assign',url:'Business/business_start.html?room=ABC23D'}]);
});

test('Skyjo opens its own illustrated pre-room, not the generic pre-room',async()=>{
 const view=simulate({host:true});
 await flush();
 await view.buttons[1].listeners.click();
 assert.deepEqual(JSON.parse(view.requests.find(r=>r.opts.method==='POST').opts.body),{game:'skyjo'});
 assert.deepEqual(view.navigated,[{type:'assign',url:'Skyjo/skyjo_start.html?room=ABC23D'}]);
});

test('Business selection and preselected guest enter its dedicated online start room',async()=>{
 const host=simulate({host:true});
 await flush();
 await host.buttons[3].listeners.click();
 assert.deepEqual(JSON.parse(host.requests.find(r=>r.opts.method==='POST').opts.body),{game:'business'});
 assert.deepEqual(host.navigated,[{type:'assign',url:'Business/business_start.html?room=ABC23D'}]);
 const guest=simulate({host:false,game:'business',phase:'preparing'});
 await flush();
 assert.deepEqual(guest.navigated,[{type:'replace',url:'Business/business_start.html?room=ABC23D'}]);
});
