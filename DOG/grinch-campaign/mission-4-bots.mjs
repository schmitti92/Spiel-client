// Cooperative local test bots: all decisions use the same legal move generator.
import {legalMoves,applyMove} from './mission-4-movement.mjs?v=5';
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

// Prefer a coordinated approach to the next lever, not simply the longest move.
// The potential accounts for *all* player colors, including swap consequences.
function goals(board,state,color){return stations(board).filter(st=>st.section<=state.section).flatMap(st=>st.levers).filter(f=>!state.leverActive.includes(f.id)&&(f.owner==='all'||f.owner===color)).map(f=>f.anchor+1);}
function potential(board,state,pieces){
 let value=0;
 for(const color of SEATS){
  const pawns=pieces.filter(p=>p.color===color),targets=goals(board,state,color);
  if(targets.length){
   const ds=pawns.map(p=>Math.min(...targets.map(t=>Math.abs(t-(p.field||0))))).sort((a,b)=>a-b);
   value-=ds[0]*12+ds[1]*1.4;
   if(ds[0]===0)value+=320;
  }else{
   const pending=stations(board).filter(st=>st.section<=state.section).flatMap(st=>st.levers).filter(f=>!state.leverActive.includes(f.id)).map(f=>f.anchor+1);
   for(const p of pawns){value+=(p.field||0)*.7;if(pending.includes(p.field))value-=100;}
  }
 }
 value-=pieces.filter(p=>p.color==='enemy').length*40;
 return value;
}
function directScore(board,state,cards,m){
 if(['discard','discardDraw','emptySwap'].includes(m.type))return -400;
 const p=state.pieces.find(q=>q.id===m.pieceId);if(!p)return -1000;
 const color=SEATS[cards.current],targets=goals(board,state,color),origin=p.field||0;
 let s=(m.to-origin)*.6;
 if(m.type==='start')s+=4;
 if(targets.includes(m.to))s+=500;
 if(targets.length){
  const dist=f=>Math.min(...targets.map(t=>Math.abs(t-f)));
  const other=state.pieces.filter(q=>q.color===color&&q.id!==p.id).map(q=>dist(q.field||0));
  const a=Math.min(dist(origin),...other),z=Math.min(dist(m.to),...other);
  s+=(a-z)*15+(dist(origin)-dist(m.to))*2;
  // A short reverse move or a split step can set up an exact landing.
  const rest=cards.hands[cards.current].filter(c=>c.id!==m.cardId);
  if(rest.some(c=>c.type==='joker'||(c.type==='1/11'&&[1,11].some(n=>targets.includes(m.to+n)))||(c.type==='4'&&targets.includes(m.to-4))||targets.includes(m.to+Number(c.type))))s+=15;
 }else{
  const pending=stations(board).filter(st=>st.section<=state.section).flatMap(st=>st.levers).filter(f=>!state.leverActive.includes(f.id)).map(f=>f.anchor+1);
  if(pending.includes(origin)&&!pending.includes(m.to))s+=100;
  if(pending.includes(m.to))s-=130;
 }
 for(const id of m.captures||[]){const q=state.pieces.find(x=>x.id===id);if(q?.color==='enemy')s+=75;else if(q)s-=100+(q.field||0)*3;}
 if(m.type==='swap'){
  const q=state.pieces.find(x=>x.id===m.targetId);
  if(q?.color!=='enemy'){
   const targetGoals=goals(board,state,q.color);
   if(targetGoals.length){const dist=f=>Math.min(...targetGoals.map(t=>Math.abs(t-f)));s+=(dist(q.field)-dist(origin))*13;if(targetGoals.includes(q.field)&&!targetGoals.includes(origin))s-=450;}
   else s-=Math.max(0,q.field-origin)*2;
  }
 }
 return s;
}
function splitScore(board,state,cards,m){
 // Evaluate the best few legal continuations, not just the first step.
 const n=applyMove(board,state.pieces,cards,m,state.section);
 const next=legalMoves(board,n.pieces,n.cards,state.section);
 if(!next.length)return -1000;
 const ranked=next.map(x=>({m:x,s:directScore(board,state,n.cards,x)})).sort((a,b)=>b.s-a.s||b.m.steps-a.m.steps).slice(0,3);
 let best=-1000;
 for(const x of ranked){
  const result=applyMove(board,n.pieces,n.cards,x.m,state.section);
  const remaining=result.cards.seven?7-result.cards.seven.spent:0;
  let value=potential(board,state,result.pieces)-potential(board,state,state.pieces);
  if(remaining){
   const tail=legalMoves(board,result.pieces,result.cards,state.section);
   const whole=tail.filter(t=>t.steps===remaining);
   for(const t of whole){const f=applyMove(board,result.pieces,result.cards,t,state.section);value=Math.max(value,potential(board,state,f.pieces)-potential(board,state,state.pieces));}
  }
  best=Math.max(best,value+x.s*.35);
 }
 return best-1;
}
export function chooseBotMove(board,state,cards){
 const moves=legalMoves(board,state.pieces,cards,state.section);
 return moves.map(m=>({m,score:m.type==='seven'?splitScore(board,state,cards,m):directScore(board,state,cards,m)})).sort((a,b)=>b.score-a.score||a.m.cardId-b.m.cardId||((b.m.steps||0)-(a.m.steps||0)))[0]?.m??null;
}
