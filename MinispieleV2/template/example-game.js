/** Copy this file to games/<game-id>.js and replace the example rules.
 * Pure rules only: no DOM, Date.now, timers, sockets, rooms or storage.
 * Engine supplies the existing 1–4 player roster and owns lifecycle.
 */
export const exampleGame = {
 id:'example-game',
 minPlayers:1,
 maxPlayers:4,
 // Optional: capabilities:['timed'], timeLimitMs:30000, scoreDirection:'higher'
 initialState(players,options={}) {
  return {
   turn:0,
   targetTurns:Number.isSafeInteger(options.targetTurns)&&options.targetTurns>0?options.targetTurns:3,
   scores:Object.fromEntries(players.map(p=>[p.id,0]))
  };
 },
 applyAction(state,{playerId,action,players}) {
  if(!players.some(p=>p.id===playerId))throw Error('UNKNOWN_PLAYER');
  if(!action||action.type!=='score'||action.points!==1)throw Error('INVALID_GAME_ACTION');
  if(state.turn>=state.targetTurns)throw Error('GAME_FINISHED');
  return {...state,turn:state.turn+1,scores:{...state.scores,[playerId]:state.scores[playerId]+1}};
 },
 getResult(state) {
  if(state.turn<state.targetTurns)return null;
  return {resultVersion:2,finished:true,results:Object.entries(state.scores).map(([playerId,score])=>({playerId,score}))};
 },
 botAction(state,playerId,players) {
  return {type:'score',points:1};
 }
};
