/**
 * DOG view-only event animation coordinator.
 * Room revisions and hand-card IDs are read, never written or broadcast.
 * Duplicate WebSocket/poll renders do not retrigger visual celebrations.
 */
export function createDogVisualFeedback(doc){
 let previous=null;
 const listeners=new WeakMap();
 const $=id=>doc.getElementById(id);
 function pulse(node,className){
  if(!node || doc.documentElement?.dataset?.dogMotion==='off' ||
    doc.defaultView?.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches)return;
  const prior=listeners.get(node);
  if(prior)node.removeEventListener?.('animationend',prior);
  node.classList.remove('dog-hand-dealt','dog-hand-revealed',className);
  // Explicit restart only on a real state change, never on ordinary re-render.
  void node.offsetWidth;
  node.classList.add(className);
  const hand=className==='dog-hand-dealt'||className==='dog-hand-revealed';
  const expected=hand?(className==='dog-hand-dealt'?'dog-hand-fan':'dog-hand-reveal'):null;
  const onEnd=event=>{
   if(hand && (event.animationName!==expected||event.target!==node.lastElementChild))return;
   if(!hand && event.target!==node)return;
   node.classList.remove(className);
   node.removeEventListener?.('animationend',onEnd);
   listeners.delete(node);
  };
  node.addEventListener('animationend',onEnd);
  listeners.set(node,onEnd);
 }
 function sync({game,matchKey,seat,handVisible,activeSeat}){
  if(!game)return;
  const shownHand=seat>=0&&Array.isArray(game.hands?.[seat])?game.hands[seat]:[];
  const next={
   matchKey,round:game.round,phase:game.phase,activeSeat,
   handSeat:seat,handCount:shownHand.length,handVisible,
   lastPlayed:game.lastPlayedCard?game.lastPlayedCard.type+':'+game.lastPlayedCard.seat:null,
   revision:game.revision,winner:game.winner,
   discardCount:Array.isArray(game.discard)?game.discard.length:(Number.isInteger(game.discard?.count)?game.discard.count:null)
  };
  const old=previous;
  previous=next;
  if(!old||old.matchKey!==matchKey)return; // initial state and new match are not new events
  if(next.activeSeat!==old.activeSeat && game.phase==='play'){
   pulse($('players')?.querySelector('.seat.on'),'dog-seat-turn-enter');
  }
  const newHand=(next.round!==old.round || (next.handSeat===old.handSeat && next.handCount>old.handCount)) && next.handVisible;
  if(newHand)pulse($('hand'),'dog-hand-dealt');
  else if(next.handVisible&&!old.handVisible&&next.handSeat===old.handSeat)pulse($('hand'),'dog-hand-revealed');
  if(next.round!==old.round)pulse($('dog-deck-art'),'dog-deck-shuffled');
  // A new card really entered the discard pile, regardless of repeated card type.
  if(next.revision!==old.revision && next.lastPlayed && (next.lastPlayed!==old.lastPlayed || (next.discardCount!==null && old.discardCount!==null && next.discardCount>old.discardCount))){
   const node=$('dog-discard-art');
   if(node){node.dataset.dogPlayed=game.lastPlayedCard?.type||'';pulse(node,'dog-discard-played');}
  }
  if(next.phase!==old.phase && next.phase==='exchange'){
   pulse($('dog-deck-art'),'dog-phase-changed');
  }
  if(next.phase==='finished' && old.phase!=='finished')pulse($('winner'),'dog-victory-spotlight');
 }
 function pending(value){
  doc.documentElement.classList.toggle('dog-move-pending',!!value);
 }
 function invalid(){
  pulse($('board')?.closest('.board-card'),'dog-board-invalid');
 }
 function reset(){
  previous=null;
  pending(false);
 }
 return {sync,pending,invalid,reset};
}
