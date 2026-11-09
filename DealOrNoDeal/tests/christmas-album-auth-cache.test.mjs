import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

const page=readFileSync('DealOrNoDeal/weihnachten.html','utf8');
const start=page.indexOf('let loadSequence=0,loadInFlight=');
const end=page.indexOf('// A retry reuses the original purchase ID',start);
assert.ok(start>0&&end>start,'Album authentication/load block exists');
const block=page.slice(start,end);
const makeClassList=()=>({
 values:new Set(),
 add(...tokens){tokens.forEach(t=>this.values.add(t))},
 remove(...tokens){tokens.forEach(t=>this.values.delete(t))},
 contains(token){return this.values.has(token)}
});
const el=()=>({
 textContent:'',hidden:false,style:{width:''},src:'',alt:'',attributes:{},
 classList:makeClassList(),
 setAttribute(key,val){this.attributes[key]=String(val)},
 removeAttribute(key){delete this.attributes[key]},
 querySelector(key){return this.children?.[key]||null}
});
function fixture(){
 let state={status:'online',user:{uid:'player-one',getIdToken:async()=>''}};
 const cards=Array.from({length:48},()=>{const root=el();root.children={img:el(),strong:el(),small:el()};return root});
 const rewards=Array.from({length:16},()=>{const root=el();root.children={'.lock':el()};return root});
 const ids=new Map();
 const element=id=>{if(!ids.has(id))ids.set(id,el());return ids.get(id)};
 const requests=[],renders=[];
 const ctx={
  current:null,
  window:{SpielOnline:{state:()=>state}},
  document:{
   querySelectorAll:key=>key==='[data-card]'?cards:[],
   getElementById:element,
   body:{classList:makeClassList()}
  },
  rewardsRoot:{querySelectorAll:()=>rewards},
  renderHammerCollection:()=>{},
  renderDuplicateExchange:()=>{},
  maybeClaimHammerBingos:()=>{},
  notice:el(),
  classicCardNumber:i=>i<32?i+1:i+33,
  base:'https://example.com',
  URL
 };
 ctx.request=()=>new Promise(resolve=>requests.push(resolve));
 ctx.render=data=>{ctx.current=data;renders.push(data)};
 runInNewContext(block,ctx);
 return {ctx,cards,rewards,requests,renders,element,setState:next=>{state=next}};
}

test('concurrent requests for the same profile share one Firestore-backed GET',async()=>{
 const fx=fixture();
 const first=fx.ctx.load(),second=fx.ctx.load();
 assert.equal(first,second);
 assert.equal(fx.requests.length,1);
 fx.requests[0]({cards:{},progress:{collected:0,totalBingos:0}});
 await Promise.all([first,second]);
 assert.equal(fx.renders.length,1);
 assert.equal(fx.element('event-balance').textContent,'⏳ Kontostand wird geladen …');
});

test('sign-out hides old cards, hammer previews, rewards and legend status',async()=>{
 const fx=fixture();
 const first=fx.ctx.load();
 fx.requests[0]({cards:{},progress:{collected:0,totalBingos:0}});
 await first;
 const card=fx.cards[32];
 card.classList.add('owned','bingo-complete');
 card.children.img.src='private.svg';
 card.children.strong.textContent='Geheimer Titel';
 card.setAttribute('aria-label','Gesammelte Karte: Geheim');
 fx.rewards[12].classList.add('unlocked');
 fx.rewards[12].children['.lock'].textContent='✅';
 fx.element('north-pole-legend-trophy').hidden=false;
 fx.setState({status:'offline',user:null});
 await fx.ctx.load();
 assert.equal(fx.ctx.current,null);
 assert.equal(card.classList.contains('owned'),false);
 assert.equal(card.children.img.src,'./assets/weihnachts_event/card-back-winter.svg');
 assert.equal(card.children.strong.textContent,'65 · ???');
 assert.equal(card.attributes['aria-label'],'Gesperrte Karte 65');
 assert.equal(fx.rewards[12].children['.lock'].textContent,'🔒');
 assert.equal(fx.element('north-pole-legend-trophy').hidden,true);
 assert.equal(fx.element('album-owned-total').textContent,'0 / 48');
 assert.equal(fx.element('album-bingo-total').textContent,'0 / 30');
});

test('late response from a signed-out account is ignored after new profile logs in',async()=>{
 const fx=fixture();
 const old=fx.ctx.load();
 fx.setState({status:'offline',user:null});
 await fx.ctx.load();
 fx.setState({status:'online',user:{uid:'player-two',getIdToken:async()=>''}});
 const newer=fx.ctx.load();
 assert.equal(fx.requests.length,2);
 fx.requests[0]({marker:'old'});
 await old;
 assert.equal(fx.renders.length,0);
 fx.requests[1]({marker:'new'});
 await newer;
 assert.equal(fx.renders.length,1);
 assert.equal(fx.renders[0].marker,'new');
});
