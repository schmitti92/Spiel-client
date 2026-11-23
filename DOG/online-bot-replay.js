/**
 * Render DOG bot replay planning. Pure client validation and presentation only.
 * All positions are already public information in the authorized room.
 * The final authoritative game is never mutated or replayed into Firestore.
 */
export function planDogBotReplay(before,after,raw){
 if(!before||!after||!raw||raw.truncated===true||!Array.isArray(raw.events)||
   !Number.isSafeInteger(before.revision)||!Number.isSafeInteger(after.revision)||
   raw.fromRevision!==before.revision||before.revision>=after.revision)return [];
 const original=before.pieces,final=after.pieces,events=raw.events;
 if(!Array.isArray(original)||!Array.isArray(final)||
   original.length!==final.length||!original.length||
   events.length<2||events.length>24||events.length!==after.revision-before.revision)return [];
 const ids=new Map(original.map(p=>[p.id,p.owner]));
 if(ids.size!==original.length)return [];
 function validPieces(pieces){
  return Array.isArray(pieces)&&pieces.length===original.length&&
   new Set(pieces.map(p=>p.id)).size===ids.size&&pieces.every(p=>
    p&&ids.has(p.id)&&ids.get(p.id)===p.owner&&
    (p.place==='home'&&p.pos===-1||
     p.place==='track'&&Number.isInteger(p.pos)&&p.pos>=0&&p.pos<64||
     p.place==='goal'&&Number.isInteger(p.pos)&&p.pos>=0&&p.pos<4));
 }
 if(!validPieces(final))return [];
 let prev=original,hasBotMovement=false;
 const frames=[];
 for(let i=0;i<events.length;i++){
  const event=events[i];
  if(!event||event.revision!==before.revision+i+1||
    !Number.isInteger(event.seat)||event.seat<0||event.seat>3||
    typeof event.bot!=='boolean'||!validPieces(event.pieces))return [];
  if(event.bot&&event.pieces.some((p,j)=>p.place!==prev[j]?.place||p.pos!==prev[j]?.pos))
   hasBotMovement=true;
  frames.push({revision:event.revision,seat:event.seat,bot:event.bot,pieces:event.pieces});
  prev=event.pieces;
 }
 if(!hasBotMovement)return [];
 const finalById=new Map(final.map(p=>[p.id,p]));
 if(prev.some(p=>finalById.get(p.id)?.place!==p.place||finalById.get(p.id)?.pos!==p.pos))
  return [];
 return frames;
}
