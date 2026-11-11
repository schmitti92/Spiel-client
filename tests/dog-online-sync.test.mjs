import test from 'node:test';
import assert from 'node:assert/strict';
import {decideDogRoomUpdate} from '../DOG/online-sync.js';

const mkGame=(revision,phase='play',hand=[{id:12,type:'7'},{id:24,type:'4'}])=>({
 revision,phase,current:0,
 hands:[hand,{count:2},{count:2},{count:2}],
 exchanges:[false,false,false,false]
});
const room=(revision,game=mkGame(revision),options={})=>({
 code:options.code??'ABC23D',revision,
 phase:options.phase??'playing',
 match:options.phase==='preparing'?null:{
   id:options.matchId??'match-1',game:options.gameType??'dog',
   dog:game,dogSeat:options.seat??0
 }
});
const previous=(roomRevision,game=mkGame(roomRevision),matchId='match-1',seat=0)=>({
 roomRevision,game,matchId,onlineSeat:seat
});
const decide=(p,r,opts={})=>decideDogRoomUpdate(p,r,{hubCode:'ABC23D',...opts});

test('DOG online ignores late HTTP reply after a newer WebSocket update',()=>{
 const latest=previous(18,mkGame(9));
 assert.deepEqual(decide(latest,room(17,mkGame(8))),{accept:false,reason:'STALE_ROOM'});
 assert.deepEqual(decide(latest,room(18,mkGame(9))),{accept:false,reason:'DUPLICATE_ROOM'});
 assert.deepEqual(decide(latest,room(99,mkGame(10),{code:'OTHERX'})),{accept:false,reason:'INVALID_OR_FOREIGN_ROOM'});
});
test('DOG online opponents can exchange cards without closing my visible hand',()=>{
 const old=mkGame(4,'exchange',[{id:12,type:'7'},{id:24,type:'4'}]);
 const incoming=mkGame(5,'exchange',[{id:12,type:'7'},{id:24,type:'4'}]);
 const result=decide(previous(10,old),room(11,incoming));
 assert.equal(result.accept,true);
 assert.equal(result.hideHand,false);
 assert.equal(result.clearSelection,false);
 assert.equal(result.seat,0);
});
test('DOG online selecting a seven keeps the hand visible through split moves',()=>{
 const start=mkGame(4,'play',[{id:12,type:'7'}]);
 const entered=mkGame(5,'seven',[{id:12,type:'7'}]);
 let change=decide(previous(10,start),room(11,entered));
 assert.equal(change.hideHand,false);
 assert.equal(change.clearSelection,true);
 const next=mkGame(6,'seven',[{id:12,type:'7'}]);
 change=decide(previous(11,entered),room(12,next));
 assert.equal(change.hideHand,false);
 assert.equal(change.clearSelection,false);
 const finished=mkGame(7,'play',[]);
 change=decide(previous(12,next),room(13,finished));
 assert.equal(change.hideHand,true);
 assert.equal(change.clearSelection,true);
});
test('DOG online rerolls and new rounds safely conceal a newly dealt hand',()=>{
 const old=mkGame(4,'exchange',[{id:7,type:'4'}]);
 const newCards=mkGame(5,'exchange',[{id:54,type:'5'}]);
 const update=decide(previous(10,old),room(11,newCards));
 assert.equal(update.hideHand,true);
 assert.equal(update.clearSelection,true);
});
test('DOG online fresh match and seat changes do not expose another player hand',()=>{
 const old=mkGame(22);
 const update=decide(previous(60,old),room(61,mkGame(1),{matchId:'match-2'}));
 assert.equal(update.accept,true);
 assert.equal(update.hideHand,true);
 assert.equal(update.matchId,'match-2');
 const switched=decide(previous(61,mkGame(1),'match-2',0),room(62,mkGame(2),{seat:2}));
 assert.equal(switched.hideHand,true);
});
test('DOG online pinned match URL never silently swaps to a different room match',()=>{
 const active=decide(previous(10,mkGame(4)),room(11,mkGame(1),{matchId:'match-2'}),{matchHint:'match-1'});
 assert.equal(active.accept,true);
 assert.equal(active.kind,'inactive');
 assert.equal(active.roomRevision,11);
});
test('DOG online refuses invalid projections instead of breaking the UI',()=>{
 const spectator=room(11,mkGame(2),{seat:null});spectator.match.dogSeat=null;
 spectator.match.dog.hands=[{count:2},{count:2},{count:2},{count:2}];
 const watch=decide(previous(10,mkGame(1)),spectator);
 assert.equal(watch.accept,true);
 assert.equal(watch.seat,null);
 assert.equal(watch.hideHand,true);
 spectator.match.dog.hands[0]=[{id:7,type:'7'}];
 assert.equal(decide(previous(10,mkGame(1)),spectator).reason,'PRIVATE_HAND_IN_SPECTATOR_PROJECTION');
 assert.equal(decide(previous(10,mkGame(1)),{code:'ABC23D',revision:11,phase:'playing',match:{id:'match-1',game:'dog',dog:{revision:'bad'},dogSeat:0}}).accept,false);
});
test('DOG online state accepts a recoverable fetch on first load',()=>{
 const update=decide({roomRevision:null,game:null,matchId:null,onlineSeat:null},room(12,mkGame(5)));
 assert.equal(update.accept,true);
 assert.equal(update.kind,'dog');
 assert.equal(update.hideHand,true);
});
