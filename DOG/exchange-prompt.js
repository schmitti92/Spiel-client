/**
 * View-only hand-off reminder for DOG's already verified exchange phase.
 * No game mutations, network requests or opponent hand information.
 */
export function dogExchangePrompt(game,seat,selectedCard=null){
 if(game?.phase!=='exchange'||!Number.isInteger(seat)||seat<0||seat>3)return null;
 const players=game.players,hands=game.hands,exchanges=game.exchanges;
 if(!Array.isArray(players)||!Array.isArray(hands)||!Array.isArray(exchanges))return null;
 const player=players[seat],hand=hands[seat];
 if(!player||player.inactive||player.bot||!Array.isArray(hand)||hand.length===0)return null;
 // Online's private snapshot uses false, while local games use null.
 if(exchanges[seat]!==null&&exchanges[seat]!==false)return null;
 const solo=game.mode==='solo2'||game.mode==='solo3';
 let recipientSeat;
 if(solo){
  for(let n=1;n<=4;n++){
   const next=(seat+n)%4;
   if(players[next]&&!players[next].inactive){recipientSeat=next;break;}
  }
 }else recipientSeat=(seat+2)%4;
 const recipient=players[recipientSeat];
 if(!recipient||recipient.inactive)return null;
 const chosen=selectedCard!==null&&hand.some(card=>card?.id===selectedCard);
 return {
  recipientSeat,
  recipientName:String(recipient.name||'Spieler'),
  title:solo?'Gib eine Karte an den nächsten Spieler':'Gib eine Karte an deinen Partner',
  guidance:chosen?'Karte ausgewählt – bestätige unten mit „Karte weitergeben“.':'Wähle unten eine deiner Handkarten aus.',
  selected:chosen
 };
}
