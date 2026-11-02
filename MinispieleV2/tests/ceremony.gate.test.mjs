import test from 'node:test';
import assert from 'node:assert/strict';
import {ceremonyReadiness,ceremonySeatReadiness} from '../engine/CeremonyGate.js';
test('ceremony waits for every human and bot',()=>{
 const players=[{id:'human'},{id:'bot'}];
 assert.deepEqual(ceremonyReadiness(players,[{playerId:'human',score:7}]).missing,['bot']);
 assert.equal(ceremonyReadiness(players,[{playerId:'human',score:7},{playerId:'bot',score:0}]).ready,true);
});
test('duplicate, unknown, and invalid results cannot unlock ceremony',()=>{
 const players=['a','b'];
 assert.equal(ceremonyReadiness(players,[{playerId:'a',score:1},{playerId:'a',score:2}]).ready,false);
 assert.equal(ceremonyReadiness(players,[{playerId:'a',score:1},{playerId:'x',score:2}]).ready,false);
 assert.equal(ceremonyReadiness(players,[{playerId:'a',score:1},{playerId:'b',score:NaN}]).ready,false);
});
test('one to four seats including zero scores',()=>{
 for(let count=1;count<=4;count++){
  const results=Array.from({length:count},(_,seat)=>({seat,score:0}));
  assert.equal(ceremonySeatReadiness(count,results.slice(0,-1)).ready,false);
  assert.equal(ceremonySeatReadiness(count,results).ready,true);
 }
});
test('invalid roster is rejected',()=>{
 assert.throws(()=>ceremonySeatReadiness(5,[]),/PLAYER_COUNT/);
 assert.throws(()=>ceremonyReadiness(['a','a'],[]),/INVALID_CEREMONY_PLAYERS/);
});

test('one-based online hub seats are supported',()=>{assert.equal(ceremonySeatReadiness(2,[{seat:1,score:2},{seat:2,score:0}]).ready,true);});
