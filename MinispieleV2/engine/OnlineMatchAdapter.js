/** Pure adapter between the shared hub match and a minigame.
 * Does not own rooms, identity, network, clocks or persistence.
 */
import {matchPhase,canEnterMatch} from './MatchLifecycle.js';
export function readOnlineMatch(room,gameId){
 if(typeof gameId!=='string'||!gameId)throw Error('INVALID_GAME_ID');
 const match=room?.match;
 if(!match||match.game!==gameId||typeof match.id!=='string'||!match.id)return null;
 const phase=matchPhase(match);
 if(!phase)throw Error('INVALID_MATCH_PHASE');
 return Object.freeze({gameId,matchId:match.id,phase,canEnter:canEnterMatch(match),playerCount:Array.isArray(match.members)?match.members.length:0});
}
export function normalizeOnlineParticipants(members){
 if(!Array.isArray(members)||members.length<1||members.length>4)throw Error('PLAYER_COUNT_1_TO_4');
 const seen=new Set();
 return members.map((m,i)=>{
  if(typeof m?.uid!=='string'||!m.uid||seen.has(m.uid))throw Error('INVALID_PLAYER');
  seen.add(m.uid);
  return Object.freeze({id:m.uid,name:typeof m.name==='string'&&m.name?m.name:'Spieler '+(i+1),type:m.testBot||m.uid.startsWith('testbot:')?'bot':'human',seat:m.seat??i});
 });
}
export function onlineGameActions(gameId){
 if(typeof gameId!=='string'||!/^[a-z][a-z0-9-]*$/.test(gameId))throw Error('INVALID_GAME_ID');
 return Object.freeze({launch:'/'+gameId+'/launch',understood:'/'+gameId+'/understood',action:'/'+gameId+'/action',finish:'/'+gameId+'/finish'});
}
