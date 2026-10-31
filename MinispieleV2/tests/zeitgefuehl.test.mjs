import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const load=async path=>import('data:text/javascript;charset=utf-8,'+encodeURIComponent(readFileSync(new URL(path,import.meta.url),'utf8')));
const contractUrl='data:text/javascript;charset=utf-8,'+encodeURIComponent(readFileSync(new URL('../engine/GameContract.js',import.meta.url),'utf8'));
const engineSource=readFileSync(new URL('../engine/MiniGameEngine.js',import.meta.url),'utf8').replace("'./GameContract.js'",JSON.stringify(contractUrl));
const {createSession}=await import('data:text/javascript;charset=utf-8,'+encodeURIComponent(engineSource));
const game=await load('../games/zeitgefuehl/game.js');
test('Zeitgefühl ends after every participant submits and scores nearest first',()=>{
 const session=createSession(game,[{id:'a',type:'human'},{id:'b',type:'bot'}],{targetSeconds:14});
 assert.equal(session.snapshot().result,null);
 session.dispatch('a',{type:'submitTime',seconds:14.05});
 assert.equal(session.snapshot().result,null);
 const result=session.botTurn('b').result;
 assert.equal(result.ranking[0].id,'a');
 assert.equal(result.ranking[0].points,10);
 assert.equal(result.ranking[1].points,7);
 assert.equal(session.restart().result,null);
});
test('Zeitgefühl prevents duplicate submissions and invalid time',()=>{
 const session=createSession(game,[{id:'a',type:'human'}]);
 assert.throws(()=>session.dispatch('a',{type:'submitTime',seconds:-1}),/INVALID_TIME/);
 session.dispatch('a',{type:'submitTime',seconds:14});
 assert.throws(()=>session.dispatch('a',{type:'submitTime',seconds:14}),/GAME_FINISHED/);
});
