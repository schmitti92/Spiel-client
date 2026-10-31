import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL(p,import.meta.url),'utf8');
const url=s=>'data:text/javascript;charset=utf-8,'+encodeURIComponent(s);
const contract=url(read('../engine/ResultContract.js'));
const ranking=url(read('../engine/ResultRanking.js').replace("'./ResultContract.js'",JSON.stringify(contract)));
const rounds=url(read('../engine/RoundResults.js').replace("'./ResultRanking.js'",JSON.stringify(ranking)));
const {createRoundResults}=await import(rounds);
const players=['anna','chris','max'].map(id=>({id,type:'human'}));
test('three rounds accumulate and rank totals',()=>{
 const m=createRoundResults(players);
 for(const scores of [[8,7,4],[10,6,5],[8,7,6]])m.addRound(players.map((p,i)=>({playerId:p.id,score:scores[i]})));
 const s=m.snapshot();assert.equal(s.roundCount,3);assert.deepEqual(s.totals.map(x=>x.score),[26,20,15]);assert.deepEqual(s.ranking.map(x=>x.rank),[1,2,3]);
});
test('equal totals share a rank',()=>{
 const m=createRoundResults(players);m.addRound([{playerId:'anna',score:4},{playerId:'chris',score:4},{playerId:'max',score:1}]);
 assert.deepEqual(m.snapshot().ranking.map(x=>x.rank),[1,1,3]);
});
test('rejects invalid rounds without changing score',()=>{
 const m=createRoundResults(players);assert.throws(()=>m.addRound([{playerId:'anna',score:1}]),/INVALID_ROUND_RESULTS/);assert.equal(m.snapshot().roundCount,0);
});
test('snapshot is isolated from internal round data',()=>{
 const m=createRoundResults(players);m.addRound(players.map(p=>({playerId:p.id,score:1})));
 const s=m.snapshot();s.rounds[0][0].score=99;assert.equal(m.snapshot().totals[0].score,1);
});
