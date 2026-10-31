import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../GameCatalog.js',import.meta.url),'utf8');
const {registerMiniGame,listMiniGames,getMiniGame,isGameSupported}=await import('data:text/javascript;charset=utf-8,'+encodeURIComponent(source));
test('registers a game once and lists it for the UI',()=>{
 const g=registerMiniGame({id:'zielring',name:'Zielring',module:'./games/zielring/game.js',image:'./assets/zielring.webp'});
 assert.equal(getMiniGame('zielring'),g);
 assert.equal(listMiniGames().length,1);
 assert.equal(isGameSupported('zielring',1),true);
 assert.equal(isGameSupported('zielring',4),true);
 assert.equal(isGameSupported('zielring',5),false);
 assert.throws(()=>registerMiniGame(g),/DUPLICATE_GAME_ID/);
});
test('rejects unsafe paths and invalid player ranges',()=>{
 assert.throws(()=>registerMiniGame({id:'bad',name:'Bad',module:'../private.js',image:'./assets/a.webp'}),/INVALID_GAME_MODULE/);
 assert.throws(()=>registerMiniGame({id:'bad',name:'Bad',module:'./games/bad/game.js',image:'./assets/a.webp',maxPlayers:5}),/INVALID_PLAYER_LIMITS/);
});
