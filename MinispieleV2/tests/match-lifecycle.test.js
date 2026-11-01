import test from 'node:test';
import assert from 'node:assert/strict';
import {matchPhase,isMatchFinished,canEnterMatch,requireFreshMatch} from '../engine/MatchLifecycle.js';
import {nextMiniGameLaunch} from '../engine/OnlineGameLaunch.js';
test('generic lifecycle works for any game, including legacy nested state',()=>{
 for(const game of ['farbenblitz','another-game']){
  const finished={id:'old',game,[game]:{phase:'finished'}};
  assert.equal(isMatchFinished(finished),true);
  assert.equal(canEnterMatch(finished),false);
  assert.equal(matchPhase({id:'new',game,status:{phase:'instructions'}}),'instructions');
 }
});
test('new match requires a fresh ID and instructions',()=>{
 assert.throws(()=>requireFreshMatch({id:'m1'},{id:'m1',status:{phase:'instructions'}}),/MATCH_ID_REUSED/);
 assert.throws(()=>requireFreshMatch({id:'m1'},{id:'m2',status:{phase:'finished'}}),/NEW_MATCH_MUST_START_WITH_INSTRUCTIONS/);
 assert.equal(requireFreshMatch({id:'m1'},{id:'m2',status:{phase:'instructions'}}),true);
});
test('finished match never auto-opens, fresh match does',()=>{
 const base={phase:'playing',players:[{me:true,participating:true}]};
 assert.equal(nextMiniGameLaunch({...base,match:{id:'old',game:'farbenblitz',farbenblitz:{phase:'finished'}}}),null);
 assert.deepEqual(nextMiniGameLaunch({...base,match:{id:'new',game:'farbenblitz',farbenblitz:{phase:'instructions'}}}),{gameId:'farbenblitz',matchId:'new'});
});
