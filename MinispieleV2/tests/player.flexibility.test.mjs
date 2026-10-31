import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../engine/PlayerManager.js',import.meta.url),'utf8');
const {validateGamePlayers,createPlayerManager}=await import('data:text/javascript;charset=utf-8,'+encodeURIComponent(source));
const humans=n=>Array.from({length:n},(_,i)=>({id:'p'+i,type:'human'}));
test('each game independently defines allowed player counts',()=>{
 for(let n=1;n<=4;n++)assert.equal(validateGamePlayers(humans(n),{minPlayers:n,maxPlayers:n}).length,n);
 assert.throws(()=>validateGamePlayers(humans(1),{minPlayers:2,maxPlayers:4}),/GAME_PLAYER_LIMITS/);
 assert.throws(()=>validateGamePlayers(humans(4),{minPlayers:1,maxPlayers:3}),/GAME_PLAYER_LIMITS/);
});
test('human and bot combinations use the same shared roster',()=>{
 const players=[{id:'a',type:'human'},{id:'b',type:'bot'},{id:'c',type:'bot'}];
 const roster=validateGamePlayers(players,{minPlayers:2,maxPlayers:4});
 const manager=createPlayerManager(roster);
 assert.equal(manager.isHuman('a'),true);
 assert.equal(manager.isBot('b'),true);
 assert.equal(manager.isBot('c'),true);
 assert.throws(()=>manager.requireHuman('b'),/PLAYER_NOT_HUMAN/);
 assert.throws(()=>manager.requireBot('a'),/PLAYER_NOT_BOT/);
});
test('shared roster remains isolated from external mutations',()=>{
 const players=[{id:'a',type:'human'}];
 const manager=createPlayerManager(players);
 players[0].type='bot';
 manager.list()[0].type='bot';
 assert.equal(manager.isHuman('a'),true);
});

test('rejects duplicate, missing and invalid participant identities',()=>{
 const invalid=[[],humans(5),[{id:'x',type:'human'},{id:'x',type:'bot'}],[{id:'',type:'human'}],[{id:'x',type:'spectator'}],[null]];
 for(const roster of invalid)assert.throws(()=>createPlayerManager(roster));
});
test('invalid game limits never mutate the original roster',()=>{
 const roster=humans(2);
 const before=structuredClone(roster);
 for(const game of [{minPlayers:0},{maxPlayers:5},{minPlayers:3,maxPlayers:2},{minPlayers:1.5},{maxPlayers:NaN},null]){
  assert.throws(()=>validateGamePlayers(roster,game));
  assert.deepEqual(roster,before);
 }
});
test('unknown identities and role checks have stable error codes',()=>{
 const manager=createPlayerManager([{id:'h',type:'human'},{id:'b',type:'bot'}]);
 assert.equal(manager.get('missing'),null);
 assert.equal(manager.isBot('missing'),false);
 assert.equal(manager.isHuman('missing'),false);
 assert.throws(()=>manager.requireHuman('missing'),/UNKNOWN_PLAYER/);
 assert.throws(()=>manager.requireBot('missing'),/UNKNOWN_PLAYER/);
 assert.throws(()=>manager.requireHuman('b'),/PLAYER_NOT_HUMAN/);
 assert.throws(()=>manager.requireBot('h'),/PLAYER_NOT_BOT/);
});
