import {createGameStartGate} from './GameStartGate.js';

/** Shared minigame launch coordinator.
 * Every game follows: select tile -> instructions -> acknowledge -> countdown -> play.
 * No UI, room management, sockets or persistence. The shared hub owns online readiness.
 * A trusted clock must be supplied by the caller for synchronized online starts.
 */
export function createGameLaunchFlow(flow,{countdownMs=3000}={}){
 if(!flow||typeof flow.select!=='function'||typeof flow.start!=='function'||typeof flow.snapshot!=='function')throw Error('INVALID_MINIGAME_FLOW');
 let gate=null,phase='selection',instructions=null;
 const snapshot=()=>Object.freeze({phase,instructions,readiness:gate?.snapshot()??null,game:flow.snapshot()});
 return Object.freeze({
  snapshot,
  select(command,description){
   if(phase!=='selection')throw Error('LAUNCH_NOT_IN_SELECTION');
   if(typeof description!=='string'||!description.trim())throw Error('GAME_INSTRUCTIONS_REQUIRED');
   const players=command?.players;
   const nextGate=createGameStartGate(players,{countdownMs});
   flow.select(command);
   gate=nextGate;instructions=description;phase='instructions';
   return snapshot();
  },
  acknowledge(playerId,now){
   if(phase!=='instructions'&&phase!=='countdown')throw Error('LAUNCH_NOT_WAITING');
   const ready=gate.acknowledge(playerId,now);
   if(ready.startAt!==null)phase='countdown';
   return snapshot();
  },
  start(now){
   if(phase!=='countdown'||!gate.canStart(now))throw Error('LAUNCH_COUNTDOWN_ACTIVE');
   flow.start();phase='playing';return snapshot();
  },
  dispatch(playerId,action,meta){
   if(phase!=='playing')throw Error('LAUNCH_NOT_PLAYING');
   const result=flow.dispatch(playerId,action,meta);
   if(flow.snapshot().stage==='result')phase='result';
   return result;
  },
  botTurn(playerId){
   if(phase!=='playing')throw Error('LAUNCH_NOT_PLAYING');
   const result=flow.botTurn(playerId);
   if(flow.snapshot().stage==='result')phase='result';
   return result;
  },
  reset(){
   if(phase==='playing')throw Error('LAUNCH_GAME_ACTIVE');
   if(phase==='result')flow.returnToSelection();
   else if(phase!=='selection')flow.returnToSelection();
   gate=null;instructions=null;phase='selection';return snapshot();
  }
 });
}
