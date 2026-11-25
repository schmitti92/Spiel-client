// Mission 4 checkpoint and protection rules, no network or random state.
import {fieldAccessible} from './mission-4-board.mjs?v=5';
import {placeTestPiece} from './mission-4-cards.mjs?v=3';
export function recordCheckpoints(board,pieces,id,fields){
 const reached=fields.filter(n=>board.checkpoints.includes(n));
 if(!reached.length)return pieces;
 return pieces.map(p=>p.id===id?{...p,reachedCheckpoints:[...new Set([...(p.reachedCheckpoints||[]),...reached])].sort((a,b)=>a-b)}:p);
}
export const isProtected=(board,piece)=>!!piece?.field&&board.safeFields.includes(piece.field);
export function respawnCaptured(board,pieces,id,section){
 const p=pieces.find(q=>q.id===id);if(!p)throw Error('Unbekannte Figur.');
 const possible=[...(p.reachedCheckpoints||[])].sort((a,b)=>b-a).filter(n=>board.checkpoints.includes(n)&&fieldAccessible(board,section,n));
 for(const field of possible){
  if(!pieces.some(q=>q.id!==id&&q.field===field))return placeTestPiece(board,pieces,id,field);
 }
 return placeTestPiece(board,pieces,id,null);
}
export function enemyHit(board,pieces,id,section){
 const p=pieces.find(q=>q.id===id);if(!p)throw Error('Unbekannte Figur.');
 if(!p.field)return {pieces,event:{type:'enemy-hit',id,blocked:true,reason:'home',to:null}};
 if(isProtected(board,p))return {pieces,event:{type:'enemy-hit',id,blocked:true,reason:'shield',to:p.field}};
 const next=respawnCaptured(board,pieces,id,section);
 return {pieces:next,event:{type:'enemy-hit',id,blocked:false,from:p.field,to:next.find(q=>q.id===id).field}};
}
