import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,legalActions,takeAction} from '../DOG/engine.js';
import {dogMoveBlockReason} from '../DOG/invalid-move-reasons.js';

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

test('invalid swap shows why a pawn in the starting house or on protected start cannot swap',()=>{
 const s=stateWithCard('swap',2);
 const source=pawn(s,8);
 assert.match(dogMoveBlockReason(s,{seat:2,cardId:999,stage:'source',sourceId:source.id}),/Starthaus.*nicht getauscht/);
 source.place='track';source.pos=32; // green protected start
 assert.match(dogMoveBlockReason(s,{seat:2,cardId:999,stage:'source',sourceId:source.id}),/geschützt.*nicht getauscht/);
 assert.match(dogMoveBlockReason(s,{seat:2,cardId:999,stage:'card'}),/ungeschützte Figur/);
});

test('invalid swap destination distinguishes protected, home, goal and same-color pieces',()=>{
 const s=stateWithCard('swap',2);
 const from=pawn(s,8),blue=pawn(s,4),green=pawn(s,9);
 from.place='track';from.pos=26;
 let reason=dogMoveBlockReason(s,{seat:2,cardId:999,stage:'target',sourceId:8,targetId:4});
 assert.match(reason,/Starthaus/);
 blue.place='track';blue.pos=16;
 reason=dogMoveBlockReason(s,{seat:2,cardId:999,stage:'target',sourceId:8,targetId:4});
 assert.match(reason,/geschützt/);
 blue.place='goal';blue.pos=0;
 reason=dogMoveBlockReason(s,{seat:2,cardId:999,stage:'target',sourceId:8,targetId:4});
 assert.match(reason,/Zielfeld/);
 green.place='track';green.pos=35;
 reason=dogMoveBlockReason(s,{seat:2,cardId:999,stage:'target',sourceId:8,targetId:9});
 assert.match(reason,/derselben Farbe/);
});

test('12 explanation distinguishes starting house from normal moves',()=>{
 const s=stateWithCard('12',2);
 assert.match(dogMoveBlockReason(s,{seat:2,cardId:999,stage:'card'}),/12 ist keine Startkarte/);
 assert.match(dogMoveBlockReason(s,{seat:2,cardId:999,stage:'source',sourceId:8}),/Mit der 12/);
});

test('blocked starting field gives specific start-card explanation',()=>{
 const s=stateWithCard('13',2);
 pawn(s,8).place='track';pawn(s,8).pos=32;
 assert.match(dogMoveBlockReason(s,{seat:2,cardId:999,stage:'source',sourceId:9}),/Startfeld.*geschützt/);
 assert.match(dogMoveBlockReason(s,{seat:2,cardId:999,stage:'card'}),/Startfeld.*geschützt/);
});

test('finish lane cannot be passed or occupied by another own pawn',()=>{
 const s=stateWithCard('12',2);
 pawn(s,8).place='track';pawn(s,8).pos=20;
 pawn(s,9).place='goal';pawn(s,9).pos=0;
 assert.match(dogMoveBlockReason(s,{seat:2,cardId:999,stage:'destination',sourceId:8,destination:'goal:0'}),/besetzt/);
});

test('seven split explains why reserve pawns cannot move and the entire seven is mandatory',()=>{
 const s=stateWithCard('7',2);
 s.phase='seven';s.seven={cardId:999,spent:2};
 assert.match(dogMoveBlockReason(s,{seat:2,cardId:999,stage:'source',sourceId:8}),/Starthaus/);
 assert.match(dogMoveBlockReason(s,{seat:2,cardId:999,stage:'destination',sourceId:8,destination:'track:32'}),/vollständig/);
});

test('three-human rule explanations use active seat color and never the missing fourth seat',()=>{
 const s=stateWithCard('swap',2);
 assert.equal(s.mode,'solo3');
 const green=pawn(s,8),blue=pawn(s,4);
 green.place='track';green.pos=23;
 blue.place='track';blue.pos=20;
 const reasons=dogMoveBlockReason(s,{seat:2,cardId:999,stage:'target',sourceId:8,targetId:4});
 assert.match(reasons,/nicht getauscht/);
 assert.ok(legalActions(s,2).some(m=>m.type==='swap'&&m.targetId===4));
});
