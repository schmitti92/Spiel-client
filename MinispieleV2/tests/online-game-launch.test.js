import test from 'node:test';
import assert from 'node:assert/strict';
import {nextMiniGameLaunch} from '../engine/OnlineGameLaunch.js';
const room={phase:'playing',match:{id:'m1',game:'farbenblitz'},players:[{me:true,participating:true},{me:false,participating:true}]};
test('automatically launch selected match for every participating player',()=>{
 assert.deepEqual(nextMiniGameLaunch(room),{gameId:'farbenblitz',matchId:'m1'});
 assert.equal(nextMiniGameLaunch(room,'m1'),null);
});
test('do not launch for spectators, inactive rooms or missing matches',()=>{
 assert.equal(nextMiniGameLaunch({...room,players:[{me:true,participating:false}]}),null);
 assert.equal(nextMiniGameLaunch({...room,phase:'preparing'}),null);
 assert.equal(nextMiniGameLaunch({...room,match:null}),null);
});
test('policy is independent of game ID',()=>{
 assert.deepEqual(nextMiniGameLaunch({...room,match:{id:'m2',game:'another-game'}}),{gameId:'another-game',matchId:'m2'});
});
