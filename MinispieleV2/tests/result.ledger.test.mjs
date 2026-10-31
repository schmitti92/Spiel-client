import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../engine/ResultLedger.js',import.meta.url),'utf8');
const {createResultLedger}=await import('data:text/javascript;charset=utf-8,'+encodeURIComponent(source));
const players=[{id:'a',type:'human'},{id:'b',type:'bot'}];
const completed=(roomId,matchId,gameId,scores,generation=0)=>({
 roomId,matchId,gameId,generation,players,
 result:{finished:true,results:[{playerId:'a',score:scores[0]},{playerId:'b',score:scores[1]}]}
});
const score=completion=>completion.result.results.map(r=>({playerId:r.playerId,points:r.score}));
test('aggregates multiple games in same room without counting duplicate deliveries',()=>{
 const ledger=createResultLedger(score);
 const first=completed('r1','m1','snake',[4,2]);
 assert.equal(ledger.accept(first).accepted,true);
 assert.equal(ledger.accept(first).accepted,false);
 ledger.accept(completed('r1','m2','cans',[1,5]));
 assert.deepEqual(ledger.snapshot('r1').totals,[{playerId:'a',points:5},{playerId:'b',points:7}]);
 assert.equal(ledger.snapshot('r1').matches.length,2);
 assert.deepEqual(ledger.snapshot('r2').totals,[]);
});
test('restart generations count independently; same match with conflicting results fails',()=>{
 const ledger=createResultLedger(score);
 ledger.accept(completed('r','m','snake',[1,2]));
 assert.throws(()=>ledger.accept(completed('r','m','snake',[8,2])),/COMPLETION_CONFLICT/);
 ledger.accept(completed('r','m','snake',[3,4],1));
 assert.deepEqual(ledger.snapshot('r').totals,[{playerId:'a',points:4},{playerId:'b',points:6}]);
});
test('invalid scoring policy and invalid completions never change totals',()=>{
 assert.throws(()=>createResultLedger(null),/INVALID_SCORING_POLICY/);
 const ledger=createResultLedger(()=>[{playerId:'a',points:2}]);
 assert.throws(()=>ledger.accept(completed('r','m','snake',[1,2])),/INVALID_TOURNAMENT_POINTS/);
 assert.deepEqual(ledger.snapshot('r').totals,[]);
 assert.throws(()=>ledger.accept({...completed('r','m','snake',[1,2]),result:null}),/INVALID_COMPLETION/);
});
test('policy can normalize scores; snapshots are independent of ledger',()=>{
 const ledger=createResultLedger(c=>c.result.results.map(r=>({playerId:r.playerId,points:r.score===Math.max(...c.result.results.map(x=>x.score))?3:1})));
 ledger.accept(completed('r','m','snake',[99,10]));
 ledger.accept(completed('r','n','cans',[2,8]));
 const snapshot=ledger.snapshot('r');
 assert.deepEqual(snapshot.totals,[{playerId:'a',points:4},{playerId:'b',points:4}]);
 snapshot.totals[0].points=999;
 assert.equal(ledger.snapshot('r').totals[0].points,4);
});
