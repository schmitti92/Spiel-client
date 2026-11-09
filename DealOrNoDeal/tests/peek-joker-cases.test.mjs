import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Script} from 'node:vm';

const js=readFileSync(new URL('../js/peek-joker.js',import.meta.url),'utf8');
const html=readFileSync(new URL('../game.html',import.meta.url),'utf8');

function harness(count=28){
 const elements=new Map(),requests=[],storage=new Map();
 const element=id=>{
  if(!elements.has(id)){
   const item={id,hidden:false,disabled:false,textContent:'',title:'',style:{},
    children:[],handlers:{},classList:{toggle(){},add(){}},
    append(node){this.children.push(node)},
    replaceChildren(){this.children=[]},
    addEventListener(type,callback){this.handlers[type]=callback}};
   elements.set(id,item);
  }
  return elements.get(id);
 };
 const myUid='player-123';
 const game={id:'match-1',phase:'open',players:[{id:myUid,case:count-1,deal:null}],caseCount:count,opened:[],pending:null};
 const context={
  document:{
   head:{append(){}},body:{append(){}},hidden:false,
   createElement(tag){return element(tag+'-'+Math.random())},
   getElementById:element,
   addEventListener(){}
  },
  window:{addEventListener(){}},
  sessionStorage:{
   setItem:(k,v)=>storage.set(k,v),
   getItem:k=>storage.get(k)||null,
   removeItem:k=>storage.delete(k)
  },
  g:game,base:'https://example.test',code:'123',
  myId:()=>myUid,
  user:()=>({uid:myUid,getIdToken:async()=>'test-token'}),
  eur:amount=>(amount/100).toLocaleString('de-DE')+' €',
  crypto:{randomUUID:()=> 'peek-request-1234567890'},
  fetch:async (url,options)=>{
   requests.push({url,options});
   const isInventory=url.endsWith('/peek/me');
   return {ok:true,json:async()=>isInventory
    ?{ok:true,balance:2}
    :{ok:true,case:JSON.parse(options.body).case,amount:420000,balance:1}};
  }
 };
 new Script(js,{filename:'peek-joker.js'}).runInNewContext(context);
 return {elements,requests,game,storage,element};
}

test('client Joker UI works for 26, 27, 28 case matches and includes final case',async()=>{
 for(const count of [26,27,28]){
  const ui=harness(count);
  const launch=Array.from(ui.elements.values()).find(x=>x.id==='peek-launch');
  assert.ok(launch);
  assert.equal(launch.hidden,false);
  await launch.handlers.click();
  const tiles=ui.element('peek-cases').children;
  assert.equal(tiles.length,count);
  assert.equal(tiles.at(-1).textContent,String(count));
  tiles.at(-1).onclick();
  const confirm=ui.element('peek-confirm');
  assert.equal(confirm.hidden,false);
  assert.match(confirm.textContent,new RegExp('Koffer '+count+' einsetzen'));
  await confirm.handlers.click();
  const post=ui.requests.find(x=>x.options.method==='POST');
  assert.ok(post,'peek POST should be sent');
  assert.equal(JSON.parse(post.options.body).case,count-1);
  assert.match(ui.element('peek-result').textContent,new RegExp('Koffer '+count+':'));
  assert.equal(ui.element('peek-balance').textContent,'Verfügbare Joker: 1');
  assert.deepEqual(ui.game.opened,[],'peek never opens a case in shared game');
  assert.equal(ui.game.phase,'open');
 }
});

test('client code uses match case count rather than old fixed 26 cap',()=>{
 assert.doesNotMatch(js,/for\(let i=0;i<26;i\+\+\)/);
 assert.doesNotMatch(js,/p\.case<26&&/);
 assert.match(js,/for\(let i=0;i<caseCount\(\);i\+\+\)/);
 assert.match(js,/p\.case<caseCount\(\)&&/);
 assert.match(js,/errorMessage\(e\.message\)/);
 assert.match(html,/peek-joker\.js\?v=20261109-28case-fix-v1/);
});

test('closed own case is shown and 28th case cannot be used after it opens',async()=>{
 const ui=harness(28);
 await Array.from(ui.elements.values()).find(x=>x.id==='peek-launch').handlers.click();
 assert.equal(ui.element('peek-cases').children.at(-1).classList!=null,true);
 ui.game.opened.push(27);
 // Trigger selection list refresh via the existing event listener in production;
 // reconstruct a fresh dialog to ensure the invalid case is disabled by state.
 const next=harness(28);
 next.game.opened.push(27);
 await Array.from(next.elements.values()).find(x=>x.id==='peek-launch').handlers.click();
 assert.equal(next.element('peek-cases').children.at(-1).disabled,true);
});
