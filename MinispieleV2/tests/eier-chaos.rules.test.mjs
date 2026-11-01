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
 assert.equal(game.eggAt(30).spawnMs,20000);
 assert.equal(game.eggAt(30).landMs-game.eggAt(30).spawnMs,1250);
 assert.equal(game.eggAt(80).spawnMs,40000);
 assert.equal(game.eggAt(80).landMs-game.eggAt(80).spawnMs,950);
 assert.equal(game.eggAt(29).spawnMs,17400);
 assert.equal(game.eggAt(79).spawnMs,37640);
 assert.equal(game.EGG_COUNT,200);
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
 assert.equal(game.eggAt(1).spawnMs-game.eggAt(0).spawnMs,600);
 assert.equal(game.eggAt(31).spawnMs-game.eggAt(30).spawnMs,360);
 assert.equal(game.eggAt(81).spawnMs-game.eggAt(80).spawnMs,155);
});

test('exactly 30, 50 and 120 eggs; 20 identical special eggs per player',()=>{
 const eggs=Array.from({length:game.EGG_COUNT},(_,i)=>game.eggAt(i));
 assert.deepEqual([eggs.filter(e=>e.spawnMs<20000).length,eggs.filter(e=>e.spawnMs>=20000&&e.spawnMs<40000).length,eggs.filter(e=>e.spawnMs>=40000).length],[30,50,120]);
 assert.equal(eggs.filter(e=>e.special).length,20);
 assert.equal(eggs.filter(e=>!e.special).length,180);
 assert.equal(eggs.reduce((n,e)=>n+e.points,0),240);
 assert.ok(eggs.every(e=>e.landMs<=60000));
 assert.deepEqual(eggs,Array.from({length:200},(_,i)=>game.eggAt(i)));
});
test('special egg gives three points to every player catching it',()=>{
 const egg=Array.from({length:game.EGG_COUNT},(_,i)=>game.eggAt(i)).find(e=>e.special);
 const s=createSession(game,[{id:'a',type:'human'},{id:'b',type:'human'}]);
 s.dispatch('a',{type:'move',x:egg.x});s.dispatch('b',{type:'move',x:egg.x});
 for(let t=0;t<egg.landMs;t+=1000)s.dispatch('a',{type:'tick',ms:Math.min(1000,egg.landMs-t)});
 assert.ok(s.snapshot().state.caught.a.includes(egg.index));
 assert.ok(s.snapshot().state.caught.b.includes(egg.index));
 assert.equal(s.snapshot().state.scores.a,s.snapshot().state.scores.b);
});
