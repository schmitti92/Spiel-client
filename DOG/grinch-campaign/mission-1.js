import {MISSION_1} from './mission-config.js';
import {drawClassicMissionBoard} from './mission-board.js?v=1';
import {trackPoint} from '../board-layout.js?v=11';
import {COLORS,LABELS,SEATS,TRACK,GOAL,newGame,legalMoves,play,status,pieceCoord,validateSaved} from './mission-1-rules.js';

const $=id=>document.getElementById(id);
const SVG='http://www.w3.org/2000/svg';
const KEY='dog-grinch-m1-classic-board-v2';
let state=null,chosenCard=null,chosenPiece=null,pickMoves=[],lastSeenRevision=-1;
let toastTimer=null,effectTimer=null;
const ns=(tag,attrs={},parent=null)=>{
 const el=document.createElementNS(SVG,tag);
 for(const [k,v] of Object.entries(attrs))el.setAttribute(k,String(v));
 if(parent)parent.append(el);
 return el;
};
const text=(tag,txt,parent,className)=>{
 const el=document.createElement(tag);
 if(className)el.className=className;
 el.textContent=String(txt);
 if(parent)parent.append(el);
 return el;
};
function toast(msg,ms=3000){
 const el=$('event-message');
 el.textContent=msg;el.classList.add('visible');
 clearTimeout(toastTimer);
 toastTimer=setTimeout(()=>el.classList.remove('visible'),ms);
}
function save(){
 try{localStorage.setItem(KEY,JSON.stringify(state));}catch{}
}
function read(){
 try{const x=JSON.parse(localStorage.getItem(KEY)||'null');return validateSaved(x)?x:null;}catch{return null;}
}
function describeMove(m){
 const p=state.pieces.find(p=>p.id===m.pieceId);
 const i=Number(p.id.slice(1))%5+1;
 let v='Figur '+i+': ';
 if(m.kind==='start')v+='aus dem Haus starten';
 else if(m.kind==='move')v+=(m.distance<0?'4 Felder rückwärts':m.distance+' Felder vorwärts')+(m.targetSteps>=TRACK?' ins Ziel':'');
 else if(m.kind==='swap'){
  const target=state.pieces.find(p=>p.id===m.targetId);
  v+='mit '+state.players[target.seat].name+' Figur '+(Number(target.id.slice(1))%5+1)+' tauschen';
 }
 if(state.hands[state.current].find(c=>c.id===m.cardId)?.type==='Joker')v+=' · Joker als '+m.as;
 return v;
}
function currentMoves(){
 if(!state||state.complete||!chosenCard)return [];
 const card=state.hands[state.current].find(c=>c.id===chosenCard);
 return card?legalMoves(state,state.current,card):[];
}
function choosePawn(id){
 if(!state||state.complete)return;
 const p=state.pieces.find(x=>x.id===id);
 const moves=currentMoves();
 if(p.seat===state.current){
  chosenPiece=id;
  pickMoves=moves.filter(m=>m.pieceId===id);
  render();
  if(pickMoves.length===1)doMove(pickMoves[0]);
  else if(!pickMoves.length)toast('Wähle zuerst eine passende Karte für diese Figur.',1800);
 }else if(chosenPiece){
  const targets=moves.filter(m=>m.pieceId===chosenPiece&&m.targetId===id);
  if(targets.length===1)doMove(targets[0]);
  else toast('Dieser Tausch ist nicht möglich.',1600);
 }
}
function doMove(m){
 try{
  state=play(state,state.current,m);
  chosenCard=null;chosenPiece=null;pickMoves=[];
  save();render();
  onEffect();
 }catch(err){toast('Zug nicht möglich: '+err.message);}
}
function moveButtons(moves,parent){
 for(const m of moves){
  const btn=document.createElement('button');btn.type='button';btn.className='move';btn.textContent=describeMove(m);
  btn.addEventListener('click',()=>doMove(m));parent.append(btn);
 }
}
function render(){
 if(!state)return;
 $('phase').textContent='Kartenphase '+state.round+' · Zug '+(state.turn+1);
 $('turn-label').textContent=state.complete?'🏆 Mission geschafft!':state.players[state.current].name+' ist am Zug';
 const seatList=$('players');seatList.replaceChildren();
 const stats=status(state);
 for(const p of stats){
  const card=text('div','',seatList,'player'+(p.seat===state.current&&!state.complete?' active':''));
  const title=text('div','',card,'name');
  const name=text('span','',title);
  const dot=text('span','',name,'color');dot.style.setProperty('--p',COLORS[p.seat]);
  text('span',p.name,name);
  if(p.seat===state.current&&!state.complete)text('span','👑 Am Zug',title);
  text('div',p.goal+' im Ziel · '+p.track+' auf dem Weg · '+p.home+' im Haus',card,'status');
  text('div',p.lost?'⚠️ Eine Figur ist verschwunden':'Alle fünf Figuren noch unterwegs',card,p.lost?'status loss':'status');
 }
 const hand=$('hand');hand.replaceChildren();
 const moves=$('moves');moves.replaceChildren();
 if(!state.complete){
  for(const c of state.hands[state.current]){
   const b=document.createElement('button');b.className='card'+(chosenCard===c.id?' selected':'');b.type='button';
   b.textContent=c.type;
   text('small',c.type==='7'?'Tausch':c.type==='Joker'?'Joker':c.type==='1/11'?'1 oder 11':'Bewegung',b);
   b.addEventListener('click',()=>{
    chosenCard=chosenCard===c.id?null:c.id;chosenPiece=null;pickMoves=[];render();
   });
   hand.append(b);
  }
  if(chosenCard){
   const opts=currentMoves();
   const visible=chosenPiece?opts.filter(m=>m.pieceId===chosenPiece):opts;
   if(!visible.length)text('p','Für diese Karte ist derzeit kein Zug möglich.',moves,'help');
   else moveButtons(visible,moves);
  }else text('p','Wähle eine Handkarte. Danach kannst du direkt auf eine eigene Figur tippen.',moves,'help');
 }else {
  text('p','Die drei Freunde haben den Aussichtspunkt erreicht – drei Figuren bleiben verschwunden. Der nächste Abschnitt ist noch in Planung.',moves,'help');
 }
 $('actions').textContent=state.complete?'🎉 Mission 1 lokal abgeschlossen (Test, keine offiziellen Belohnungen).':'Ziel: Jeder rettet vier Figuren. Eine Figur je Spieler wird vom Fluch gefangen.';
 const history=$('history');history.replaceChildren();
 for(const entry of state.history)text('p',entry,history);
 drawClassicMissionBoard($('board'),state,{selectedPiece:chosenPiece,onPieceClick:choosePawn});
}
function onEffect(){
 const ev=state?.lastEvent;
 if(!ev||lastSeenRevision===state.revision)return;
 lastSeenRevision=state.revision;
 if(ev.type==='loss'&&Number.isInteger(ev.position)){
  const layer=$('event-fx')||ns('g',{id:'event-fx'},$('board'));
  const p=trackPoint(ev.position);
  layer.replaceChildren();
  ns('circle',{cx:p.x,cy:p.y,r:34,fill:ev.lossType==='freeze'?'#8bddff':'#3edc8b',opacity:'.22'},layer);
  const symbol={collapse:'🕳️',abduction:'🌪️',freeze:'🧊'}[ev.lossType]||'⚡';
  const fx=ns('text',{x:p.x,y:p.y+16,'text-anchor':'middle','font-size':48},layer);fx.textContent=symbol;
  clearTimeout(effectTimer);effectTimer=setTimeout(()=>layer.replaceChildren(),2800);
 }else if(ev.type==='quake'){
  $('board-wrap').classList.add('shaking');
  clearTimeout(effectTimer);
  effectTimer=setTimeout(()=>$('board-wrap').classList.remove('shaking'),1300);
 }else if(ev.type==='fog'){
  $('board-wrap').classList.add('foggy');
  clearTimeout(effectTimer);
  effectTimer=setTimeout(()=>$('board-wrap').classList.remove('foggy'),2500);
 }
 toast(ev.message,ev.type==='win'?6500:3400);
}
function start(){
 const names=LABELS.map((name,i)=>$('name-'+i).value.trim()||name);
 state=newGame(undefined,names);
 chosenCard=null;chosenPiece=null;pickMoves=[];lastSeenRevision=-1;
 $('setup').close();
 save();render();
 toast('Die Reise beginnt. Ein unheimliches grünes Leuchten kommt vom Berg …',3300);
}
$('begin').addEventListener('click',start);
$('restart').addEventListener('click',()=>{
 if(!confirm('Lokalen Mission-1-Test wirklich neu beginnen?'))return;
 localStorage.removeItem(KEY);state=null;chosenCard=null;chosenPiece=null;pickMoves=[];
 for(let i=0;i<SEATS;i++)$('name-'+i).value=LABELS[i];
 $('setup').showModal();render();
});
state=read();
if(state){render();if(state.lastEvent){lastSeenRevision=state.revision;}}
else $('setup').showModal();
