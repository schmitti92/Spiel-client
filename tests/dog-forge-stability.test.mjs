import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve,dirname} from 'node:path';
import {runInNewContext} from 'node:vm';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const read=p=>readFileSync(resolve(root,p),'utf8');
const code=read('dog-forge-ui.js');
const flush=async()=>{for(let n=0;n<25;n++)await Promise.resolve()};
const view=level=>({
 ok:true,hero:{levels:{weapon:level,armor:1},successes:0,failures:0,crafts:0,exchanges:0,recent:[]},
 items:[{id:'weapon',name:'Waffe',icon:'⚔️',group:'equipment',baseLevel:1,maxLevel:20,summary:''},
 {id:'armor',name:'Rüstung',icon:'🛡️',group:'equipment',baseLevel:1,maxLevel:20,summary:''}],
 quotes:[{itemId:'weapon',level,nextLevel:level+1,cost:{iron:2},successChance:100,affordable:true,maxed:false}],
 inventory:{resources:{iron:1000,forge_coal:1000}}
});
function harness(){
 const nodes=new Map(),events=new Map(),store=new Map(),calls=[],timers=new Map();
 let uid='A',blocked=false,postMode='normal',complete,serial=0;
 function element(tag='div'){
  const h={},set=new Set();
  return {tag,className:'',textContent:'',href:'',disabled:false,hidden:false,
   open:false,children:[],handlers:h,attrs:{},value:'',dataset:{},style:{
    width:'',setProperty(){},removeProperty(){}
   },classList:{add(x){set.add(x)},remove(x){set.delete(x)},
    contains(x){return set.has(x)},toggle(x,enabled){if(enabled)set.add(x);else set.delete(x)}},
   setAttribute(k,v){this.attrs[k]=v},addEventListener(k,v){h[k]=v},
   append(...a){this.children.push(...a)},replaceChildren(...a){this.children=a},
   replaceWith(){},showModal(){this.open=true},close(){this.open=false;h.close?.()},
   closest(){return null},scrollIntoView(){}
  }
 }
 function el(id){if(!nodes.has(id))nodes.set(id,element(id));return nodes.get(id)}
 el('upgrade-content').closest=()=>el('upgrade-panel');
 const tabs=['equipment','attack','defense','exchange'].map(name=>{
  const n=element('button');n.dataset.tab=name;n.className='forge-tab';return n
 });
 const add=(name,fn)=>{const arr=events.get(name)||[];arr.push(fn);events.set(name,arr)};
 const doc={hidden:false,getElementById:el,createElement:element,
  createTextNode(text){const n=element('#text');n.textContent=text;return n},
  querySelectorAll(q){return q==='.forge-tab'?tabs:[]},
  querySelector(q){return q==='.upgrade-panel'?el('upgrade-panel'):tabs[0]},
  addEventListener:add};
 const win={SPIELPORTAL_CONFIG:{apiBase:'https://local.invalid'},
  SpielOnline:{state(){return uid?{status:'online',user:{
   uid,getIdToken:async()=>('token-'+uid)},profile:{name:'Held '+uid,setupComplete:true}}:null}},
  DogForgeCeremony:{start(){},finish:async()=>{},abort(){}},
  DogForgeGallery:{render(){},open(){}},addEventListener:add};
 const localStorage={getItem:k=>store.get(k)||null,
  setItem(k,v){if(blocked)throw Error('blocked');store.set(k,v)},
  removeItem:k=>store.delete(k)};
 class Controller{
  constructor(){const listeners=[];this.signal={aborted:false,addEventListener(k,fn){
   if(k==='abort')listeners.push(fn)}};
   this.abort=()=>{this.signal.aborted=true;for(const fn of listeners)fn()}
  }
 }
 const reply=data=>({ok:true,json:async()=>data});
 async function fetch(url,opts){
  const account=opts.headers.Authorization.replace('Bearer token-','');
  const record={method:opts.method,account,opts};calls.push(record);
  if(opts.method==='GET')return reply(view(account==='B'?8:1));
  if(postMode==='defer')return new Promise(resolve=>{
   complete=()=>resolve(reply({...view(2),result:{
    type:'upgrade',itemId:'weapon',success:true,oldLevel:1,newLevel:2}}))
  });
  if(postMode==='timeout')return new Promise((_,reject)=>{
   opts.signal.addEventListener('abort',()=>reject(Error('AbortError')));
  });
  return reply({...view(2),replayed:postMode==='replay',
   result:{type:'upgrade',itemId:'weapon',success:true,oldLevel:1,newLevel:2}});
 }
 runInNewContext(code,{window:win,document:doc,localStorage,
  fetch,URLSearchParams,location:{search:'?room=123'},AbortController:Controller,
  setTimeout(fn,ms){const id=++serial;timers.set(id,{fn,ms});return id},
  clearTimeout(id){timers.delete(id)}});
 const emit=name=>{for(const fn of events.get(name)||[])fn()};
 const click=target=>{const n=typeof target==='string'?el(target):target;
  assert.equal(typeof n?.handlers?.click,'function','clickable node');
  n.handlers.click()};
 const find=(n,p)=>p(n)?n:(n.children||[]).map(c=>find(c,p)).find(Boolean);
 const upgrade=()=>{
  const btn=find(el('upgrade-content'),n=>n.className?.split(' ').includes('forge-action'));
  click(btn);assert.equal(el('forge-confirm').open,true);click('forge-confirm-submit');
 };
 const get=()=>calls.filter(c=>c.method==='GET');
 const posts=()=>calls.filter(c=>c.method==='POST');
 return {el,emit,click,upgrade,store,timers,get,posts,doc,
  account(v){uid=v;emit('spielonline-change')},block(v){blocked=v},
  mode(v){postMode=v},finishPost(){complete()}}
}
test('D5 preserved room navigation and no repeat GET from noisy auth updates',async()=>{
 const h=harness();await flush();assert.equal(h.get().length,1);
 assert.equal(h.el('forge-back').href,'./dog-expedition.html?room=123');
 assert.equal(h.el('forge-materials').href,'./dog-expedition.html?room=123');
 h.emit('spielonline-change');h.emit('spielonline-change');
 h.emit('visibilitychange');await flush();
 assert.equal(h.get().length,1,'same data should not refetch');
 h.click('forge-refresh');h.click('forge-refresh');await flush();
 assert.equal(h.get().length,2,'overlapping refreshes share GET');
 h.account('B');await flush();
 assert.equal(h.get().at(-1).account,'B');
 assert.equal(h.el('forge-weapon-level').children[0].textContent,'8');
});
test('D5 disabled browser storage prevents all unsafe forge POSTs',async()=>{
 const h=harness();await flush();h.block(true);h.upgrade();await flush();
 assert.equal(h.posts().length,0);
 assert.match(h.el('forge-status').textContent,/nicht speichern/);
});
test('D5 account switch mid-POST isolates state and preserves replay ID',async()=>{
 const h=harness();await flush();h.mode('defer');h.upgrade();await flush();
 const receipt=JSON.parse(h.store.get('dog:forge:pending:A')).id;
 h.account('B');assert.equal(h.el('forge-retry-wrap').hidden,true);
 h.finishPost();await flush();
 assert.equal(h.get().at(-1).account,'B');
 assert.equal(h.el('forge-weapon-level').children[0].textContent,'8');
 assert.ok(h.store.get('dog:forge:pending:A'));
 h.mode('replay');h.account('A');await flush();
 assert.equal(h.el('forge-retry-wrap').hidden,false);
 h.click('forge-retry');await flush();
 assert.equal(JSON.parse(h.posts().at(-1).opts.body).requestId,receipt);
 assert.equal(h.store.has('dog:forge:pending:A'),false);
});
test('D5 uncertain POST timeout keeps the receipt for safe replay',async()=>{
 const h=harness();await flush();h.mode('timeout');h.upgrade();await flush();
 const receipt=h.store.get('dog:forge:pending:A');
 assert.equal(h.posts().length,1);
 const timeout=[...h.timers.values()].find(x=>x.ms===20000);
 assert.ok(timeout);timeout.fn();await flush();
 assert.equal(h.store.get('dog:forge:pending:A'),receipt);
 assert.equal(h.el('forge-retry-wrap').hidden,false);
 assert.match(h.el('forge-status').textContent,/Sicher wiederholen/);
});
test('D5 A→B→A profile flip never celebrates a stale receipt',async()=>{
 const h=harness();await flush();h.mode('defer');h.upgrade();await flush();
 h.account('B');h.account('A');h.finishPost();await flush();
 assert.ok(h.store.get('dog:forge:pending:A'));
 assert.equal(h.el('forge-result').open,false);
});
test('D5 touch layout, hidden controls and expedition links are stable',()=>{
 const css=read('dog-forge.css'),exp=read('dog-materials-ui.js');
 assert.ok(css.includes('.retry-bar[hidden]'));
 assert.ok(css.includes('.forge-goal-banner[hidden]'));
 assert.ok(css.includes('@media(max-width:640px) and (pointer:coarse)'));
 assert.ok(css.includes('background-attachment:scroll'));
 assert.ok(exp.includes("'forge-launch','forge-from-storage'"));
 assert.ok(exp.includes('encodeURIComponent(room)'));
 assert.ok(code.includes("'INVALID_EXCHANGE_COUNT','DOG_MATERIALS_LIMIT'"));
});
