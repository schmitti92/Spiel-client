import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const resultSource=readFileSync(new URL('../engine/ResultContract.js',import.meta.url),'utf8');
const rankingSource=readFileSync(new URL('../engine/ResultRanking.js',import.meta.url),'utf8');
const resultUrl='data:text/javascript;charset=utf-8,'+encodeURIComponent(resultSource);
const rankingUrl='data:text/javascript;charset=utf-8,'+encodeURIComponent(rankingSource.replace("'./ResultContract.js'",JSON.stringify(resultUrl)));
const {rankResults}=await import(rankingUrl);
const players=[{id:'a'},{id:'b'},{id:'c'},{id:'d'}];
const result={finished:true,results:[{playerId:'a',score:7},{playerId:'b',score:10},{playerId:'c',score:7},{playerId:'d',score:1}]};
test('higher scores win and ties share rank',()=>{
 assert.deepEqual(rankResults(result,players).map(x=>[x.playerId,x.rank]),[['b',1],['a',2],['c',2],['d',4]]);
});
test('lower score can win when game explicitly declares direction',()=>{
 assert.deepEqual(rankResults(result,players,{higherIsBetter:false}).map(x=>[x.playerId,x.rank]),[['d',1],['a',2],['c',2],['b',4]]);
});
test('ranking does not modify source results',()=>{
 const before=structuredClone(result);
 rankResults(result,players);
 assert.deepEqual(result,before);
});
test('unfinished games have no ranking',()=>assert.equal(rankResults(null,players),null));
test('invalid result is rejected',()=>assert.throws(()=>rankResults({finished:true,results:[]},players),/INVALID_RESULT_COUNT/));
