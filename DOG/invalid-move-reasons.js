/**
 * View-only explanations for rejected DOG interactions.
 * Rules always remain authoritative in engine.js / Render; this module never
 * changes game state, private cards, deck order, or networking.
 */
const START=new Set(['1/11','13']);
const pawn=(game,id)=>game?.pieces?.find(p=>p.id===id)||null;
const protectedStart=p=>p?.place==='track'&&p.pos===p.owner*16;
const moverOwner=(game,seat)=>{
 if(game?.mode==='solo3')return seat;
 const own=game?.pieces?.filter(p=>p.owner===seat)||[];
 return own.length&&own.every(p=>p.place==='goal')?(seat+2)%4:seat;
};
function cardType(game,seat,id,jokerAs){
 const card=Array.isArray(game?.hands?.[seat])?game.hands[seat].find(c=>c.id===id):null;
 return card?.type==='joker'?(jokerAs||'joker'):(card?.type||null);
}
function startIsBlocked(game,owner){
 return game.pieces.some(p=>p.place==='track'&&p.pos===owner*16&&protectedStart(p));
}
function activePawns(game,owner){
 return game.pieces.filter(p=>p.owner===owner);
}
/**
 * stage: 'card' (selected hand card has no legal move),
 * 'source' (tapped pawn cannot move), 'target' (illegal swap partner),
 * 'destination' (chosen field is not reachable).
 */
