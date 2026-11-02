import test from 'node:test';
import assert from 'node:assert/strict';
import {validatePlayers} from '../engine/PlayerManager.js';
import {normalizeOnlineParticipants} from '../engine/OnlineMatchAdapter.js';
test('shared roster recognizes explicit bots and existing hub testBot flag',()=>{
 const roster=normalizeOnlineParticipants([{uid:'u1',name:'Mensch'},{uid:'bot2',name:'Bot',type:'bot'},{uid:'testbot:legacy',testBot:true}]);
 assert.deepEqual(roster.map(p=>p.type),['human','bot','bot']);
 assert.equal(validatePlayers(roster).length,3);
});
test('untrusted uid prefix never grants bot status',()=>{
 const roster=normalizeOnlineParticipants([{uid:'testbot:pretend',name:'Fake'}]);
 assert.equal(roster[0].type,'human');
});
test('invalid rosters are rejected before games start',()=>{
 assert.throws(()=>normalizeOnlineParticipants([]),/PLAYER_COUNT/);
 assert.throws(()=>normalizeOnlineParticipants([{uid:'a'},{uid:'a'}]),/INVALID_PLAYER/);
 assert.throws(()=>normalizeOnlineParticipants(Array.from({length:5},(_,i)=>({uid:String(i)}))),/PLAYER_COUNT/);
});
