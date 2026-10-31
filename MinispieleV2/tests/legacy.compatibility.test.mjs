import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const load=async path=>import('data:text/javascript;charset=utf-8,'+encodeURIComponent(readFileSync(new URL(path,import.meta.url),'utf8')));
const gameContractSource=readFileSync(new URL('../engine/GameContract.js',import.meta.url),'utf8');
const gameContractUrl='data:text/javascript;charset=utf-8,'+encodeURIComponent(gameContractSource);
const engineSource=readFileSync(new URL('../engine/MiniGameEngine.js',import.meta.url),'utf8').replace("'./GameContract.js'",JSON.stringify(gameContractUrl));
const {createSession}=await import('data:text/javascript;charset=utf-8,'+encodeURIComponent(engineSource));
const {validateResult}=await load('../engine/ResultContract.js');
const legacy=await load('../games/zeitgefuehl/game.js');

test('legacy game still completes and restarts through unchanged engine',()=>{
 const players=[{id:'human',type:'human'},{id:'bot',type:'bot'}];
 const session=createSession(legacy,players,{targetSeconds:14});
 session.dispatch('human',{type:'submitTime',seconds:14});
 const result=session.botTurn('bot').result;
 assert.equal(result.ranking.length,2);
 assert.equal(result.ranking[0].id,'human');
 assert.equal(session.restart().result,null);
});

test('legacy ranking is not silently accepted as the new shared result format',()=>{
 const players=[{id:'human',type:'human'}];
 const session=createSession(legacy,players,{targetSeconds:14});
 const legacyResult=session.dispatch('human',{type:'submitTime',seconds:14}).result;
 assert.throws(()=>validateResult(legacyResult,players),/INVALID_RESULT_FORMAT/);
});
