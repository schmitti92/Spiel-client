import {rankResults} from './ResultRanking.js';
/** Pure round scoring for the shared ceremony; no UI, network or storage. */
export function createRoundResults(players,{higherIsBetter=true}={}) {
  if(!Array.isArray(players)||players.length<1||players.length>4||players.some(p=>!p||typeof p.id!=='string'||!p.id)||new Set(players.map(p=>p.id)).size!==players.length)throw Error('INVALID_PLAYERS');
  if(typeof higherIsBetter!=='boolean')throw Error('INVALID_SCORE_DIRECTION');
  const ids=players.map(p=>p.id);
  const rounds=[];
  const snapshot=()=>{
    const totals=ids.map(playerId=>({playerId,score:rounds.reduce((sum,round)=>sum+round.find(x=>x.playerId===playerId).score,0)}));
    return {roundCount:rounds.length,rounds:rounds.map(round=>round.map(x=>({...x}))),totals,ranking:rounds.length?rankResults({finished:true,results:totals},players,{higherIsBetter}):null};
  };
  return Object.freeze({
    snapshot,
    addRound(results) {
      if(!Array.isArray(results)||results.length!==ids.length||results.some(x=>!x||!ids.includes(x.playerId)||typeof x.score!=='number'||!Number.isFinite(x.score))||new Set(results.map(x=>x.playerId)).size!==ids.length)throw Error('INVALID_ROUND_RESULTS');
      const round=ids.map(id=>({playerId:id,score:results.find(x=>x.playerId===id).score}));
      if(round.some((x,i)=>!Number.isFinite(x.score+rounds.reduce((sum,r)=>sum+r[i].score,0))))throw Error('INVALID_TOTAL_SCORE');
      rounds.push(round);
      return snapshot();
    }
  });
}
