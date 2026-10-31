/**
 * MiniGame Engine 2.0 — pure game-session orchestration.
 * No DOM, network, browser storage or player identity handling.
 */
export const CONTRACT_VERSION = 1;
const required = ['id','initialState','applyAction','getResult','botAction'];
const clone = value => structuredClone(value);
const assert = (condition,message) => { if(!condition) throw new Error(message); };
export function validateGame(game) {
 assert(game && typeof game === 'object','GAME_REQUIRED');
 for(const key of required) assert(typeof game[key] === (key==='id'?'string':'function'),'GAME_CONTRACT_'+key);
 return game;
}
export function createSession(game, players, options = {}) {
 validateGame(game);
 assert(Array.isArray(players) && players.length>=1 && players.length<=4,'PLAYER_COUNT_1_TO_4');
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
