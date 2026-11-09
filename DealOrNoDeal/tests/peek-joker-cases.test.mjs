import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Script} from 'node:vm';

const js=readFileSync(new URL('../js/peek-joker.js',import.meta.url),'utf8');
const html=readFileSync(new URL('../game.html',import.meta.url),'utf8');

function harness(count=28,{playerCount=3,balance=2,postError=null}={}){
 const elements=new Map(),requests=[],storage=new Map();
 const element=id=>{
  if(!elements.has(id)){
   const item={id,hidden:false,disabled:false,textContent:'',title:'',style:{},dataset:{},
    children:[],handlers:{},className:'',classList:{classes:new Set(),toggle(n,enabled){if(enabled)this.classes.add(n);else this.classes.delete(n)},add(n){this.classes.add(n)}},
    append(...nodes){this.children.push(...nodes)},
    replaceChildren(...nodes){this.children=[...nodes]},
    addEventListener(type,callback){this.handlers[type]=callback}};
   elements.set(id,item);
  }
  return elements.get(id);
 };
 const myUid='player-123';
 const players=[
  {id:myUid,name:'Ich',case:0,deal:null},
  {id:'vanessa',name:'Vanessa',case:count-1,deal:null},
  {id:'david',name:'David',case:5,deal:null},
  {id:'moin',name:'Moin',case:6,deal:null}
 ].slice(0,playerCount);
 const game={id:'match-1',phase:'open',players,caseCount:count,opened:[],pending:null};
 const privateResults=players.filter(p=>p.id!==myUid).map(p=>({
  id:p.id,name:p.name,case:p.case,amount:p.case===count-1?1000000000:p.case*100
 }));
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
  fetch:async(url,options)=>{
   requests.push({url,options});
   const inventory=url.endsWith('/peek/me');
   const result=inventory?{ok:true,balance}:{ok:true,case:JSON.parse(options.body).case,cases:privateResults,balance:balance-1};
   if(postError&&!inventory)return {ok:false,json:async()=>({ok:false,error:postError})};
   return {ok:true,json:async()=>result};
  }
 };
 new Script(js,{filename:'peek-joker.js'}).runInNewContext(context);
 return {elements,requests,game,storage,element,players,privateResults};
}
const launch=ui=>Array.from(ui.elements.values()).find(x=>x.id==='peek-launch');

test('all 26–29-case modes highlight other players and disable own/non-personal cases',async()=>{
 for(const count of [26,27,28,29]){
  const ui=harness(count,{playerCount:3});
  assert.equal(launch(ui).hidden,false);
  await launch(ui).handlers.click();
  const tiles=ui.element('peek-cases').children;
  assert.equal(tiles.length,count);
  assert.equal(tiles[0].disabled,true,'own case must be inaccessible');
  assert.ok(tiles[0].classList.classes.has('own'));
  assert.equal(tiles[2].disabled,true,'unassigned cases must be inaccessible');
  assert.equal(tiles[5].disabled,false,'David personal case must be selectable');
  assert.equal(tiles[count-1].disabled,false,'Vanessa personal case must be selectable');
  assert.ok(tiles[count-1].classList.classes.has('opponent'));
  tiles[count-1].onclick();
  const confirm=ui.element('peek-confirm');
  assert.equal(confirm.hidden,false);
  assert.match(confirm.textContent,/1 Joker für alle 2 Mitspieler-Koffer/);
  await confirm.handlers.click();
  const post=ui.requests.find(x=>x.options.method==='POST');
  assert.ok(post,'private peek request should be made once');
  assert.equal(JSON.parse(post.options.body).case,count-1);
  const privateView=ui.element('peek-result').children;
  assert.equal(privateView.length,2);
  assert.match(privateView[0].textContent,/2 persönliche Mitspieler-Koffer/);
  const playerCards=privateView[1].children;
  assert.equal(playerCards.length,2);
  assert.deepEqual(playerCards.map(c=>c.children[0].textContent),['Vanessa','David']);
  assert.ok(playerCards.every(c=>c.children[0].textContent!=='Ich'));
  assert.equal(ui.element('peek-balance').textContent,'Verfügbare Joker: 1');
  assert.deepEqual(ui.game.opened,[],'Joker must not open physical cases');
  assert.equal(ui.game.phase,'open');
 }
});
test('all other players appear at once for 2, 3 and 4 participants for one Joker',async()=>{
 for(const playerCount of [2,3,4]){
  const ui=harness(29,{playerCount,balance:1});
  await launch(ui).handlers.click();
  ui.element('peek-cases').children[28].onclick();
  await ui.element('peek-confirm').handlers.click();
  const cards=ui.element('peek-result').children[1].children;
  assert.equal(cards.length,playerCount-1);
  assert.equal(ui.requests.filter(r=>r.options.method==='POST').length,1);
  assert.equal(ui.element('peek-balance').textContent,'Verfügbare Joker: 0');
 }
});
test('a solo player cannot open the Joker to peek own selected case',()=>{
 const ui=harness(29,{playerCount:1});
 assert.equal(launch(ui).hidden,true);
});
test('client cannot select their own case nor ordinary unassigned cases',async()=>{
 const ui=harness(29,{playerCount:4});
 await launch(ui).handlers.click();
 const buttons=ui.element('peek-cases').children;
 buttons[0].onclick();
 buttons[2].onclick();
 assert.equal(ui.element('peek-confirm').hidden,true);
 assert.equal(ui.requests.filter(r=>r.options.method==='POST').length,0);
});
test('invalid requests keep Joker pending for safe retry',async()=>{
 const ui=harness(29,{postError:'OWN_CASE_FORBIDDEN'});
 await launch(ui).handlers.click();
 ui.element('peek-cases').children[28].onclick();
 await ui.element('peek-confirm').handlers.click();
 assert.match(ui.element('peek-error').textContent,/Deinen eigenen persönlichen Koffer/);
 assert.equal(ui.element('peek-result').textContent,'');
 assert.equal(ui.storage.size,1,'retry receipt remains in session');
});
test('UI displays only the private opponent list and uses dynamic 29-case capacity',()=>{
 assert.match(js,/const opponents=\(\)=>/);
 assert.match(js,/caseCount\(\)/);
 assert.match(js,/showPrivateResults\(data\)/);
 assert.match(js,/p\.id!==myId\(\)/);
 assert.match(js,/OWN_CASE_FORBIDDEN/);
 assert.match(js,/NO_OTHER_PLAYER_CASES/);
 assert.match(js,/peek-results-grid/);
 assert.match(html,/peek-joker\.js\?v=20261110-opponents-all-v1/);
 assert.doesNotMatch(js,/eur\(data\.amount\)/);
});
