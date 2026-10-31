import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../engine/ResultContract.js',import.meta.url),'utf8');
const {validateResult}=await import('data:text/javascript;charset=utf-8,'+encodeURIComponent(source));
const players=Array.from({length:4},(_,i)=>({id:'p'+i,type:i%2?'bot':'human'}));
test('result contract supports 1–4 players, negative scores and ties without ranking rules',()=>{
 for(let count=1;count<=4;count++){
  const roster=players.slice(0,count);
  const results=roster.map(p=>({playerId:p.id,score:-3}));
  const result={finished:true,results};
  assert.equal(validateResult(result,roster),result);
  assert.deepEqual(result.results,results);
 }
});
test('result contract rejects missing, duplicated and unknown participants',()=>{
 const roster=players.slice(0,2);
 for(const results of [
  [{playerId:'p0',score:1}],
  [{playerId:'p0',score:1},{playerId:'p0',score:2}],
  [{playerId:'p0',score:1},{playerId:'other',score:2}]
 ])assert.throws(()=>validateResult({finished:true,results},roster),/INVALID_RESULT_/);
});
test('result contract rejects non-finite and non-numeric scores',()=>{
 for(const score of [NaN,Infinity,-Infinity,'5',null]){
  assert.throws(()=>validateResult({finished:true,results:[{playerId:'p0',score}]},players.slice(0,1)),/INVALID_RESULT_SCORE/);
 }
});
test('pending results remain null; invalid completed shapes are rejected',()=>{
 assert.equal(validateResult(null,players.slice(0,1)),null);
 for(const value of [undefined,{},[],{finished:false,results:[]},{finished:true,results:null}]){
  assert.throws(()=>validateResult(value,players.slice(0,1)),/INVALID_RESULT_FORMAT/);
 }
});
