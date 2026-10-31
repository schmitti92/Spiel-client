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

test('different games choose independent round, score and timer rules',()=>{
 const timed={...game,id:'timed-demo',capabilities:['timed'],timeLimitMs:30000,scoreDirection:'lower'};
 const rounds={...game,id:'round-demo',capabilities:['rounds'],roundCount:3,scoreDirection:'higher'};
 const untimed={...game,id:'open-demo',capabilities:[]};
 for(const definition of [timed,rounds,untimed])assert.equal(validateGameDefinition(definition),definition);
 assert.equal(untimed.timeLimitMs,undefined);
 assert.equal(rounds.timeLimitMs,undefined);
 assert.equal(timed.roundCount,undefined);
});
test('rejects invalid optional metadata without imposing global defaults',()=>{
 for(const roundCount of [0,-1,1.5,'3'])assert.throws(()=>validateGameDefinition({...game,capabilities:['rounds'],roundCount}),/INVALID_GAME_ROUND_COUNT/);
 for(const timeLimitMs of [0,-1,1.5,'30000'])assert.throws(()=>validateGameDefinition({...game,capabilities:['timed'],timeLimitMs}),/INVALID_GAME_TIME_LIMIT/);
 assert.throws(()=>validateGameDefinition({...game,scoreDirection:'random'}),/INVALID_GAME_SCORE_DIRECTION/);
 assert.throws(()=>validateGameDefinition({...game,roundCount:3}),/GAME_CAPABILITIES_REQUIRED/);
 assert.throws(()=>validateGameDefinition({...game,capabilities:['timed'],roundCount:3}),/UNDECLARED_GAME_ROUNDS/);
 assert.throws(()=>validateGameDefinition({...game,capabilities:['rounds'],timeLimitMs:30000}),/UNDECLARED_GAME_TIMER/);
});
