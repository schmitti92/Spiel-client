import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Script} from 'node:vm';

const load=name=>readFileSync(new URL('../'+name,import.meta.url),'utf8');
const event=load('weihnachten.html');
const game=load('game.html');
const inline=event.match(/<script>([\s\S]*?)<\/script>/)?.[1]||'';
const begin=inline.indexOf('function openReveal(revealed');
const end=inline.indexOf('function finishReveal()',begin);
assert.ok(begin>=0&&end>begin,'pack reveal function must exist');
const openCode=inline.slice(begin,end);

function harness(){
 const elements=new Map();
 const get=id=>{
  if(!elements.has(id))elements.set(id,{
   hidden:true,disabled:false,textContent:'',dataset:{},style:{},focus(){},
   classList:{remove(){},add(){}}
  });
  return elements.get(id);
 };
 const calls={present:0,opened:[],prefetch:[]};
 const ctx={
  revealState:null,revealMotionToken:0,revealMotionBusy:false,
  lastHammerAwardSummary:'',stopRevealAuto(){},
  document:{body:{style:{}},getElementById:get},
  overlay:get('reveal-overlay'),next:get('reveal-next'),skip:get('reveal-skip'),close:get('reveal-close'),
  window:{
   ChristmasPackCinema:{
    orderCards:cards=>[...cards],
    open:(cards,mode,pack)=>calls.opened.push({cards,mode,pack})
   },
   ChristmasCardImages:{prefetch:(cards)=>calls.prefetch.push(cards)},
   ChristmasShowDirector:{presentPack:(fn)=>{calls.present++;fn()}}
  },
  christmasCardImage:card=>card.id+'.png'
 };
 new Script(openCode+'\nthis.runReveal=openReveal;this.state=()=>revealState;').runInNewContext(ctx);
 return {ctx,calls,get};
}
const duplicate={id:'christmas-01',name:'Wiederholung',rarity:'legendary',isNew:false};
const fresh={id:'christmas-02',name:'Neu',rarity:'common',isNew:true};

test('an entirely duplicate pack is credited elsewhere and creates no visible modal or show queue',()=>{
 const {ctx,calls,get}=harness();
 const result=ctx.runReveal([duplicate,{...duplicate,id:'christmas-03'}],'real','large');
 assert.equal(result,false);
 assert.equal(calls.present,0);
 assert.equal(calls.opened.length,0);
 assert.equal(get('reveal-overlay').hidden,true);
 assert.equal(ctx.state(),null);
});

test('a mixed pack reveals only new cards while leaving the original server receipt untouched',()=>{
 const {ctx,calls,get}=harness();
 const received=Object.freeze([duplicate,fresh,{...duplicate,id:'christmas-04'}]);
 ctx.runReveal(received,'real','premium');
 assert.equal(calls.present,1);
 assert.equal(get('reveal-overlay').hidden,false);
 assert.deepEqual(Array.from(ctx.state().cards,card=>card.id),['christmas-02']);
 assert.deepEqual(Array.from(calls.opened[0].cards,card=>card.id),['christmas-02']);
 assert.equal(received.length,3);
 assert.equal(calls.prefetch.length,1);
});

test('demo packs continue to reveal all cards without changing awards',()=>{
 const {ctx,calls}=harness();
 ctx.runReveal([duplicate,fresh],'demo','premium');
 assert.equal(ctx.state().cards.length,2);
 assert.equal(calls.opened[0].mode,'demo');
});

test('multiplayer shows new cards to all viewers and automatically completes duplicate-only rewards',()=>{
 assert.match(game,/const newCards=awardedCards\.filter\(card=>card\?\.isNew===true\)/);
 assert.match(game,/const duplicateOnly=awardedCards\.length>0&&!newCards\.length/);
 assert.match(game,/const drawn=newCards;/);
 assert.match(game,/if\(duplicateOnly\)\{[\s\S]*?void continueReward\(\)/);
 assert.match(game,/if\(duplicateOnly&&!isFinal&&!directBankerPack&&reward\.uid===uid\)/);
 assert.match(game,/box\.style\.visibility='hidden'/);
 assert.match(game,/const special=drawn\.filter\(c=>c\.isNew===true/);
 assert.match(event,/monsterSpinRewardCards=Array\.isArray\(spin\.revealed\)&&spin\.revealed\.some\(card=>card\?\.isNew===true\)/);
});
