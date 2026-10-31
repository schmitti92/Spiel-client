/** Pure in-memory tournament ledger. The lobby owns persistence and room membership.
 * Each completed match generation is recorded once; scoring policy is supplied by the caller.
 */
export function createResultLedger(scoreResult) {
 if (typeof scoreResult !== 'function') throw Error('INVALID_SCORING_POLICY');
 const rooms = new Map();
 const copy = value => structuredClone(value);
 const keyOf = item => JSON.stringify([item.matchId,item.generation]);
 const roomFor = roomId => {
  let room = rooms.get(roomId);
  if (!room) {room={entries:new Map(), totals:new Map()};rooms.set(roomId,room);}
  return room;
 };
 return Object.freeze({
  accept(completion) {
   if (!completion || typeof completion !== 'object' || Array.isArray(completion)) throw Error('INVALID_COMPLETION');
   const {roomId,matchId,gameId,generation,players,result} = completion;
   if ([roomId,matchId,gameId].some(v=>typeof v!=='string'||!v.trim()) ||
       !Number.isSafeInteger(generation)||generation<0 ||
       !Array.isArray(players)||players.length<1||players.length>4 ||
       !result||result.finished!==true||!Array.isArray(result.results)) throw Error('INVALID_COMPLETION');
   const ids=players.map(p=>p?.id);
   if(ids.some(id=>typeof id!=='string'||!id)||new Set(ids).size!==ids.length||
      result.results.length!==ids.length||
      result.results.some(r=>!r||!ids.includes(r.playerId))||
      new Set(result.results.map(r=>r.playerId)).size!==ids.length) throw Error('INVALID_COMPLETION_PLAYERS');
   const room=roomFor(roomId);
   const key=keyOf(completion);
   if(room.entries.has(key)) {
    const previous=room.entries.get(key);
    if(previous.gameId!==gameId || JSON.stringify(previous.players)!==JSON.stringify(players) ||
       JSON.stringify(previous.result)!==JSON.stringify(result)) throw Error('COMPLETION_CONFLICT');
    return Object.freeze({accepted:false,roomId,matchId,generation});
   }
   // Score policy converts game-specific outcomes into comparable tournament points.
   const awarded=scoreResult(copy(completion));
   if(!Array.isArray(awarded)||awarded.length!==ids.length||
      awarded.some(x=>!x||!ids.includes(x.playerId)||typeof x.points!=='number'||!Number.isFinite(x.points))||
      new Set(awarded.map(x=>x.playerId)).size!==ids.length) throw Error('INVALID_TOURNAMENT_POINTS');
   const nextTotals=new Map(room.totals);
   for(const {playerId,points} of awarded){
    const total=(nextTotals.get(playerId)??0)+points;
    if(!Number.isFinite(total))throw Error('INVALID_TOURNAMENT_POINTS');
    nextTotals.set(playerId,total);
   }
   room.entries.set(key,copy({roomId,matchId,gameId,generation,players,result,awarded}));
   room.totals=nextTotals;
   return Object.freeze({accepted:true,roomId,matchId,generation});
  },
  snapshot(roomId) {
   if(typeof roomId!=='string'||!roomId.trim())throw Error('INVALID_ROOM_ID');
   const room=rooms.get(roomId);
   return copy({roomId,totals:room?[...room.totals].map(([playerId,points])=>({playerId,points})):[],
     matches:room?[...room.entries.values()]:[]});
  }
 });
}
