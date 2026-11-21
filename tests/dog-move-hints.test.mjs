import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,legalActions} from '../DOG/engine.js';
import {DOG_MOVE_HINTS_KEY,readDogMoveHints,writeDogMoveHints,dogLegalTargets} from '../DOG/move-hints.js';

function state(type='5',seat=0,{inactiveSeats=[]}={}){
 const s=createGame({rng:()=>0.31,bots:[false,false,false,false],inactiveSeats});
 s.phase='play';s.current=seat;s.starter=seat;
 s.hands=[[],[],[],[]];s.hands[seat]=[{id:999,type}];
 return s;
}
function pawn(s,id,place,pos){
 const p=s.pieces.find(p=>p.id===id);p.place=place;p.pos=pos;return p;
}
function targets(s,seat,cardId,pieceId,jokerAs=null){
 return dogLegalTargets(s,legalActions(s,seat),{seat,cardId,pieceId,jokerAs});
}

test('hints start disabled, persist only in local browser preferences, and tolerate unavailable storage',()=>{
 const storage=new Map();
 const local={getItem:key=>storage.get(key)||null,setItem:(key,value)=>storage.set(key,value)};
 assert.equal(readDogMoveHints(local),false);
 assert.equal(writeDogMoveHints(true,local),true);
 assert.equal(storage.get(DOG_MOVE_HINTS_KEY),'1');
 assert.equal(readDogMoveHints(local),true);
 assert.equal(writeDogMoveHints(false,local),false);
 assert.equal(readDogMoveHints(local),false);
 assert.equal(readDogMoveHints({getItem(){throw Error('blocked');}}),false);
 assert.equal(writeDogMoveHints(true,{setItem(){throw Error('blocked');}}),true);
});

test('a five-card and selected red pawn show exactly five spaces forward',()=>{
 const s=state('5');
 pawn(s,0,'track',8);
 const hint=targets(s,0,999,0);
 assert.deepEqual(hint.map(h=>h.key),['track:13']);
 assert.deepEqual(hint.map(h=>h.kind),['move']);
 assert.deepEqual(targets(s,0,999,1),[],'other pawns in reserve are not legal');
});

test('the four-card offers both the forward and backward destinations',()=>{
 const s=state('4');
 pawn(s,0,'track',8);
 assert.deepEqual(new Set(targets(s,0,999,0).map(x=>x.key)),new Set(['track:12','track:4']));
});

test('start cards can only hint own real starting square and a 12 cannot exit',()=>{
 const red=state('13');
 assert.deepEqual(targets(red,0,999,0).map(x=>x.key),['track:0']);
 const green=state('1/11',2,{inactiveSeats:[3]});
 assert.equal(green.mode,'solo3');
 assert.deepEqual(targets(green,2,999,8).map(x=>x.key),['track:32']);
 const twelve=state('12',2,{inactiveSeats:[3]});
 assert.deepEqual(targets(twelve,2,999,8),[]);
});

test('a protected opponent start blocks a five-card destination',()=>{
 const s=state('5');
 pawn(s,0,'track',11);
 pawn(s,4,'track',16); // blue owns track:16, protected
 assert.deepEqual(targets(s,0,999,0),[]);
});

test('goal entry markers use goal:position and the selected pawn color',()=>{
 const s=state('12',2,{inactiveSeats:[3]});
 pawn(s,8,'track',21); // first goal after passing track 32
 const hint=targets(s,2,999,8).filter(h=>h.place==='goal');
 assert.ok(hint.some(h=>h.key==='goal:0'&&h.owner===2));
});

test('Tauschkarte marks only legal opponent figures, including three-human mode',()=>{
 const s=state('swap',2,{inactiveSeats:[3]});
 pawn(s,8,'track',25);
 pawn(s,0,'track',7);
 pawn(s,4,'track',16); // blue protected start, excluded
 pawn(s,5,'track',22); // second blue unprotected, included
 assert.deepEqual(targets(s,2,999,8).map(h=>h.targetId),[0,5]);
 assert.equal(targets(s,2,999,8).some(h=>h.targetId===4),false);
});

test('Joker makes no hint until the player chooses its card interpretation',()=>{
 const s=state('joker');
 pawn(s,0,'track',8);
 assert.deepEqual(targets(s,0,999,0),[]);
 assert.deepEqual(targets(s,0,999,0,'5').map(h=>h.key),['track:13']);
 assert.equal(targets(s,0,999,0,'swap').length,0);
});

test('split seven hints legal partial destinations with no fabricated distances',()=>{
 const s=state('7');
 pawn(s,0,'track',8);
 s.phase='seven';s.seven={cardId:999,spent:2};
 const hint=targets(s,0,999,0);
 assert.ok(hint.length>0);
 assert.ok(hint.every(h=>h.place==='track'||h.place==='goal'));
 assert.ok(hint.every(h=>h.pos>8&&h.pos<=13));
});

test('a replacement card in the rescue phase marks only the exit square',()=>{
 const s=state('13');
 s.phase='rescue';s.rescue={cardId:999};
 assert.deepEqual(targets(s,0,999,0).map(h=>h.key),['track:0']);
 assert.deepEqual(dogLegalTargets(s,legalActions(s,0),{seat:0,cardId:123,pieceId:0}),[]);
});

test('no hints for other seats, stale cards, invalid selected pieces or exchange',()=>{
 const s=state('5');
 pawn(s,0,'track',8);
 const legal=legalActions(s,0);
 assert.deepEqual(dogLegalTargets(s,legal,{seat:1,cardId:999,pieceId:0}),[]);
 assert.deepEqual(dogLegalTargets(s,legal,{seat:0,cardId:321,pieceId:0}),[]);
 assert.deepEqual(dogLegalTargets(s,legal,{seat:0,cardId:999,pieceId:100}),[]);
 s.phase='exchange';
 assert.deepEqual(dogLegalTargets(s,legal,{seat:0,cardId:999,pieceId:0}),[]);
});
