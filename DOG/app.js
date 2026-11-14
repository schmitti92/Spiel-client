import {cardMarkup,cardVisual} from './card-visuals.js?v=1';
import {CARD_TYPES,createGame,exchangeCard,legalActions,takeAction,cancelSeven,botAction} from './engine.js';
import {decideDogRoomUpdate} from './online-sync.js?v=14';
import {DEFAULT_APPEARANCE,BOARD_STYLES,PIECE_STYLES,CARD_STYLES,loadAppearance,saveAppearance,resolveAppearance,validAssetPath,assetBackground} from './appearance-registry.js?v=12';
import {trackPoint,goalPoint,homePoint,TRACK_POINTS,GOAL_POINTS,HOME_POINTS,isStartField,BOARD_LAYOUT_ID} from './board-layout.js?v=10';

const $=id=>document.getElementById(id);
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const KEY='spielportal:dog:local-v1';
const params=new URL(location.href).searchParams;
const online=/^(?:\d{3}|[A-HJ-NP-Z2-9]{6})$/.test(params.get('room')||'');
const hubCode=online?params.get('room'):null;
const matchHint=params.get('match');
const editorBack='index.html'+location.search;
document.querySelectorAll('[data-dog-editor]').forEach(link=>link.href='editor.html?return='+encodeURIComponent(editorBack)+'&v=10');
const apiBase=String(window.SPIELPORTAL_CONFIG?.apiBase||'https://serverfinal-ynbe.onrender.com').replace(/\/+$/,'');
let onlineSeat=null,onlineSocket=null,onlineBusy=false,onlinePoll=null,onlineHeartbeat=null,roomRevision=null,acceptedMatchId=null,refreshInFlight=null;
function user(){const s=window.SpielOnline?.state?.();return s?.status==='online'&&s.user?.getIdToken?s.user:null;}
async function hubRequest(path,method='GET',payload){
 const person=user();if(!person)throw Error('Bitte melde dich mit deinem Online-Profil an.');
 const token=await person.getIdToken();
 const response=await fetch(apiBase+'/api/hub/rooms/'+hubCode+path,{method,headers:{Authorization:'Bearer '+token,...(payload?{'Content-Type':'application/json'}:{})},body:payload?JSON.stringify(payload):undefined,cache:'no-store'});
 const body=await response.json();
 if(!response.ok||!body.ok)throw Error(body.error||'SERVER_ERROR');
 return body.room;
}
function acceptRemote(room){
 const decision=decideDogRoomUpdate(
   {roomRevision,game,onlineSeat,matchId:acceptedMatchId},
   room,{hubCode,matchHint}
 );
 if(!decision.accept)return;
 roomRevision=decision.roomRevision;
 if(decision.kind==='dog'){
   if(decision.hideHand)revealed=decision.seat!==null;
   if(decision.clearSelection){selectedCard=null;selectedPiece=null;jokerAs=null;$('dog-joker-dialog').close();}
   game=decision.game;onlineSeat=decision.seat;acceptedMatchId=decision.matchId;
   render();
 }else if(game?.phase==='finished'){
   $('status').textContent='Partie beendet – du kannst in der Raum-Lobby ein neues Spiel auswählen.';
 }else{
   $('status').textContent='Das DOG-Spiel ist noch nicht gestartet oder wurde bereits beendet. Kehre zur Raum-Lobby zurück.';
 }
}
async function refreshOnline(){
 if(refreshInFlight)return refreshInFlight;
 refreshInFlight=(async()=>{
   try{const room=await hubRequest('');acceptRemote(room);}
   catch(e){$('status').textContent='⚠️ Online: '+e.message;}
 })();
 try{await refreshInFlight;}finally{refreshInFlight=null;}
}

function startSocket(){
 if(onlineSocket||!user())return;
 const socket=new WebSocket(apiBase.replace(/^http/i,'ws')+'/hub');onlineSocket=socket;
 socket.onopen=async()=>{
  try{const token=await user().getIdToken();if(socket.readyState===1)socket.send(JSON.stringify({type:'subscribe',code:hubCode,profileIdToken:token}));}
  catch(_){socket.close();}
  onlineHeartbeat=setInterval(()=>{if(socket.readyState===1)socket.send(JSON.stringify({type:'ping'}));},30000);
 };
 socket.onmessage=e=>{let data;try{data=JSON.parse(e.data)}catch(_){return;}if(data.type==='room'&&data.room?.code===hubCode)acceptRemote(data.room);};
 socket.onclose=()=>{if(onlineHeartbeat){clearInterval(onlineHeartbeat);onlineHeartbeat=null;}if(onlineSocket===socket)onlineSocket=null;};
 socket.onerror=()=>{};
}
async function initOnline(){
 $('back-link').href='../hub-lobby.html?room='+encodeURIComponent(hubCode)+'&stage=1';
 $('new-game').hidden=true;
 $('human-count').disabled=true;
 $('human-count').closest('.controls').hidden=true;
 $('turn').textContent='Online-Spielstand wird verbunden …';
 await refreshOnline();
 startSocket();
 if(!onlinePoll)onlinePoll=setInterval(()=>{if(!onlineSocket||onlineSocket.readyState!==1)void refreshOnline();if(!onlineSocket||onlineSocket.readyState>=2)startSocket();},8000);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden){void refreshOnline();startSocket();}});
 window.addEventListener('spielonline-change',()=>{if(user()){void refreshOnline();startSocket();}});
}

