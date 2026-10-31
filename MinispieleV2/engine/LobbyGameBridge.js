/** Pure boundary between the shared lobby and MiniGame Engine.
 * The lobby owns room membership, identities, persistence and navigation.
 * This module never creates or changes a room.
 */
export function createLobbyGameBridge(launcher) {
 if (!launcher || typeof launcher.create !== 'function') throw Error('INVALID_GAME_LAUNCHER');
 return Object.freeze({
  prepare(command) {
   if (!command || typeof command !== 'object' || Array.isArray(command)) throw Error('INVALID_GAME_COMMAND');
   const {roomId, matchId, gameId, players, options = {}} = command;
   if (typeof roomId !== 'string' || !roomId.trim()) throw Error('INVALID_ROOM_ID');
   if (typeof matchId !== 'string' || !matchId.trim()) throw Error('INVALID_MATCH_ID');
   if (typeof gameId !== 'string' || !gameId.trim()) throw Error('INVALID_GAME_ID');
   if (!Array.isArray(players)) throw Error('INVALID_GAME_PLAYERS');
   // Room and match identifiers are references only, never game state.
   const session = launcher.create(gameId, players, options);
   const roster = session.players();
   const identity = Object.freeze({roomId, matchId, gameId});
   const read = () => session.snapshot();
   const completion = () => {
    const snapshot = read();
    if (snapshot.phase !== 'finished') return null;
    return structuredClone({
     ...identity,
     generation:snapshot.generation,
     revision:snapshot.revision,
     players:roster,
     result:snapshot.result
    });
   };
   return Object.freeze({
    identity,
    players:()=>structuredClone(roster),
    snapshot:read,
    start:()=>session.start(),
    dispatch:(playerId,action,meta)=>session.dispatch(playerId,action,meta),
    botTurn:playerId=>session.botTurn(playerId),
    restart:()=>session.restart(),
    completion
   });
  }
 });
}
