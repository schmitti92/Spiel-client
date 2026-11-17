import test from 'node:test';
import assert from 'node:assert/strict';
import {rebalanceOdds,rebalanceLockedOdds} from '../DOG/scratch-odds.mjs';

test('changing one of three symbol chances always updates the others to 100%',()=>{
 const first=rebalanceOdds([200,500,300],2,620);
 assert.deepEqual(first,[109,271,620]);
 assert.equal(first.reduce((a,b)=>a+b,0),1000);
 assert.equal(first[2],620);
});
test('all five jackpot icons preserve the exact edited probability',()=>{
 const source=[200,200,200,200,200];
 for(const i of source.keys()){
  for(const weight of [0,1,333,777,999,1000]){
   const balanced=rebalanceOdds(source,i,weight);
   assert.equal(balanced.length,5);
   assert.equal(balanced[i],weight);
   assert.equal(balanced.reduce((a,b)=>a+b,0),1000);
   assert.ok(balanced.every(x=>Number.isInteger(x)&&x>=0&&x<=1000));
  }
 }
});
test('zeroed other categories can be restored without producing NaN',()=>{
 assert.deepEqual(rebalanceOdds([1000,0,0,0],0,600),[600,134,133,133]);
 assert.deepEqual(rebalanceOdds([0,0,0,1000],3,0),[334,333,333,0]);
 assert.deepEqual(rebalanceOdds([0,0,0,0,0],1,1000),[0,1000,0,0,0]);
});
test('100%-normalizer avoids hidden rounding drift after repeated edits',()=>{
 let values=[110,210,280,400];
 for(let n=0;n<120;n++){
  const slot=n%4,weight=(n*53)%1001;
  values=rebalanceOdds(values,slot,weight);
  assert.equal(values[slot],weight);
  assert.equal(values.reduce((a,b)=>a+b,0),1000);
 }
});

test('locked odds remain exactly fixed as other odds are modified',()=>{
 const fixed=rebalanceLockedOdds([200,500,300],0,45,[false,true,false]);
 assert.deepEqual(fixed,[450,500,50]);
 assert.equal(fixed.reduce((a,b)=>a+b,0),1000);
 assert.equal(rebalanceLockedOdds([200,500,300],0,60,[false,true,false]),null);
 assert.deepEqual(rebalanceLockedOdds([200,500,300],1,40,[true,false,true]),[200,400,300] .map((x,i)=>i===1?400:x)); 
});
test('locked normalization distributes integer tenths with no drifting or negatives',()=>{
 let values=[100,200,300,400];
 for(let n=0;n<60;n++){
  const result=rebalanceLockedOdds(values,0,(n*7)%31,[false,false,true,true]);
  if(result===null)continue;
  assert.equal(result[2],300);
  assert.equal(result[3],400);
  assert.equal(result.reduce((sum,v)=>sum+v,0),1000);
  assert.ok(result.every(v=>Number.isSafeInteger(v)&&v>=0));
  values=result;
 }
});