export function dogMoveBlockReason(game,{seat,cardId=null,jokerAs=null,stage='card',sourceId=null,targetId=null,destination=null}={}){
 if(!game||!Number.isInteger(seat)||seat<0)return 'Dieser Spielzug ist momentan nicht möglich.';
 if(!['play','rescue','seven'].includes(game.phase))return 'Warte, bis die Kartenrunde beginnt.';
 const owner=moverOwner(game,seat);
 const type=cardType(game,seat,cardId,jokerAs);
 const source=pawn(game,sourceId),target=pawn(game,targetId);
 const own=activePawns(game,owner);
 const onTrack=own.some(p=>p.place==='track');
 const canStart=START.has(type)||type==='joker';
 const swap=type==='swap';

 if(game.phase==='rescue'&&cardId!==game.rescue?.cardId)
  return 'Nach dem Nachziehen darf nur die gezogene Startkarte zum Heraussetzen gespielt werden.';
 if(stage==='source'){
   if(game.phase==='seven'){
     if(!source)return 'Wähle eine Figur für die restlichen Schritte der 7 aus.';
     if(source.owner!==owner)return 'Die restlichen Schritte der 7 dürfen nur mit eigenen Figuren verteilt werden.';
     if(source.place==='home')return 'Eine Figur im Starthaus kann mit der 7 nicht laufen.';
     return 'Mit dieser Figur lassen sich die restlichen Schritte der 7 nicht vollständig und regelgerecht verteilen.';
   }
   if(!type)return 'Wähle zuerst eine Handkarte aus.';
   if(!source)return 'Tippe zuerst eine Figur auf dem Spielfeld an.';
   if(source.owner!==owner)return swap?
     'Zum Tauschen musst du zuerst eine eigene Figur auf der Laufbahn auswählen.':
     'Du kannst nur deine eigenen Figuren bewegen.';
   if(swap){
     if(source.place==='home')return 'Eine Figur im Starthaus darf nicht getauscht werden. Sie muss zuerst herausgesetzt werden.';
     if(source.place==='goal')return 'Figuren im Zielfeld dürfen nicht getauscht werden.';
     if(protectedStart(source))return 'Diese Figur steht geschützt auf ihrem eigenen Startfeld und darf nicht getauscht werden.';
     return 'Diese Figur kann mit der Tauschkarte gerade nicht getauscht werden.';
   }
   if(source.place==='home'){
     if(!canStart)return type==='12'?
       'Mit der 12 darfst du keine Figur aus dem Starthaus heraussetzen. Dafür brauchst du 1/11, 13 oder einen Joker.':
       'Mit dieser Karte kannst du keine Figur aus dem Starthaus heraussetzen. Dafür brauchst du 1/11, 13 oder einen Joker.';
     if(startIsBlocked(game,owner))return 'Dein eigenes Startfeld ist durch eine geschützte Figur besetzt. Solange sie dort steht, kannst du keine weitere Figur heraussetzen.';
     return 'Mit dieser Karte ist das Heraussetzen gerade nicht erlaubt.';
   }
   if(source.place==='goal'&&type==='4')return 'Im Ziel darf eine Figur mit der 4 nicht rückwärts laufen.';
   return 'Mit dieser Karte ist für die ausgewählte Figur kein gültiger Weg frei.';
 }
 if(stage==='target'&&swap){
   if(!source)return 'Wähle zuerst eine eigene Figur zum Tauschen aus.';
   if(source.place!=='track')return 'Nur Figuren auf der Laufbahn dürfen getauscht werden – nicht im Haus oder im Ziel.';
   if(protectedStart(source))return 'Deine Figur auf dem eigenen Startfeld ist geschützt und darf nicht getauscht werden.';
   if(!target)return 'Zum Tauschen tippe eine andere Figur auf der Laufbahn an.';
   if(target.place==='home')return 'Eine Figur im Starthaus darf nicht getauscht werden.';
   if(target.place==='goal')return 'Eine Figur im Zielfeld darf nicht getauscht werden.';
   if(target.owner===owner)return 'Zwei Figuren derselben Farbe dürfen nicht miteinander getauscht werden.';
   if(protectedStart(target))return 'Die andere Figur steht geschützt auf ihrem eigenen Startfeld und darf nicht getauscht werden.';
   return 'Diese beiden Figuren dürfen nach den DOG-Regeln nicht getauscht werden.';
 }
 if(stage==='destination'){
   if(!source)return 'Wähle zuerst eine Figur aus.';
   if(game.phase==='seven')return 'Die 7 muss vollständig auf erlaubte Wege verteilt werden. Geschützte Startfelder und besetzte Zielfelder blockieren den Weg.';
   if(swap)return 'Beim Tauschen wählst du eine zweite Figur auf der Laufbahn, kein freies Feld.';
   if(source.place==='home'){
     if(!canStart)return 'Diese Karte kann keine Figur aus dem Starthaus heraussetzen.';
     if(startIsBlocked(game,owner))return 'Dein Startfeld ist durch eine geschützte Figur blockiert. Heraussetzen ist deshalb nicht erlaubt.';
     if(destination!=='track:'+owner*16)return 'Eine Figur aus dem Haus muss auf das eigene farbige Startfeld gesetzt werden.';
   }
   if(source.place==='goal'&&destination?.startsWith('track:'))
     return 'Eine Figur im Ziel darf nicht zurück auf die Laufbahn.';
   if(destination?.startsWith('goal:')){
     const goalPos=Number(destination.slice(5));
     if(!Number.isInteger(goalPos)||goalPos<0||goalPos>3)return 'Dieses Zielfeld gehört nicht zur Zielbahn.';
     if(game.pieces.some(p=>p.owner===owner&&p.place==='goal'&&p.pos===goalPos&&p.id!==source.id))
       return 'Dieses Zielfeld ist bereits von einer eigenen Figur besetzt. Im Ziel darfst du nicht überspringen oder schlagen.';
     if(type==='4')return 'Mit der 4 kannst du nicht rückwärts ins Ziel einlaufen; vorwärts muss die Schrittzahl genau passen.';
     if(type==='12')return 'Mit der 12 müssen genau zwölf Schritte bis zum Zielfeld möglich sein.';
     return 'Ins Ziel kommst du nur vorwärts über dein eigenes Startfeld, mit exakt passender Schrittzahl.';
   }
   if(destination?.startsWith('track:')){
     const pos=Number(destination.slice(6));
     if(game.pieces.some(p=>p.place==='track'&&p.pos===pos&&protectedStart(p)&&p.id!==source.id))
       return 'Auf diesem Feld steht eine geschützte Startfigur. Sie darf nicht geschlagen oder übersprungen werden.';
   }
   if(type==='7')return 'Bei der 7 müssen alle sieben Schritte gültig verteilt werden. Die Figur darf kein gesperrtes Feld passieren.';
   if(type==='swap')return 'Zum Tauschen musst du eine andere Figur antippen.';
   return 'Dieses Feld ist mit der gewählten Karte nicht erreichbar. Die Schrittzahl und geschützte Felder müssen stimmen.';
 }
 if(stage==='card'){
   if(game.phase==='seven')return 'Bei der 7 müssen alle sieben Schritte ohne unerlaubten Zug verteilt werden.';
   if(swap){
     if(!own.some(p=>p.place==='track'&&!protectedStart(p)))
       return 'Die Tauschkarte kann nicht genutzt werden: Du brauchst eine eigene ungeschützte Figur auf der Laufbahn. Figuren im Haus, Ziel oder auf dem geschützten Startfeld können nicht tauschen.';
     if(!game.pieces.some(p=>p.owner!==owner&&p.place==='track'&&!protectedStart(p)))
       return 'Für die Tauschkarte gibt es keine andere ungeschützte Figur auf der Laufbahn.';
     return 'Mit dieser Tauschkarte ist derzeit kein Tausch erlaubt.';
   }
   if(!onTrack&&own.every(p=>p.place==='home')&&!canStart)
     return type==='12'?
       'Die 12 ist keine Startkarte. Um aus dem Starthaus zu kommen, benötigst du 1/11, 13 oder Joker.':
       'Alle deine Figuren sind noch im Haus. Du brauchst 1/11, 13 oder Joker zum Heraussetzen.';
   if(canStart&&startIsBlocked(game,owner)&&own.some(p=>p.place==='home'))
     return 'Dein eigenes Startfeld ist geschützt besetzt. Eine weitere Figur kann dort nicht herausgesetzt werden.';
   if(type==='7')return 'Die 7 ist nicht spielbar, wenn sich alle sieben Schritte nicht vollständig verteilen lassen.';
   return 'Für diese Karte gibt es gerade keinen erlaubten Zug. Du kannst sie bei fehlenden Zügen abwerfen und eine Ersatzkarte ziehen.';
 }
 return 'Dieser Zug ist nach den DOG-Regeln gerade nicht möglich.';
}
