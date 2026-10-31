import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL(p,import.meta.url),'utf8');
const data=s=>'data:text/javascript;charset=utf-8,'+encodeURIComponent(s);
const contract=data(read('../engine/GameContract.js'));
const engine=data(read('../engine/MiniGameEngine.js').replace("'./GameContract.js'",JSON.stringify(contract)));
const results=data(read('../engine/ResultContract.js'));
const standard=data(read('../engine/StandardSession.js').replace("'./MiniGameEngine.js'",JSON.stringify(engine)).replace("'./ResultContract.js'",JSON.stringify(results)));
const players=data(read('../engine/PlayerManager.js'));
const manager=data(read('../engine/SessionManager.js').replace("'./StandardSession.js'",JSON.stringify(standard)).replace("'./PlayerManager.js'",JSON.stringify(players)));
const registry=data(read('../engine/GameRegistry.js').replace("'./GameContract.js'",JSON.stringify(contract)));
const launcher=data(read('../engine/GameLauncher.js').replace("'./SessionManager.js'",JSON.stringify(manager)));
const {createGameRegistry}=await import(registry);
const {createGameLauncher}=await import(launcher);
const roster=[{id:'human',type:'human'},{id:'bot',type:'bot'}];
const makeGame=(id,limit)=>({
 id,initialState:()=>({count:0}),
 applyAction:state=>({...state,count:state.count+1}),
 getResult:state=>state.count>=limit?{resultVersion:2,finished:true,results:roster.map(p=>({playerId:p.id,outcome:'complete'}))}:null,
 botAction:()=>({type:'move'})
});
test('registered games launch through one interface with independent sessions',()=>{
 const catalog=createGameRegistry([makeGame('fast',1),makeGame('slow',3)]);
 const launch=createGameLauncher(catalog);
 const a=launch.create('fast',roster);
 const b=launch.create('slow',roster);
 a.start();b.start();
 assert.equal(a.dispatch('human',{type:'move'}).phase,'finished');
 assert.equal(b.dispatch('human',{type:'move'}).phase,'playing');
 assert.equal(b.botTurn('bot').phase,'playing');
 assert.equal(b.dispatch('human',{type:'move'}).phase,'finished');
 assert.equal(a.snapshot().state.count,1);
 assert.equal(b.snapshot().state.count,3);
 assert.equal(a.restart().phase,'ready');
 assert.equal(b.snapshot().phase,'finished');
});
test('launcher rejects unknown games without creating sessions',()=>{
 const launch=createGameLauncher(createGameRegistry());
 assert.throws(()=>launch.create('not-registered',roster),/UNKNOWN_GAME/);
 assert.throws(()=>createGameLauncher(null),/INVALID_GAME_REGISTRY/);
});
test('launcher sees newly registered games without changes to launcher',()=>{
 const catalog=createGameRegistry();
 const launch=createGameLauncher(catalog);
 catalog.register(makeGame('new-kind',1));
 const session=launch.create('new-kind',roster);
 assert.equal(session.start().phase,'playing');
 assert.equal(session.dispatch('human',{type:'finish'}).phase,'finished');
});
