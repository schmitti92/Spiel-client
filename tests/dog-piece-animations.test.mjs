import test from 'node:test';
import assert from 'node:assert/strict';
import {snapshotPieces,pointForPiece,planPieceMotions} from '../DOG/piece-animations.js';

const board = {
  track: Array.from({length:64}, (_,i)=>({x:i*10,y:i%2*20})),
  goal: Array.from({length:4},(_,seat)=>Array.from({length:4},(_,i)=>({x:100+seat*100+i*8,y:400}))),
  home: Array.from({length:4},(_,seat)=>Array.from({length:4},(_,i)=>({x:100+seat*100+i*8,y:600})))
};
const piece=(id,owner,place,pos)=>({id,owner,place,pos});
const motion=(from,to)=>planPieceMotions([from],[to],board)[0];

test('snapshot copies visual positions and does not mutate game data',()=>{
  const original=[piece(0,0,'home',-1)];
  const saved=snapshotPieces(original);
  saved[0].pos=12;
  assert.equal(original[0].pos,-1);
});
test('figures jump from reserve to their actual start field',()=>{
  const item=motion(piece(0,0,'home',-1),piece(0,0,'track',0));
  assert.equal(item.kind,'launch');
  assert.deepEqual(item.points,[board.home[0][0],board.track[0]]);
});
test('clockwise steps wrap safely across track field 63 to 0',()=>{
  const item=motion(piece(0,0,'track',63),piece(0,0,'track',1));
  assert.equal(item.kind,'step');
  assert.deepEqual(item.points,[board.track[63],board.track[0],board.track[1]]);
});
test('backwards four moves over all four fields (not teleport)',()=>{
  const item=motion(piece(4,1,'track',10),piece(4,1,'track',6));
  assert.equal(item.kind,'step');
  assert.deepEqual(item.points,[10,9,8,7,6].map(i=>board.track[i]));
});
test('goal entry crosses the start first, then turns into goal lane',()=>{
  const item=motion(piece(0,0,'track',63),piece(0,0,'goal',0));
  assert.deepEqual(item.points,[board.track[63],board.track[0],board.goal[0][0]]);
});
test('inside the goal lane all intermediate fields remain visible',()=>{
  const item=motion(piece(0,0,'goal',0),piece(0,0,'goal',3));
  assert.deepEqual(item.points,[...board.goal[0]]);
});
test('swap animates both pieces along opposing arcs',()=>{
  const before=[piece(0,0,'track',7),piece(4,1,'track',31)];
  const after=[piece(0,0,'track',31),piece(4,1,'track',7)];
  const motions=planPieceMotions(before,after,board);
  assert.equal(motions.length,2);
  assert.ok(motions.every(m=>m.kind==='swap'));
  assert.deepEqual(motions[0].points,[board.track[7],board.track[31]]);
});
test('captured figures return to their own reserve',()=>{
  const item=motion(piece(0,0,'track',11),piece(0,0,'home',-1));
  assert.equal(item.kind,'capture');
  assert.deepEqual(item.points,[board.track[11],board.home[0][0]]);
});
test('unchanged positions produce no animation',()=>{
  const p=piece(0,0,'track',5);
  assert.deepEqual(planPieceMotions([p],[{...p}],board),[]);
});
test('coordinates come from the supplied board, not a fixed picture',()=>{
  const custom={...board,track:board.track.map(p=>({x:p.x+17,y:p.y+9}))};
  assert.deepEqual(pointForPiece(piece(4,1,'track',21),custom),custom.track[21]);
});