// Zoom affects only the SVG viewport; game state, cards and surrounding UI stay unchanged.
const BOARD_SIZE=760,ZOOM_MIN=.75,ZOOM_MAX=2.5,ZOOM_STEP=.25;
let boardZoom=1;
function setBoardZoom(value){
 boardZoom=Math.max(ZOOM_MIN,Math.min(ZOOM_MAX,Math.round(value*100)/100));
 const size=BOARD_SIZE/boardZoom,offset=(BOARD_SIZE-size)/2;
 $('board').setAttribute('viewBox',[offset,offset,size,size].join(' '));
 $('dog-zoom-label').textContent=Math.round(boardZoom*100)+' %';
 $('dog-zoom-in').disabled=boardZoom>=ZOOM_MAX;
 $('dog-zoom-out').disabled=boardZoom<=ZOOM_MIN;
}
$('dog-zoom-in').addEventListener('click',()=>setBoardZoom(boardZoom+ZOOM_STEP));
$('dog-zoom-out').addEventListener('click',()=>setBoardZoom(boardZoom-ZOOM_STEP));
$('dog-zoom-reset').addEventListener('click',()=>setBoardZoom(1));
$('board').addEventListener('wheel',event=>{
 if(!event.ctrlKey&&!event.shiftKey)return;
 event.preventDefault();
 setBoardZoom(boardZoom+(event.deltaY<0?ZOOM_STEP:-ZOOM_STEP));
},{passive:false});
const names=['Rot','Blau','Grün','Gelb'];
let game,selectedCard=null,selectedPiece=null,jokerAs=null,available=[],revealed=online,aiTimer=null,lastTurn=null,humans=1;
let appearance=loadAppearance();
const currentLook=()=>resolveAppearance(appearance);
const displayColors=()=>currentLook().pieces.colors;
const cardsLabel=t=>t==='swap'?'⇄':t==='joker'?'★':t==='1/11'?'1/11':t;
function recover(){
  try{
    const g=JSON.parse(localStorage.getItem(KEY));
    if(g?.schemaVersion===1&&g.ruleset==='classic-dog'&&Array.isArray(g.pieces)&&g.pieces.length===16&&g.players?.length===4&&Array.isArray(g.hands)&&g.hands.length===4){game=g;humans=g.players.filter(x=>!x.bot).length;return true;}
  }catch(_){}
  return false;
}
function save(){if(online)return;try{localStorage.setItem(KEY,JSON.stringify(game));}catch(_){}}
function newGame(){
  if(online)return;
  if(aiTimer){clearTimeout(aiTimer);aiTimer=null;}
  humans=Number($('human-count').value)||1;
  game=createGame({names:['Du','Spieler Blau','Spieler Grün','Spieler Gelb'],bots:[0,1,2,3].map(i=>i>=humans)});
  revealed=true;selectedCard=null;selectedPiece=null;jokerAs=null;lastTurn=null;
  save();render();scheduleAI();
}
function isHumanExchange(){
  if(game.phase!=='exchange')return -1;
  if(online)return onlineSeat!==null&&game.exchanges[onlineSeat]===false?onlineSeat:-1;
  return game.players.findIndex(p=>!p.bot&&game.exchanges[p.seat]===null);
}
function currentHuman(){
  if(game.phase==='exchange')return isHumanExchange();
  if(online)return game.current===onlineSeat&&game.phase!=='finished'?onlineSeat:-1;
  if(game.phase==='play'||game.phase==='seven')return game.players[game.current].bot?-1:game.current;
  return -1;
}
function activeSeat(){
  if(game.phase==='exchange')return isHumanExchange();
  return game.current;
}
const boardPoint=trackPoint;
const coord=p=>p.x.toFixed(2)+','+p.y.toFixed(2);
function piecePoint(piece){
  if(piece.place==='track')return boardPoint(piece.pos);
  if(piece.place==='goal')return goalPoint(piece.owner,piece.pos);
  return homePoint(piece.owner,piece.id%4);
}
function drawBoard(){
  if(!game)return;
  const board=[];
  const push=part=>board.push(part);
  const look=currentLook(),skin=look.board;
  const palette=look.pieces.colors;
  const safeColor=seat=>palette[seat]||palette[0];
  push('<title>DOG Klassisch – 64 Lauffelder, 4 geschützte Startfelder und 4 Zielbahnen</title>');
  push('<defs>'+
    '<linearGradient id="dog-wood" x1="0" y1="0" x2="1" y2="1"><stop stop-color="'+skin.wood[0]+'"/><stop offset=".22" stop-color="'+skin.wood[1]+'"/><stop offset=".44" stop-color="'+skin.wood[2]+'"/><stop offset=".7" stop-color="'+skin.wood[3]+'"/><stop offset="1" stop-color="'+skin.wood[4]+'"/></linearGradient>'+
    '<radialGradient id="dog-blue" cx=".42" cy=".34" r=".88"><stop stop-color="'+skin.surface[0]+'"/><stop offset=".56" stop-color="'+skin.surface[1]+'"/><stop offset="1" stop-color="'+skin.surface[2]+'"/></radialGradient>'+
    '<linearGradient id="dog-hole" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#ffffff"/><stop offset=".52" stop-color="#ecf1f4"/><stop offset="1" stop-color="#b6c4d0"/></linearGradient>'+
    '<linearGradient id="dog-center" x1="0" y1="0" x2="0" y2="1"><stop stop-color="'+skin.center[0]+'"/><stop offset="1" stop-color="'+skin.center[1]+'"/></linearGradient>'+
    '<filter id="dog-pawn-shadow" x="-60%" y="-60%" width="220%" height="220%"><feDropShadow dx="0" dy="3" stdDeviation="2.8" flood-color="#000" flood-opacity=".65"/></filter>'+
    '<filter id="dog-halo" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="4"/></filter>'+
    '<pattern id="dog-speckle" x="0" y="0" width="31" height="43" patternUnits="userSpaceOnUse"><circle cx="5" cy="11" r=".8" fill="#ffffff" opacity=".09"/><circle cx="22" cy="34" r=".65" fill="#ffffff" opacity=".12"/><circle cx="16" cy="6" r=".55" fill="#06172f" opacity=".38"/></pattern>'
  );
  for(let seat=0;seat<4;seat++){
    const c=safeColor(seat);
    push('<linearGradient id="dog-pawn-'+seat+'" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#ffffff" stop-opacity=".68"/><stop offset=".3" stop-color="'+c+'"/><stop offset=".83" stop-color="'+c+'"/><stop offset="1" stop-color="#172431" stop-opacity=".9"/></linearGradient>');
  }
  push('</defs>');
  push('<rect x="8" y="8" width="744" height="744" rx="44" fill="url(#dog-wood)" stroke="#2c1b13" stroke-width="7"/>');
  push('<rect x="27" y="27" width="706" height="706" rx="30" fill="#051323" stroke="#ead4a4" stroke-opacity=".66" stroke-width="2"/>');
  push('<rect x="35" y="35" width="690" height="690" rx="25" fill="url(#dog-blue)"/>');
  // Optional trusted image asset specified by a built-in board theme.
  if(validAssetPath(skin.image))
    push('<image href="'+skin.image+'" x="35" y="35" width="690" height="690" preserveAspectRatio="xMidYMid slice" opacity=".94" pointer-events="none"/>');
  push('<rect x="35" y="35" width="690" height="690" rx="25" fill="url(#dog-speckle)"/>');
  push('<rect x="41" y="41" width="678" height="678" rx="20" fill="none" stroke="'+skin.edge+'" stroke-opacity=".27" stroke-width="1.5"/>');
  // The course makes a single uninterrupted 64-step circuit. Start indices are
  // 0/16/32/48; the correct corner is independent of future cosmetic themes.
  const path=TRACK_POINTS.map((p,i)=>(i===0?'M ':'L ')+coord(p)).join(' ')+' Z';
  push('<path d="'+path+'" fill="none" stroke="#03152a" stroke-width="32" stroke-linejoin="round" stroke-linecap="round" opacity=".52"/>');
  push('<path d="'+path+'" fill="none" stroke="'+skin.route+'" stroke-width="3" stroke-linejoin="round" stroke-linecap="round" opacity=".55"/>');
  // All goal and reserve holes follow the draggable editor coordinates.
  for(let seat=0;seat<4;seat++){
    const c=safeColor(seat),start=boardPoint(seat*16);
    const goal=GOAL_POINTS[seat],home=HOME_POINTS[seat];
    const gps=goal.map(coord).join(' '),hps=home.map(coord).join(' ');
    push('<polyline points="'+gps+'" fill="none" stroke="'+c+'" stroke-opacity=".23" stroke-width="39" stroke-linecap="round" stroke-linejoin="round"/>');
    push('<polyline points="'+hps+'" fill="none" stroke="'+c+'" stroke-opacity=".15" stroke-width="37" stroke-linecap="round" stroke-linejoin="round"/>');
    push('<polyline points="'+gps+'" fill="none" stroke="'+c+'" stroke-opacity=".66" stroke-width="2.5" stroke-linecap="round"/>');
    push('<polyline points="'+hps+'" fill="none" stroke="'+c+'" stroke-opacity=".45" stroke-width="2" stroke-linecap="round"/>');
    // Zielbahn beginnt am farbigen Startfeld, nicht am Ringfeld davor.
    // Der Figuren-Zug muss das Startfeld auf dem Weg zum Ziel überqueren.
    const goalEntry=boardPoint(seat*16);
    push('<path d="M '+coord(goalEntry)+' L '+coord(goal[0])+'" stroke="'+c+'" stroke-width="2.8" stroke-dasharray="6 4" opacity=".76"/>');
    push('<path d="M '+coord(start)+' L '+coord(home[0])+'" stroke="'+c+'" stroke-width="2.1" stroke-dasharray="3 7" opacity=".62"/>');
    for(let j=0;j<4;j++){
      const p=home[j];
      push('<circle cx="'+p.x+'" cy="'+p.y+'" r="16.7" fill="#041629" stroke="'+c+'" stroke-opacity=".7" stroke-width="2.4"/>');
      push('<circle cx="'+p.x+'" cy="'+p.y+'" r="11.4" fill="#164066" opacity=".6"/>');
    }
    for(let j=0;j<4;j++){
      const p=goal[j];
      push('<circle cx="'+p.x+'" cy="'+p.y+'" r="17.3" fill="'+c+'" fill-opacity=".21" stroke="'+c+'" stroke-width="2.5"/>');
      push('<circle cx="'+p.x+'" cy="'+p.y+'" r="11.4" fill="#ffffff" fill-opacity=".12"/>');
    }
    const labelGoal=goal[2],labelHome=home[2];
    push('<text x="'+labelGoal.x+'" y="'+(labelGoal.y+28)+'" text-anchor="middle" fill="'+c+'" font-size="10" font-weight="850" letter-spacing=".8">ZIEL</text>');
    push('<text x="'+labelHome.x+'" y="'+(labelHome.y+28)+'" text-anchor="middle" fill="'+c+'" font-size="10" font-weight="850" letter-spacing=".8">START</text>');
  }
  // A warm little center crest. Original brand artwork is intentionally not
  // copied so future DOG modes and events can use the same geometric layout.
  push('<rect x="289" y="289" width="182" height="182" rx="28" fill="url(#dog-center)" stroke="#cfac75" stroke-opacity=".63" stroke-width="3"/>');
  push('<rect x="299" y="299" width="162" height="162" rx="20" fill="none" stroke="#b4d0e6" stroke-opacity=".21" stroke-width="1"/>');
  push('<path d="M 330 339 Q 380 315 430 339 M 330 422 Q 380 448 430 422" stroke="#c6a472" stroke-width="2" fill="none" opacity=".67"/>');
  push('<text x="380" y="377" text-anchor="middle" fill="#f8e1b5" font-size="47" font-weight="1000" letter-spacing="2">DOG</text>');
  push('<text x="380" y="402" text-anchor="middle" fill="#91bad1" font-size="12" font-weight="800" letter-spacing="3">KLASSISCH</text>');
  // Carved white holes, exactly sixty unprotected plus four tinted starts.
  for(let i=0;i<64;i++){
    const {x,y}=boardPoint(i),start=isStartField(i),seat=i/16|0;
    const c=safeColor(seat);
    push('<circle cx="'+x+'" cy="'+(y+2.1)+'" r="18.7" fill="#020f22" opacity=".75"/>');
    push('<circle cx="'+x+'" cy="'+y+'" r="'+(start?18.2:16.5)+'" fill="'+(start?c:'url(#dog-hole)')+'" stroke="'+(start?'#f5e1b7':'#143c58')+'" stroke-width="'+(start?3.5:2)+'"/>');
    push('<circle cx="'+(x-4)+'" cy="'+(y-5)+'" r="'+(start?5.5:4.4)+'" fill="#ffffff" opacity="'+(start?'.30':'.62')+'"/>');
    if(start){
      push('<circle cx="'+x+'" cy="'+y+'" r="10.4" fill="#07172b" fill-opacity=".18"/>');
      push('<path d="M '+(x-4)+' '+(y-7)+' L '+(x+5)+' '+y+' L '+(x-4)+' '+(y+7)+' Z" fill="#ffffff" opacity=".88"/>');
    }
  }
  // No move hints: destinations must be calculated by the player.
  // Pawns on top, always staying attached to their logical position.
  for(const piece of game.pieces){
    const p=piecePoint(piece),color=safeColor(piece.owner),hi=selectedPiece===piece.id;
    if(!p)continue;
    if(hi)push('<circle class="dog-move-halo" cx="'+p.x+'" cy="'+p.y+'" r="28" fill="'+color+'" fill-opacity=".5" filter="url(#dog-halo)" pointer-events="none"/>');
    push('<g data-piece="'+piece.id+'" class="dog-pawn '+(hi?'can-pick':'')+'" aria-label="Figur '+(piece.id%4+1)+' '+(game.players[piece.owner]?.name||'')+'">');
    push('<ellipse cx="'+p.x+'" cy="'+(p.y+10)+'" rx="14.6" ry="6.8" fill="#020b15" opacity=".63"/>');
    push('<path d="M '+(p.x-10)+' '+(p.y+5)+' Q '+(p.x-11)+' '+(p.y-3)+' '+(p.x-5)+' '+(p.y-7)+' Q '+p.x+' '+(p.y-13)+' '+(p.x+5)+' '+(p.y-7)+' Q '+(p.x+11)+' '+(p.y-3)+' '+(p.x+10)+' '+(p.y+5)+' Q '+p.x+' '+(p.y+14)+' '+(p.x-10)+' '+(p.y+5)+' Z" fill="url(#dog-pawn-'+piece.owner+')" stroke="'+(hi?'#ffffff':'#061b2c')+'" stroke-width="'+(hi?'3':'1.5')+'" filter="url(#dog-pawn-shadow)"/>');
    push('<circle cx="'+p.x+'" cy="'+(p.y-7)+'" r="9.1" fill="url(#dog-pawn-'+piece.owner+')" stroke="#ffffff" stroke-opacity=".42" stroke-width="1.4"/>');
    push('<circle cx="'+(p.x-2.8)+'" cy="'+(p.y-10.8)+'" r="2.3" fill="#fff" opacity=".68"/>');
    // Transparent large target for touch and keyboard focus via the move buttons.
    push('<circle cx="'+p.x+'" cy="'+p.y+'" r="22" fill="transparent"/>');
    push('</g>');
  }
  $('board').innerHTML=board.join('');
}

