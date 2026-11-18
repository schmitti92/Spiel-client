/**
 * Standalone, deterministic Grinch mission 1 trial engine.
 * Three independent human seats, five reserve pieces each, ORIGINAL 64 track fields.
 * Never reads/writes official DOG rooms, village currency or mission progress.
 */
import {MISSION_1} from './mission-config.js';
export const SEATS=3,TRACK=64,GOAL=4;
export const COLORS=['#e65f58','#4c9bfa','#e8b84e'];
export const LABELS=['Rot','Blau','Gelb'];
export const START_CARDS=new Set(['1/11','13']);
export const TYPES=['1/11','2','3','4','5','6','7','8','9','10','12','13','Joker'];
export const LOSS_TYPES=['collapse','abduction','freeze'];
const clone=x=>JSON.parse(JSON.stringify(x));
const pos=(n)=>((n%TRACK)+TRACK)%TRACK;
// The original DOG track uses four 16-step quadrants.
// Mission seats deliberately occupy its red, blue and yellow start indices.
const MISSION_STARTS=[0,16,48];
const homeIndex=s=>MISSION_STARTS[s];
function seeded(seed){let x=(seed>>>0)||1;return ()=>((x=(Math.imul(x,1664525)+1013904223)>>>0)/4294967296);}
function shuffle(xs,rng){const list=[...xs];for(let i=list.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[list[i],list[j]]=[list[j],list[i]];}return list;}
function deck(rng){return shuffle(TYPES.flatMap((type,i)=>Array.from({length:type==='Joker'?6:8},(_,n)=>({id:type+'-'+i+'-'+n,type}))),rng);}
function pieceAtTrack(s,absolute,except){return s.pieces.find(p=>p.id!==except&&p.place==='track'&&pos(homeIndex(p.seat)+p.steps)===absolute);}
function finishAvailable(s,p,newSteps){if(newSteps<TRACK||newSteps>=TRACK+GOAL)return false;const lane=newSteps-TRACK;return !s.pieces.some(o=>o.id!==p.id&&o.seat===p.seat&&o.place==='goal'&&o.steps-TRACK===lane);}
function values(type){if(type==='1/11')return [1,11];if(type==='4')return [4,-4];if(type==='7'||type==='Joker')return [];return [Number(type)];}
function isTurnDone(s){return s.players.every(p=>s.hands[p.seat].length===0);}
function refill(s){if(s.draw.length<SEATS*5){s.draw=deck(seeded(s.seed+s.round*31));}s.round++;for(let i=0;i<SEATS;i++)s.hands[i]=s.draw.splice(0,5);log(s,'Neue Kartenphase '+s.round);}
function log(s,message){s.history.unshift(message);s.history=s.history.slice(0,10);}
function nextTurn(s){
 s.current=(s.current+1)%SEATS;s.turn++;
 if(isTurnDone(s))refill(s);
 // Discard impossible hands, rather than soft-locking an active player.
 let guard=0;
 // A whole deal can contain no playable starting or movement cards.
 // Cycle through complete card phases until somebody has a legal move.
 while(guard++<500&&!s.complete){
  const hand=s.hands[s.current];
  const can=hand.some(c=>legalMoves(s,s.current,c).length>0);
  if(can)break;
  if(hand.length){log(s,LABELS[s.current]+' kann nicht ziehen – Karten abgelegt');s.discard.push(...hand.splice(0));}
  s.current=(s.current+1)%SEATS;s.turn++;
  if(isTurnDone(s))refill(s);
 }
 if(guard>=500)throw Error('Keine legalen Kartenaktionen gefunden.');
}
function assignLosses(seed){return shuffle(LOSS_TYPES,seeded(seed+77));}
export function newGame(seed=Math.floor(Math.random()*2147483647),names=LABELS){
 const rng=seeded(seed);
 const s={
  version:1,mission:MISSION_1.id,seed,players:LABELS.map((name,seat)=>({seat,name:String(names[seat]||name).slice(0,25),lossType:assignLosses(seed)[seat],lost:false,moves:0})),
  pieces:Array.from({length:15},(_,i)=>({id:'p'+i,seat:Math.floor(i/5),place:'home',steps:-1})),
  current:0,turn:0,round:0,draw:deck(rng),discard:[],hands:[[],[],[]],history:[],complete:false,revision:0,lastEvent:null,effects:[],
 };
 refill(s);
 // The first player may have no starting card. Skip impossible openings automatically.
 if(!s.hands[s.current].some(card=>legalMoves(s,s.current,card).length))nextTurn(s);
 return s;
}
export function pieceCoord(p){if(p.place==='track')return pos(homeIndex(p.seat)+p.steps);if(p.place==='goal')return p.steps-TRACK;return -1;}
export function legalMoves(s,seat,card){
 if(s.complete||seat!==s.current||!card||!s.hands[seat].some(c=>c.id===card.id))return [];
 const types=card.type==='Joker'?TYPES.filter(x=>x!=='Joker'):[card.type];
 const opts=[];
 for(const type of types){
  if(START_CARDS.has(type))for(const p of s.pieces.filter(p=>p.seat===seat&&p.place==='home')){
   const occupant=pieceAtTrack(s,homeIndex(seat),p.id);
   if(!occupant)opts.push({kind:'start',pieceId:p.id,cardId:card.id,as:type});
  }
  if(type==='7'){
   for(const a of s.pieces.filter(p=>p.seat===seat&&p.place==='track'))
    for(const b of s.pieces.filter(p=>p.seat!==seat&&p.place==='track'))
     opts.push({kind:'swap',pieceId:a.id,targetId:b.id,cardId:card.id,as:type});
  }
  for(const distance of values(type)){
   for(const p of s.pieces.filter(p=>p.seat===seat&&(p.place==='track'||p.place==='goal'))){
    if(p.place==='goal'&&distance<0)continue;
    const targetSteps=p.steps+distance;
    if(targetSteps<0||targetSteps>=TRACK+GOAL)continue;
    if(p.place==='goal'&&targetSteps<TRACK)continue;
    if(targetSteps>=TRACK&&!finishAvailable(s,p,targetSteps))continue;
    const final=targetSteps<TRACK?pos(homeIndex(seat)+targetSteps):-1;
    const at=final>=0?pieceAtTrack(s,final,p.id):null;
    const starts=(final===homeIndex(seat));
    if(at&&at.seat===seat||at&&starts)continue;
    // Cannot jump over own figures inside a narrow goal lane.
    if(targetSteps>=TRACK){
      const from=Math.max(TRACK,p.steps+1),to=targetSteps;
      if(s.pieces.some(o=>o.id!==p.id&&o.seat===seat&&o.place==='goal'&&o.steps>=from&&o.steps<=to))continue;
    }
    opts.push({kind:'move',pieceId:p.id,cardId:card.id,as:type,distance,targetSteps,captureId:at?.id||null});
   }
  }
 }
 return opts;
}
function ensureSingleLoss(s,seat,movedId){
 const info=s.players[seat];
 if(info.lost||info.moves<2)return;
 let p=s.pieces.find(p=>p.id===movedId&&p.seat===seat&&p.place==='track');
 if(!p)p=s.pieces.find(p=>p.seat===seat&&p.place==='track');
 if(!p)return;
 const trackPosition=pieceCoord(p);
 p.place='lost';p.steps=-1;info.lost=true;
 const names={collapse:'Der Boden bricht ein!',abduction:'Eine Figur wird entführt!',freeze:'Ein Eisfluch schlägt zu!'};
 const msg=names[info.lossType]+' '+info.name+' verliert eine Figur.';
 s.lastEvent={type:'loss',seat,pieceId:p.id,lossType:info.lossType,position:trackPosition,message:msg,turn:s.turn};
 log(s,msg);
}
function maybeEffects(s){
 // Story losses have priority; never hide a mandatory capture behind weather.
 if(s.lastEvent?.type==='loss'||s.lastEvent?.type==='hint')return;
 if(s.turn>0&&s.turn%MISSION_1.effects.quakeEvery===0){
  for(const p of s.pieces.filter(p=>p.place==='track'))p.steps=Math.max(0,p.steps-1);
  s.lastEvent={type:'quake',message:'Erdbeben! Alle Figuren auf dem Weg gehen ein Feld zurück.',turn:s.turn};
  log(s,'Erdbeben erschüttert den Berg');
 }else if(s.turn>0&&s.turn%MISSION_1.effects.fogEvery===0){
  s.lastEvent={type:'fog',message:'Dichter Nebel zieht über den Weg.',turn:s.turn};
 }else if(s.turn>0&&s.turn%MISSION_1.effects.clueEvery===0){
  const hints=['Ein metallisches Dröhnen kommt aus der Ferne.','Grüne Funken leuchten oberhalb der Wolken.','Im Schnee liegen seltsame Kristallsplitter.','Die Berge scheinen euch zu beobachten.'];
  s.lastEvent={type:'hint',message:hints[Math.floor(s.turn/MISSION_1.effects.clueEvery)%hints.length],turn:s.turn};
 }
}
function checkComplete(s){
 // Exactly one player piece trapped; the other four use the original goal lane.
 s.complete=s.players.every(info=>info.lost&&s.pieces.filter(p=>p.seat===info.seat&&p.place==='goal').length===4);
 if(s.complete){s.lastEvent={type:'win',message:'Alle Freunde erreichen den Aussichtspunkt. Drei Figuren bleiben vermisst.',turn:s.turn};log(s,s.lastEvent.message);}
}
export function play(original,seat,action){
 if(original.complete||seat!==original.current)throw Error('Nicht dein Zug.');
 const valid=original.hands[seat].flatMap(c=>legalMoves(original,seat,c));
 const chosen=valid.find(m=>m.kind===action.kind&&m.cardId===action.cardId&&m.as===action.as&&m.pieceId===action.pieceId&&m.targetId===action.targetId&&m.distance===action.distance);
 if(!chosen)throw Error('Ungültiger Zug');
 const s=clone(original),p=s.pieces.find(p=>p.id===chosen.pieceId);
 if(chosen.kind==='start'){p.place='track';p.steps=0;}
 if(chosen.kind==='move'){
  if(chosen.captureId){const victim=s.pieces.find(v=>v.id===chosen.captureId);victim.place='home';victim.steps=-1;}
  p.steps=chosen.targetSteps;p.place=p.steps>=TRACK?'goal':'track';
 }
 if(chosen.kind==='swap'){
  const other=s.pieces.find(p=>p.id===chosen.targetId);
  const firstAbs=pieceCoord(p),otherAbs=pieceCoord(other);
  // Preserve each piece's relative progress around the common ring.
  p.steps+=pos(otherAbs-firstAbs);
  other.steps+=pos(firstAbs-otherAbs);
  p.steps=p.steps%TRACK;other.steps=other.steps%TRACK;
 }
 const i=s.hands[seat].findIndex(c=>c.id===chosen.cardId);
 s.discard.push(s.hands[seat].splice(i,1)[0]);
 s.players[seat].moves++;
 s.lastEvent=null;
 ensureSingleLoss(s,seat,p.id);
 // Passive signposts become true story-only clue fields if a figure reaches
 // them. They never eliminate extra figures or modify ordinary card moves.
 if(!s.lastEvent&&p.place==='track'){
  const clue=MISSION_1.trailHints.find(c=>c.field===pieceCoord(p));
  if(clue){
   s.lastEvent={type:'hint',field:clue.field,message:clue.message,turn:s.turn};
   log(s,'Pfadfinder-Hinweis: '+clue.title);
  }
 }
 log(s,s.players[seat].name+' spielt '+chosen.as);
 checkComplete(s);
 if(!s.complete){
  nextTurn(s);maybeEffects(s);
  // A quake can move an occupying pawn onto a starting field and invalidate
  // the next seat's previously legal start. Recheck after environmental effects.
  if(!s.hands[s.current].some(card=>legalMoves(s,s.current,card).length))nextTurn(s);
 }
 s.revision++;
 return s;
}
export function status(s){return s.players.map(info=>({
 seat:info.seat,name:info.name,lost:info.lost,home:s.pieces.filter(p=>p.seat===info.seat&&p.place==='home').length,
 track:s.pieces.filter(p=>p.seat===info.seat&&p.place==='track').length,
 goal:s.pieces.filter(p=>p.seat===info.seat&&p.place==='goal').length
}));}
export function validateSaved(x){return !!x&&x.version===1&&x.mission===1&&Array.isArray(x.players)&&x.players.length===3&&Array.isArray(x.pieces)&&x.pieces.length===15&&Array.isArray(x.hands)&&x.hands.length===3&&Number.isInteger(x.current)&&x.current>=0&&x.current<3;}
