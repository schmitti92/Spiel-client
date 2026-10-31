import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../engine/GameContract.js',import.meta.url),'utf8');
const {validateGameDefinition,GAME_CONTRACT_VERSION}=await import('data:text/javascript;charset=utf-8,'+encodeURIComponent(source));
const game={id:'demo',initialState:()=>({}),applyAction:s=>s,getResult:()=>null,botAction:()=>({type:'wait'})};
test('accepts existing games with backward-compatible defaults',()=>assert.equal(validateGameDefinition(game),game));
test('supports explicitly versioned 1–4 player games',()=>{
 for(let n=1;n<=4;n++)assert.ok(validateGameDefinition({...game,contractVersion:GAME_CONTRACT_VERSION,minPlayers:n,maxPlayers:4}));
});
test('rejects unsupported versions and limits',()=>{
 assert.throws(()=>validateGameDefinition({...game,contractVersion:999}),/UNSUPPORTED_GAME_CONTRACT_VERSION/);
 assert.throws(()=>validateGameDefinition({...game,maxPlayers:5}),/INVALID_GAME_PLAYER_LIMITS/);
 assert.throws(()=>validateGameDefinition({...game,minPlayers:3,maxPlayers:2}),/INVALID_GAME_PLAYER_LIMITS/);
});
test('rejects undeclared capabilities and duplicate flags',()=>{
 assert.throws(()=>validateGameDefinition({...game,capabilities:['network']}),/INVALID_GAME_CAPABILITIES/);
 assert.throws(()=>validateGameDefinition({...game,capabilities:['rounds','rounds']}),/INVALID_GAME_CAPABILITIES/);
 assert.ok(validateGameDefinition({...game,capabilities:['rounds','timed']}));
});
