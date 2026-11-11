/**
 * DOG multiplayer read-only reconciliation.
 *
 * WebSocket notifications and HTTP refreshes can arrive in any order.
 * Room revisions, not response arrival times, decide freshness. Neither
 * visual preferences nor private cards are added to the room state here.
 */
const ownHandIds=(game,seat)=>{
  if(!game||!Number.isInteger(seat)||seat<0||seat>3)return null;
  const hand=game.hands?.[seat];
  return Array.isArray(hand)?hand.map(card=>card?.id).join(','):null;
};
export function decideDogRoomUpdate(previous,room,{hubCode,matchHint=null}={}){
  if(!room||room.code!==hubCode||!Number.isSafeInteger(room.revision)||room.revision<0)
    return {accept:false,reason:'INVALID_OR_FOREIGN_ROOM'};
  const lastRevision=previous?.roomRevision;
  if(Number.isSafeInteger(lastRevision)&&room.revision<lastRevision)
    return {accept:false,reason:'STALE_ROOM'};
  // Duplicate HTTP/socket updates must not redraw the whole board or
  // overwrite a player's in-progress card selection.
  if(Number.isSafeInteger(lastRevision)&&room.revision===lastRevision)
    return {accept:false,reason:'DUPLICATE_ROOM'};
  const match=room.phase==='playing'&&room.match?.game==='dog'?room.match:null;
  if(!match||(matchHint&&matchHint!==match.id))
    return {accept:true,kind:'inactive',roomRevision:room.revision};
  // Non-participating room members are allowed to watch the public board.
  // Their projection never contains a private hand or a playable seat.
  const spectator=match.dogSeat===null;
  if(!match.dog||(!spectator&&(!Number.isInteger(match.dogSeat)||match.dogSeat<0||match.dogSeat>3)))
    return {accept:false,reason:'INVALID_DOG_PROJECTION'};
  if(spectator&&match.dog.hands?.some(Array.isArray))
    return {accept:false,reason:'PRIVATE_HAND_IN_SPECTATOR_PROJECTION'};
  if(!Number.isSafeInteger(match.dog.revision)||match.dog.revision<0)
    return {accept:false,reason:'INVALID_DOG_REVISION'};
  const sameMatch=previous?.matchId===match.id;
  if(sameMatch&&Number.isSafeInteger(previous?.game?.revision)
    && match.dog.revision<previous.game.revision)
    return {accept:false,reason:'STALE_DOG'};
  const seat=match.dogSeat;
  const handChanged=!sameMatch
    ||seat!==previous?.onlineSeat
    ||ownHandIds(previous?.game,seat)!==ownHandIds(match.dog,seat);
  const phaseChanged=sameMatch&&previous?.game?.phase!==match.dog.phase;
  const hideHand=spectator||handChanged||match.dog.phase==='finished'
    ||(phaseChanged&&match.dog.phase==='exchange');
  const clearSelection=handChanged||phaseChanged;
  return {
    accept:true,kind:'dog',roomRevision:room.revision,
    matchId:match.id,game:match.dog,seat,
    hideHand,clearSelection
  };
}