function actionLabel(m){
  const figure=m.pieceId!==undefined?'Figur '+((m.pieceId%4)+1):'';
  if(m.type==='start')return '🚀 '+figure+' starten';
  if(m.type==='swap')return '🔄 '+figure+' mit '+names[Math.floor(m.targetId/4)]+' '+((m.targetId%4)+1)+' tauschen';
  if(m.type==='emptySwap')return '↔ Tauschkarte ohne Wirkung ablegen';
  if(m.type==='seven')return '🔥 7 Schritte aufteilen';
  if(m.type==='seven-step')return figure+' · '+m.steps+' Schritt'+(m.steps===1?'':'e')+(m.to?.startsWith('goal')?' ins Ziel':'');
  if(m.type==='move')return figure+' · '+Math.abs(m.steps)+' '+(m.steps<0?'rückwärts':'vorwärts')+(m.to?.startsWith('goal')?' ins Ziel':'')+(m.captures?.length?' · '+m.captures.length+' geschlagen':'');
  return 'Karte spielen';
}
function renderPlayers(){
  const seats=game.players.map(p=>{
    const own=game.pieces.filter(x=>x.owner===p.seat),goal=own.filter(x=>x.place==='goal').length,turn=activeSeat()===p.seat&&game.phase!=='finished';
    const hand=Array.isArray(game.hands[p.seat])?game.hands[p.seat].length:(game.hands[p.seat]?.count||0),exchange=game.phase==='exchange'&&game.exchanges[p.seat]!==null&&game.exchanges[p.seat]!==false;
    return '<div class="seat '+(turn?'on':'')+'" style="--seat:'+displayColors()[p.seat]+'"><span class="seat-mark"></span><span class="seat-name">'+escape(p.name)+(p.bot?' 🤖':' 👤')+'</span><b>'+goal+'/4</b><span class="seat-extra">'+(exchange?'✓ Karte getauscht':hand+' Karten')+'</span></div>';
  }).join('');
  $('players').innerHTML=seats;
}
function renderHand(){
  const seat=currentHuman(),title=$('hand-title'),hand=$('hand'),actions=$('moves'),button=$('show-hand');
  actions.innerHTML='';hand.innerHTML='';
  if(game.phase==='finished'){title.textContent='🏆 Partie beendet';button.hidden=true;return;}
  if(seat<0){title.textContent=online&&onlineSeat!==null?'🃏 Deine Handkarten':'🤖 Bots spielen';button.hidden=true;if(online&&onlineSeat!==null&&Array.isArray(game.hands[onlineSeat]))hand.innerHTML=game.hands[onlineSeat].map(c=>cardMarkup(c.type,{tag:'div'})).join('');available=[];return;}
  if(lastTurn!==seat){revealed=online||humans===1;selectedCard=null;selectedPiece=null;jokerAs=null;lastTurn=seat;}
  button.hidden=online||humans===1;button.textContent=revealed?'🙈 Hand verdecken':'🃏 Karten ansehen';
  title.textContent=game.phase==='exchange'?'🔐 '+game.players[seat].name+': Karte an Partner geben':game.phase==='seven'?'🔥 Die 7 verteilen – noch '+(7-game.seven.spent)+' Schritte':'🎯 '+game.players[seat].name+' ist am Zug';
  if(!revealed){const symbol=escape(currentLook().cards.emblem);
    hand.innerHTML='<div class="hand-veil"><div class="dog-card-backs" aria-hidden="true"><span class="dog-card-back">'+symbol+'</span><span class="dog-card-back">'+symbol+'</span><span class="dog-card-back">'+symbol+'</span></div><span>Deine Karten sind verdeckt. Tippe auf „Karten ansehen“.</span></div>';return;}
  if(game.phase==='seven'){
    available=legalActions(game,seat);
    hand.innerHTML=game.hands[seat].map(c=>cardMarkup(c.type,{tag:'div',selected:c.id===game.seven.cardId,footer:c.id===game.seven.cardId?'Noch '+(7-game.seven.spent)+' Schritte':null})).join('');
    if(!online){const cancel=document.createElement('button');cancel.className='secondary move-button';cancel.textContent='↶ Sieben zurücknehmen';cancel.addEventListener('click',()=>{game=cancelSeven(game,seat);selectedCard=null;selectedPiece=null;save();render();});actions.appendChild(cancel);}
  }else{
    const cards=game.hands[seat];
    const exchange=game.phase==='exchange';
    hand.innerHTML=cards.map(c=>cardMarkup(c.type,{selected:selectedCard===c.id,attrs:'type="button" data-card="'+c.id+'"',footer:exchange?'WEITERGEBEN':null})).join('');
    available=exchange?[]:selectedCard!==null?legalActions(game,seat).filter(m=>m.cardId===selectedCard&&(jokerAs===null||m.as===jokerAs)):[];
    if(exchange&&selectedCard!==null){
      available=[{type:'exchange',cardId:selectedCard}];
    }
  }
  if(game.phase==='seven')available=legalActions(game,seat);
  const special=available.filter(m=>['exchange','seven','emptySwap'].includes(m.type));
  actions.insertAdjacentHTML('beforeend',[...new Map(special.map(m=>[m.type,m])).values()].map(m=>'<button type="button" class="move-button" data-special="'+m.type+'">'+(m.type==='exchange'?'Karte weitergeben':m.type==='seven'?'7 beginnen':'Tauschkarte ablegen')+'</button>').join(''));
  $('move-help').textContent=jokerAs!==null?'Joker als '+(jokerAs==='swap'?'Tauschkarte':jokerAs)+' gewählt. Figur und Ziel selbst antippen.':game.phase==='exchange'?'Wähle die Karte für deinen Partner.':game.phase==='seven'?'Figur und Zielfeld selbst wählen. Noch '+(7-game.seven.spent)+' Schritte.':selectedCard===null?'Wähle eine Karte.':'Figur und Zielfeld selbst antippen – ohne Zugvorschläge.';
}
function renderCardPiles(){
 const deck=Array.isArray(game.deck)?game.deck:null;
 const discard=Array.isArray(game.discard)?game.discard:null;
 $('dog-deck-count').textContent=deck?deck.length+' Karten':'Verdeckt';
 $('dog-discard-count').textContent=discard?discard.length+' Karten':'Verdeckt';
 const last=discard?.at(-1);
 $('dog-discard-art').textContent=last?cardsLabel(last.type):'—';
 $('dog-discard-art').title=last?'Zuletzt abgelegt: '+last.type:'Noch keine Karte abgelegt';
}
function render(){
  if(!game)return;
  renderCardPiles();
  if(!online)$('human-count').value=String(humans);
  $('round').textContent=String(game.round);
  $('phase').textContent=game.phase==='exchange'?'Geheimer Kartentausch':game.phase==='seven'?'7 verteilen':game.phase==='finished'?'Spielende':'Kartenrunde';
  const active=activeSeat();
  $('turn').textContent=game.phase==='finished'?'🏆 Team '+(game.winner===0?'Rot / Grün':'Blau / Gelb')+' gewinnt!':game.phase==='exchange'?'Karten werden getauscht':active>=0?game.players[active].name+' ist dran':'Bots spielen';
  $('history').innerHTML=game.history.map(t=>'<div>'+escape(t)+'</div>').join('');
  renderPlayers();
  available=[];
  renderHand();drawBoard();
  $('status').textContent=online?'🌐 Online mit Freunden · Karten serverseitig geschützt · Raum '+hubCode:'Klassische Regeln • Teams Rot/Grün und Blau/Gelb • Spielstand wird lokal gesichert';
  $('winner').hidden=game.phase!=='finished';
  if(game.phase==='finished')$('winner-title').textContent='Team '+(game.winner===0?'Rot / Grün':'Blau / Gelb')+' gewinnt!';
  $('selected-info').textContent=selectedCard?'Karte ausgewählt: '+cardsLabel(game.hands[currentHuman()]?.find(c=>c.id===selectedCard)?.type||''):'';
}
function onCard(id){
  const seat=currentHuman();if(seat<0||!revealed)return;
  selectedCard=selectedCard===id?null:id;selectedPiece=null;jokerAs=null;
  if(selectedCard!==null&&game.phase==='play'&&game.hands[seat].some(c=>c.id===selectedCard&&c.type==='joker'))openJokerDialog(seat);
  render();
}
function onMove(i){
  const seat=currentHuman();if(seat<0||!revealed)return;
  const move=available[i];if(!move)return;
  if(online){
    if(onlineBusy)return;
    onlineBusy=true;$('status').textContent='Zug wird vom Server geprüft …';
    hubRequest('/dog/action','POST',{matchId:acceptedMatchId||matchHint||'',expectedRevision:game.revision,actionId:crypto.randomUUID(),action:move})
      .then(room=>{acceptRemote(room);})
      .catch(e=>{$('status').textContent='⚠️ '+e.message;void refreshOnline();})
      .finally(()=>{onlineBusy=false;});
    return;
  }
  try{
    if(game.phase==='exchange')game=exchangeCard(game,seat,move.cardId);
    else game=takeAction(game,seat,move);
    selectedCard=null;selectedPiece=null;jokerAs=null;revealed=humans===1;lastTurn=null;available=[];save();render();scheduleAI();
  }catch(e){$('status').textContent='⚠️ '+e.message;}
}
function scheduleAI(){
  if(online)return;
  if(aiTimer){clearTimeout(aiTimer);aiTimer=null;}
  if(!game||game.phase==='finished')return;
  if(game.phase==='exchange'){
    for(let i=0;i<4;i++)if(game.players[i].bot && game.exchanges[i]===null){
      const move=botAction(game,i);if(move){game=exchangeCard(game,i,move.cardId);save();}
    }
    render();
  }
  if((game.phase==='play'||game.phase==='seven')&&game.players[game.current].bot){
    aiTimer=setTimeout(()=>{
      aiTimer=null;
      try{
        const move=botAction(game,game.current);
        if(move)game=takeAction(game,game.current,move);
        else throw Error('Bot findet keinen erlaubten Zug');
        save();render();scheduleAI();
      }catch(e){$('status').textContent='⚠️ Botfehler: '+e.message;}
    },250);
  }
}
const jokerDialog=$('dog-joker-dialog');
function openJokerDialog(seat){
 const card=game.hands[seat]?.find(c=>c.id===selectedCard);
 if(card?.type!=='joker'||game.phase!=='play')return;
 const actions=legalActions(game,seat).filter(m=>m.cardId===card.id);
 const choices=CARD_TYPES.filter(type=>type!=='joker');
 $('dog-joker-grid').innerHTML=choices.map(type=>{
  const enabled=actions.some(m=>m.as===type);
  const label=type==='swap'?'Tauschkarte':type==='1/11'?'1 oder 11':type;
  return cardMarkup(type,{extraClass:'dog-joker-choice',attrs:'type="button" data-joker-as="'+escape(type)+'" '+(enabled?'':'disabled title="Aktuell kein legaler Zug"')});
 }).join('');
 if(!jokerDialog.open)jokerDialog.showModal();
}
$('dog-joker-grid').addEventListener('click',event=>{
 const button=event.target.closest('[data-joker-as]');
 if(!button||button.disabled)return;
 jokerAs=button.dataset.jokerAs;selectedPiece=null;jokerDialog.close();render();
});
$('dog-joker-close').addEventListener('click',()=>{jokerDialog.close();selectedCard=null;jokerAs=null;selectedPiece=null;render();});
jokerDialog.addEventListener('cancel',()=>{selectedCard=null;jokerAs=null;selectedPiece=null;render();});
$('hand').addEventListener('click',e=>{const btn=e.target.closest('[data-card]');if(btn)onCard(Number(btn.dataset.card));});
$('moves').addEventListener('click',e=>{const btn=e.target.closest('[data-special]');if(!btn)return;const index=available.findIndex(m=>m.type===btn.dataset.special&&(jokerAs===null||m.as===jokerAs));if(index>=0)onMove(index);});
$('board').addEventListener('click',e=>{
 if(!revealed||currentHuman()<0||onlineBusy)return;
 const node=e.target.closest('[data-piece]');
 if(node&&selectedPiece===null){if(!available.some(m=>m.pieceId===Number(node.dataset.piece)))return;selectedPiece=Number(node.dataset.piece);drawBoard();$('move-help').textContent='Wähle das Zielfeld selbst.';return;}
 if(node&&Number(node.dataset.piece)===selectedPiece){selectedPiece=null;drawBoard();$('move-help').textContent='Figur abgewählt.';return;}
 if(node&&available.some(m=>m.pieceId===Number(node.dataset.piece))&&Number(node.dataset.piece)!==selectedPiece){selectedPiece=Number(node.dataset.piece);drawBoard();$('move-help').textContent='Andere Figur gewählt. Jetzt Zielfeld antippen.';return;}
 if(selectedPiece===null)return;
 const matrix=$('board').getScreenCTM();if(!matrix)return;
 const p=new DOMPoint(e.clientX,e.clientY).matrixTransform(matrix.inverse());
 const fields=TRACK_POINTS.map((v,i)=>({key:'track:'+i,p:v}));
 GOAL_POINTS.forEach((group,seat)=>group.forEach((v,i)=>fields.push({key:'goal:'+i,p:v,seat})));
 let dest=null,best=26*26;
 for(const field of fields){const d=(field.p.x-p.x)**2+(field.p.y-p.y)**2;if(d<best){best=d;dest=field;}}
 const matches=available.map((m,i)=>({m,i})).filter(({m})=>{
  if(m.pieceId!==selectedPiece)return false;
  if(m.type==='swap')return !!node&&m.targetId===Number(node.dataset.piece);
  if(m.type==='start')return !node&&dest?.key==='track:'+(game.pieces[selectedPiece].owner*16);
  return dest&&['move','seven-step'].includes(m.type)&&m.to===dest.key&&(dest.seat===undefined||dest.seat===game.pieces[selectedPiece].owner);
 });
 if(matches.length===1){onMove(matches[0].i);return;}
 if(matches.length>1){
  const choices=matches.map(({m},i)=>(i+1)+': '+(m.as||m.steps||'Zug')+(m.viaGoal?' über Ziel':'')).join(' | ');
  const response=prompt('Mehrere Wege führen hierher. Welche Variante? '+choices,'1');
  if(response===null)return;
  const selected=Number(response)-1;
  if(Number.isInteger(selected)&&matches[selected])onMove(matches[selected].i);
  return;
 }
 selectedPiece=null;drawBoard();$('move-help').textContent='Zug nicht erlaubt. Bitte selbst erneut rechnen.';
});
// Test controls are deliberately restricted to local games; never send altered cards online.
const testPanel=$('dog-card-test'),testSelect=$('dog-test-card');
if(!online){
 testPanel.hidden=false;
 for(const type of CARD_TYPES){const option=document.createElement('option');option.value=type;option.textContent=type==='swap'?'Tauschkarte':type==='joker'?'Joker':type==='1/11'?'1 oder 11':type;testSelect.appendChild(option);}
 $('dog-test-seven-setup').addEventListener('click',()=>{
  if(!confirm('7er-Test starten? Dein bisheriger lokaler DOG-Spielstand wird durch eine Testpartie ersetzt.'))return;
  if(aiTimer){clearTimeout(aiTimer);aiTimer=null;}
  humans=1;$('human-count').value='1';
  game=createGame({names:['Du','Spieler Blau','Spieler Grün','Spieler Gelb'],bots:[false,true,true,true]});
  game.phase='play';game.current=0;game.starter=0;
  game.exchanges=[null,null,null,null];
  const first=game.pieces.filter(p=>p.owner===0);
  for(const [i,pos] of [2,8].entries()){first[i].place='track';first[i].pos=pos;}
  const card=game.hands[0][0];card.type='7';
  selectedCard=card.id;selectedPiece=null;revealed=true;lastTurn=0;available=[];
  save();render();
  $('status').textContent='🧪 Zwei rote Figuren stehen auf der Strecke. Tippe „7 beginnen“ und verteile z. B. 3 + 4 Felder auf beide Figuren.';
 });
 $('dog-give-test-card').addEventListener('click',()=>{
  if(!game||game.phase==='finished'||game.phase==='seven'){ $('status').textContent='🧪 Testkarte erst außerhalb einer laufenden 7 oder nach einem Neustart einsetzen.';return;}
  const seat=currentHuman();
  if(seat<0){$('status').textContent='🧪 Warte, bis du wieder an der Reihe bist oder Karten tauschen kannst.';return;}
  const type=testSelect.value;
  if(!CARD_TYPES.includes(type))return;
  const hand=game.hands[seat];
  if(!Array.isArray(hand)||!hand.length){$('status').textContent='🧪 Keine Handkarte zum Ersetzen vorhanden.';return;}
  const index=hand.findIndex(c=>c.id===selectedCard);
  const card=hand[index>=0?index:0];
  card.type=type;
  selectedCard=card.id;selectedPiece=null;revealed=true;
  save();render();
  $('status').textContent='🧪 Testkarte '+type+' eingesetzt. Nur dein lokaler Spielstand wurde geändert.';
 });
}
$('show-hand').addEventListener('click',()=>{revealed=!revealed;render();});
$('new-game').addEventListener('click',()=>{if(confirm('Neue Partie starten? Der aktuelle Spielstand wird ersetzt.'))newGame();});
$('human-count').addEventListener('change',()=>{if(confirm('Spielerzahl ändern und eine neue Partie beginnen?'))newGame();else $('human-count').value=String(humans);});

