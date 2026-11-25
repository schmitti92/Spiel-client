// Cooperative local test bots: all decisions use the same legal move generator.
import {legalMoves,applyMove} from './mission-4-movement.mjs?v=4';
import {SEATS} from './mission-4-cards.mjs?v=4';
import {stations,leverStatus,activateLever} from './mission-4-levers.mjs?v=3';
export function botExchange(cards){
 const value=t=>t==='joker'?50:t==='1/11'||t==='13'?25:t==='7'?20:t==='swap'?3:Number(t)||0;
 return [...cards.hands[cards.current]].sort((a,b)=>value(a.type)-value(b.type)||a.id-b.id)[0];
}
export function activateBotLevers(board,state,color){
 let n=state;
 for(const st of stations(board))for(const lever of st.levers){
  const v=leverStatus(board,n,lever.id);
  if(v.allowed&&v.pawn?.color===color)n=activateLever(board,n,lever.id);
 }
 return n;
}
function score(board,state,cards,m){
 const p=state.pieces.find(q=>q.id===m.pieceId),color=SEATS[cards.current];
 if(m.type==='discard'||m.type==='discardDraw'||m.type==='emptySwap')return -100;
 if(m.type==='seven'){
  const n=applyMove(board,state.pieces,cards,m,state.section);
  const choices=legalMoves(board,n.pieces,n.cards,state.section);
  return choices.length?Math.max(...choices.map(x=>score(board,state,n.cards,x)))-0.25:-1000;
 }
 if(!p)return -1000;
 let s=m.type==='start'?45:(m.to-(p.field||0))*2;
 const targets=stations(board).filter(st=>st.section<=state.section).flatMap(st=>st.levers).filter(f=>!state.leverActive.includes(f.id)&&(f.owner==='all'||f.owner===color)).map(f=>f.anchor+1);
 if(targets.length&&m.to){
  const distance=f=>Math.min(...targets.map(t=>Math.abs(t-f)));
  s+=(distance(p.field||0)-distance(m.to))*5;
  if(targets.includes(m.to))s+=250;
  if(targets.includes(p.field)&&!targets.includes(m.to))s-=150;
 }
 for(const id of m.captures||[]){const q=state.pieces.find(x=>x.id===id);s+=q?.color==='enemy'?130:-210;}
 if(m.type==='swap'){
  const q=state.pieces.find(x=>x.id===m.targetId);
  if(q?.color!=='enemy')s-=100;
  else s+=10;
 }
 return s;
}
export function chooseBotMove(board,state,cards){
 const moves=legalMoves(board,state.pieces,cards,state.section);
 return moves.map(m=>({m,score:score(board,state,cards,m)})).sort((a,b)=>b.score-a.score||a.m.cardId-b.m.cardId)[0]?.m??null;
}
