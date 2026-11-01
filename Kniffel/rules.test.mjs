import test from 'node:test';import assert from 'node:assert/strict';import {score,totals,createGame,roll,hold,commit} from './rules.js';
test('all 13 categories',()=>{const d=[2,2,2,3,3];assert.equal(score(d,1),6);assert.equal(score(d,6),12);assert.equal(score(d,8),25);assert.equal(score([1,2,3,4,6],9),30);assert.equal(score([2,3,4,5,6],10),40);assert.equal(score([6,6,6,6,6],11),50);assert.equal(score([1,2,3,4,5],12),15);assert.equal(score([1,1,2,2,3],8),0);});
test('bonus threshold',()=>{assert.equal(totals([3,6,9,12,15,18,...Array(7).fill(null)]).bonus,35);assert.equal(totals([3,6,9,12,15,17,...Array(7).fill(null)]).bonus,0);});
test('hold and three-roll limit',()=>{const g=createGame([{name:'A',type:'human'}]);roll(g,()=>0);hold(g,0);roll(g,()=>.99);assert.equal(g.dice[0],1);assert.equal(g.dice[1],6);roll(g,()=>.5);assert.throws(()=>roll(g));});
test('score once and switch players',()=>{const g=createGame([{name:'A',type:'human'},{name:'B',type:'bot'}]);roll(g,()=>0);commit(g,0);assert.equal(g.players[0].sheet[0],5);assert.equal(g.turn,1);assert.equal(g.rolls,0);assert.throws(()=>commit(g,0));});
test('full game ends',()=>{const g=createGame([{name:'A',type:'human'}]);for(let i=0;i<13;i++){roll(g,()=>0);commit(g,i);}assert.equal(g.finished,true);assert.throws(()=>roll(g));});

test('invalid category leaves game unchanged',()=>{const g=createGame([{name:'A',type:'human'}]);roll(g,()=>0);const before=JSON.stringify(g);for(const category of [-1,13,1.5,NaN,undefined]){assert.throws(()=>commit(g,category));assert.equal(JSON.stringify(g),before);}});
