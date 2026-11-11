import {createGame,exchangeCard,legalActions,takeAction,cancelSeven,botAction,COLORS} from './engine.js';
import {trackPoint,goalPoint,homePoint,TRACK_POINTS,GOAL_POINTS,HOME_POINTS,isStartField,BOARD_LAYOUT_ID} from './board-layout.js';

const $=id=>document.getElementById(id);
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const KEY='spielportal:dog:local-v1';
const params=new URL(location.href).searchParams;
const online=/^(?:\d{3}|[A-HJ-NP-Z2-9]{6})$/.test(params.get('room')||'');
const hubCode=online?params.get('room'):null;
const matchHint=params.get('match');
const editorBack='index.html'+location.search;
document.querySelectorAll('[data-dog-editor]').forEach(link=>link.href='editor.html?return='+encodeURIComponent(editorBack)+'&v=4');
const apiBase=String(window.SPIELPORTAL_CONFIG?.apiBase||'https://serverfinal-ynbe.onrender.com').replace(/\/+$/,'');
let onlineSeat=null,onlineSocket=null,onlineBusy=false,onlinePoll=null,onlineHeartbeat=null,roomRevision=null;
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
 if(room.code!==hubCode)return;
 if(room.phase==='playing'&&room.match?.game==='dog'&&(!matchHint||matchHint===room.match.id)){
   if(game?.revision!==room.match.dog?.revision){selectedCard=null;revealed=false;}
   game=room.match.dog;onlineSeat=room.match.dogSeat;
   roomRevision=room.revision;
   render();
 }else if(game?.phase==='finished'){
   $('status').textContent='Partie beendet – du kannst in der Raum-Lobby ein neues Spiel auswählen.';
 }else $('status').textContent='Das DOG-Spiel ist noch nicht gestartet oder wurde bereits beendet. Kehre zur Raum-Lobby zurück.';
}
async function refreshOnline(){
 try{const room=await hubRequest('');acceptRemote(room);}
 catch(e){$('status').textContent='⚠️ Online: '+e.message;}
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

const names=['Rot','Blau','Grün','Gelb'];
let game,selectedCard=null,available=[],revealed=false,aiTimer=null,lastTurn=null,humans=1;
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
  revealed=false;selectedCard=null;lastTurn=null;
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
  const safeColor=seat=>COLORS[seat]||COLORS[0];
  push('<title>DOG Klassisch – 64 Lauffelder, 4 geschützte Startfelder und 4 Zielbahnen</title>');
  push('<defs>'+
    '<linearGradient id="dog-wood" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#5f422c"/><stop offset=".22" stop-color="#cca471"/><stop offset=".44" stop-color="#6e4930"/><stop offset=".7" stop-color="#a5774e"/><stop offset="1" stop-color="#4c3223"/></linearGradient>'+
    '<radialGradient id="dog-blue" cx=".42" cy=".34" r=".88"><stop stop-color="#194e83"/><stop offset=".56" stop-color="#123963"/><stop offset="1" stop-color="#061c35"/></radialGradient>'+
    '<linearGradient id="dog-hole" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#ffffff"/><stop offset=".52" stop-color="#ecf1f4"/><stop offset="1" stop-color="#b6c4d0"/></linearGradient>'+
    '<linearGradient id="dog-center" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#133c62"/><stop offset="1" stop-color="#071d37"/></linearGradient>'+
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
  push('<rect x="35" y="35" width="690" height="690" rx="25" fill="url(#dog-speckle)"/>');
  push('<rect x="41" y="41" width="678" height="678" rx="20" fill="none" stroke="#7ca9cb" stroke-opacity=".27" stroke-width="1.5"/>');
  // The course makes a single uninterrupted 64-step circuit. Start indices are
  // 0/16/32/48; the correct corner is independent of future cosmetic themes.
  const path=TRACK_POINTS.map((p,i)=>(i===0?'M ':'L ')+coord(p)).join(' ')+' Z';
  push('<path d="'+path+'" fill="none" stroke="#03152a" stroke-width="32" stroke-linejoin="round" stroke-linecap="round" opacity=".52"/>');
  push('<path d="'+path+'" fill="none" stroke="#4b85a9" stroke-width="3" stroke-linejoin="round" stroke-linecap="round" opacity=".55"/>');
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
  // Legal landing rings show the actual result of the selected card.
  const targets=new Set(available.flatMap(m=>[m.pieceId,m.targetId].filter(Number.isInteger)));
  const landings=new Map();
  for(const m of available){
    let p=null;
    if(m.type==='start'){
      const owner=game.pieces[m.pieceId]?.owner;
      if(Number.isInteger(owner))p=boardPoint(owner*16);
    }else if(m.type==='move'||m.type==='seven-step'){
      const target=String(m.to||'').split(':');
      const n=Number(target[1]),owner=game.pieces[m.pieceId]?.owner;
      if(target[0]==='track'&&Number.isInteger(n)&&n>=0&&n<64)p=boardPoint(n);
      if(target[0]==='goal'&&Number.isInteger(owner)&&Number.isInteger(n)&&n>=0&&n<4)p=goalPoint(owner,n);
    }else if(m.type==='swap'){
      const other=game.pieces[m.targetId];
      if(other)p=piecePoint(other);
    }
    if(p)landings.set(coord(p),p);
  }
  for(const p of landings.values()){
    push('<circle class="dog-landing-hint" cx="'+p.x+'" cy="'+p.y+'" r="22.8" fill="#ffe1a1" fill-opacity=".20" stroke="#ffe5ad" stroke-width="3" stroke-dasharray="5 5" pointer-events="none"/>');
  }
  // Pawns on top, always staying attached to their logical position.
  for(const piece of game.pieces){
    const p=piecePoint(piece),color=safeColor(piece.owner),hi=targets.has(piece.id);
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
    return '<div class="seat '+(turn?'on':'')+'" style="--seat:'+COLORS[p.seat]+'"><span class="seat-mark"></span><span class="seat-name">'+escape(p.name)+(p.bot?' 🤖':' 👤')+'</span><b>'+goal+'/4</b><span class="seat-extra">'+(exchange?'✓ Karte getauscht':hand+' Karten')+'</span></div>';
  }).join('');
  $('players').innerHTML=seats;
}
function renderHand(){
  const seat=currentHuman(),title=$('hand-title'),hand=$('hand'),actions=$('moves'),button=$('show-hand');
  actions.innerHTML='';hand.innerHTML='';
  if(game.phase==='finished'){title.textContent='🏆 Partie beendet';button.hidden=true;return;}
  if(seat<0){title.textContent='🤖 Bots spielen';button.hidden=true;return;}
  if(lastTurn!==seat){revealed=false;selectedCard=null;lastTurn=seat;}
  button.hidden=false;button.textContent=revealed?'🙈 Hand verdecken':'🃏 Karten ansehen';
  title.textContent=game.phase==='exchange'?'🔐 '+game.players[seat].name+': Karte an Partner geben':game.phase==='seven'?'🔥 Die 7 verteilen – noch '+(7-game.seven.spent)+' Schritte':'🎯 '+game.players[seat].name+' ist am Zug';
  if(!revealed){hand.innerHTML='<div class="hand-veil">Deine Karten sind verdeckt. Tippe auf „Karten ansehen“.</div>';return;}
  if(game.phase==='seven'){
    available=legalActions(game,seat);
    hand.innerHTML='<div class="hand-veil">Wähle eine Figur und wie viele Schritte sie laufen soll. Alle 7 Schritte müssen verwendet werden.</div>';
    if(!online){const cancel=document.createElement('button');cancel.className='secondary move-button';cancel.textContent='↶ Sieben zurücknehmen';cancel.addEventListener('click',()=>{game=cancelSeven(game,seat);selectedCard=null;save();render();});actions.appendChild(cancel);}
  }else{
    const cards=game.hands[seat];
    const exchange=game.phase==='exchange';
    hand.innerHTML=cards.map((c,i)=>'<button type="button" class="playing-card '+(selectedCard===c.id?'picked ':'')+(c.type==='joker'||['swap','7','4','1/11','13'].includes(c.type)?'special':'')+'" data-card="'+c.id+'"><small>'+(c.type==='joker'?'JOKER':c.type==='swap'?'TAUSCH':'DOG')+'</small><strong>'+cardsLabel(c.type)+'</strong><em>'+(exchange?'weitergeben':(c.type==='7'?'7 teilen':c.type==='swap'?'Tauschen':'Spielen'))+'</em></button>').join('');
    available=exchange?[]:selectedCard!==null?legalActions(game,seat).filter(m=>m.cardId===selectedCard):[];
    if(exchange&&selectedCard!==null){
      available=[{type:'exchange',cardId:selectedCard}];
    }
  }
  if(game.phase==='seven')available=legalActions(game,seat);
  if(available.length>0){
    const unique=available.slice(0,170);
    actions.insertAdjacentHTML('beforeend',unique.map((m,i)=>'<button type="button" class="move-button" data-move="'+i+'">'+escape(actionLabel(m))+'</button>').join(''));
    $('move-help').textContent='Wähle einen erlaubten Zug. Tipp: Die hervorgehobenen Figuren sind spielbar.';
  }else $('move-help').textContent=game.phase==='exchange'?'Wähle eine Karte, die du verdeckt deinem Partner geben möchtest.':'Wähle zuerst eine Karte aus deiner Hand.';
}
function render(){
  if(!game)return;
  if(!online)$('human-count').value=String(humans);
  $('round').textContent=String(game.round);
  $('phase').textContent=game.phase==='exchange'?'Geheimer Kartentausch':game.phase==='seven'?'7 verteilen':game.phase==='finished'?'Spielende':'Kartenrunde';
  const active=activeSeat();
  $('turn').textContent=game.phase==='finished'?'🏆 Team '+(game.winner===0?'Rot / Grün':'Blau / Gelb')+' gewinnt!':game.phase==='exchange'?'Karten werden getauscht':active>=0?game.players[active].name+' ist dran':'Bots spielen';
  $('history').innerHTML=game.history.map(t=>'<div>'+escape(t)+'</div>').join('');
  renderPlayers();
  available=game.phase==='seven'&&revealed?legalActions(game,game.current):[];
  drawBoard();renderHand();drawBoard();
  $('status').textContent=online?'🌐 Online mit Freunden · Karten serverseitig geschützt · Raum '+hubCode:'Klassische Regeln • Teams Rot/Grün und Blau/Gelb • Spielstand wird lokal gesichert';
  $('winner').hidden=game.phase!=='finished';
  if(game.phase==='finished')$('winner-title').textContent='Team '+(game.winner===0?'Rot / Grün':'Blau / Gelb')+' gewinnt!';
  $('selected-info').textContent=selectedCard?'Karte ausgewählt: '+cardsLabel(game.hands[currentHuman()]?.find(c=>c.id===selectedCard)?.type||''):'';
}
function onCard(id){
  const seat=currentHuman();if(seat<0||!revealed)return;
  selectedCard=selectedCard===id?null:id;
  render();
}
function onMove(i){
  const seat=currentHuman();if(seat<0||!revealed)return;
  const move=available[i];if(!move)return;
  if(online){
    if(onlineBusy)return;
    onlineBusy=true;$('status').textContent='Zug wird vom Server geprüft …';
    hubRequest('/dog/action','POST',{matchId:matchHint||params.get('match')||'',expectedRevision:game.revision,actionId:crypto.randomUUID(),action:move})
      .then(room=>{selectedCard=null;revealed=false;acceptRemote(room);})
      .catch(e=>{$('status').textContent='⚠️ '+e.message;void refreshOnline();})
      .finally(()=>{onlineBusy=false;});
    return;
  }
  try{
    if(game.phase==='exchange')game=exchangeCard(game,seat,move.cardId);
    else game=takeAction(game,seat,move);
    selectedCard=null;revealed=false;lastTurn=null;available=[];save();render();scheduleAI();
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
$('hand').addEventListener('click',e=>{const btn=e.target.closest('[data-card]');if(btn)onCard(Number(btn.dataset.card));});
$('moves').addEventListener('click',e=>{const btn=e.target.closest('[data-move]');if(btn)onMove(Number(btn.dataset.move));});
$('board').addEventListener('click',e=>{
  const node=e.target.closest('[data-piece]');if(!node)return;
  const id=Number(node.dataset.piece),matches=available.filter(a=>a.pieceId===id);
  if(matches.length===1){onMove(available.indexOf(matches[0]));return;}
  if(matches.length>1){$('move-help').textContent='Für diese Figur gibt es '+matches.length+' Möglichkeiten. Wähle unten den passenden Zug.';document.querySelector('#moves')?.scrollIntoView({behavior:'smooth',block:'nearest'});}
});
$('show-hand').addEventListener('click',()=>{revealed=!revealed;render();});
$('new-game').addEventListener('click',()=>{if(confirm('Neue Partie starten? Der aktuelle Spielstand wird ersetzt.'))newGame();});
$('human-count').addEventListener('change',()=>{if(confirm('Spielerzahl ändern und eine neue Partie beginnen?'))newGame();else $('human-count').value=String(humans);});
$('rules-button').addEventListener('click',()=>{$('rules').showModal();});
$('rules-close').addEventListener('click',()=>{$('rules').close();});
if(online){void initOnline();}else if(!recover())newGame();else{render();scheduleAI();}
window.addEventListener('pageshow',()=>{if(game)drawBoard();});
