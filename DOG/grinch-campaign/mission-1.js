import {MISSION_1} from './mission-config.js?v=4';
import {cardVisual} from '../card-visuals.js?v=11';
import {drawClassicMissionBoard} from './mission-board.js?v=6';
import {pathfinderStatus} from './mission-1-pathfinder.js?v=4';
import {trackPoint,goalPoint} from '../board-layout.js?v=11';
import {COLORS,LABELS,SEATS,TRACK,GOAL,newGame,legalMoves,play,status,pieceCoord,validateSaved} from './mission-1-rules.js?v=6';

const $=id=>document.getElementById(id);
const SVG='http://www.w3.org/2000/svg';
const KEY='dog-grinch-m1-canonical-cards-v4';
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
 if(m.kind==='emptySwap')return 'Tauschkarte ablegen (momentan keine Figuren zum Tauschen)';
 const p=state.pieces.find(p=>p.id===m.pieceId);
 if(!p)return 'Karte spielen';
 const i=Number(p.id.slice(1))%5+1;
 let v='Figur '+i+': ';
 if(m.kind==='start')v+='aus dem Haus starten';
 else if(m.kind==='move')v+=(m.distance<0?'4 Felder rückwärts':m.distance+' Felder vorwärts')+(m.targetSteps===TRACK?' ins Portal':'');
 else if(m.kind==='seven')v+='7 aufteilen – '+m.distance+' Schritt'+(m.distance===1?'':'e')+(m.targetSteps===TRACK?' ins Portal':'');
 else if(m.kind==='swap'){
  const target=state.pieces.find(p=>p.id===m.targetId);
  v+='mit '+state.players[target.seat].name+' Figur '+(Number(target.id.slice(1))%5+1)+' tauschen';
 }
 if(state.hands[state.current].find(c=>c.id===m.cardId)?.type==='joker')v+=' · Joker als '+m.as;
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
  chosenCard=state.seven?.cardId??null;chosenPiece=null;pickMoves=[];
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
 $('turn-label').textContent=state.complete?'🏆 Mission geschafft!':state.players[state.current].name+' ist am Zug'+(state.seven?' · 7 aufteilen: noch '+(7-state.seven.spent)+' Schritte':'');
 const seatList=$('players');seatList.replaceChildren();
 const stats=status(state);
 for(const p of stats){
  const card=text('div','',seatList,'player'+(p.seat===state.current&&!state.complete?' active':''));
  const title=text('div','',card,'name');
  const name=text('span','',title);
  const dot=text('span','',name,'color');dot.style.setProperty('--p',COLORS[p.seat]);
  text('span',p.name,name);
  if(p.seat===state.current&&!state.complete)text('span','👑 Am Zug',title);
  text('div','🌀 '+p.teleported+'/4 teleportiert · '+p.track+' auf dem Weg · '+p.home+' im Haus',card,'status');
  text('div',p.lost?'⚠️ Eine Figur ist verschwunden':'Alle fünf Figuren noch unterwegs',card,p.lost?'status loss':'status');
 }
 const hand=$('hand');hand.replaceChildren();
 const moves=$('moves');moves.replaceChildren();
 if(!state.complete){
  if(state.seven)chosenCard=state.seven.cardId;
  for(const c of state.hands[state.current]){
   const b=document.createElement('button');
   b.className='card'+(chosenCard===c.id?' selected':'')+' has-art';
   b.type='button';
   b.disabled=Boolean(state.seven&&state.seven.cardId!==c.id);
   const visual=cardVisual(c.type);
   const fallback=text('span',c.type==='swap'?'⇄':c.type==='joker'?'★':c.type,b,'card-fallback');
   if(visual.image){
    const img=document.createElement('img');
    img.src='../'+visual.image.replace(/^\.\//,'');
    img.alt='';
    img.loading='eager';
    img.className='card-art';
    img.onerror=()=>{
      if(visual.fallbackImage && !img.dataset.fallback){
       img.dataset.fallback='1';
       img.src='../'+visual.fallbackImage.replace(/^\.\//,'');
      }else img.remove();
    };
    b.append(img);
   }
   b.setAttribute('aria-label','DOG-Karte '+(c.type==='swap'?'Tausch':c.type==='joker'?'Joker':c.type));
   if(state.seven&&state.seven.cardId===c.id)b.title='7: Noch '+(7-state.seven.spent)+' Schritte';
   b.addEventListener('click',()=>{
    if(state.seven)return;
    chosenCard=chosenCard===c.id?null:c.id;chosenPiece=null;pickMoves=[];render();
   });
   hand.append(b);
  }
  if(chosenCard){
   const opts=currentMoves();
   const visible=chosenPiece?opts.filter(m=>m.pieceId===chosenPiece):opts;
   if(!visible.length)text('p','Für diese Karte ist derzeit kein Zug möglich.',moves,'help');
   else moveButtons(visible,moves);
  }else text('p','Wähle eine DOG-Karte. Die 7 wird auf insgesamt 7 Schritte verteilt; Tauschen und Joker funktionieren wie im Hauptspiel.',moves,'help');
 }else {
  text('p','Die drei Freunde haben alle zwölf verbliebenen Figuren über ihre drei wiederverwendbaren Portale nach Welt 2 geschickt. Drei Figuren bleiben verschollen. Mission 2 ist noch nicht spielbar.',moves,'help');
 }
 $('actions').textContent=state.complete?'🎉 Mission 1 lokal abgeschlossen (Test, keine offiziellen Belohnungen).':'Ziel: Jede Person schickt vier Figuren nacheinander durch ihr einzelnes Portal. Eine Figur je Spieler bleibt im Fluch gefangen.';
 // Each player has exactly one reusable portal at the FIRST classic goal location.
 const route=pathfinderStatus(state);
 $('trail-progress-count').textContent=route.ready+' / '+route.participants+' Portale abgeschlossen';
 const waypointList=$('trail-progress-players');
 waypointList.replaceChildren();
 for(let seat=0;seat<SEATS;seat++){
  const complete=route.counts[seat]===4;
  const item=text('div',(complete?'✅ ':'🌀 ')+state.players[seat].name+': '+route.counts[seat]+'/4 teleportiert',waypointList,'trail-waypoint'+(complete?' done':''));
  item.style.setProperty('--player-color',COLORS[seat]);
 }
 $('trail-next-mission').textContent=route.allReady?
  '🏔️ Alle zwölf Figuren haben ihre Portale passiert. Welt 2 wartet! Diese Folgemission ist noch in Entwicklung und bleibt vorerst gesperrt.':
  '🌀 Landet mit jeder verbleibenden Figur genau auf eurem einen Portal-Zielfeld. Die Figur verschwindet sofort, das Portal wird wieder frei.';
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
 }else if(ev.type==='teleport'){
  const owner=[0,1,3][ev.seat],p=goalPoint(owner,0);
  const layer=$('event-fx')||ns('g',{id:'event-fx'},$('board'));
  layer.replaceChildren();
  ns('circle',{cx:p.x,cy:p.y,r:30,fill:'#50ffd7',opacity:'.5',stroke:'#ffe9a8','stroke-width':3},layer);
  const glyph=ns('text',{x:p.x,y:p.y+12,'text-anchor':'middle','font-size':38},layer);glyph.textContent='✨';
  clearTimeout(effectTimer);
  effectTimer=setTimeout(()=>layer.replaceChildren(),1300);
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
