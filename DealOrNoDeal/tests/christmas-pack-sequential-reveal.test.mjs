import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Script} from 'node:vm';

const load=file=>readFileSync(new URL('../'+file,import.meta.url),'utf8');
const html=load('weihnachten.html');
const css=load('css/christmas-pack-cinema.css');
const cinema=load('js/christmas-pack-cinema.js');
const inline=html.match(/<script>([\s\S]*?)<\/script>/)?.[1]||'';
function makeCinema(){
 const env={window:{},document:{readyState:'loading',addEventListener(){}},setTimeout,clearTimeout};
 new Script(cinema).runInNewContext(env);
 return env.window.ChristmasPackCinema;
}
function span(start,end){
 const a=inline.indexOf(start),b=inline.indexOf(end,a+start.length);
 assert.ok(a>=0&&b>a,'Missing snippet '+start);
 return inline.slice(a,b);
}
test('pack cards are sorted common → rare → epic → legendary without touching server data',()=>{
 const cinema=makeCinema();
 const cards=Object.freeze([
  Object.freeze({id:'L1',rarity:'legendary'}),
  Object.freeze({id:'E1',rarity:'epic'}),
  Object.freeze({id:'R1',rarity:'rare'}),
  Object.freeze({id:'C1',rarity:'common'}),
  Object.freeze({id:'E2',rarity:'epic'}),
  Object.freeze({id:'L2',rarity:'legendary'}),
  Object.freeze({id:'C2',rarity:'common'}),
  Object.freeze({id:'R2',rarity:'rare'})
 ]);
 const arranged=cinema.orderCards(cards);
 assert.equal(Array.from(arranged,x=>x.id).join(','),'C1,C2,R1,R2,E1,E2,L1,L2');
 assert.equal(cards[0].id,'L1','real server payload is never mutated');
 assert.equal(arranged[0],cards[3],'card objects are not cloned or altered');
 assert.equal(arranged.at(-1),cards[5]);
 assert.equal(cinema.orderCards(undefined).length,0);
});
test('all reveals including demo, monster packs and normal purchases use the same ordered presentation',()=>{
 const open=span('function openReveal(revealed','function finishReveal()');
 const finish=span('function finishReveal()','async function revealNext()');
 assert.match(open,/ChristmasPackCinema\?\.orderCards\?\.\(revealed\)/);
 assert.match(open,/revealState=\{cards:array/);
 assert.match(finish,/state\.cards\.forEach/);
 assert.match(html,/openReveal\(demo,'demo','premium'\)/);
 assert.match(html,/openReveal\(cards,'real',pack\)/);
 assert.match(html,/openReveal\(revealed,'real',pack\)/);
 assert.match(open,/stopRevealAuto\(\)/);
 assert.match(finish,/stopRevealAuto\(\)/);
 assert.match(inline,/close\.addEventListener\('click',\(\)=>\{\s*stopRevealAuto\(\)/);
});
test('each opened card is a large spotlight with its own zoom and rarity finale',()=>{
 assert.match(css,/pc-card-magnify/);
 assert.match(css,/#reveal-overlay\[data-stage=card\] \.reveal-card/);
 assert.match(css,/width:min\(410px,88%\)/);
 assert.match(css,/max-height:345px/);
 assert.match(css,/width:min\(345px,84vw\)/);
 assert.match(css,/reveal-card\.legendary/);
 assert.match(css,/reveal-card\.epic/);
 assert.match(css,/@media\(max-width:380px\)/);
 assert.match(css,/prefers-reduced-motion:reduce/);
 assert.match(html,/sequential-v2/);
});

test('each card reveals, enlarges, then automatically reveals the next until summary',async()=>{
 const nextCode=span('async function revealNext(){',"next.addEventListener('click'");
 const state={
  cards:[
   {id:'c',rarity:'common',name:'Normal',isNew:true},
   {id:'r',rarity:'rare',name:'Selten',isNew:true},
   {id:'e',rarity:'epic',name:'Episch',isNew:false},
   {id:'l',rarity:'legendary',name:'Legendär',isNew:true}
  ],index:-1,mode:'real'
 };
 const elements=new Map();
 const get=id=>{if(!elements.has(id))elements.set(id,{hidden:false,textContent:'',src:'',alt:'',className:''});return elements.get(id)};
 const timerJobs=new Map();let ticket=0,completed=0;
 const shown=[];
 const ctx={
  revealState:state,revealMotionToken:0,revealMotionBusy:false,revealAutoTimer:null,
  next:{disabled:false,hidden:false,textContent:''},overlay:{hidden:false,dataset:{}},
  document:{getElementById:get},
  window:{ChristmasPackCinema:{
   startCard:async()=>{},
   showCard:(card,i,n)=>shown.push({id:card.id,index:i,total:n})
  }},
  christmasCardImage:card=>card.id+'.png',
  stopRevealAuto(){if(ctx.revealAutoTimer!=null){timerJobs.delete(ctx.revealAutoTimer);ctx.revealAutoTimer=null}},
  revealCardHoldMs:card=>({common:1800,rare:2200,epic:2900,legendary:3900})[card.rarity],
  finishReveal(){completed++;ctx.revealState=null},
  setTimeout:(cb,ms)=>{const id=++ticket;timerJobs.set(id,{cb,ms});return id},
  clearTimeout:id=>timerJobs.delete(id)
 };
 new Script(nextCode+'\nthis.advance = revealNext;').runInNewContext(ctx);
 for(let i=0;i<4;i++){
  if(i===0)await ctx.advance();
  else{
   const task=timerJobs.get(ctx.revealAutoTimer);
   assert.ok(task,'expected scheduled automatic card');
   timerJobs.delete(ctx.revealAutoTimer);
   task.cb();
   await new Promise(resolve=>setImmediate(resolve));
  }
  assert.equal(shown[i].id,state.cards[i].id);
  assert.equal(ctx.revealMotionBusy,false);
  assert.equal(get('reveal-card').hidden,false);
  assert.equal(get('reveal-image').src,state.cards[i].id+'.png');
  assert.equal(timerJobs.get(ctx.revealAutoTimer).ms,[1800,2200,2900,3900][i]);
 }
 const last=timerJobs.get(ctx.revealAutoTimer);
 timerJobs.delete(ctx.revealAutoTimer);last.cb();
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(completed,1,'summary must appear after final legendary card');
 assert.equal(shown.length,4);
 assert.equal(ctx.revealState,null);
});
