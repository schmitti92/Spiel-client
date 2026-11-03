import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,chooseDoor,revealNext,getResult,botAction,publicGame} from './rules.js';
const revealAll=s=>{for(let i=0;i<3;i++)s=revealNext(s);return s};
test('same open door allows multiple adventurers through',()=>{
 let s=createGame({players:['a','b','c'],lockedDoors:[2]});
 for(const id of ['a','b'])s=chooseDoor(s,id,0);
 s=chooseDoor(s,'c',1);
 s=revealAll(s);
 assert.deepEqual(s.alive,['a','b','c']);
 assert.deepEqual(getResult(s).winnerIds,['a','b','c']);
});
test('all players on locked door are eliminated',()=>{
 let s=createGame({players:['a','b','c'],lockedDoors:[1]});
 s=chooseDoor(s,'a',1);s=chooseDoor(s,'b',1);s=chooseDoor(s,'c',0);
 s=revealAll(s);
 assert.deepEqual(getResult(s).winnerIds,['c']);
 assert.deepEqual(getResult(s).eliminated,['a','b']);
});
test('doors are revealed one by one in fixed order',()=>{
 let s=createGame({players:['a'],lockedDoors:[2]});
 s=chooseDoor(s,'a',0);
 for(let door=0;door<3;door++){s=revealNext(s);assert.equal(s.reveals[door].door,door);}
 assert.equal(s.finished,true);
});
test('selection is private until reveal',()=>{
 let s=createGame({players:['a','b'],lockedDoors:[1]});
 s=chooseDoor(s,'a',1);
 assert.equal(publicGame(s,'b').myChoice,null);
 assert.equal(publicGame(s,'b').chosenCount,1);
 assert.equal(publicGame(s,'b').reveals.length,0);
 assert.throws(()=>chooseDoor(s,'a',2),/ALREADY_CHOSEN/);
});
test('rounds advance and no survivor produces no winner',()=>{
 let s=createGame({players:['a','b'],lockedDoors:[0,1]});
 s=chooseDoor(s,'a',2);s=chooseDoor(s,'b',2);s=revealAll(s);
 assert.equal(s.round,1);assert.equal(s.phase,'choosing');
 s=chooseDoor(s,'a',1);s=chooseDoor(s,'b',1);s=revealAll(s);
 assert.deepEqual(getResult(s).winnerIds,[]);
});
test('one to four players and deterministic bots',()=>{
 assert.throws(()=>createGame({players:['a','a'],lockedDoors:[0]}),/INVALID_PLAYERS/);
 assert.throws(()=>createGame({players:['a','b','c','d','e'],lockedDoors:[0]}),/INVALID_PLAYERS/);
 const s=createGame({players:['bot:r:0'],lockedDoors:[1]});
 assert.deepEqual(botAction(s,'bot:r:0',7),botAction(s,'bot:r:0',7));
});

test('a new chamber closes all doors and clears the previous round reveal',()=>{
 let s=createGame({players:['a','b'],lockedDoors:[2,0]});
 s=chooseDoor(s,'a',1);s=chooseDoor(s,'b',1);
 s=revealAll(s);
 assert.equal(s.phase,'choosing');
 assert.equal(s.round,1);
 assert.deepEqual(s.reveals,[]);
 assert.deepEqual(s.choices,{});
 s=chooseDoor(s,'a',2);s=chooseDoor(s,'b',2);
 assert.equal(publicGame(s,'a').reveals.length,0);
 s=revealNext(s);
 assert.deepEqual(s.reveals.map(r=>r.door),[0]);
});
test('a single survivor ends the adventure early',()=>{
 let s=createGame({players:['a','b'],lockedDoors:[1,2,0]});
 s=chooseDoor(s,'a',0);s=chooseDoor(s,'b',1);
 s=revealAll(s);
 assert.equal(s.phase,'finished');
 assert.deepEqual(s.winnerIds,['a']);
});
