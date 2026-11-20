import test from 'node:test';
import assert from 'node:assert/strict';
import {randomLossThresholds,GRINCH_LOSS_MISSIONS,validCampaignSurvivors} from '../DOG/grinch-campaign/mission-loss-policy.js';
import {newGame as first,legalMoves as moves1} from '../DOG/grinch-campaign/mission-1-rules.js';
import {newGame as second,legalMoves as moves2} from '../DOG/grinch-campaign/mission-2-rules.js';
import {MISSIONS} from '../DOG/grinch-campaign/mission-config.js';

test('all Grinch missions require exactly one new capture for each color',()=>{
 assert.deepEqual([1,2,3].map(n=>GRINCH_LOSS_MISSIONS[n].starting),[5,4,3]);
 assert.deepEqual([1,2,3].map(n=>GRINCH_LOSS_MISSIONS[n].rescueTarget),[4,3,2]);
 assert.deepEqual(MISSIONS.slice(0,3).map(x=>x.forcedLossesPerPlayer),[1,1,1]);
 assert.equal(MISSIONS[2].enabled,false,'mission 3 is not yet a playable engine');
 assert.equal(MISSIONS[2].teleportCountToComplete,2);
});
test('each player gets different, hidden randomized capture timing in missions 1 and 2',()=>{
 for(const [mission,make] of [[1,first],[2,second]]){
  for(const seed of [34,94,1978,778819]){
   const s=make(seed);
   const values=randomLossThresholds(seed,mission);
   assert.deepEqual(s.players.map(x=>x.lossTriggerAt),values);
   assert.equal(new Set(values).size,3);
   assert.ok(values.every(n=>n>=2&&n<=7));
   const owned=s.pieces.filter(p=>p.seat===0);
   assert.equal(owned.filter(p=>p.place==='lost').length,mission-1);
   assert.equal(owned.filter(p=>p.place==='home'||p.place==='track').length,6-mission);
  }
 }
});
test('last portal cannot be entered without mandatory hidden trap in either mission',()=>{
 for(const [mission,make,legal] of [[1,first,moves1],[2,second,moves2]]){
  const s=make(361);s.current=0;
  const n=GRINCH_LOSS_MISSIONS[mission].rescueTarget;
  const by=i=>s.pieces.find(p=>p.id==='p'+i);
  for(let i=0;i<n-1;i++){by(i).place='teleported';by(i).steps=64;}
  const remainingId=n-1;by(remainingId).place='track';by(remainingId).steps=63;
  const doomedId=n;by(doomedId).place='home';by(doomedId).steps=-1;
  const card=s.hands[0][0];card.type='1/11';
  if(mission===2)Object.assign(s.m2,{cardCurse:null,frozen:{},hazards:[],portalUntil:-1,
    forcedCard:null,forcedPiece:null,lockedCard:null,noSwapUntil:-1});
  assert.ok(!legal(s,0,card).some(x=>x.pieceId==='p'+remainingId&&x.targetSteps===64));
  by(doomedId).place='lost';by(doomedId).steps=-1;
  s.players[0][mission===1?'lost':'m2Lost']=true;
  assert.ok(legal(s,0,card).some(x=>x.pieceId==='p'+remainingId&&x.targetSteps===64));
 }
});
test('future mission 3 progression is not accepted without 3 lost + 2 saved per seat',()=>{
 const pieces=Array.from({length:15},(_,i)=>({seat:Math.floor(i/5),place:i%5<3?'lost':'teleported'}));
 assert.ok([0,1,2].every(seat=>validCampaignSurvivors(pieces,seat,3)));
 pieces[4].place='home';assert.equal(validCampaignSurvivors(pieces,0,3),false);
});
