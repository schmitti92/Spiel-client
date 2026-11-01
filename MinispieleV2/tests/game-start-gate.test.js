import test from 'node:test';
import assert from 'node:assert/strict';
import {createGameStartGate} from '../engine/GameStartGate.js';
test('one human begins only after acknowledging and countdown',()=>{
 const gate=createGameStartGate([{id:'a',type:'human'}]);
 assert.equal(gate.canStart(1000),false);
 assert.equal(gate.acknowledge('a',1000).startAt,4000);
 assert.equal(gate.canStart(3999),false);
 assert.equal(gate.canStart(4000),true);
});
test('multiple humans must all acknowledge; bots are already ready',()=>{
 const gate=createGameStartGate([{id:'a',type:'human'},{id:'b',type:'human'},{id:'bot',type:'bot'}]);
 assert.deepEqual([gate.snapshot().ready,gate.snapshot().waiting],[1,2]);
 assert.equal(gate.acknowledge('a',100).startAt,null);
 assert.equal(gate.acknowledge('a',200).ready,2);
 assert.equal(gate.acknowledge('b',300).startAt,3300);
 assert.equal(gate.acknowledge('b',900).startAt,3300);
 assert.equal(gate.canStart(3300),true);
});
test('reject unknown participants and invalid roster',()=>{
 assert.throws(()=>createGameStartGate([{id:'a',type:'human'},{id:'a',type:'bot'}]),/INVALID_PLAYERS/);
 const gate=createGameStartGate([{id:'a',type:'human'}]);
 assert.throws(()=>gate.acknowledge('other',100),/NOT_A_HUMAN_PARTICIPANT/);
});
