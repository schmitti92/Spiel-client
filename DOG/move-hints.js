/**
 * Read-only DOG move destination projection for the optional board hint lever.
 * Only engine-verified legal actions for the active player's selected card and
 * selected piece may produce a hint. No hints are broadcast or saved to rooms.
 */
export const DOG_MOVE_HINTS_KEY='spielportal:dog:show-legal-targets:v1';

export function readDogMoveHints(storage){
 try{return storage?.getItem(DOG_MOVE_HINTS_KEY)==='1';}catch{return false;}
}
export function writeDogMoveHints(enabled,storage){
 try{storage?.setItem(DOG_MOVE_HINTS_KEY,enabled?'1':'0');}catch{}
 return !!enabled;
}
export function dogLegalTargets(game,actions,{seat,cardId,pieceId,jokerAs=null}={}){
 if(!game||!Array.isArray(actions)||!Number.isInteger(seat)||seat!==game.current||
    !['play','seven','rescue'].includes(game.phase)||
    !Number.isInteger(pieceId)||!Number.isInteger(cardId))return [];
 const hand=game.hands?.[seat];
 if(!Array.isArray(hand)||!hand.some(card=>card.id===cardId))return [];
 const piece=game.pieces?.find(p=>p.id===pieceId);
 if(!piece)return [];
 if(game.phase==='rescue'&&game.rescue?.cardId!==cardId)return [];
 if(game.phase==='seven'&&game.seven?.cardId!==cardId)return [];
 const card=hand.find(c=>c.id===cardId);
 // Do not leak every Joker interpretation until the owner explicitly chose it.
 if(game.phase!=='seven'&&card.type==='joker'&&!jokerAs)return [];
 const result=new Map();
 for(const action of actions){
  if(action.pieceId!==pieceId)continue;
  if(game.phase!=='seven'&&action.cardId!==cardId)continue;
  if(game.phase!=='seven'&&jokerAs&&action.as!==jokerAs)continue;
  if(action.type==='swap'){
   const target=game.pieces.find(p=>p.id===action.targetId);
   if(!target||target.place!=='track')continue;
   const key='track:'+target.pos;
   if(Number.isInteger(target.pos))result.set(key,{key,place:'track',pos:target.pos,owner:target.owner,kind:'swap',targetId:target.id});
  }else if(action.type==='start'){
   const key='track:'+(piece.owner*16);
   result.set(key,{key,place:'track',pos:piece.owner*16,owner:piece.owner,kind:'start'});
  }else if(['move','seven-step'].includes(action.type)){
   const [place,posText]=String(action.to||'').split(':');
   const pos=Number(posText);
   if(!['track','goal'].includes(place)||!Number.isInteger(pos)||
      (place==='track'&&(pos<0||pos>=64))||
      (place==='goal'&&(pos<0||pos>=4)))continue;
   const key=place+':'+pos;
   result.set(key,{key,place,pos,owner:piece.owner,kind:'move'});
  }
 }
 return [...result.values()];
}
