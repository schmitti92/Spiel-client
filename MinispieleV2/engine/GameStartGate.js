/** Shared, pure pre-game acknowledgement flow.
 * The hub supplies stable player IDs and a trusted clock; UI supplies instructions.
 * No rooms, sockets, persistence, or game-specific rules.
 */
export function createGameStartGate(players, {countdownMs=3000}={}) {
 if(!Array.isArray(players)||players.length<1||players.length>4)throw Error('PLAYER_COUNT_1_TO_4');
 if(!Number.isSafeInteger(countdownMs)||countdownMs<0)throw Error('INVALID_COUNTDOWN');
 const roster=players.map(p=>({id:p?.id,type:p?.type}));
 if(roster.some(p=>typeof p.id!=='string'||!p.id||!['human','bot'].includes(p.type))||new Set(roster.map(p=>p.id)).size!==roster.length)throw Error('INVALID_PLAYERS');
 const humanIds=new Set(roster.filter(p=>p.type==='human').map(p=>p.id));
 const acknowledged=new Set();
 let startAt=null;
 const snapshot=()=>Object.freeze({phase:startAt===null?'instructions':'countdown',total:roster.length,ready:roster.length-humanIds.size+acknowledged.size,waiting:humanIds.size-acknowledged.size,startAt});
 return Object.freeze({
  snapshot,
  acknowledge(playerId,now) {
   if(!humanIds.has(playerId))throw Error('NOT_A_HUMAN_PARTICIPANT');
   if(!Number.isFinite(now))throw Error('INVALID_TIME');
   if(startAt!==null)return snapshot();
   acknowledged.add(playerId);
   if(acknowledged.size===humanIds.size)startAt=now+countdownMs;
   return snapshot();
  },
  canStart(now) {
   if(!Number.isFinite(now))throw Error('INVALID_TIME');
   return startAt!==null&&now>=startAt;
  }
 });
}
