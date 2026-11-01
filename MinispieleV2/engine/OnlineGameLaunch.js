import {canEnterMatch} from './MatchLifecycle.js';
/** Shared, pure online minigame navigation policy.
 * The hub is authoritative for room membership and match selection.
 * No sockets, URLs, DOM, storage or game-specific room management.
 */
export function nextMiniGameLaunch(room,currentMatchId=null){
 const match=room?.match;
 if(room?.phase!=='playing'||!canEnterMatch(match))return null;
 if(!Array.isArray(room.players)||!room.players.some(p=>p.me&&p.participating))return null;
 if(match.id===currentMatchId)return null;
 return Object.freeze({gameId:match.game,matchId:match.id});
}
