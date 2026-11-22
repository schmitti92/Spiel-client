/**
 * Resolve board taps against already engine-approved DOG actions.
 * Tapping an occupied start square must count as tapping the square itself:
 * the opponent's pawn is the target to capture, not a reason to reject spawn.
 * This is presentation-only; DOG/engine.js remains authoritative.
 */
export function dogBoardActionMatchesDestination(action, selectedPawn, destination, tappedPawnId=null){
  if(!action||!selectedPawn||action.pieceId!==selectedPawn.id)return false;
  if(action.type==='swap')
    return Number.isInteger(tappedPawnId)&&action.targetId===tappedPawnId;
  if(action.type==='start')
    return selectedPawn.place==='home'&&destination?.key==='track:'+(selectedPawn.owner*16);
  return !!destination&&['move','seven-step'].includes(action.type)&&
    action.to===destination.key&&
    (destination.seat===undefined||destination.seat===selectedPawn.owner);
}
