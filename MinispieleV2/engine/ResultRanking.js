import {validateResult} from './ResultContract.js';
/** Shared ceremony ranking; game scores are never modified. */
export function rankResults(result,players,{higherIsBetter=true}={}) {
  validateResult(result,players);
  if(result===null)return null;
  if(typeof higherIsBetter!=='boolean')throw Error('INVALID_SCORE_DIRECTION');
  const order=new Map(players.map((p,i)=>[p.id,i]));
  const sorted=result.results.map(x=>({...x})).sort((a,b)=>
    (higherIsBetter?b.score-a.score:a.score-b.score)||order.get(a.playerId)-order.get(b.playerId));
  let lastScore=null,lastRank=0;
  return sorted.map((entry,index)=>{
    if(index===0||entry.score!==lastScore)lastRank=index+1;
    lastScore=entry.score;
    return {...entry,rank:lastRank};
  });
}
