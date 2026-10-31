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

test('result contract preserves game-defined metadata without imposing winners or score direction',()=>{
 const roster=players.slice(0,3);
 const result={finished:true,results:[
  {playerId:'p2',score:0,detail:{accuracy:0.8}},
  {playerId:'p0',score:-4,detail:{accuracy:0.2}},
  {playerId:'p1',score:0,detail:{accuracy:0.8}}
 ],reason:'game-defined',extra:{roundsPlayed:7}};
 assert.equal(validateResult(result,roster),result);
 assert.deepEqual(result.results.map(r=>r.playerId),['p2','p0','p1']);
 assert.equal(result.reason,'game-defined');
});
test('result contract does not mutate result or participant input',()=>{
 const roster=structuredClone(players.slice(0,2));
 const result={finished:true,results:[{playerId:'p0',score:2},{playerId:'p1',score:2}]};
 const originalRoster=structuredClone(roster);
 const originalResult=structuredClone(result);
 validateResult(result,roster);
 assert.deepEqual(roster,originalRoster);
 assert.deepEqual(result,originalResult);
});

test('v2 results support scoreless outcomes while preserving legacy v1 requirements',()=>{
 const roster=players.slice(0,2);
 const scoreless={resultVersion:2,finished:true,results:[{playerId:'p0',outcome:'survived'},{playerId:'p1',outcome:'eliminated'}]};
 assert.equal(validateResult(scoreless,roster),scoreless);
 assert.throws(()=>validateResult({...scoreless,resultVersion:1},roster),/INVALID_RESULT_SCORE/);
 assert.throws(()=>validateResult({...scoreless,resultVersion:3},roster),/UNSUPPORTED_RESULT_CONTRACT_VERSION/);
 assert.throws(()=>validateResult({...scoreless,resultVersion:0},roster),/UNSUPPORTED_RESULT_CONTRACT_VERSION/);
});
test('v2 results accept optional scores, shared outcomes and ties',()=>{
 const roster=players.slice(0,3);
 const result={resultVersion:2,finished:true,results:[{playerId:'p0',score:0},{playerId:'p1',outcome:'team-win'},{playerId:'p2',score:0}],teamOutcome:'success'};
 assert.equal(validateResult(result,roster),result);
 assert.throws(()=>validateResult({...result,results:[{playerId:'p0',score:NaN},...result.results.slice(1)]},roster),/INVALID_RESULT_SCORE/);
});
