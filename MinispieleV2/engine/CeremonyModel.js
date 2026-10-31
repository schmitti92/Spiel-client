import {createRoundResults} from './RoundResults.js';
/** Shared presentation data for single or multi-round games. No DOM or room logic. */
export function buildGameCeremony({players,rounds,higherIsBetter=true}) {
  if(!Array.isArray(rounds)||rounds.length<1)throw Error('CEREMONY_REQUIRES_ROUNDS');
  const manager=createRoundResults(players,{higherIsBetter});
  for(const round of rounds)manager.addRound(round);
  const state=manager.snapshot();
  const names=new Map(players.map(p=>[p.id,p.name||p.id]));
  const ranking=state.ranking.map(entry=>({playerId:entry.playerId,name:names.get(entry.playerId),rank:entry.rank,score:entry.score,roundScores:state.rounds.map(round=>round.find(x=>x.playerId===entry.playerId).score)}));
  return {kind:'game',roundCount:state.roundCount,ranking};
}
