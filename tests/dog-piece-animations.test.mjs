import test from 'node:test';
import assert from 'node:assert/strict';
import {snapshotPieces,pointForPiece,planPieceMotions,createPieceAnimator,shouldAnimatePieceUpdate,opponentMoveNotice} from '../DOG/piece-animations.js';

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

test('animated tokens render at their previous positions before first animation frame',()=>{
 const saved={window:globalThis.window,document:globalThis.document,requestAnimationFrame:globalThis.requestAnimationFrame,cancelAnimationFrame:globalThis.cancelAnimationFrame};
 const attributes={};
 const node={style:{opacity:''},classList:{add(){},remove(){}},
  setAttribute:(key,value)=>{attributes[key]=value},
  removeAttribute:key=>{delete attributes[key]}};
 const svg={busy:false,querySelectorAll:()=>[],querySelector:()=>node,
  setAttribute(key,value){if(key==='aria-busy')this.busy=value},
  removeAttribute(key){if(key==='aria-busy')this.busy=false},
  appendChild(){}};
 globalThis.document={hidden:false};
 globalThis.window={matchMedia:()=>({matches:false})};
 globalThis.requestAnimationFrame=()=>12;
 globalThis.cancelAnimationFrame=()=>{};
 try{
  const animator=createPieceAnimator(svg);
  const duration=animator.play([{id:0,owner:0,kind:'step',points:[{x:5,y:5},{x:35,y:25}]}],['#ff0000']);
  assert.ok(duration>0);
  assert.equal(attributes.transform,'translate(-30.00 -20.00)');
  assert.equal(animator.isActive(),true);
  assert.equal(svg.busy,'true');
  animator.cancel();
  assert.equal(attributes.transform,undefined);
  assert.equal(animator.isActive(),false);
  assert.equal(svg.busy,false);
 }finally{
  for(const [key,value] of Object.entries(saved)){if(value===undefined)delete globalThis[key];else globalThis[key]=value;}
 }
});

test('opponent animation survives skipped non-board game revisions',()=>{
 const before=[piece(0,0,'track',3),piece(4,1,'home',-1)];
 const after=[piece(0,0,'track',3),piece(4,1,'track',16)];
 const base={sameMatch:true,previousRevision:12,currentRevision:15,previousPieces:before,currentPieces:after};
 assert.equal(shouldAnimatePieceUpdate(base),true);
 assert.equal(planPieceMotions(before,after,board)[0].kind,'launch');
 assert.equal(shouldAnimatePieceUpdate({...base,currentRevision:12}),false);
 assert.equal(shouldAnimatePieceUpdate({...base,currentRevision:25}),false);
 assert.equal(shouldAnimatePieceUpdate({...base,sameMatch:false}),false);
 assert.equal(shouldAnimatePieceUpdate({...base,currentPieces:before}),false);
 assert.equal(shouldAnimatePieceUpdate({...base,previousPieces:before.slice(0,1)}),false);
});

test('public opponent and bot move notices never reveal private hands',()=>{
 const motions=[{id:4,owner:1,kind:'step',points:[board.track[4],board.track[5]]}];
 const game={players:[{seat:0,name:'Du',bot:false},{seat:1,name:'Computer Blau',bot:true}],
  hands:[[ {id:1,type:'joker'} ],[{id:7,type:'13'}]],
  history:['Computer Blau spielt 13']};
 assert.deepEqual(opponentMoveNotice(game,motions,{online:false}),{seat:1,text:'🤖 Computer Blau spielt 13'});
 assert.equal(opponentMoveNotice(game,[],{online:false}),null);
 assert.equal(opponentMoveNotice(game,motions,{online:true,ownSeat:1}),null);
 assert.deepEqual(opponentMoveNotice(game,motions,{online:true,ownSeat:0}),{seat:1,text:'🤖 Computer Blau spielt 13'});
 assert.equal(opponentMoveNotice({...game,history:['Runde 2: neue Karten']},motions,{online:true,ownSeat:0}),null);
});
