// Linear Mission 4 board adapter; card semantics shared with classic DOG.
import {dogCardSteps,dogCardChoices} from '../engine.js';
import {fieldAccessible} from './mission-4-board.mjs?v=6';
import {recordCheckpoints,respawnCaptured} from './mission-4-protection.mjs?v=1';
import {SEATS,completeCard,replacementCard,placeTestPiece} from './mission-4-cards.mjs?v=4';
const copy=x=>JSON.parse(JSON.stringify(x));
const check=(ok,msg)=>{if(!ok)throw Error(msg);};
const at=(pieces,field,except)=>pieces.find(p=>p.id!==except&&p.field===field);
const own=(pieces,cards)=>pieces.filter(p=>p.color===SEATS[cards.current]);
const fieldExists=(board,n)=>fieldAccessible(board,board.unlockedSection??1,n);
function sendHome(board,pieces,id){return placeTestPiece(board,pieces,id,null);}
function relocate(board,pieces,id,to){return placeTestPiece(board,pieces,id,to);}
function path(board,pieces,p,steps,seven=false){
 if(!p||!Number.isInteger(steps)||!steps||(p.field?!fieldExists(board,p.field):steps<0))return null;
 const origin=p.field||0;
 const route=[],captures=[];
 for(let i=1;i<=Math.abs(steps);i++){
  const f=origin+Math.sign(steps)*i;if(!fieldExists(board,f))return null;
  const victim=at(pieces,f,p.id);if(victim&&(seven||i===Math.abs(steps)))captures.push(victim.id);
  route.push(f);
 }
 return {pieceId:p.id,to:route.at(-1),steps,path:route,captures:[...new Set(captures)]};
}
function applyRoute(board,pieces,m){const hits=m.captures||[];let n=pieces.filter(p=>!(p.color==='enemy'&&hits.includes(p.id)));for(const id of hits)if(n.some(p=>p.id===id))n=sendHome(board,n,id);n=relocate(board,n,m.pieceId,m.to);n=recordCheckpoints(board,n,m.pieceId,m.path||[m.to]);for(const id of hits)if(n.some(p=>p.id===id))n=respawnCaptured(board,n,id,board.unlockedSection??1);return n;}
function sevenCandidates(board,pieces,cards,left){const out=[];for(const p of own(pieces,cards))for(let n=1;n<=left;n++){const m=path(board,pieces,p,n,true);if(m)out.push({...m,type:'seven-step',cardId:cards.seven?.cardId,as:'7'});}return out;}
function canSeven(board,pieces,cards,left,memo=new Map()){
 if(left===0)return true;
 const key=left+'|'+pieces.map(p=>p.id+':'+(p.field||0)+':'+(p.reachedCheckpoints||[]).join('.')).join(',');
 if(memo.has(key))return memo.get(key);
 for(const m of sevenCandidates(board,pieces,cards,left))if(canSeven(board,applyRoute(board,pieces,m),cards,left-m.steps,memo)){memo.set(key,true);return true;}
 memo.set(key,false);return false;
}
function sevenMoves(board,pieces,cards,left){const memo=new Map();return sevenCandidates(board,pieces,cards,left).filter(m=>canSeven(board,applyRoute(board,pieces,m),cards,left-m.steps,memo));}
function starts(board,pieces,cards,card,as){
 if(as==='7')return [];
 return own(pieces,cards).filter(p=>!p.field).flatMap(p=>dogCardSteps(as).filter(n=>n>0).map(n=>path(board,pieces,p,n)).filter(Boolean).map(m=>({...m,type:'start',cardId:card.id,as})));
}
function candidates(board,pieces,cards,card,as){
 const out=starts(board,pieces,cards,card,as);
 if(as==='7'){
  if(canSeven(board,pieces,cards,7))out.push({type:'seven',cardId:card.id,as});
 }else if(as==='swap'){
  for(const p of own(pieces,cards).filter(p=>fieldExists(board,p.field)))for(const other of pieces.filter(q=>q.color!==p.color&&fieldExists(board,q.field)&&(q.color!=='enemy'||p.field<board.sections[0].to+1)))out.push({type:'swap',cardId:card.id,as,pieceId:p.id,targetId:other.id,to:other.field});
  if(!out.length)out.push({type:'emptySwap',cardId:card.id,as});
 }else for(const p of own(pieces,cards).filter(p=>p.field))for(const steps of dogCardSteps(as)){const m=path(board,pieces,p,steps);if(m)out.push({...m,type:'move',cardId:card.id,as});}
 return out;
}
export function houseRescueAllowed(board,pieces,cards){return false;}
export function legalMoves(board,pieces,cards,unlockedSection=1){
 board={...board,unlockedSection};
 if(cards.stage!=='play')return [];
 if(cards.seven)return sevenMoves(board,pieces,cards,7-cards.seven.spent);
 const hand=cards.hands[cards.current];
 if(cards.rescue){const c=hand.find(c=>c.id===cards.rescue.cardId);return c?dogCardChoices(c.type).flatMap(as=>starts(board,pieces,cards,c,as)):[];}
 const all=hand.flatMap(c=>dogCardChoices(c.type).flatMap(as=>candidates(board,pieces,cards,c,as)));
 if(all.some(m=>m.type!=='emptySwap'))return all;
 return hand.map(c=>({type:houseRescueAllowed(board,pieces,cards)?'discardDraw':'discard',cardId:c.id}));
}
export function applyMove(board,pieces,cards,action,unlockedSection=1){
 board={...board,unlockedSection};
 const match=legalMoves(board,pieces,cards,unlockedSection).find(m=>['type','cardId','as','pieceId','targetId','steps','to'].every(k=>m[k]===action[k]));
 check(match,'Dieser Zug ist nicht erlaubt.');
 let n=copy(cards),p=pieces;const m=match;
 if(m.type==='seven'){n.seven={cardId:m.cardId,spent:0,snapshot:copy(pieces)};return {cards:n,pieces:p,event:m};}
 if(m.type==='seven-step'){p=applyRoute(board,p,m);n.seven.spent+=m.steps;if(n.seven.spent===7)n=completeCard(n,m.cardId,'spielt die geteilte');return {cards:n,pieces:p,event:m};}
 if(m.type==='discardDraw'){n=replacementCard(n,m.cardId,c=>dogCardChoices(c.type).some(as=>starts(board,p,n,c,as).length));return {cards:n,pieces:p,event:{...m,draw:n.lastDraw}};}
 if(m.type==='start'||m.type==='move')p=applyRoute(board,p,m);
 if(m.type==='swap'){const a=p.find(q=>q.id===m.pieceId),b=p.find(q=>q.id===m.targetId);p=p.map(q=>q.id===a.id?{...q,field:b.field,position:{...b.position}}:q.id===b.id?{...q,field:a.field,position:{...a.position}}:q);p=recordCheckpoints(board,p,a.id,[b.field]);p=recordCheckpoints(board,p,b.id,[a.field]);}
 n=completeCard(n,m.cardId,m.type==='discard'?'ist blockiert, wirft ab':m.type==='emptySwap'?'legt Tausch ohne Ziel ab':'spielt'+(m.as==='7'?' die':''));
 return {cards:n,pieces:p,event:m};
}
export function cancelSplit(pieces,cards){check(cards.seven,'Keine Sieben aktiv.');const n=copy(cards),p=n.seven.snapshot;n.seven=null;return {cards:n,pieces:p};}
