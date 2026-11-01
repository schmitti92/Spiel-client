import test from 'node:test';
import assert from 'node:assert/strict';
import {createSession} from '../engine/MiniGameEngine.js';
import * as game from '../games/eier-chaos/game.js';
const roster=[{id:'a',type:'human'},{id:'b',type:'bot'}];
test('Eier-Chaos supports 1-4 players and common engine contract',()=>{
 for(let n=1;n<=4;n++){const s=createSession(game,roster.concat([{id:'c',type:'bot'},{id:'d',type:'bot'}]).slice(0,n));assert.equal(s.snapshot().players.length,n);}
});
test('deterministic eggs, speed increases every 20 seconds',()=>{
 assert.deepEqual(game.eggAt(10),game.eggAt(10));
 assert.equal(game.eggAt(0).landMs-game.eggAt(0).spawnMs,1600);
 assert.equal(game.eggAt(39).spawnMs,20000);
 assert.equal(game.eggAt(39).landMs-game.eggAt(39).spawnMs,1250);
 assert.equal(game.eggAt(98).spawnMs,40000);
 assert.equal(game.eggAt(98).landMs-game.eggAt(98).spawnMs,950);
 assert.equal(game.eggAt(38).spawnMs,19760);
 assert.equal(game.eggAt(97).spawnMs,39720);
 assert.equal(game.EGG_COUNT,194);
 assert.throws(()=>game.eggAt(game.EGG_COUNT),/INVALID_EGG_INDEX/);
});
test('catch, miss, finish, result and restart',()=>{
 const s=createSession(game,roster);
 s.dispatch('a',{type:'move',x:game.eggAt(0).x});
 s.dispatch('a',{type:'tick',ms:1000});
 s.dispatch('a',{type:'tick',ms:1000});
 assert.ok(s.snapshot().state.scores.a>=1);
 assert.equal(s.snapshot().state.scores.b,0);
 for(let i=0;i<58;i++)s.dispatch('a',{type:'tick',ms:1000});
 assert.equal(s.snapshot().state.finished,true);
 assert.equal(s.snapshot().result.results.length,2);
 assert.throws(()=>s.dispatch('a',{type:'tick',ms:1}),/GAME_FINISHED/);
 s.restart();assert.equal(s.snapshot().state.elapsedMs,0);
});
test('rejects invalid moves, ticks and unauthorized clock',()=>{
 const s=createSession(game,roster);
 assert.throws(()=>s.dispatch('a',{type:'move',x:2}),/INVALID_POSITION/);
 assert.throws(()=>s.dispatch('b',{type:'tick',ms:50}),/CLOCK_OWNER_REQUIRED/);
 assert.throws(()=>s.dispatch('a',{type:'tick',ms:1001}),/INVALID_TICK/);
});

test('egg frequency rises at each 20-second boundary',()=>{
 assert.equal(game.eggAt(1).spawnMs-game.eggAt(0).spawnMs,520);
 assert.equal(game.eggAt(40).spawnMs-game.eggAt(39).spawnMs,340);
 assert.equal(game.eggAt(99).spawnMs-game.eggAt(98).spawnMs,210);
});
