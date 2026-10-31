import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL(p,import.meta.url),'utf8');
const data=s=>'data:text/javascript;charset=utf-8,'+encodeURIComponent(s);
const contract=data(read('../engine/GameContract.js'));
const engine=data(read('../engine/MiniGameEngine.js').replace("'./GameContract.js'",JSON.stringify(contract)));
const result=data(read('../engine/ResultContract.js'));
const standard=data(read('../engine/StandardSession.js').replace("'./MiniGameEngine.js'",JSON.stringify(engine)).replace("'./ResultContract.js'",JSON.stringify(result)));
const playersModule=data(read('../engine/PlayerManager.js'));
const manager=data(read('../engine/SessionManager.js').replace("'./StandardSession.js'",JSON.stringify(standard)).replace("'./PlayerManager.js'",JSON.stringify(playersModule)));
const registry=data(read('../engine/GameRegistry.js').replace("'./GameContract.js'",JSON.stringify(contract)));
const launcher=data(read('../engine/GameLauncher.js').replace("'./SessionManager.js'",JSON.stringify(manager)));
const bridge=data(read('../engine/LobbyGameBridge.js'));
const {createGameRegistry}=await import(registry);
const {createGameLauncher}=await import(launcher);
const {createLobbyGameBridge}=await import(bridge);
const participants=[{id:'p1',type:'human'},{id:'p2',type:'bot'}];
const game=(id,limit=2)=>({
 id,minPlayers:2,maxPlayers:4,
 initialState:()=>({moves:[]}),
 applyAction:(state,{playerId})=>({moves:[...state.moves,playerId]}),
 getResult:state=>state.moves.length>=limit?{
  resultVersion:2,finished:true,
  results:participants.map(p=>({playerId:p.id,score:state.moves.filter(id=>id===p.id).length}))
 }:null,
 botAction:()=>({type:'move'})
});
const lobby=createLobbyGameBridge(createGameLauncher(createGameRegistry([game('snake'),game('cans',1)])));
const command=(gameId='snake')=>({roomId:'room-123',matchId:'match-1',gameId,players:participants});
test('lobby hands the same room and roster to different game types',()=>{
 const a=lobby.prepare(command());
 const b=lobby.prepare({...command('cans'),matchId:'match-2'});
 assert.deepEqual(a.identity,{roomId:'room-123',matchId:'match-1',gameId:'snake'});
 assert.equal(b.identity.roomId,a.identity.roomId);
 assert.deepEqual(a.players(),participants);
 assert.equal(a.completion(),null);
 a.start();b.start();
 assert.equal(a.dispatch('p1',{type:'move'}).phase,'playing');
 assert.equal(b.dispatch('p1',{type:'move'}).phase,'finished');
 assert.equal(a.botTurn('p2').phase,'finished');
 assert.deepEqual(a.completion().result.results,[{playerId:'p1',score:1},{playerId:'p2',score:1}]);
 assert.equal(b.completion().matchId,'match-2');
 assert.equal(a.completion().roomId,'room-123');
 assert.equal(a.completion().gameId,'snake');
});
test('completion is a detached stable envelope and restart changes generation',()=>{
 const instance=lobby.prepare(command('cans'));
 instance.start();instance.dispatch('p1',{type:'move'});
 const first=instance.completion();
 first.result.results[0].score=999;
 assert.equal(instance.completion().result.results[0].score,1);
 assert.equal(instance.completion().generation,0);
 instance.restart();
 assert.equal(instance.completion(),null);
 instance.start();instance.dispatch('p1',{type:'move'});
 assert.equal(instance.completion().generation,1);
 assert.equal(instance.completion().matchId,first.matchId);
});
test('invalid lobby command and incompatible roster fail before starting a game',()=>{
 for(const field of ['roomId','matchId','gameId']){
  assert.throws(()=>lobby.prepare({...command(),[field]:''}),/INVALID_/);
 }
 assert.throws(()=>lobby.prepare({...command(),players:[participants[0]]}),/GAME_PLAYER_LIMITS/);
 assert.throws(()=>lobby.prepare({...command(),gameId:'missing'}),/UNKNOWN_GAME/);
 assert.throws(()=>createLobbyGameBridge(null),/INVALID_GAME_LAUNCHER/);
});
