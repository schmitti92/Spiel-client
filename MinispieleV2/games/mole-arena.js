/** Maulwurf Arena: deterministic, turn-independent 30-second score game.
 * The host supplies clock ticks as actions; the rules never read Date or timers.
 */
export const moleArena={
 id:'mole-arena',minPlayers:1,maxPlayers:4,
 capabilities:['timed','simultaneous'],timeLimitMs:30000,scoreDirection:'higher',
 initialState(players,options={}){
  return {elapsedMs:0,round:0,holes:[0,1,2,3,4,5,6,7,8],target:0,
   scores:Object.fromEntries(players.map(p=>[p.id,0])),hits:[],finished:false};
 },
 applyAction(state,{playerId,action,players}){
  if(state.finished)throw Error('GAME_FINISHED');
  if(!action||typeof action!=='object')throw Error('INVALID_ACTION');
  if(action.type==='tick'){
   if(playerId!==null)throw Error('TICK_REQUIRES_SYSTEM');
   if(!Number.isSafeInteger(action.ms)||action.ms<=0||action.ms>30000)throw Error('INVALID_TICK');
   const elapsedMs=Math.min(30000,state.elapsedMs+action.ms);
   const round=Math.floor(elapsedMs/1000);
   return {...state,elapsedMs,round,target:round%9,finished:elapsedMs>=30000};
  }
  if(action.type!=='hit'||!Number.isInteger(action.hole)||action.hole<0||action.hole>8)throw Error('INVALID_HIT');
  if(!players.some(p=>p.id===playerId))throw Error('UNKNOWN_PLAYER');
  const key=playerId+':'+state.round;
  if(state.hits.includes(key))return state;
  return {...state,hits:[...state.hits,key],scores:{...state.scores,[playerId]:state.scores[playerId]+(action.hole===state.target?1:0)}};
 },
 getResult(state){
  if(!state.finished)return null;
  return {finished:true,resultVersion:2,results:Object.entries(state.scores).map(([playerId,score])=>({playerId,score}))};
 },
 botAction(state,playerId){return {type:'hit',hole:state.target};}
};
