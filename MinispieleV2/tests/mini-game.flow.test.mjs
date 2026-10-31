import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL(p,import.meta.url),'utf8');
const data=s=>'data:text/javascript;charset=utf-8,'+encodeURIComponent(s);
const contract=data(read('../engine/GameContract.js'));
const engine=data(read('../engine/MiniGameEngine.js').replace("'./GameContract.js'",JSON.stringify(contract)));
const results=data(read('../engine/ResultContract.js'));
const standard=data(read('../engine/StandardSession.js').replace("'./MiniGameEngine.js'",JSON.stringify(engine)).replace("'./ResultContract.js'",JSON.stringify(results)));
const playersModule=data(read('../engine/PlayerManager.js'));
const manager=data(read('../engine/SessionManager.js').replace("'./StandardSession.js'",JSON.stringify(standard)).replace("'./PlayerManager.js'",JSON.stringify(playersModule)));
const registry=data(read('../engine/GameRegistry.js').replace("'./GameContract.js'",JSON.stringify(contract)));
const launcher=data(read('../engine/GameLauncher.js').replace("'./SessionManager.js'",JSON.stringify(manager)));
const {createGameRegistry}=await import(registry);
const {createGameLauncher}=await import(launcher);
const {createLobbyGameBridge}=await import(data(read('../engine/LobbyGameBridge.js')));
const {createResultLedger}=await import(data(read('../engine/ResultLedger.js')));
const {createMiniGameFlow}=await import(data(read('../engine/MiniGameFlow.js')));
const roster=[{id:'p1',type:'human'},{id:'p2',type:'bot'}];
const game=(id,limit)=>({
 id,minPlayers:2,maxPlayers:4,
 initialState:()=>({moves:[]}),
 applyAction:(state,{playerId})=>({moves:[...state.moves,playerId]}),
 botAction:()=>({type:'move'}),
 getResult:state=>state.moves.length>=limit?{finished:true,results:roster.map(p=>({playerId:p.id,score:state.moves.filter(x=>x===p.id).length}))}:null
});
const bridge=createLobbyGameBridge(createGameLauncher(createGameRegistry([game('one',2),game('two',1)])));
const ledger=createResultLedger(c=>c.result.results.map(x=>({playerId:x.playerId,points:x.score})));
const flow=createMiniGameFlow(bridge,ledger);
const command=(gameId,matchId)=>({roomId:'room-1',matchId,gameId,players:roster});
test('selection to results, replay and next game preserve shared standings',()=>{
 assert.equal(flow.snapshot().stage,'selection');
 assert.throws(()=>flow.start(),/FLOW_NOT_READY/);
 assert.equal(flow.select(command('one','m1')).stage,'ready');
 assert.equal(flow.start().stage,'playing');
 assert.throws(()=>flow.select(command('two','m2')),/FLOW_NOT_IN_SELECTION/);
 assert.equal(flow.dispatch('p1',{type:'move'}).stage,'playing');
 const finished=flow.botTurn('p2');
 assert.equal(finished.stage,'result');
 assert.deepEqual(finished.standings.totals,[{playerId:'p1',points:1},{playerId:'p2',points:1}]);
 assert.throws(()=>flow.dispatch('p1',{type:'move'}),/FLOW_NOT_PLAYING/);
 assert.equal(flow.replay().stage,'ready');
 flow.start();flow.dispatch('p1',{type:'move'});flow.botTurn('p2');
 assert.equal(flow.snapshot().standings.matches.length,2);
 assert.equal(flow.returnToSelection().stage,'selection');
 assert.equal(flow.select(command('two','m2')).identity.roomId,'room-1');
 assert.equal(flow.start().stage,'playing');
 assert.equal(flow.dispatch('p1',{type:'move'}).stage,'result');
 assert.equal(flow.snapshot().standings.matches.length,3);
 assert.deepEqual(flow.snapshot().standings.totals,[{playerId:'p1',points:3},{playerId:'p2',points:2}]);
});
test('invalid commands leave the flow in its previous state',()=>{
 const separate=createMiniGameFlow(bridge,createResultLedger(c=>c.result.results.map(x=>({playerId:x.playerId,points:x.score}))));
 assert.throws(()=>separate.select(command('missing','m3')),/UNKNOWN_GAME/);
 assert.equal(separate.snapshot().stage,'selection');
 assert.throws(()=>separate.replay(),/FLOW_NOT_IN_RESULT/);
 assert.throws(()=>createMiniGameFlow(null,ledger),/INVALID_LOBBY_BRIDGE/);
});