function applyAppearance(){
  const look=currentLook();
  const variables={
    '--dog-page-bg':look.board.page,
    '--dog-frame-bg':look.board.frame,
    '--dog-card-face':assetBackground(look.cards.faceImage,look.cards.face),
    '--dog-card-special':assetBackground(look.cards.specialImage,look.cards.special),
    '--dog-card-border':look.cards.border,
    '--dog-card-special-border':look.cards.specialBorder,
    '--dog-card-ink':look.cards.ink,
    '--dog-card-back':assetBackground(look.cards.backImage,look.cards.back)
  };
  for(const [name,value] of Object.entries(variables))
    document.documentElement.style.setProperty(name,value);
  $('appearance-preview-back').textContent=look.cards.emblem;
  for(const field of ['board','pieces','cards']){
    const select=$('appearance-'+field);
    if(select)select.value=appearance[field];
  }
  document.querySelectorAll('[data-appearance-seat]').forEach(element=>{
    const seat=Number(element.dataset.appearanceSeat);
    if(Number.isInteger(seat)&&seat>=0&&seat<4)element.style.backgroundColor=look.pieces.colors[seat];
  });
  if(game)render();
}
function prepareAppearanceUI(){
  const groups={board:BOARD_STYLES,pieces:PIECE_STYLES,cards:CARD_STYLES};
  for(const [type,registry] of Object.entries(groups)){
    const select=$('appearance-'+type);
    select.replaceChildren();
    for(const [id,design] of Object.entries(registry)){
      const option=document.createElement('option');
      option.value=id;option.textContent=design.label;
      select.appendChild(option);
    }
    select.addEventListener('change',()=>{
      appearance=saveAppearance({...appearance,[type]:select.value});
      applyAppearance();
    });
  }
  $('appearance-button').addEventListener('click',()=>{$('appearance-dialog').showModal();});
  $('appearance-close').addEventListener('click',()=>{$('appearance-dialog').close();});
  $('appearance-reset').addEventListener('click',()=>{
    appearance=saveAppearance(DEFAULT_APPEARANCE);
    applyAppearance();
  });
  applyAppearance();
}

$('rules-button').addEventListener('click',()=>{$('rules').showModal();});
$('rules-close').addEventListener('click',()=>{$('rules').close();});
prepareAppearanceUI();
if(online){void initOnline();}else if(!recover())newGame();else{render();scheduleAI();}
window.addEventListener('pageshow',()=>{if(game)drawBoard();});
