import test from 'node:test';
import assert from 'node:assert/strict';
import {readOnlineMatch,normalizeOnlineParticipants,onlineGameActions} from '../engine/OnlineMatchAdapter.js';
test('adapts hub match without changing it',()=>{
 const room={match:{id:'m1',game:'eier-chaos',status:{phase:'playing'},members:[{uid:'a'}]}};
 assert.deepEqual(readOnlineMatch(room,'eier-chaos'),{gameId:'eier-chaos',matchId:'m1',phase:'playing',canEnter:true,playerCount:1});
 assert.equal(readOnlineMatch(room,'farbenblitz'),null);
});
test('normalizes humans and shared test bots',()=>{
 assert.deepEqual(normalizeOnlineParticipants([{uid:'a',name:'Anna'},{uid:'testbot:1',name:'Bot',testBot:true}]).map(p=>p.type),['human','bot']);
 assert.throws(()=>normalizeOnlineParticipants([{uid:'a'},{uid:'a'}]),/INVALID_PLAYER/);
});
test('provides consistent game action paths without networking',()=>{
 assert.equal(onlineGameActions('eier-chaos').action,'/eier-chaos/action');
 assert.throws(()=>onlineGameActions('../bad'),/INVALID_GAME_ID/);
});
