import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../engine/ResultContract.js',import.meta.url),'utf8');
const {validateResult}=await import('data:text/javascript;charset=utf-8,'+encodeURIComponent(source));
const players=[{id:'a',type:'human'},{id:'b',type:'bot'}];
const valid={finished:true,results:[{playerId:'a',score:5},{playerId:'b',score:5}]};
test('null means game not finished',()=>assert.equal(validateResult(null,players),null));
test('valid results and ties retain original scores',()=>assert.equal(validateResult(valid,players),valid));
test('requires exactly one entry for each participant',()=>{
 assert.throws(()=>validateResult({finished:true,results:[valid.results[0]]},players),/INVALID_RESULT_COUNT/);
 assert.throws(()=>validateResult({finished:true,results:[valid.results[0],valid.results[0]]},players),/INVALID_RESULT_PLAYER/);
 assert.throws(()=>validateResult({finished:true,results:[valid.results[0],{playerId:'unknown',score:0}]},players),/INVALID_RESULT_PLAYER/);
});
test('rejects invalid scores and unfinished result objects',()=>{
 for(const score of [NaN,Infinity,'5',null])assert.throws(()=>validateResult({finished:true,results:[{playerId:'a',score},{playerId:'b',score:2}]},players),/INVALID_RESULT_SCORE/);
 assert.throws(()=>validateResult({finished:false,results:valid.results},players),/INVALID_RESULT_FORMAT/);
});
test('accepts 1–4 players but rejects invalid rosters',()=>{
 for(let n=1;n<=4;n++){
  const ps=Array.from({length:n},(_,i)=>({id:'p'+i,type:'human'}));
  assert.ok(validateResult({finished:true,results:ps.map(p=>({playerId:p.id,score:0}))},ps));
 }
 assert.throws(()=>validateResult(null,[]),/INVALID_RESULT_PLAYERS/);
 assert.throws(()=>validateResult(null,[...players,...players]),/INVALID_RESULT_PLAYERS/);
});
