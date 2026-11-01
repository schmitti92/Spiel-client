/** Shared pure match lifecycle. The hub owns rooms and persistence.
 * Each newly selected match must receive a unique ID from the hub.
 */
export const MATCH_PHASES=Object.freeze(['instructions','countdown','playing','finished']);
export function matchPhase(match){
 if(!match||typeof match!=='object')return null;
 const phase=match.status?.phase??match.lifecycle?.phase??match.phase??match[match.game]?.phase??null;
 return MATCH_PHASES.includes(phase)?phase:null;
}
export function isMatchFinished(match){return matchPhase(match)==='finished';}
export function canEnterMatch(match){return Boolean(match&&typeof match.id==='string'&&match.id&&typeof match.game==='string'&&match.game&&!isMatchFinished(match));}
export function requireFreshMatch(previous,next){
 if(!next||typeof next.id!=='string'||!next.id)throw Error('INVALID_MATCH_ID');
 if(previous?.id===next.id)throw Error('MATCH_ID_REUSED');
 if(matchPhase(next)!=='instructions')throw Error('NEW_MATCH_MUST_START_WITH_INSTRUCTIONS');
 return true;
}
