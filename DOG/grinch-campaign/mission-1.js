import {MISSION_1} from './mission-config.js';
import {COLORS,LABELS,SEATS,TRACK,GOAL,newGame,legalMoves,play,status,pieceCoord,validateSaved} from './mission-1-rules.js';

const $=id=>document.getElementById(id);
const SVG='http://www.w3.org/2000/svg';
const KEY='dog-grinch-m1-local-demo-v1';
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
const tile=(parent,x,y,r,cls,stroke)=>{
 const circle=ns('circle',{cx:x,cy:y,r,class:cls},parent);
 if(stroke)circle.setAttribute('stroke',stroke);
 return circle;
};
const xy=i=>{
 const a=-Math.PI/2+i*2*Math.PI/TRACK;
 const wobble=1+.035*Math.sin(3*a);
 return {x:480+330*wobble*Math.cos(a),y:353+247*wobble*Math.sin(a)};
};
const goal=(seat,j)=>{
 const start=xy(seat*20);
 const factor=.76-j*.115;
 return {x:480+(start.x-480)*factor,y:353+(start.y-353)*factor};
};
const homes=[
 {x:480,y:32},{x:83,y:565},{x:875,y:565}
];
function home(seat,index){
 const origin=homes[seat],col=index%3,row=Math.floor(index/3);
 return {x:origin.x+(col-1)*36,y:origin.y+row*37};
}
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
function setupBoard(){
 const line=$('path-lines'),fields=$('path-fields'),goals=$('goal-fields'),homeLayer=$('home-fields');
 const points=Array.from({length:TRACK},(_,i)=>xy(i));
 for(let i=0;i<TRACK;i++){
  const a=points[i],b=points[(i+1)%TRACK];
  ns('line',{x1:a.x,y1:a.y,x2:b.x,y2:b.y,stroke:'#bbdce0','stroke-width':15,'stroke-opacity':.35,'stroke-linecap':'round'},line);
 }
 for(let i=0;i<TRACK;i++){
  const p=points[i],seat=i/20;
  const isStart=Number.isInteger(seat);
  const circ=tile(fields,p.x,p.y,14,isStart?'tile start':'tile',isStart?COLORS[seat]:null);
  circ.dataset.index=i;
  if(i%5===0)ns('text',{x:p.x,y:p.y+3,class:'tile-num','text-anchor':'middle'},fields).textContent=String(i+1);
 }
 for(let seat=0;seat<SEATS;seat++){
  const g0=goal(seat,0),g4=goal(seat,4);
  ns('line',{x1:g0.x,y1:g0.y,x2:g4.x,y2:g4.y,stroke:COLORS[seat],'stroke-width':9,'stroke-opacity':.56,'stroke-linecap':'round'},goals);
  for(let j=0;j<GOAL;j++){
   const c=goal(seat,j);tile(goals,c.x,c.y,13,'goal-cell',COLORS[seat]);
  }
  for(let j=0;j<GOAL;j++){
   const c=home(seat,j);tile(homeLayer,c.x,c.y,14,'home-cell',COLORS[seat]);
  }
 }
}
function pawnPos(p){
 if(p.place==='track')return xy(pieceCoord(p));
 if(p.place==='goal')return goal(p.seat,pieceCoord(p));
 return home(p.seat,Number(p.id.slice(1))%5);
}
function drawPawns(){
 const layer=$('pawns');layer.replaceChildren();
 if(!state)return;
 for(const p of state.pieces){
  if(p.place==='lost')continue;
  const point=pawnPos(p);
  const g=ns('g',{role:'button',tabindex:'0','aria-label':state.players[p.seat].name+' Figur '+(Number(p.id.slice(1))%5+1)+' – '+(p.place==='home'?'Starthaus':p.place==='goal'?'Ziel':'Weg')},layer);
  const choose=()=>choosePawn(p.id);
  g.addEventListener('click',choose);
  g.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();choose();}});
  ns('circle',{cx:point.x,cy:point.y,r:11.3,fill:COLORS[p.seat],class:'pawn'+(chosenPiece===p.id?' selected':'')},g);
  const t=ns('text',{x:point.x,y:point.y+5,class:'pawn-ord'},g);
  t.textContent=String(Number(p.id.slice(1))%5+1);
 }
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
 drawPawns();
}
function onEffect(){
 const ev=state?.lastEvent;
 if(!ev||lastSeenRevision===state.revision)return;
 lastSeenRevision=state.revision;
 if(ev.type==='quake'){
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
setupBoard();
state=read();
if(state){render();if(state.lastEvent){lastSeenRevision=state.revision;}}
else $('setup').showModal();
