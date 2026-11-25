// Portal 1: one additional AI seat, one card per three completed human turns.
import {dogCardSteps,dogCardChoices,dogCardsPerRound} from '../engine.js';
import {fillEnemyHand,useEnemyCard,closeEnemyHand,placeTestPiece} from './mission-4-cards.mjs?v=4';
import {isProtected,respawnCaptured,recordCheckpoints} from './mission-4-protection.mjs?v=1';
export const PORTAL_CAP=8;
export const portalEntry=board=>board.fields.find(f=>f.section===1&&f.feature?.type==='spawn')?.number;
export const portalEnemies=pieces=>pieces.filter(p=>p.color==='enemy');
const occupied=(pieces,f,except)=>pieces.find(p=>p.id!==except&&p.field===f);
const permitted=(board,f)=>Number.isInteger(f)&&f>=1&&f<board.sections[0].to+1&&!!board.fields[f-1]?.position;
export function spawnPortalEnemy(board,state){
 if(state.portal1.closed)return state;
 const entry=portalEntry(board);
 if(!entry||portalEnemies(state.pieces).length>=PORTAL_CAP||occupied(state.pieces,entry))return state;
 const id='enemy-'+state.portal1.nextId;
 return {...state,pieces:[...state.pieces,{id,color:'enemy',field:entry,position:{...board.fields[entry-1].position}}],portal1:{...state.portal1,nextId:state.portal1.nextId+1,lastAction:'Gegner '+id.split('-')[1]+' erscheint auf Feld '+entry+'.'}};
}
export function enemyMoves(board,pieces,hand){
 const out=[];
 for(const card of hand)for(const as of dogCardChoices(card.type))for(const p of portalEnemies(pieces)){
  if(as==='swap'){
   for(const q of pieces)if(q.color!=='enemy'&&permitted(board,q.field)&&!isProtected(board,q))out.push({cardId:card.id,as,id:p.id,to:q.field,targetId:q.id,path:[],hits:[],score:p.field-q.field});
   continue;
  }
  for(const value of dogCardSteps(as)){
   const path=[],hits=[];let valid=true;
   for(let j=1;j<=Math.abs(value);j++){
    const f=p.field-Math.sign(value)*j;if(!permitted(board,f)){valid=false;break;}
    const q=occupied(pieces,f,p.id),last=j===Math.abs(value);
    if(q&&last&&(q.color==='enemy'||isProtected(board,q))){valid=false;break;}
    if(q&&q.color!=='enemy'&&!isProtected(board,q)&&(as==='7'||last))hits.push(q.id);
    path.push(f);
   }
   if(valid&&path.length)out.push({cardId:card.id,as,id:p.id,to:path.at(-1),path,hits,score:hits.length*100+p.field-path.at(-1)});
  }
 }
 return out.sort((a,b)=>b.score-a.score||a.cardId-b.cardId||a.id.localeCompare(b.id));
}
export function applyEnemyMove(board,pieces,m,section){
 const p=pieces.find(q=>q.id===m.id);
 if(m.targetId){const q=pieces.find(x=>x.id===m.targetId);let n=pieces.map(x=>x.id===p.id?{...x,field:q.field,position:{...q.position}}:x.id===q.id?{...x,field:p.field,position:{...p.position}}:x);return recordCheckpoints(board,n,q.id,[p.field]);}
 let n=pieces;for(const id of m.hits)n=placeTestPiece(board,n,id,null);
 n=n.map(q=>q.id===p.id?{...q,field:m.to,position:{...board.fields[m.to-1].position}}:q);
 for(const id of m.hits)n=respawnCaptured(board,n,id,section);
 return n;
}
export function portalTick(board,state,cards,previousPhase=cards.phase){
 if(state.portal1.closed||cards.turn===0||cards.turn%3!==0||cards.turn<=state.portal1.lastTurn)return {state,cards};
 let n=spawnPortalEnemy(board,state),c=cards,spawned=n!==state;
 n={...n,portal1:{...n.portal1,lastTurn:cards.turn}};
 if(!portalEnemies(n.pieces).length)return {state:n,cards:c};
 if(!(c.enemyHand||[]).length)c=fillEnemyHand(c,dogCardsPerRound(previousPhase));
 const m=enemyMoves(board,n.pieces,c.enemyHand)[0];
 if(m){const from=n.pieces.find(p=>p.id===m.id).field;n={...n,pieces:applyEnemyMove(board,n.pieces,m,n.section),portal1:{...n.portal1,lastAction:'Gegner '+m.id.split('-')[1]+' spielt '+m.as+': '+from+' → '+m.to+(m.hits.length?' · '+m.hits.length+' Treffer':'')}};c=useEnemyCard(c,m.cardId);}
 else {c=useEnemyCard(c,c.enemyHand[0].id);n.portal1.lastAction='Gegner kann nicht ziehen und wirft eine Karte ab.';}
 // If entry was occupied by an enemy that just moved away, try once more.
 if(!spawned){const message=n.portal1.lastAction;const retry=spawnPortalEnemy(board,n);if(retry!==n)n={...retry,portal1:{...retry.portal1,lastAction:message+' · Neuer Gegner erscheint.'}};}
 return {state:n,cards:c};
}
export function closePortalCards(state,cards){return state.portal1.closed&&(cards.enemyHand||[]).length?closeEnemyHand(cards):cards;}
