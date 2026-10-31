import {validateGameDefinition,GAME_CONTRACT_VERSION} from './GameContract.js';
/**
 * MiniGame Engine 2.0 — pure game-session orchestration.
 * No DOM, network, browser storage or player identity handling.
 */
export const CONTRACT_VERSION = GAME_CONTRACT_VERSION;
const clone = value => structuredClone(value);
const assert = (condition,message) => { if(!condition) throw new Error(message); };
export function validateGame(game) {
 return validateGameDefinition(game);
}
export function createSession(game, players, options = {}) {
 validateGame(game);
 assert(Array.isArray(players) && players.length>=1 && players.length<=4,'PLAYER_COUNT_1_TO_4');
 assert(players.length >= (game.minPlayers ?? 1) && players.length <= (game.maxPlayers ?? 4),'GAME_PLAYER_LIMITS');
 const ids = players.map(p=>p.id);
 assert(players.every(p=>typeof p.id==='string' && p.id && ['human','bot'].includes(p.type)),'INVALID_PLAYER');
 assert(new Set(ids).size===ids.length,'DUPLICATE_PLAYER');
 const roster=clone(players.map(({id,type})=>({id,type})));
 const initial=game.initialState(clone(roster),clone(options));
 assert(initial && typeof initial==='object' && !Array.isArray(initial),'INVALID_INITIAL_STATE');
 let state=clone(initial);
 let revision=0;
 const snapshot=()=>({gameId:game.id,revision,players:clone(roster),state:clone(state),result:clone(game.getResult(clone(state)))});
 return Object.freeze({
  snapshot,
  dispatch(playerId,action) {
   assert(ids.includes(playerId),'UNKNOWN_PLAYER');
   assert(action && typeof action==='object','INVALID_ACTION');
   const next=game.applyAction(clone(state),{playerId,action:clone(action),players:clone(roster)});
   assert(next && typeof next==='object','INVALID_NEXT_STATE');
   state=clone(next);revision++;
   return snapshot();
  },
  botTurn(playerId) {
   const player=roster.find(p=>p.id===playerId);
   assert(player?.type==='bot','NOT_A_BOT');
   const action=game.botAction(clone(state),playerId,clone(roster));
   return this.dispatch(playerId,action);
  },
  restart() {
   const next=game.initialState(clone(roster),clone(options));
   assert(next && typeof next==='object' && !Array.isArray(next),'INVALID_INITIAL_STATE');
   state=clone(next);revision++;return snapshot();
  }
 });
}
