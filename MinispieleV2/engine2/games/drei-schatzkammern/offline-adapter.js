/** Offline integration adapter: engine2 owns roster/lifecycle; game owns rules. */
import {createRoom,dispatch as engineDispatch} from '../../MiniGameEngine2.js';
import {createGame,chooseDoor,revealNext,getResult,botAction,publicGame} from './rules.js';
const fail=x=>{throw Error(x)};
export function createTreasureSession({roomId='offline-treasure',hostId='human:1',players=[],botPreset=0,lockedDoors=[1,2,0]}={}){
 let room=createRoom({roomId,hostId,botPreset});
 let index=0;
 function command(type,actorId,extra={}){
  const result=engineDispatch(room,{type,actorId,commandId:'treasure:'+ ++index,expectedRevision:room.revision,now:1000+index,...extra});
  room=result.state;return room;
 }
 for(const p of players){if(p!==hostId)command('join',p);}
 command('prepare',hostId,{matchId:roomId+':match:1',gameId:'drei-schatzkammern'});
 const game=createGame({players:room.match.roster,lockedDoors});
 return {
  get room(){return structuredClone(room)},
  get game(){return structuredClone(game)},
  command,
  acknowledge(id){command('ready',id);return room.match.phase},
  start(){if(room.match.phase!=='countdown')fail('NOT_READY');command('tick',hostId,{now:room.match.startedAt});},
  choose(id,door){if(room.match.phase!=='playing')fail('NOT_PLAYING');Object.assign(game,chooseDoor(game,id,door));},
  botChoose(id,seed=0){const a=botAction(game,id,seed);this.choose(id,a.door);},
  reveal(){if(room.match.phase!=='playing')fail('NOT_PLAYING');Object.assign(game,revealNext(game));return publicGame(game,hostId)},
  finish(){
   const result=getResult(game);if(!result)fail('GAME_NOT_FINISHED');
   for(const id of room.match.roster)command('submit-result',id,{verified:true,score:result.winnerIds.includes(id)?1:0});
   return {room:structuredClone(room),result};
  },
  view(id){return {room:room.match.phase==='finished'?room.match.phase:room.match.phase,game:publicGame(game,id)}}
 };
}
