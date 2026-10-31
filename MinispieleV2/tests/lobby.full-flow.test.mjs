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
const {createLobbyGameBridge}=await import(data(read('../engine/LobbyGameBridge.js')));
const {createResultLedger}=await import(data(read('../engine/ResultLedger.js')));
const roster=[{id:'human-1',type:'human'},{id:'bot-1',type:'bot'}];
const scoreGame={
 id:'score-game',minPlayers:2,maxPlayers:4,
 initialState:()=>({turns:[]}),
 applyAction:(state,{playerId})=>({turns:[...state.turns,playerId]}),
 botAction:()=>({type:'move'}),
 getResult:state=>state.turns.length===2?{finished:true,results:roster.map(p=>({playerId:p.id,score:state.turns.filter(x=>x===p.id).length}))}:null
};
const survivalGame={
 id:'survival-game',minPlayers:2,maxPlayers:2,
 initialState:()=>({survivor:null}),
 applyAction:(state,{playerId,action})=>{
  if(action.type!=='survive')throw Error('INVALID_SURVIVAL_ACTION');
  return {survivor:playerId};
 },
 botAction:()=>({type:'survive'}),
 getResult:state=>state.survivor===null?null:{resultVersion:2,finished:true,results:roster.map(p=>({playerId:p.id,outcome:p.id===state.survivor?'survived':'eliminated'}))}
};
const bridge=createLobbyGameBridge(createGameLauncher(createGameRegistry([scoreGame,survivalGame])));
const ledger=createResultLedger(completion=>{
 if(completion.gameId==='score-game')return completion.result.results.map(x=>({playerId:x.playerId,points:x.score}));
 return completion.result.results.map(x=>({playerId:x.playerId,points:x.outcome==='survived'?3:0}));
});
const command=(roomId,matchId,gameId)=>({roomId,matchId,gameId,players:roster});
test('existing lobby room survives two different games and yields shared standings',()=>{
 const first=bridge.prepare(command('existing-room','match-1','score-game'));
 assert.equal(first.identity.roomId,'existing-room');
 assert.equal(first.completion(),null);
 first.start();
 first.dispatch('human-1',{type:'move'});
 first.botTurn('bot-1');
 const scoreResult=first.completion();
 assert.equal(ledger.accept(scoreResult).accepted,true);
 assert.equal(ledger.accept(first.completion()).accepted,false);
 const second=bridge.prepare(command('existing-room','match-2','survival-game'));
 assert.deepEqual(second.players(),first.players());
 second.start();
 second.dispatch('human-1',{type:'survive'});
 assert.equal(ledger.accept(second.completion()).accepted,true);
 const overview=ledger.snapshot('existing-room');
 assert.equal(overview.roomId,'existing-room');
 assert.deepEqual(overview.totals,[{playerId:'human-1',points:4},{playerId:'bot-1',points:1}]);
 assert.deepEqual(overview.matches.map(x=>x.gameId),['score-game','survival-game']);
 assert.equal(ledger.snapshot('another-room').matches.length,0);
});
test('invalid action cannot finish or score a game; replay is a separate generation',()=>{
 const active=bridge.prepare(command('existing-room','match-replay','survival-game'));
 active.start();
 assert.throws(()=>active.dispatch('human-1',{type:'invalid'}),/INVALID_SURVIVAL_ACTION/);
 assert.equal(active.snapshot().phase,'playing');
 assert.equal(active.completion(),null);
 active.dispatch('human-1',{type:'survive'});
 assert.equal(ledger.accept(active.completion()).accepted,true);
 active.restart();
 assert.equal(active.completion(),null);
 active.start();
 active.botTurn('bot-1');
 assert.equal(ledger.accept(active.completion()).accepted,true);
 assert.equal(ledger.accept(active.completion()).accepted,false);
 const matches=ledger.snapshot('existing-room').matches.filter(x=>x.matchId==='match-replay');
 assert.deepEqual(matches.map(x=>x.generation),[0,1]);
 const replayTotals=matches.flatMap(x=>x.awarded).reduce((totals,x)=>({...totals,[x.playerId]:(totals[x.playerId]??0)+x.points}),{});
 assert.deepEqual(replayTotals,{'human-1':3,'bot-1':3});
});
test('game-specific player limits are checked before the lobby can launch a game',()=>{
 assert.throws(()=>bridge.prepare({...command('r','m','survival-game'),players:[roster[0]]}),/GAME_PLAYER_LIMITS/);
 assert.throws(()=>bridge.prepare({...command('r','m','missing-game')}),/UNKNOWN_GAME/);
});
