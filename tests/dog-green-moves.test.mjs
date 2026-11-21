import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,legalActions,takeAction} from '../DOG/engine.js';

function stateWithCard(type,seat,{inactiveSeats=[3]}={}){
 const state=createGame({inactiveSeats,bots:[false,false,false,false],rng:()=>0.41});
 state.phase='play';state.current=seat;state.starter=seat;
 state.hands=[[],[],[],[]];state.hands[seat]=[{id:999,type}];
 return state;
}
function pawn(state,id){return state.pieces.find(piece=>piece.id===id);}

test('12 reaches the first finish field for red, blue, green and yellow with exact distance',()=>{
 for(const seat of [0,1,2,3]){
  const s=stateWithCard('12',seat,{inactiveSeats:[]});
  const piece=pawn(s,seat*4);
  piece.place='track';piece.pos=(seat*16-11+64)%64;
  const move=legalActions(s,seat).find(a=>a.type==='move'&&a.pieceId===piece.id&&a.viaGoal&&a.to==='goal:0'&&a.steps===12);
  assert.ok(move,'seat '+seat+' should be able to enter first finish field with 12');
  const after=takeAction(s,seat,move);
  assert.equal(pawn(after,seat*4).place,'goal');
  assert.equal(pawn(after,seat*4).pos,0);
 }
});

test('green can swap unprotected blue pawn in a three-human game without fourth bot',()=>{
 const s=stateWithCard('swap',2);
 assert.equal(s.mode,'solo3');
 assert.equal(s.pieces.length,12);
 const green=pawn(s,8),blue=pawn(s,4),red=pawn(s,0);
 green.place='track';green.pos=26;
 blue.place='track';blue.pos=20;
 red.place='track';red.pos=0; // protected start, never a swap target
 const actions=legalActions(s,2);
 const swap=actions.find(a=>a.type==='swap'&&a.pieceId===8&&a.targetId===4);
 assert.ok(swap,'green swap is a legal action');
 assert.equal(actions.some(a=>a.type==='swap'&&a.targetId===0),false);
 const after=takeAction(s,2,swap);
 assert.equal(pawn(after,8).pos,20);
 assert.equal(pawn(after,4).pos,26);
 assert.equal(after.players[3].inactive,true);
});

test('a 12 cannot spawn a reserve pawn, including the green reserve',()=>{
 const s=stateWithCard('12',2);
 assert.equal(legalActions(s,2).some(a=>a.type==='start'),false);
});
