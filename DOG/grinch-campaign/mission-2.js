import {MISSIONS} from './mission-config.js?v=6';
const MISSION_2=MISSIONS[1];
import {presentMission2Slot,wireMission2Slots,setMission2SlotDismissHandler} from './mission-2-slot-ui.js?v=2';
import {createGrinchOnline} from './mission-2-online.js?v=1';
import {cardVisual} from '../card-visuals.js?v=11';
import {drawMission2Board} from './mission-2-board.js?v=2';
import {mission2Status} from './mission-2-markers.js?v=1';
import {trackPoint,goalPoint} from '../board-layout.js?v=11';
import {COLORS,LABELS,SEATS,TRACK,GOAL,newGame,legalMoves,play,acknowledgeMission2Slot,status,pieceCoord,validateSaved} from './mission-2-rules.js?v=5';

const $=id=>document.getElementById(id);
const SVG='http://www.w3.org/2000/svg';
const KEY='dog-grinch-m2-slots-v1';
const roomCode=(new URLSearchParams(location.search).get('room')||'').toUpperCase();
const onlineMode=/^(?:[0-9]{3}|[A-HJ-NP-Z2-9]{6})$/.test(roomCode);
let onlineSeat=null,onlineMatchId=null,onlineBridge=null,onlineBusy=false;
const myTurn=()=>!onlineMode||onlineSeat===state?.current;
function curseLabel(type,id){
 const rules={
  11:{'7':'JETZT 8'},12:{'8':'7 AUFTEILEN'},13:{'2':'JETZT 12','12':'JETZT 2'},
  14:{'5':'JETZT 10','10':'JETZT 5'},15:{'4':'NUR −4'},
  16:{'13':'3 / START'},17:{'1/11':'1 / START'},18:{swap:'JETZT 6'},
  19:{joker:'KEIN 7/TAUSCH'},20:{'3':'JETZT 9','9':'JETZT 3'}
 };
 return rules[id]?.[type]||null;
}
let state=null,chosenCard=null,chosenPiece=null,pickMoves=[],lastSeenRevision=-1,lastSlotRound=0,lastSeenLossEventId=0;
wireMission2Slots();
setMission2SlotDismissHandler(async round=>{
 if(!state||state.m2?.pendingSlotRound!==round)return;
 if(!myTurn()){
  toast('⏳ Der aktive Spieler bestätigt die Slotrunde für alle.',2600);
  return;
 }
 if(onlineMode){
  if(!onlineBridge||onlineBusy)return;
  onlineBusy=true;render();
  try{await onlineBridge.acknowledgeSlot(state,round);}
  finally{onlineBusy=false;render();}
 }else{
  try{state=acknowledgeMission2Slot(state,state.current,round);save();render();}
  catch(err){toast('Slot-Bestätigung fehlgeschlagen: '+err.message,3200);}
 }
});
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
 if(!state||state.complete||state.m2?.pendingSlotRound||!chosenCard||!myTurn())return [];
 const card=state.hands[state.current].find(c=>c.id===chosenCard);
 return card?legalMoves(state,state.current,card):[];
}
function choosePawn(id){
 if(!state||state.complete||state.m2?.pendingSlotRound||!myTurn()||onlineBusy)return;
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
async function doMove(m){
 if(state?.m2?.pendingSlotRound){toast('🎰 Zuerst die Slotrunde bestätigen.',2400);return;}
 if(onlineMode){
  if(!onlineBridge||!myTurn()||onlineBusy)return;
  onlineBusy=true;render();
  try{
   const completed=await onlineBridge.action(m,state);
   if(completed){chosenCard=null;chosenPiece=null;pickMoves=[];}
  }finally{onlineBusy=false;render();}
  return;
 }
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
 $('turn-label').textContent=state.complete?'🏆 Mission geschafft!':state.m2?.pendingSlotRound?'🎰 Slotrunde '+state.m2.pendingSlotRound+' – wartet auf Bestätigung':state.players[state.current].name+' ist am Zug'+(state.seven?' · 7 aufteilen: noch '+(7-state.seven.spent)+' Schritte':'');
 const seatList=$('players');seatList.replaceChildren();
 const stats=status(state);
 for(const p of stats){
  const card=text('div','',seatList,'player'+(p.seat===state.current&&!state.complete?' active':''));
  const title=text('div','',card,'name');
  const name=text('span','',title);
  const dot=text('span','',name,'color');dot.style.setProperty('--p',COLORS[p.seat]);
  text('span',p.name,name);
  if(p.seat===state.current&&!state.complete)text('span','👑 Am Zug',title);
  text('div','🌀 '+p.teleported+'/3 gerettet · '+p.track+' auf dem Weg · '+p.home+' im Haus',card,'status');
  const remaining=p.teleported+p.track+p.home;
  text('div',remaining+'/4 Figuren verbleiben in Mission 2 · '+(remaining===3?'3 für Mission 3 gesichert':'eine muss noch verschwinden'),card,'status');
  const captured=state.players[p.seat]?.m2Lost;
  text('div',captured?'⚠️ Genau eine weitere Figur verschwunden':'🕳️ Versteckte Falle: eine weitere Figur wird noch verschwinden',card,captured?'status loss':'status');
 }
 const hand=$('hand');hand.replaceChildren();
 const moves=$('moves');moves.replaceChildren();
 if(!state.complete&&myTurn()){
  if(state.seven)chosenCard=state.seven.cardId;
  for(const c of state.hands[state.current]){
   const b=document.createElement('button');
   b.className='card'+(chosenCard===c.id?' selected':'')+' has-art';
   b.type='button';
   b.disabled=onlineBusy||Boolean(state.m2?.pendingSlotRound)||Boolean(state.seven&&state.seven.cardId!==c.id);
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
   if(state.m2?.cardCurse)b.title=(b.title?b.title+' · ':'')+'Grinch-Kartenfluch #'+state.m2.cardCurse;
   const activeCardLabel=curseLabel(c.type,state.m2?.cardCurse);
   if(activeCardLabel){const badge=text('span',activeCardLabel,b,'m2-card-effect');b.setAttribute('aria-label',b.getAttribute('aria-label')+' · '+activeCardLabel);}
   b.addEventListener('click',()=>{
    if(state.seven)return;
    chosenCard=chosenCard===c.id?null:c.id;chosenPiece=null;pickMoves=[];render();
   });
   hand.append(b);
  }
  if(state.m2?.pendingSlotRound){text('p','🎰 Die Grinch-Walzen werden gezeigt. Erst nach Bestätigung kann ein Kartenzug gespielt werden.',moves,'help');}
  else if(chosenCard){
   const opts=currentMoves();
   const visible=chosenPiece?opts.filter(m=>m.pieceId===chosenPiece):opts;
   if(!visible.length)text('p','Für diese Karte ist derzeit kein Zug möglich.',moves,'help');
   else moveButtons(visible,moves);
  }else text('p','Wähle eine DOG-Karte. Achte auf aktive Grinch-Kartenflüche.',moves,'help');
 }else if(state.complete){
  text('p',onlineMode?
   '🏆 Neun Figuren gerettet. Mission 3 wird nach der Serverbestätigung freigeschaltet.':
   '🏆 Neun Figuren gerettet! Dies ist ein lokaler Test ohne offizielle Freischaltung.',moves,'help');
 }else{
  const player=state.players[state.current]?.name||'Spieler';
  text('p','⏳ '+player+' ist am Zug. Deine Handkarten bleiben privat. Warte auf deinen nächsten Zug.',moves,'help');
 }
 $('actions').textContent=state.complete?'🎉 Mission 2 geschafft!':
  '🎰 Der Grinch-Slot dreht nach jeder Kartenphase. Je drei Figuren erreichen das Portal.';
 if(state.m2?.cardCurse){const flag=document.createElement('div');flag.className='m2-active-curse';flag.textContent='🃏 AKTIVER KARTENFLUCH #'+state.m2.cardCurse;$('actions').append(flag);}
 // Each player has exactly one reusable portal at the FIRST classic goal location.
 const route=mission2Status(state);
 $('trail-progress-count').textContent=route.ready+' / '+route.participants+' Portale abgeschlossen';
 const waypointList=$('trail-progress-players');
 waypointList.replaceChildren();
 for(let seat=0;seat<SEATS;seat++){
  const complete=route.counts[seat]===3;
  const item=text('div',(complete?'✅ ':'🌀 ')+state.players[seat].name+': '+route.counts[seat]+'/3 gerettet',waypointList,'trail-waypoint'+(complete?' done':''));
  item.style.setProperty('--player-color',COLORS[seat]);
 }
 $('trail-next-mission').textContent=route.allReady?
  '🏔️ Alle neun Figuren gerettet! Mission 3 wartet.':
  '🕳️ Wie in Mission 1: Genau eine der vier verbliebenen Figuren verschwindet je Spieler durch eine versteckte Falle. Erst dann können alle drei übrigen Figuren in Mission 3 gerettet werden.';
 const history=$('history');history.replaceChildren();
 for(const entry of state.history)text('p',entry,history);
 drawMission2Board($('board'),state,{selectedPiece:chosenPiece,onPieceClick:choosePawn});
}
function clearMissionWeather(){
 clearTimeout(effectTimer);
 effectTimer=null;
 const wrap=$('board-wrap');
 wrap?.classList.remove('foggy','shaking');
}
function showMissionWeather(kind,title,detail,ms){
 const wrap=$('board-wrap');
 if(!wrap)return;
 $('weather-label').textContent=title;
 $('weather-detail').textContent=detail;
 // Reflow restarts the CSS animation even after back-to-back weather events.
 void wrap.offsetWidth;
 wrap.classList.add(kind);
 effectTimer=setTimeout(()=>{
  wrap.classList.remove('foggy','shaking');
  effectTimer=null;
 },ms);
}
function revealLossEffect(ev){
 if(!ev||!Number.isInteger(ev.position))return;

  const layer=$('event-fx')||ns('g',{id:'event-fx'},$('board'));
  const p=trackPoint(ev.position);
  layer.replaceChildren();
  // The danger tile looked like an ordinary DOG square until activation.
  // Reveal its type for a moment only AFTER a pawn has landed and disappeared.
  const colors={collapse:'#1b2634',abduction:'#4d3362',freeze:'#b9f7ff'};
  ns('circle',{cx:p.x,cy:p.y,r:33,fill:colors[ev.lossType]||'#214e4e',opacity:'.3',stroke:'#fff3bc','stroke-width':3},layer);
  ns('circle',{cx:p.x,cy:p.y,r:18,fill:colors[ev.lossType]||'#173e42',stroke:'#fff3bc','stroke-width':1.8},layer);
  const symbol={collapse:'🕳️',abduction:'🌪️',freeze:'🧊'}[ev.lossType]||'⚡';
  const fx=ns('text',{x:p.x,y:p.y+11,'text-anchor':'middle','font-size':28},layer);fx.textContent=symbol;
  const reveal=ns('text',{x:p.x,y:p.y-27,'text-anchor':'middle','font-size':10,'font-weight':900,fill:'#fff2ba'},layer);reveal.textContent='FALLE!';
  clearTimeout(effectTimer);effectTimer=setTimeout(()=>layer.replaceChildren(),2800);

}
function onEffect(){
 if(!state||lastSeenRevision===state.revision)return;
 lastSeenRevision=state.revision;
 // A new action cancels unfinished prior weather, including visual text.
 clearMissionWeather();
 const ev=state.lastEvent;
 if(!ev)return;
 if(ev.type==='slot'){
  const latestLoss=state.m2?.eventLog?.filter(e=>e.type==='loss'&&e.eventId>lastSeenLossEventId).at(-1);
  if(latestLoss){
   lastSeenLossEventId=latestLoss.eventId;
   revealLossEffect(latestLoss);
   toast(latestLoss.message,2500);
  }
  const spin=state.m2?.spins?.find(item=>item.round===state.round);
  if(spin&&spin.round>lastSlotRound){
   lastSlotRound=spin.round;
   if(latestLoss)setTimeout(()=>{if(state?.round>=spin.round)void presentMission2Slot(spin);},2100);
   else void presentMission2Slot(spin);
  }
  return;
 }
 if(ev.type==='loss'&&Number.isInteger(ev.position)){
  revealLossEffect(ev);
  const lossEvent=state.m2?.eventLog?.filter(e=>e.type==='loss'&&e.pieceId===ev.pieceId).at(-1);
  if(lossEvent)lastSeenLossEventId=Math.max(lastSeenLossEventId,lossEvent.eventId);
 }else if(ev.type==='teleport'){
  const owner=[0,1,3][ev.seat],p=goalPoint(owner,0);
  const layer=$('event-fx')||ns('g',{id:'event-fx'},$('board'));
  layer.replaceChildren();
  ns('circle',{cx:p.x,cy:p.y,r:30,fill:'#50ffd7',opacity:'.5',stroke:'#ffe9a8','stroke-width':3},layer);
  const glyph=ns('text',{x:p.x,y:p.y+12,'text-anchor':'middle','font-size':38},layer);glyph.textContent='✨';
  clearTimeout(effectTimer);
  effectTimer=setTimeout(()=>layer.replaceChildren(),1300);
 }else if(ev.type==='quake'){
  const q=ev.quake||{};
  const moved=Number(q.moved)||0,blocked=Number(q.blocked)||0,protectedCount=Number(q.protectedCount)||0;
  showMissionWeather(
   'shaking','⚡ ERDBEBEN!',
   moved+' Figuren springen zurück · '+blocked+' blockiert · '+protectedCount+' geschützt',
   1800
  );
 }else if(ev.type==='fog'){
  showMissionWeather(
   'foggy','🌫️ DICHTER NEBEL',
   'Der Berg verschwindet im Nebel. Die Felder bleiben spielbar.',
   4500
  );
 }
 toast(ev.message,ev.type==='win'?6500:3400);
}
function start(){
 if(onlineMode)return;
 clearMissionWeather();
 const names=LABELS.map((name,i)=>$('name-'+i).value.trim()||name);
 state=newGame(undefined,names);
 chosenCard=null;chosenPiece=null;pickMoves=[];lastSeenRevision=-1;lastSlotRound=0;lastSeenLossEventId=0;
 $('setup').close();
 save();render();
 toast('🎰 Der verfluchte Aufstieg beginnt!',2500);
 onEffect();
}
$('begin').addEventListener('click',start);
$('restart').addEventListener('click',()=>{
 if(onlineMode)return;
 if(!confirm('Lokalen Mission-2-Test wirklich neu beginnen?'))return;
 clearMissionWeather();
 localStorage.removeItem(KEY);state=null;chosenCard=null;chosenPiece=null;pickMoves=[];
 for(let i=0;i<SEATS;i++)$('name-'+i).value=LABELS[i];
 $('setup').showModal();render();
});
function updateOnlinePanel(room){
 const panel=$('grinch-online-panel');
 panel.hidden=false;
 const players=room.players?.filter(p=>!p.testBot&&!p.bot)||[];
 const active=room.phase==='playing'&&room.match?.game==='dog-grinch2';
 $('grinch-online-code').textContent='Spielraum '+room.code;
 $('grinch-online-players').textContent=players.map(p=>(p.me?'👤 ':'')+p.name).join(' · ')+' ('+players.length+'/3)';
 const start=$('grinch-online-launch');
 start.hidden=!room.host||(active&&!room.match.grinch?.complete);
 start.disabled=onlineBusy||players.length!==3;
 $('grinch-online-lobby').href='../../hub-lobby.html?'+new URLSearchParams({room:room.code}).toString();
 if(active){
  $('grinch-online-status').textContent=room.match.grinch?.complete?
    (room.match.grinchCompletionRecorded?'✅ Offizieller Sieg bestätigt. Mission 3 ist freigeschaltet.':'🏆 Sieg erkannt – Server bestätigt den Fortschritt.'):
    '🎲 Mission 2 läuft online · '+room.match.grinchRoster.map(p=>p.name).join(' / ');
  return;
 }
 $('grinch-online-status').textContent=room.host?
  (players.length===3?'Alle drei sind da. Du kannst Mission 2 gemeinsam starten.':'Warte auf genau drei Spieler im Raum, dann kannst du starten.'):
  'Warte darauf, dass der Host die Mission startet. Falls du nicht zum Raum gehörst, tritt zuerst über die Lobby bei.';
}
function acceptOnlineRoom(room){
 if(!room||room.code!==roomCode)return;
 updateOnlinePanel(room);
 const match=room.phase==='playing'&&room.match?.game==='dog-grinch2'?room.match:null;
 if(!match){
  state=null;onlineSeat=null;onlineMatchId=null;
  $('board').innerHTML='';
  $('hand').replaceChildren();$('moves').replaceChildren();
  $('turn-label').textContent='🌐 Warte auf den Online-Missionsstart';
  return;
 }
 const mission=match.grinch;
 if(!mission)return;
 const previous=state?.revision??null,priorMatch=onlineMatchId;
 // Ignore out-of-order WebSocket / refresh snapshots from an older revision.
 if(priorMatch===match.id&&previous!==null&&mission.revision<previous)return;
 onlineSeat=Number.isInteger(match.grinchSeat)?match.grinchSeat:null;
 onlineMatchId=match.id;
 state=mission;
 if(priorMatch!==match.id){
  chosenCard=null;chosenPiece=null;pickMoves=[];
  lastSeenRevision=mission.revision;lastSlotRound=0;
  lastSeenLossEventId=mission.m2?.eventLog?.filter(x=>x.type==='loss').at(-1)?.eventId||0;
 }else if(previous!==null&&previous!==mission.revision){
  chosenCard=mission.seven&&onlineSeat===mission.current?mission.seven.cardId:null;
  chosenPiece=null;pickMoves=[];
 }
 render();
 if(priorMatch!==match.id){
  const spin=mission.m2?.spins?.at(-1);
  if(spin&&mission.m2?.pendingSlotRound===spin.round){lastSlotRound=spin.round;void presentMission2Slot(spin);}
 }
 else if(previous!==null&&priorMatch===match.id&&previous!==mission.revision)onEffect();
}
function onOnlineError(message){
 $('grinch-online-panel').hidden=false;
 $('grinch-online-status').textContent='⚠️ '+message;
 toast(message,4400);
}
function onOnlineConnection(mode){
 if(mode==='login')$('grinch-online-status').textContent='🔐 Melde dich mit deinem Online-Profil an oder kehre zum gemeinsamen Spielraum zurück.';
 else if(mode==='reconnecting')$('grinch-online-status').textContent='🔄 Verbindung unterbrochen. Der Spielstand wird erneut geladen.';
}
if(onlineMode){
 $('grinch-online-panel').hidden=false;
 $('grinch-online-code').textContent='Spielraum '+roomCode;
 $('grinch-online-lobby').href='../../hub-lobby.html?'+new URLSearchParams({room:roomCode}).toString();
 $('restart').hidden=true;$('restart').style.display='none';
 onlineBridge=createGrinchOnline({roomCode,onRoom:acceptOnlineRoom,onError:onOnlineError,onConnection:onOnlineConnection});
 $('grinch-online-launch').addEventListener('click',async()=>{
  if(onlineBusy)return;
  onlineBusy=true;$('grinch-online-launch').disabled=true;
  try{await onlineBridge.launch();}finally{onlineBusy=false;}
 });
 $('grinch-online-refresh').addEventListener('click',()=>void onlineBridge.refresh());
 onlineBridge.start();
}else{
 state=read();
 if(state){
  render();lastSeenRevision=state.revision;
  const spin=state.m2?.spins?.at(-1);
  if(spin&&state.m2?.pendingSlotRound===spin.round){lastSlotRound=spin.round;void presentMission2Slot(spin);}
  else lastSlotRound=spin?.round||0;
 }
 else $('setup').showModal();
}
