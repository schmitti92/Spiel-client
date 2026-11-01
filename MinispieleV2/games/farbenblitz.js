/** Farbenblitz – pure deterministic color recognition game.
 * Each participant answers one challenge per round. No timers, DOM or network.
 */
export const COLORS=Object.freeze(['rot','blau','gruen','gelb']);
const LEVELS=Object.freeze(['leicht','mittel','schwer']);
// Four-round balanced rotation: each word and ink color occurs once per cycle.
const challenge=(round,level)=>{
 const cycle=Math.floor(round/4),index=round%4;
 const wordIndex=(index+cycle)%COLORS.length;
 const inkIndex=(index+cycle+1+cycle%2)%COLORS.length;
 return {word:COLORS[wordIndex],ink:COLORS[inkIndex],
  correct:level==='leicht'?COLORS[wordIndex]:COLORS[inkIndex]};
};
export const farbenblitz={
 id:'farbenblitz',minPlayers:1,maxPlayers:4,scoreDirection:'higher',
 capabilities:['rounds','simultaneous'],roundCount:10,
 initialState(players,options={}){
  const rounds=options.rounds??10,level=options.level??'mittel';
  if(!Number.isSafeInteger(rounds)||rounds<1||rounds>30)throw Error('INVALID_ROUNDS');
  if(!LEVELS.includes(level))throw Error('INVALID_LEVEL');
  return {round:0,rounds,level,challenge:challenge(0,level),
   scores:Object.fromEntries(players.map(p=>[p.id,0])),
   answered:[],finished:false};
 },
 applyAction(state,{playerId,action,players}){
  if(state.finished)throw Error('GAME_FINISHED');
  if(!players.some(p=>p.id===playerId))throw Error('UNKNOWN_PLAYER');
  if(!action||action.type!=='answer'||!COLORS.includes(action.color)||action.round!==state.round)throw Error('INVALID_COLOR_ACTION');
  if(state.answered.includes(playerId))throw Error('ALREADY_ANSWERED');
  const scores={...state.scores,[playerId]:state.scores[playerId]+(action.color===state.challenge.correct?1:0)};
  const answered=[...state.answered,playerId];
  if(answered.length<players.length)return {...state,scores,answered};
  const round=state.round+1;
  return {...state,scores,round,answered:[],finished:round>=state.rounds,
   challenge:round>=state.rounds?null:challenge(round,state.level)};
 },
 getResult(state){
  if(!state.finished)return null;
  return {resultVersion:2,finished:true,results:Object.entries(state.scores).map(([playerId,score])=>({playerId,score}))};
 },
 botAction(state,playerId,players){
  if(!players.some(p=>p.id===playerId))throw Error('UNKNOWN_PLAYER');
  return {type:'answer',round:state.round,color:state.challenge.correct};
 }
};
