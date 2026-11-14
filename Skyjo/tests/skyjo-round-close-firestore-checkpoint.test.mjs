import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const source=readFileSync(new URL('../skyjo_action-logic-part-15.txt',import.meta.url),'utf8');
const start=source.indexOf('function roundCloseCard(ref){');
const end=source.indexOf('/* Kompatibilitätsfunktionen',start);
assert.ok(start>=0&&end>start,'round-close source block is available');
const isolated=source.slice(start,end);

async function prepareRound(cardCount){
 const grid=Array.from({length:cardCount},(_,i)=>({id:'card-'+i,faceUp:false,type:'number',value:1}));
 const roundClose={id:'test-close',stage:'reveal',
   revealOrder:grid.map((c,idx)=>({pi:0,zone:'grid',idx,id:c.id})),
   revealIndex:0,removePi:0,updatedAt:0};
 const state={phase:'roundReveal',roundClose,players:[{grid,extras:[]}]};
 let saves=0,renderCalls=0;
 const ctx=vm.createContext({
   state,ui:{},Date,
   save:()=>{saves++},
   render:()=>{renderCalls++},
   buildRoundEndJokerValueMap:()=>({}),
   sleepMs:async delay=>{if(delay>=650)state.phase='test-completed'}
 });
 vm.runInContext(isolated,ctx,{filename:'skyjo-round-close.js'});
 await ctx.runRoundClose('test-close');
 return {state,saves,renderCalls,grid};
}

test('Hidden round-close flips persist in bounded batches, not every card',async()=>{
 const {state,saves,grid}=await prepareRound(50);
 assert.equal(state.roundClose.revealIndex,50);
 assert.equal(state.roundClose.stage,'remove');
 assert.ok(grid.every(c=>c.faceUp),'all hidden cards still become visible in authoritative state');
 assert.equal(saves,4,'save after each 16 hidden flips, plus a mandatory stage boundary');
});

test('Short rounds always persist the completed reveal boundary',async()=>{
 const a=await prepareRound(12);
 assert.equal(a.saves,1,'12-card round persists its final stage without redundant writes');
 const b=await prepareRound(32);
 assert.equal(b.saves,3,'both checkpoints and final stage are durable');
 assert.equal(b.state.roundClose.stage,'remove');
});
