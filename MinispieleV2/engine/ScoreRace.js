/** Shared deterministic score-race reveal model.
 * Presentation only: no DOM, timers, rooms, storage, networking or game rules.
 * The host supplies authoritative final scores and elapsed animation time.
 */
export const SCORE_RACE_DURATION_MS=8500;
export function createScoreRace(results,{durationMs=SCORE_RACE_DURATION_MS}={}){
 if(!Array.isArray(results)||results.length<1||results.length>4)throw Error('PLAYER_COUNT_1_TO_4');
 if(!Number.isFinite(durationMs)||durationMs<=0)throw Error('INVALID_RACE_DURATION');
 const ids=new Set();
 const roster=results.map((p,i)=>{
  if(!p||typeof p.playerId!=='string'||!p.playerId||ids.has(p.playerId)||typeof p.name!=='string'||!p.name||!Number.isFinite(p.score))throw Error('INVALID_RACE_RESULT');
  ids.add(p.playerId);
  return Object.freeze({playerId:p.playerId,name:p.name,score:p.score,seat:p.seat??i});
 });
 const max=Math.max(1,...roster.map(p=>Math.max(0,p.score)));
 const winnerScore=Math.max(...roster.map(p=>p.score));
 return Object.freeze({
  durationMs,
  frame(elapsedMs){
   if(!Number.isFinite(elapsedMs)||elapsedMs<0)throw Error('INVALID_RACE_TIME');
   const progress=Math.min(1,elapsedMs/durationMs),eased=1-(1-progress)**2;
   const finished=progress===1;
   return Object.freeze({
    progress,finished,
    lanes:roster.map(p=>Object.freeze({playerId:p.playerId,name:p.name,seat:p.seat,fillPercent:100*Math.max(0,p.score)/max*eased,score:finished?p.score:null,winner:finished&&p.score===winnerScore})),
    winners:finished?roster.filter(p=>p.score===winnerScore).map(p=>p.playerId):[]
   });
  }
 });
}
