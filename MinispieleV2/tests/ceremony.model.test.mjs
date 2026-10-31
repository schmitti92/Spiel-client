import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL(p,import.meta.url),'utf8');
const url=s=>'data:text/javascript;charset=utf-8,'+encodeURIComponent(s);
const contract=url(read('../engine/ResultContract.js'));
const ranking=url(read('../engine/ResultRanking.js').replace("'./ResultContract.js'",JSON.stringify(contract)));
const rounds=url(read('../engine/RoundResults.js').replace("'./ResultRanking.js'",JSON.stringify(ranking)));
const ceremony=url(read('../engine/CeremonyModel.js').replace("'./RoundResults.js'",JSON.stringify(rounds)));
const {buildGameCeremony}=await import(ceremony);
const players=[{id:'a',name:'Anna'},{id:'b',name:'Ben'}];
test('single-round game displays game score without a tournament score',()=>{
 const result=buildGameCeremony({players,rounds:[[{playerId:'a',score:8},{playerId:'b',score:5}]]});
 assert.equal(result.kind,'game');assert.equal(result.roundCount,1);assert.deepEqual(result.ranking[0],{playerId:'a',name:'Anna',rank:1,score:8,roundScores:[8]});
});
test('multi-round game displays round scores and overall game ranking',()=>{
 const result=buildGameCeremony({players,rounds:[[{playerId:'a',score:2},{playerId:'b',score:5}],[{playerId:'a',score:7},{playerId:'b',score:4}]]});
 assert.deepEqual(result.ranking.map(p=>p.rank),[1,1]);assert.deepEqual(result.ranking[0].roundScores,[2,7]);
});
test('rejects ceremony without completed round',()=>assert.throws(()=>buildGameCeremony({players,rounds:[]}),/CEREMONY_REQUIRES_ROUNDS/));
