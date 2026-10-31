import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL(p,import.meta.url),'utf8');
const data=s=>'data:text/javascript;charset=utf-8,'+encodeURIComponent(s);
const {farbenblitz}=await import(data(read('../games/farbenblitz.js')));
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
test('Farbenblitz runs offline in shared engine with scoring and replay',()=>{
 const roster=[{id:'human',type:'human'},{id:'bot',type:'bot'}];
 const bridge=createLobbyGameBridge(createGameLauncher(createGameRegistry([farbenblitz])));
 const ledger=createResultLedger(c=>c.result.results.map(r=>({playerId:r.playerId,points:r.score})));
 const flow=createMiniGameFlow(bridge,ledger);
 flow.select({roomId:'existing-room',matchId:'farbenblitz-1',gameId:'farbenblitz',players:roster,options:{rounds:2}});
 assert.equal(flow.start().stage,'playing');
 for(let i=0;i<2;i++){
  const correct=flow.snapshot().session.state.challenge.correct;
  flow.dispatch('human',{type:'answer',round:i,color:correct});
  flow.botTurn('bot');
 }
 assert.equal(flow.snapshot().stage,'result');
 assert.deepEqual(flow.snapshot().standings.totals,[{playerId:'human',points:2},{playerId:'bot',points:2}]);
 assert.equal(flow.replay().stage,'ready');
 assert.equal(flow.start().session.state.round,0);
});
