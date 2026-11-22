/**
 * Local DOG bot strengths. This module never changes the rules, room state,
 * Firebase, or Render's authoritative online turns.
 *
 * Medium intentionally reuses the established classic bot heuristic.
 * Expert looks only at the board and its own cards: never at opponents' hands.
 * Every result comes from legalActions(), so even a weak bot follows the rules.
 */
import {legalActions,botAction} from './engine.js';

export const DOG_BOT_DIFFICULTY_KEY='dog:bot-difficulties:v1';
export const DOG_BOT_DIFFICULTIES=Object.freeze(['easy','medium','expert']);
const DEFAULT='medium';
const slots=Object.freeze([0,1,2,3]);
const mod=n=>((n%64)+64)%64;

export function normalizeDogBotDifficulty(value){
 return DOG_BOT_DIFFICULTIES.includes(value)?value:DEFAULT;
}
export function readDogBotDifficulties(storage=typeof localStorage==='undefined'?null:localStorage){
 try{
  const value=JSON.parse(storage?.getItem(DOG_BOT_DIFFICULTY_KEY)||'{}');
  if(!value||typeof value!=='object'||Array.isArray(value))return {};
  const result={};
  for(const seat of slots)
   if(DOG_BOT_DIFFICULTIES.includes(value[seat]))result[seat]=value[seat];
  return result;
 }catch{return {};}
}
export function saveDogBotDifficulty(seat,level,storage=typeof localStorage==='undefined'?null:localStorage){
 const result=readDogBotDifficulties(storage);
 if(!Number.isInteger(seat)||seat<0||seat>3)return result;
 result[seat]=normalizeDogBotDifficulty(level);
 try{storage?.setItem(DOG_BOT_DIFFICULTY_KEY,JSON.stringify(result));}catch(_){}
 return result;
}
export function dogBotDifficultyForSeat(settings,seat){
 return normalizeDogBotDifficulty(settings?.[seat]);
}

function cardAt(game,seat,cardId){
 return game.hands?.[seat]?.find(card=>card.id===cardId)||null;
}
function friendly(game,seat,owner){
 return owner===seat||(game.mode!=='solo3'&&owner%2===seat%2);
}
function progress(owner,position){
 return mod(position-owner*16);
}
function expertScore(game,seat,action){
 const own=game.pieces.filter(p=>p.owner===seat);
 const card=cardAt(game,seat,action.cardId);
 const holdingStart=own.some(p=>p.place==='home');
 const teammate=game.mode==='solo3'?null:(seat+2)%4;
 const partnerOut=teammate!==null&&
   game.pieces.some(p=>p.owner===teammate&&p.place==='track');
 if(action.type==='exchange'){
  if(!card)return -200;
  // If the partner is stuck in reserve, pass a way out. Otherwise preserve
  // joker/start cards for our own turns and donate a useful ordinary card.
  const rescue=['13','1/11','joker'].includes(card.type);
  if(!partnerOut)return rescue?(card.type==='joker'?55:110):0;
  const value={'2':32,'3':30,'4':26,'5':25,'6':24,'8':23,'9':22,'10':21,
   '12':20,'swap':13,'7':8,'1/11':2,'13':1,'joker':-10};
  return value[card.type]??0;
 }
 if(action.type==='discardDraw')return 0;
 if(action.type==='emptySwap')return -250;
 if(action.type==='seven-finish')return -120;
 if(action.type==='seven')return 75;
 if(action.type==='start'){
  const occupant=game.pieces.find(p=>p.owner!==seat&&p.place==='track'&&p.pos===seat*16);
  return 155+(occupant?(friendly(game,seat,occupant.owner)?-110:85):0)
   -(card?.type==='joker'?22:0);
 }
 if(action.type==='swap'){
  const mine=game.pieces.find(p=>p.id===action.pieceId);
  const theirs=game.pieces.find(p=>p.id===action.targetId);
  if(!mine||!theirs)return -100;
  const improvement=progress(seat,theirs.pos)-progress(seat,mine.pos);
  const opponentLoss=progress(theirs.owner,theirs.pos)-progress(theirs.owner,mine.pos);
  return 22+Math.max(-100,Math.min(100,improvement*2.4))+
   (friendly(game,seat,theirs.owner)?-85:Math.max(-35,Math.min(45,opponentLoss*.75)))-
   (card?.type==='joker'?22:0);
 }
 if(action.type!=='move'&&action.type!=='seven-step')return -100;
 const pawn=game.pieces.find(p=>p.id===action.pieceId);
 if(!pawn)return -100;
 const goal=typeof action.to==='string'&&action.to.startsWith('goal:');
 const target=typeof action.to==='string'&&action.to.startsWith('track:')?
  Number(action.to.slice(6)):null;
 let value=12;
 if(goal){
  const slot=Number(action.to.slice(5));
  value+=pawn.place==='goal'?45+35*(slot-pawn.pos):190+slot*38;
  // The game's actual victory condition is four pawns in goal, regardless
  // of their precise goal slots.
  if(pawn.place!=='goal'&&own.filter(p=>p.place==='goal').length===3)value+=10000;
 }else{
  value+=Math.max(-16,Math.min(75,Number(action.steps||0)*5));
  // Moving backwards from the start can be a deliberate setup for entering
  // the finish on the next card instead of circling another lap.
  if(action.steps===-4&&pawn.place==='track'&&
     progress(seat,pawn.pos)<8)value+=34;
  if(target===seat*16&&pawn.place==='track'&&pawn.pos!==target)value+=25;
  if(target!==null&&target!==seat*16){
   // Unknown cards remain unknown: estimate danger only from board geometry.
   const risk=game.pieces.filter(p=>!friendly(game,seat,p.owner)&&p.place==='track'&&
     mod(target-p.pos)>=1&&mod(target-p.pos)<=13).length;
   value-=Math.min(28,risk*9);
  }
 }
 for(const id of action.captures||[]){
  const struck=game.pieces.find(p=>p.id===id);
  if(!struck)continue;
  value+=friendly(game,seat,struck.owner)?-125:95;
 }
 if(card?.type==='joker')value-=22;
 if(holdingStart&&pawn.place==='goal')value-=12;
 return value;
}

/**
 * Returns a legal action only, never applies one.
 * easy: random legal move
 * medium: existing heuristic
 * expert: positional goals, winning move, captures, threats, exchanges
 */
export function chooseDogBotAction(game,seat=game?.current,difficulty=DEFAULT,rng=Math.random){
 if(!game?.players?.[seat]?.bot||game.players[seat].inactive)return null;
 const level=normalizeDogBotDifficulty(difficulty);
 if(level==='medium')return botAction(game,seat);
 const actions=legalActions(game,seat);
 if(actions.length===0)return null;
 if(level==='easy'){
  const roll=Number(rng());
  return actions[Math.max(0,Math.min(actions.length-1,
   Math.floor((Number.isFinite(roll)?roll:0)*actions.length)))];
 }
 let best=actions[0],bestScore=-Infinity;
 for(const action of actions){
  const score=expertScore(game,seat,action);
  if(score>bestScore){best=action;bestScore=score;}
 }
 return best;
}
