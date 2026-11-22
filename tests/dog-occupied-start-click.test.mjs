import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,legalActions,takeAction} from '../DOG/engine.js';
import {dogBoardActionMatchesDestination as match} from '../DOG/board-action-targets.js';

function fixture(seat,type='13'){
 const s=createGame({rng:()=>0.42,bots:[false,false,false,false]});
 s.phase='play';s.current=seat;s.starter=seat;
 s.hands=[[],[],[],[]];s.hands[seat]=[{id:999,type}];
 s.exchanges=[null,null,null,null];
 return s;
}

test('tap on occupied start pawn with 13: all four colours may capture foreign pawns',()=>{
 for(let seat=0;seat<4;seat++){
  const s=fixture(seat);
  const opponent=(seat+1)%4,field=seat*16;
  const target=s.pieces[opponent*4];
  target.place='track';target.pos=field;
  const starter=s.pieces[seat*4];
  const action=legalActions(s,seat).find(a=>a.type==='start'&&a.pieceId===starter.id);
  assert.ok(action,'start must be legal even when occupied by foreign pawn');
  assert.equal(match(action,starter,{key:'track:'+field},target.id),true,
    'Tapping the foreign pawn must select the legal start action');
  const after=takeAction(s,seat,action);
  assert.equal(after.pieces[starter.id].pos,field);
  assert.equal(after.pieces[target.id].place,'home');
 }
});

test('tapping an empty own start remains valid for a 13',()=>{
 const s=fixture(1),starter=s.pieces[4],action=legalActions(s,1).find(a=>a.type==='start'&&a.pieceId===4);
 assert.equal(match(action,starter,{key:'track:16'},null),true);
 assert.equal(match(action,starter,{key:'track:15'},null),false);
});

test('an own protected start pawn continues blocking start, including a tap on that pawn',()=>{
 const s=fixture(1),blocker=s.pieces[5];
 blocker.place='track';blocker.pos=16;
 assert.equal(legalActions(s,1).some(a=>a.type==='start'),false);
});

test('ordinary capture targets and swaps are unaffected by occupied-pawn click fix',()=>{
 const s=fixture(1,'2');
 const own=s.pieces[4],target=s.pieces[0];
 own.place='track';own.pos=14;target.place='track';target.pos=16;
 const move=legalActions(s,1).find(a=>a.type==='move'&&a.pieceId===4&&a.to==='track:16');
 assert.ok(move);
 assert.equal(match(move,own,{key:'track:16'},target.id),true);
 assert.equal(match(move,own,{key:'track:15'},target.id),false);
 assert.equal(match({type:'swap',pieceId:4,targetId:0},own,null,0),true);
 assert.equal(match({type:'swap',pieceId:4,targetId:0},own,null,5),false);
});
