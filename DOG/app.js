import {refreshVerifiedCosmetics} from './verified-cosmetics.js?v=2';
import {CARD_EDITIONS,CARD_EDITION,isCardEditionUnlocked,loadCardEdition,saveCardEdition,cardBackBackground,cardMarkup,cardVisual} from './card-visuals.js?v=12';
import {enableHandTouchGestures} from './hand-gestures.js?v=2';
import {mountDogEmojiGame,showDogEmoji,showDogEmojiError} from './emoji-game.js?v=4';
import {boardGestureTarget} from './board-gesture-math.js?v=1';
import {snapshotPieces,planPieceMotions,createPieceAnimator} from './piece-animations.js?v=3';
import {loadMotionMode,saveMotionMode,applyMotionMode} from './motion-settings.js?v=1';
import {createDogVisualFeedback} from './ui-animations.js?v=2';
import {summarizeDogVictory} from './victory-summary.js?v=1';
import {CARD_TYPES,createGame,exchangeCard,legalActions,takeAction,cancelSeven,botAction} from './engine.js';
import {decideDogRoomUpdate} from './online-sync.js?v=14';
import {DEFAULT_APPEARANCE,BOARD_STYLES,isBoardUnlocked,BOARD_FRAMES,SIDEBAR_BACKGROUNDS,HUD_TONES,HUD_OPACITY_BLOCKS,normalizeHudOpacity,hudOpacityColor,PIECE_STYLES,PIECE_SHAPES,isPieceShapeUnlocked,CARD_STYLES,PUBLISHED_CARD_STYLE_IDS,loadAppearance,saveAppearance,normalizeAppearance,resolveAppearance,validAssetPath,assetBackground} from './appearance-registry.js?v=27';
import {trackPoint,goalPoint,homePoint,TRACK_POINTS,GOAL_POINTS,HOME_POINTS,isStartField,BOARD_LAYOUT_ID} from './board-layout.js?v=11';

const $=id=>document.getElementById(id);
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const KEY='spielportal:dog:local-v1';
const params=new URL(location.href).searchParams;
const online=/^(?:\d{3}|[A-HJ-NP-Z2-9]{6})$/.test(params.get('room')||'');
const hubCode=online?params.get('room'):null;
const matchHint=params.get('match');
const editorBack='index.html'+location.search;
if(online){
 const eventLink=$('dog-christmas-event-link');
 if(eventLink)eventLink.href='christmas-event.html?'+new URLSearchParams({room:hubCode,return:editorBack}).toString();
 const levelLink=$('dog-player-level-link');
 if(levelLink)levelLink.href='christmas-event.html?'+new URLSearchParams({room:hubCode,return:editorBack}).toString()+'#level';
}
document.querySelectorAll('[data-dog-editor]').forEach(link=>link.href='editor.html?return='+encodeURIComponent(editorBack)+'&v=10');
const apiBase=String(window.SPIELPORTAL_CONFIG?.apiBase||'https://serverfinal-ynbe.onrender.com').replace(/\/+$/,'');
let onlineSeat=null,onlineSocket=null,onlineBusy=false,onlinePoll=null,onlineHeartbeat=null,roomRevision=null,acceptedMatchId=null,refreshInFlight=null,onlineDogAvatars=[],onlineChristmas=null,onlineResearch=null,emojiSocketReady=false;
function user(){const s=window.SpielOnline?.state?.();return s?.status==='online'&&s.user?.getIdToken?s.user:null;}
async function hubRequest(path,method='GET',payload){
 const person=user();if(!person)throw Error('Bitte melde dich mit deinem Online-Profil an.');
 const token=await person.getIdToken();
 const response=await fetch(apiBase+'/api/hub/rooms/'+hubCode+path,{method,headers:{Authorization:'Bearer '+token,...(payload?{'Content-Type':'application/json'}:{})},body:payload?JSON.stringify(payload):undefined,cache:'no-store'});
 let body;
 try{body=await response.json();}
 catch{throw Error('Render liefert keine gültigen Spieldaten (HTTP '+response.status+'). Bitte Verbindung prüfen.');}
 if(!response.ok||!body?.ok)throw Error(body?.error||'Server antwortet mit HTTP '+response.status);
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
   if((decision.clearSelection||game?.revision!==decision.game?.revision)&&$('dog-move-choice-dialog')?.open)$('dog-move-choice-dialog').close();
   if(decision.hideHand)revealed=decision.seat!==null;
   if(decision.clearSelection){selectedCard=null;selectedPiece=null;jokerAs=null;$('dog-joker-dialog').close();}
   game=decision.game;onlineSeat=decision.seat;acceptedMatchId=decision.matchId;
   onlineDogAvatars=Array.isArray(room.match?.dogAvatars)?room.match.dogAvatars:[];
   onlineChristmas=room.match?.christmas?.enabled===true?room.match.christmas:null;
   onlineResearch=room.match?.dogResearch||null;
   render();
   if(game?.phase==='finished')window.dispatchEvent(new Event('dog-match-finished'));
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
 const socket=new WebSocket(apiBase.replace(/^http/i,'ws')+'/hub');onlineSocket=socket;emojiSocketReady=false;
 socket.onopen=async()=>{
  try{const token=await user().getIdToken();if(socket.readyState===1)socket.send(JSON.stringify({type:'subscribe',code:hubCode,profileIdToken:token}));}
  catch(_){socket.close();}
  onlineHeartbeat=setInterval(()=>{if(socket.readyState===1)socket.send(JSON.stringify({type:'ping'}));},30000);
 };
 socket.onmessage=e=>{
  let data;try{data=JSON.parse(e.data)}catch(_){return;}
  if(data.type==='room'&&data.room?.code===hubCode){
   emojiSocketReady=true;acceptRemote(data.room);
  }else if(data.type==='dog_emoji'&&data.code===hubCode&&data.matchId===acceptedMatchId){
   showDogEmoji(data);
  }else if(data.type==='dog_emoji_error'){
   showDogEmojiError(data.reason);
  }
 };
 socket.onclose=()=>{emojiSocketReady=false;if(onlineHeartbeat){clearInterval(onlineHeartbeat);onlineHeartbeat=null;}if(onlineSocket===socket)onlineSocket=null;};
 socket.onerror=()=>{};
}
async function initOnline(){
 // stayMatch tells the shared lobby to display the current room without
 // automatically launching the same active match again. It is navigation-only.
 const backParams=new URLSearchParams({room:hubCode,stage:'1',dogLobby:'1'});
 if(matchHint)backParams.set('stayMatch',matchHint);
 $('back-link').href='../hub-lobby.html?'+backParams.toString();
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

// Touch gestures change only the SVG viewBox, never game state or other UI.
const BOARD_SIZE=760,ZOOM_MIN=1,ZOOM_MAX=3;
let boardZoom=1,boardCenter={x:380,y:380},gestureMoved=false,suppressBoardClickUntil=0;
const boardPointers=new Map();
let gestureSnapshot=null;
const boardSvg=$('board');
const pieceAnimator=createPieceAnimator(boardSvg);
const visualFeedback=createDogVisualFeedback(document);
applyMotionMode(loadMotionMode());
let lastBoardKey=null,lastBoardSnapshot=null,lastBoardRevision=null,lastBoardMatch=null,lastMotionDuration=0;
function applyBoardView(){
 const size=BOARD_SIZE/boardZoom,half=size/2;
 boardCenter.x=Math.max(half,Math.min(BOARD_SIZE-half,boardCenter.x));
 boardCenter.y=Math.max(half,Math.min(BOARD_SIZE-half,boardCenter.y));
 boardSvg.setAttribute('viewBox',[boardCenter.x-half,boardCenter.y-half,size,size].join(' '));
 $('dog-zoom-label').textContent=Math.round(boardZoom*100)+' %';
 $('dog-zoom-in').disabled=boardZoom>=ZOOM_MAX;
 $('dog-zoom-out').disabled=boardZoom<=ZOOM_MIN;
}
function setBoardZoom(value){
 boardZoom=Math.max(ZOOM_MIN,Math.min(ZOOM_MAX,value));
 applyBoardView();
}
function boardPixelScale(){
 const rect=boardSvg.getBoundingClientRect();
 // preserveAspectRatio meet: actual drawing is square and centered.
 return Math.min(rect.width,rect.height)/(BOARD_SIZE/boardZoom);
}
function gestureState(){
 const points=[...boardPointers.values()];
 if(!points.length)return null;
 const mid={x:points.reduce((v,p)=>v+p.x,0)/points.length,y:points.reduce((v,p)=>v+p.y,0)/points.length};
 return {mid,distance:points.length>1?Math.hypot(points[0].x-points[1].x,points[0].y-points[1].y):0,zoom:boardZoom,center:{...boardCenter}};
}
function beginGesture(){gestureSnapshot=gestureState();}
boardSvg.addEventListener('pointerdown',event=>{
 if(event.pointerType==='mouse')return;
 boardPointers.set(event.pointerId,{x:event.clientX,y:event.clientY});
 if(boardPointers.size>=2){gestureMoved=true;suppressBoardClickUntil=performance.now()+450;}
 beginGesture();
 try{boardSvg.setPointerCapture(event.pointerId);}catch(_){}
});
boardSvg.addEventListener('pointermove',event=>{
 if(!boardPointers.has(event.pointerId))return;
 const old=boardPointers.get(event.pointerId);
 boardPointers.set(event.pointerId,{x:event.clientX,y:event.clientY});
 if(!gestureSnapshot)return;
 const points=[...boardPointers.values()];
 const mid={x:points.reduce((v,p)=>v+p.x,0)/points.length,y:points.reduce((v,p)=>v+p.y,0)/points.length};
 if(points.length>=2&&gestureSnapshot.distance>0){
  const target=boardGestureTarget(gestureSnapshot,{
   x:mid.x,y:mid.y,
   distance:Math.hypot(points[0].x-points[1].x,points[0].y-points[1].y)
  },boardSvg.getBoundingClientRect(),{boardSize:BOARD_SIZE,minZoom:ZOOM_MIN,maxZoom:ZOOM_MAX});
  boardZoom=target.zoom;boardCenter=target.center;applyBoardView();
  gestureMoved=true;suppressBoardClickUntil=performance.now()+450;
 }else if(boardZoom>1&&points.length===1){
  const delta=Math.hypot(event.clientX-old.x,event.clientY-old.y);
  if(delta>2){
   const scale=boardPixelScale();
   boardCenter.x-=(event.clientX-old.x)/scale;boardCenter.y-=(event.clientY-old.y)/scale;
   applyBoardView();gestureMoved=true;suppressBoardClickUntil=performance.now()+450;
  }
 }
});
function endBoardPointer(event){
 if(!boardPointers.has(event.pointerId))return;
 boardPointers.delete(event.pointerId);
 if(gestureMoved)suppressBoardClickUntil=performance.now()+450;
 if(!boardPointers.size)gestureMoved=false;
 beginGesture();
}
boardSvg.addEventListener('pointerup',endBoardPointer);
boardSvg.addEventListener('pointercancel',endBoardPointer);
boardSvg.addEventListener('lostpointercapture',endBoardPointer);
$('dog-zoom-in').addEventListener('click',()=>setBoardZoom(boardZoom+.25));
$('dog-zoom-out').addEventListener('click',()=>setBoardZoom(boardZoom-.25));
$('dog-zoom-reset').addEventListener('click',()=>{boardCenter={x:380,y:380};setBoardZoom(1);});
boardSvg.addEventListener('wheel',event=>{
 if(!event.ctrlKey&&!event.shiftKey)return;
 event.preventDefault();setBoardZoom(boardZoom+(event.deltaY<0?.15:-.15));
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
  pieceAnimator.cancel();visualFeedback.reset();lastBoardKey=null;lastBoardSnapshot=null;lastBoardRevision=null;lastBoardMatch=null;lastMotionDuration=0;
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
  const snapshot=snapshotPieces(game.pieces);
  const matchIdentity=online?(acceptedMatchId||matchHint||'online'):'local';
  // Repeated room/presence updates and card UI changes must not interrupt an
  // ongoing pawn animation by replacing the entire SVG with identical content.
  const boardKey=JSON.stringify([snapshot,appearance,selectedPiece,game.players?.map(p=>p.name),
    onlineChristmas?.round,onlineChristmas?.roundGiftCollected,onlineChristmas?.roundScratchCollected,
    onlineChristmas?.visibleGiftFields,onlineChristmas?.visibleScratchFields]);
  if(boardKey===lastBoardKey && boardSvg.childElementCount){lastMotionDuration=0;return;}
  const canAnimate=!!lastBoardSnapshot && lastBoardMatch===matchIdentity &&
    Number.isInteger(game.revision) && game.revision===lastBoardRevision+1;
  const motions=canAnimate?planPieceMotions(lastBoardSnapshot,snapshot,{
    track:TRACK_POINTS,goal:GOAL_POINTS,home:HOME_POINTS
  }):[];
  lastBoardKey=boardKey;lastBoardSnapshot=snapshot;
  lastBoardRevision=game.revision;lastBoardMatch=matchIdentity;
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
  // Classic figure gradients remain available beside the optional full-field discs.
  for(let seat=0;seat<4;seat++){
    const color=safeColor(seat);
    push('<linearGradient id="dog-pawn-'+seat+'" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#ffffff" stop-opacity=".68"/><stop offset=".3" stop-color="'+color+'"/><stop offset=".83" stop-color="'+color+'"/><stop offset="1" stop-color="#172431" stop-opacity=".9"/></linearGradient>');
  }
  push('</defs>');
  push('<rect x="8" y="8" width="744" height="744" rx="44" fill="url(#dog-wood)" stroke="#2c1b13" stroke-width="7"/>');
  push('<rect x="27" y="27" width="706" height="706" rx="30" fill="#051323" stroke="#ead4a4" stroke-opacity=".66" stroke-width="2"/>');
  push('<rect x="35" y="35" width="690" height="690" rx="25" fill="url(#dog-blue)"/>');
  // Static background art has no spaces or pawns; the interactive path below
  // always uses the editor's actual track coordinates. Fallback stays visible
  // until the optional premium WebP image has been uploaded to the repository.
  if(validAssetPath(skin.fallbackImage))
    push('<image href="'+skin.fallbackImage+'" x="0" y="0" width="760" height="760" preserveAspectRatio="xMidYMid meet" pointer-events="none"/>');
  if(validAssetPath(skin.image))
    push('<image href="'+skin.image+'" x="0" y="0" width="760" height="760" preserveAspectRatio="xMidYMid meet" pointer-events="none"/>');
  push('<rect x="35" y="35" width="690" height="690" rx="25" fill="url(#dog-speckle)"/>');
  push('<rect x="41" y="41" width="678" height="678" rx="20" fill="none" stroke="'+skin.edge+'" stroke-opacity=".27" stroke-width="1.5"/>');
  // The course makes a single uninterrupted 64-step circuit. Start indices are
  // 0/16/32/48; the correct corner is independent of future cosmetic themes.
  const path=TRACK_POINTS.map((p,i)=>(i===0?'M ':'L ')+coord(p)).join(' ')+' Z';
  push('<path d="'+path+'" fill="none" stroke="#03152a" stroke-width="16" stroke-linejoin="round" stroke-linecap="round" opacity=".44"/>');
  push('<path d="'+path+'" fill="none" stroke="'+skin.route+'" stroke-width="3" stroke-linejoin="round" stroke-linecap="round" opacity=".55"/>');
  // All goal and reserve holes follow the draggable editor coordinates.
  for(let seat=0;seat<4;seat++){
    const c=safeColor(seat),start=boardPoint(seat*16);
    const goal=GOAL_POINTS[seat],home=HOME_POINTS[seat];
    const gps=goal.map(coord).join(' '),hps=home.map(coord).join(' ');
    push('<polyline points="'+gps+'" fill="none" stroke="'+c+'" stroke-opacity=".23" stroke-width="17" stroke-linecap="round" stroke-linejoin="round"/>');
    push('<polyline points="'+hps+'" fill="none" stroke="'+c+'" stroke-opacity=".15" stroke-width="16" stroke-linecap="round" stroke-linejoin="round"/>');
    push('<polyline points="'+gps+'" fill="none" stroke="'+c+'" stroke-opacity=".66" stroke-width="2.5" stroke-linecap="round"/>');
    push('<polyline points="'+hps+'" fill="none" stroke="'+c+'" stroke-opacity=".45" stroke-width="2" stroke-linecap="round"/>');
    // Zielbahn beginnt am farbigen Startfeld, nicht am Ringfeld davor.
    // Der Figuren-Zug muss das Startfeld auf dem Weg zum Ziel überqueren.
    const goalEntry=boardPoint(seat*16);
    push('<path d="M '+coord(goalEntry)+' L '+coord(goal[0])+'" stroke="'+c+'" stroke-width="2.8" stroke-dasharray="6 4" opacity=".76"/>');
    push('<path d="M '+coord(start)+' L '+coord(home[0])+'" stroke="'+c+'" stroke-width="2.1" stroke-dasharray="3 7" opacity=".62"/>');
    for(let j=0;j<4;j++){
      const p=home[j];
      push('<circle cx="'+p.x+'" cy="'+p.y+'" r="17.1" fill="#041629" stroke="'+c+'" stroke-opacity=".7" stroke-width="1.5"/>');
      push('<circle cx="'+p.x+'" cy="'+p.y+'" r="11.7" fill="#164066" opacity=".6"/>');
    }
    // White goal holes with a prominent outline in the owner's player color.
    // Keep the approved coordinates and hit areas unchanged.
    for(let j=0;j<4;j++){
      const p=goal[j];
      push('<circle cx="'+p.x+'" cy="'+(p.y+2.1)+'" r="17.45" fill="#061423" fill-opacity=".78" pointer-events="none"/>');
      push('<circle class="dog-goal-hole" cx="'+p.x+'" cy="'+p.y+'" r="17.1" fill="url(#dog-hole)" stroke="'+c+'" stroke-width="1.9" pointer-events="none"/>');
      push('<circle cx="'+(p.x-4)+'" cy="'+(p.y-5)+'" r="4.4" fill="#ffffff" fill-opacity=".66" pointer-events="none"/>');
    }
    const labelGoal=goal[2],labelHome=home[2];
    push('<text x="'+labelGoal.x+'" y="'+(labelGoal.y+28)+'" text-anchor="middle" fill="'+c+'" font-size="10" font-weight="850" letter-spacing=".8">ZIEL</text>');
    push('<text x="'+labelHome.x+'" y="'+(labelHome.y+28)+'" text-anchor="middle" fill="'+c+'" font-size="10" font-weight="850" letter-spacing=".8">START</text>');
  }
  // Shared transparent DOG crest. This artwork is purely decorative and
  // never changes the approved track/goal/home coordinates or game rules.
  push('<image href="./Bilder/Wappen/dog-wappen.png" x="283" y="283" width="194" height="194" preserveAspectRatio="xMidYMid meet" pointer-events="none"/>');
  // Carved white holes, exactly sixty unprotected plus four tinted starts.
  for(let i=0;i<64;i++){
    const {x,y}=boardPoint(i),start=isStartField(i),seat=i/16|0;
    const c=safeColor(seat);
    push('<circle cx="'+x+'" cy="'+(y+2.1)+'" r="17.3" fill="#020f22" opacity=".66"/>');
    push('<circle cx="'+x+'" cy="'+y+'" r="'+(start?17.3:17.1)+'" fill="'+(start?c:'url(#dog-hole)')+'" stroke="'+(start?'#f5e1b7':'#143c58')+'" stroke-width="'+(start?1.7:1.3)+'"/>');
    push('<circle cx="'+(x-4)+'" cy="'+(y-5)+'" r="'+(start?5.5:4.4)+'" fill="#ffffff" opacity="'+(start?'.30':'.62')+'"/>');
    if(start){
      push('<circle cx="'+x+'" cy="'+y+'" r="10.4" fill="#07172b" fill-opacity=".18"/>');
      push('<path d="M '+(x-4)+' '+(y-7)+' L '+(x+5)+' '+y+' L '+(x-4)+' '+(y+7)+' Z" fill="#ffffff" opacity=".88"/>');
    }
  }
  // 🎄 Temporary Christmas test view: server-provided unclaimed fields.
  // The markers are decorative; all rewards are verified on Render.
  if(onlineChristmas?.enabled){
    const marks=[
      ...(Array.isArray(onlineChristmas.visibleGiftFields)?
        onlineChristmas.visibleGiftFields.map(field=>({field,icon:'⭐',color:'#725409',ring:'#ffe69d'})):[]),
      ...(Array.isArray(onlineChristmas.visibleScratchFields)?
        onlineChristmas.visibleScratchFields.map(field=>({field,icon:'🎟️',color:'#175284',ring:'#b4ecff'})):[])
    ];
    const painted=new Set();
    for(const {field,icon,color,ring} of marks){
      if(!Number.isInteger(field)||field<0||field>=64||field%16===0||painted.has(field))continue;
      painted.add(field);
      const {x,y}=boardPoint(field);
      push('<g class="dog-christmas-reveal-marker" pointer-events="none">'+
        '<circle cx="'+x+'" cy="'+y+'" r="15.2" fill="'+color+'" fill-opacity=".96" stroke="'+ring+'" stroke-width="2.2"/>'+
        '<text x="'+x+'" y="'+(y+5.8)+'" text-anchor="middle" font-size="17.5" font-weight="800" fill="#fff">'+icon+'</text>'+
      '</g>');
    }
  }
  // No action hint or reward is generated by this visual overlay.
  // No move hints: destinations must be calculated by the player.
  // Full-field, solid-color DOG counters. The board holes have radii
  // 17.1–17.3 SVG units; each piece fills its reserve, track or goal field.
  for(const piece of game.pieces){
    const p=piecePoint(piece),color=safeColor(piece.owner),hi=selectedPiece===piece.id;
    if(!p)continue;
    if(hi)push('<circle class="dog-move-halo" cx="'+p.x+'" cy="'+p.y+'" r="28" fill="'+color+'" fill-opacity=".5" filter="url(#dog-halo)" pointer-events="none"/>');
    push('<g data-piece="'+piece.id+'" class="dog-pawn '+(hi?'can-pick dog-pawn-selected':'')+'" aria-label="Figur '+(piece.id%4+1)+' '+(game.players[piece.owner]?.name||'')+'">');
    if(look.pieceShape==='solid'){
      // New option: opaque color disc covers the underlying white field.
      push('<circle cx="'+p.x+'" cy="'+p.y+'" r="17.3" fill="'+color+'" stroke="'+(hi?'#fffaf0':'#112536')+'" stroke-width="'+(hi?'2.4':'1.1')+'" filter="url(#dog-pawn-shadow)"/>');
      push('<circle cx="'+p.x+'" cy="'+p.y+'" r="14.7" fill="none" stroke="#ffffff" stroke-opacity=".26" stroke-width=".9" pointer-events="none"/>');
      push('<path d="M '+(p.x-10)+' '+(p.y-6)+' Q '+(p.x-3)+' '+(p.y-13)+' '+(p.x+5)+' '+(p.y-10)+'" fill="none" stroke="#ffffff" stroke-opacity=".30" stroke-width="1.8" stroke-linecap="round" pointer-events="none"/>');
    }else{
      // Original DOG pawn design, restored as the default.
      push('<ellipse cx="'+p.x+'" cy="'+(p.y+10)+'" rx="14.6" ry="6.8" fill="#020b15" opacity=".63"/>');
      push('<path d="M '+(p.x-10)+' '+(p.y+5)+' Q '+(p.x-11)+' '+(p.y-3)+' '+(p.x-5)+' '+(p.y-7)+' Q '+p.x+' '+(p.y-13)+' '+(p.x+5)+' '+(p.y-7)+' Q '+(p.x+11)+' '+(p.y-3)+' '+(p.x+10)+' '+(p.y+5)+' Q '+p.x+' '+(p.y+14)+' '+(p.x-10)+' '+(p.y+5)+' Z" fill="url(#dog-pawn-'+piece.owner+')" stroke="'+(hi?'#ffffff':'#061b2c')+'" stroke-width="'+(hi?'3':'1.5')+'" filter="url(#dog-pawn-shadow)"/>');
      push('<circle cx="'+p.x+'" cy="'+(p.y-7)+'" r="9.1" fill="url(#dog-pawn-'+piece.owner+')" stroke="#ffffff" stroke-opacity=".42" stroke-width="1.4"/>');
      push('<circle cx="'+(p.x-2.8)+'" cy="'+(p.y-10.8)+'" r="2.3" fill="#fff" opacity=".68"/>');
    }
    // Preserve a generous transparent touch target for mobile/desktop.
    push('<circle cx="'+p.x+'" cy="'+p.y+'" r="18.3" fill="transparent"/>');
    push('</g>');
  }
  boardSvg.innerHTML=board.join('');
  lastMotionDuration=pieceAnimator.play(motions,palette);
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
// Active-seat emblems are separate from avatars and from player colors.
// Future reward unlocks can provide an emblem id through DOG_ACTIVE_EMBLEM_BY_SEAT.
// The crown is the default; this registry alone does not unlock rewards.
const DOG_ACTIVE_EMBLEMS=Object.freeze({
 crown:'👑',dragon:'🐉',phoenix:'🔥',diamond:'💎',lion:'🦁',
 star:'🌟',knight:'🛡️',moon:'🌙',trophy:'🏆',wolf:'🐺',wings:'🪽'
});
function dogActiveEmblem(seat){
 const id=window.DOG_ACTIVE_EMBLEM_BY_SEAT?.[seat]||'crown';
 return DOG_ACTIVE_EMBLEMS[id]||DOG_ACTIVE_EMBLEMS.crown;
}
function renderPlayers(){
  const seats=game.players.map(p=>{
    const own=game.pieces.filter(x=>x.owner===p.seat),goal=own.filter(x=>x.place==='goal').length,turn=activeSeat()===p.seat&&game.phase!=='finished';
    const hand=Array.isArray(game.hands[p.seat])?game.hands[p.seat].length:(game.hands[p.seat]?.count||0),exchange=game.phase==='exchange'&&game.exchanges[p.seat]!==null&&game.exchanges[p.seat]!==false;
    const avatarId=online?onlineDogAvatars[p.seat]:window.DogAvatars?.localAvatar?.(p.seat);
    const portrait=p.bot?'<span class="dog-seat-avatar is-bot" aria-label="Computergegner">🤖</span>':'<span class="dog-seat-avatar" role="img" aria-label="Profilbild von '+escape(p.name)+'" style="'+(window.DogAvatars?.css?.(avatarId)||'')+'"></span>';
    const detail=exchange?'✓ Karte getauscht':hand+' Karten';
    const activeEmblem=turn?'<span class="dog-active-emblem" aria-label="Aktiver Spieler">'+dogActiveEmblem(p.seat)+'</span>':'';
    return '<div class="seat '+(turn?'on':'')+'" style="--seat:'+displayColors()[p.seat]+'">'+activeEmblem+portrait+'<span class="dog-seat-info"><span class="seat-name">'+escape(p.name)+'</span><span class="seat-extra'+(exchange?' is-done':'')+'">'+detail+'</span></span><b class="dog-seat-score">'+goal+'/4</b></div>';
  }).join('');
  const host=$('players');
  if(host._dogMarkup!==seats){host.innerHTML=seats;host._dogMarkup=seats;}
}
function renderHand(){
  const seat=currentHuman(),title=$('hand-title'),hand=$('hand'),actions=$('moves'),button=$('show-hand');
  actions.innerHTML='';
  const setHandMarkup=markup=>{if(hand._dogMarkup!==markup){hand.innerHTML=markup;hand._dogMarkup=markup;}};
  // Card count controls the physical hand-card size; never affects saved or online game state.
  const shownSeat=seat>=0?seat:(online&&onlineSeat!==null?onlineSeat:-1);
  const shownCards=shownSeat>=0?game.hands?.[shownSeat]:null;
  hand.dataset.cardCount=Array.isArray(shownCards)?String(shownCards.length):'0';
  if(game.phase==='finished'){title.textContent='🏆 Partie beendet';button.hidden=true;setHandMarkup('');return;}
  if(seat<0){title.textContent=online&&onlineSeat!==null?'🃏 Deine Handkarten':'🤖 Bots spielen';button.hidden=true;setHandMarkup(online&&onlineSeat!==null&&Array.isArray(game.hands[onlineSeat])?game.hands[onlineSeat].map(c=>cardMarkup(c.type,{tag:'div'})).join(''):'');available=[];return;}
  if(lastTurn!==seat){revealed=online||humans===1;selectedCard=null;selectedPiece=null;jokerAs=null;lastTurn=seat;}
  button.hidden=online||humans===1;button.textContent=revealed?'🙈 Hand verdecken':'🃏 Karten ansehen';
  title.textContent=game.phase==='exchange'?'🔐 '+game.players[seat].name+': Karte an Partner geben':game.phase==='seven'?'🔥 Die 7 verteilen – noch '+(7-game.seven.spent)+' Schritte':'🎯 '+game.players[seat].name+' ist am Zug';
  if(!revealed){const symbol=escape(currentLook().cards.emblem);
    setHandMarkup('<div class="hand-veil"><div class="dog-card-backs" aria-hidden="true"><span class="dog-card-back">'+symbol+'</span><span class="dog-card-back">'+symbol+'</span><span class="dog-card-back">'+symbol+'</span></div><span>Deine Karten sind verdeckt. Tippe auf „Karten ansehen“.</span></div>');return;}
  if(game.phase==='seven'){
    available=legalActions(game,seat);
    setHandMarkup(game.hands[seat].map(c=>cardMarkup(c.type,{tag:'div',selected:c.id===game.seven.cardId,footer:c.id===game.seven.cardId?'Noch '+(7-game.seven.spent)+' Schritte':null})).join(''));
    if(!online){const cancel=document.createElement('button');cancel.className='secondary move-button';cancel.textContent='↶ Sieben zurücknehmen';cancel.addEventListener('click',()=>{game=cancelSeven(game,seat);selectedCard=null;selectedPiece=null;save();render();});actions.appendChild(cancel);}
  }else{
    const cards=game.hands[seat];
    const exchange=game.phase==='exchange';
    setHandMarkup(cards.map(c=>cardMarkup(c.type,{selected:selectedCard===c.id,attrs:'type="button" data-card="'+c.id+'"',footer:exchange?'WEITERGEBEN':null})).join(''));
    available=exchange?[]:selectedCard!==null?legalActions(game,seat).filter(m=>m.cardId===selectedCard&&(jokerAs===null||m.as===jokerAs)):[];
    if(exchange&&selectedCard!==null){
      available=[{type:'exchange',cardId:selectedCard}];
    }
  }
  if(game.phase==='seven')available=legalActions(game,seat);
  if(online&&onlineResearch?.card_swap>0&&game.phase==='exchange'&&!onlineResearch.usedSwap&&selectedCard!==null){
    actions.insertAdjacentHTML('beforeend','<button type="button" class="move-button dog-hand-action-primary" data-research-action="research-swap">🃏 Magischer Kartentausch · ausgewählte Karte ersetzen (1×)</button>');
  }
  const special=available.filter(m=>['exchange','seven','emptySwap'].includes(m.type));
  actions.insertAdjacentHTML('beforeend',[...new Map(special.map(m=>[m.type,m])).values()].map(m=>'<button type="button" class="move-button dog-hand-action-primary" data-special="'+m.type+'">'+(m.type==='exchange'?'🎁 Karte weitergeben':m.type==='seven'?'🔥 7 Schritte verteilen':'🗑 Tauschkarte ablegen')+'</button>').join(''));
  // The rules engine automatically discards the complete hand when no legal
  // action exists. Do not offer a manual discard while a legal move is possible.
  if(game.phase==='play' && !legalActions(game,seat).length){
    actions.insertAdjacentHTML('beforeend','<span class="dog-no-move-note" role="status">🗑 Kein Zug möglich – deine Karten werden automatisch abgelegt.</span>');
  }
  $('move-help').textContent=jokerAs!==null?'Joker als '+(jokerAs==='swap'?'Tauschkarte':jokerAs)+' gewählt. Figur und Ziel selbst antippen.':game.phase==='exchange'?'Wähle die Karte für deinen Partner.':game.phase==='seven'?'Figur und Zielfeld selbst wählen. Noch '+(7-game.seven.spent)+' Schritte.':selectedCard===null?'Wähle eine Karte.':'Figur und Zielfeld selbst antippen – ohne Zugvorschläge.';
}
function renderCardPiles(){
 $('dog-deck-art').style.backgroundImage=cardBackBackground();
 const deck=Array.isArray(game.deck)?game.deck:null;
 const discard=Array.isArray(game.discard)?game.discard:null;
 $('dog-deck-count').textContent=deck?deck.length+' Karten':'Verdeckt';
 $('dog-discard-count').textContent=discard?discard.length+' Karten':'Verdeckt';
 // The pile represents the latest played card across ALL players, not
 // the viewer's own cards. Never infer it from another player's hidden hand.
 const last=game.lastPlayedCard||discard?.at(-1)||null;
 const discardArt=$('dog-discard-art');
 const artwork=last?cardVisual(last.type):null;
 const art=artwork?.image||null;
 discardArt.classList.toggle('has-card',!!art);
 discardArt.style.backgroundImage=art?'url("'+art+'")'+(artwork.fallbackImage?',url("'+artwork.fallbackImage+'")':''):'';
 discardArt.textContent=art?'':last?cardsLabel(last.type):'—';
 discardArt.title=last?'Zuletzt gespielt: '+last.type+(Number.isInteger(last.seat)?' · '+(game.players?.[last.seat]?.name||'Spieler'):''):'Noch keine Karte gespielt';
}
// The ceremony is a client-only projection of the final DOG game result.
let victoryShownKey=null,victorySummaryKey=null;
const victoryDialog=$('winner');
function closeVictoryCeremony(){
 if(victoryDialog.open && typeof victoryDialog.close==='function')victoryDialog.close();
 else victoryDialog.removeAttribute('open');
}
function openVictoryCeremony(){
 victoryDialog.hidden=false;
 if(victoryDialog.open)return;
 try{
  if(typeof victoryDialog.showModal==='function')victoryDialog.showModal();
  else victoryDialog.setAttribute('open','');
 }catch(error){console.warn('DOG Siegerehrung konnte nicht geöffnet werden',error);}
}
function updateVictoryCeremony(){
 const result=summarizeDogVictory(game);
 const finished=!!result;
 $('dog-victory-mini').hidden=!finished;
 if(!finished){
  if(victoryDialog.open)closeVictoryCeremony();
  victoryDialog.hidden=true;victoryShownKey=null;victorySummaryKey=null;
  return;
 }
 const victor=result.winner;
 const key=(online?(acceptedMatchId||matchHint||hubCode):'local')+'|'+game.round+'|'+victor;
 const summary=JSON.stringify([key,result.teams,result.players,appearance.pieces]);
 if(victorySummaryKey!==summary){
  victorySummaryKey=summary;
  $('winner-title').textContent='Team '+result.teams[0].name+' gewinnt!';
  $('winner-subtitle').textContent='Alle acht Figuren des Siegerteams sind im Ziel. Gemeinsam geschafft!';
  $('dog-victory-teams').innerHTML=result.teams.map((team,index)=>
    '<div class="dog-victory-team '+(team.winning?'is-winner':'')+'">'+
      '<span class="dog-victory-team-place">'+(team.winning?'✦ SIEGERTEAM':'GEGNERTEAM')+'</span>'+
      '<strong>'+team.name+'</strong>'+
      '<span class="dog-victory-team-score">'+team.total+'<small> / 8 Figuren</small></span>'+
    '</div>').join('');
  const colors=displayColors();
  $('dog-victory-players').innerHTML=result.players.map(player=>
    '<div class="dog-victory-player '+(player.winning?'is-winning-player':'')+'" style="--dog-victory-color:'+colors[player.seat]+'">'+
      '<span class="dog-victory-player-marker" aria-hidden="true"></span>'+
      '<span class="dog-victory-player-name">'+escape(player.name)+(player.bot?' <small>BOT</small>':'')+'</span>'+
      '<span class="dog-victory-player-score">'+player.goalCount+' <small>/ 4</small></span>'+
    '</div>').join('');
  $('dog-victory-new').hidden=online;
  $('dog-victory-lobby').href=$('back-link').href;
 }
 victoryDialog.hidden=false;
 if(victoryShownKey!==key){
  victoryShownKey=key;
  openVictoryCeremony();
 }
}
$('dog-victory-show').addEventListener('click',openVictoryCeremony);
$('dog-victory-close').addEventListener('click',closeVictoryCeremony);
$('dog-victory-new').addEventListener('click',()=>{closeVictoryCeremony();$('new-game').click();});

function render(){
  if(!game)return;
  renderCardPiles();
  if(!online)$('human-count').value=String(humans);
  $('round').textContent=String(game.round);
  $('phase').textContent=game.phase==='exchange'?'Geheimer Kartentausch':game.phase==='seven'?'7 verteilen':game.phase==='finished'?'Spielende':'Kartenrunde';
  const active=activeSeat();
  $('turn').textContent=game.phase==='finished'?'🏆 Team '+(game.winner===0?'Rot / Grün':'Blau / Gelb')+' gewinnt!':game.phase==='exchange'?'Karten werden getauscht':active>=0?game.players[active].name+' ist dran':'Bots spielen';
  // This is view-only. Write the live labels only on actual changes, so
  // duplicate room updates neither retrigger motion nor repeat ARIA messages.
  const royalRound=$('dog-premium-round'),royalPhase=$('dog-premium-phase'),royalNow=$('dog-premium-now');
  const roundLabel='Runde '+game.round,phaseLabel=$('phase').textContent,turnLabel=$('turn').textContent;
  if(royalRound.textContent!==roundLabel)royalRound.textContent=roundLabel;
  if(royalPhase.textContent!==phaseLabel)royalPhase.textContent=phaseLabel;
  if(royalNow.textContent!==turnLabel){
    royalNow.textContent=turnLabel;
    royalNow.classList.remove('dog-royal-turn-change');
    void royalNow.offsetWidth;
    royalNow.classList.add('dog-royal-turn-change');
  }
  $('history').innerHTML=game.history.map(t=>'<div>'+escape(t)+'</div>').join('');
  renderPlayers();
  available=[];
  renderHand();drawBoard();
  const latestEvent=onlineChristmas?.activity?.at(-1);
  const myScratch=latestEvent?.type==='scratch'&&latestEvent.seat===onlineSeat?
   ' · 🎟️ '+({simple:'Einfaches',medium:'Mittleres',premium:'Premium-'}[latestEvent.tier]||'')+
     ' Rubbellos gefunden! Im Weihnachtsevent einlösen.':'';
  $('status').textContent=online?'🌐 Online mit Freunden · Raum '+hubCode+(onlineChristmas?
    ' · 🎄 '+(onlineChristmas.roundGiftCollected||0)+'/'+(onlineChristmas.giftFieldCount||0)+' Lichtfelder gesammelt' +
    ' · 🎟️ '+(onlineChristmas.roundScratchCollected||0)+'/'+(onlineChristmas.scratchFieldCount??8)+' Rubbellos-Felder gesammelt' +
    ' · '+(onlineChristmas.earnedTenths/10).toLocaleString('de-DE')+' ⭐ gesammelt'+myScratch:
    ' · Klassischer DOG-Modus'):
    'Klassische Regeln • Teams Rot/Grün und Blau/Gelb • Spielstand wird lokal gesichert';
  updateVictoryCeremony();
  visualFeedback.sync({game,matchKey:online?(acceptedMatchId||matchHint||'online'):'local',seat:online?onlineSeat:currentHuman(),handVisible:revealed,activeSeat:active});
  $('selected-info').textContent=selectedCard?'Karte ausgewählt: '+cardsLabel(game.hands[currentHuman()]?.find(c=>c.id===selectedCard)?.type||''):'';
}
function onCard(id){
  const seat=currentHuman();if(seat<0||!revealed)return;
  selectedCard=selectedCard===id?null:id;selectedPiece=null;jokerAs=null;
  if(selectedCard!==null&&game.phase==='play'&&game.hands[seat].some(c=>c.id===selectedCard&&c.type==='joker'))openJokerDialog(seat);
  render();
}
function onResearchAction(type){
  if(!online||onlineBusy||!game||!onlineResearch)return;
  const action=type==='research-swap'?{type,cardId:selectedCard}:{type};
  if(type==='research-swap'&&(!Number.isInteger(selectedCard)||game.phase!=='exchange'))return;
  const seat=currentHuman();
  if(seat<0)return;
  onlineBusy=true;visualFeedback.pending(true);
  $('status').textContent=type==='research-swap'?'🃏 Magischer Kartentausch wird ausgeführt …':'🔮 Deine nächste Karte wird untersucht …';
  hubRequest('/dog/action','POST',{
    matchId:acceptedMatchId||matchHint||'',expectedRevision:game.revision,
    actionId:crypto.randomUUID(),action
  }).then(room=>{selectedCard=null;acceptRemote(room);})
    .catch(e=>{$('status').textContent='⚠️ '+e.message;void refreshOnline();})
    .finally(()=>{onlineBusy=false;visualFeedback.pending(false);});
}
function onMove(i){
  const seat=currentHuman();if(seat<0||!revealed)return;
  const move=available[i];if(!move)return;
  if(online){
    if(onlineBusy)return;
    onlineBusy=true;visualFeedback.pending(true);$('status').textContent='Zug wird vom Server geprüft …';
    hubRequest('/dog/action','POST',{matchId:acceptedMatchId||matchHint||'',expectedRevision:game.revision,actionId:crypto.randomUUID(),action:move})
      .then(room=>{acceptRemote(room);})
      .catch(e=>{visualFeedback.invalid();$('status').textContent='⚠️ '+e.message;void refreshOnline();})
      .finally(()=>{onlineBusy=false;visualFeedback.pending(false);});
    return;
  }
  try{
    if(game.phase==='exchange')game=exchangeCard(game,seat,move.cardId);
    else game=takeAction(game,seat,move);
    selectedCard=null;selectedPiece=null;jokerAs=null;revealed=humans===1;lastTurn=null;available=[];save();render();scheduleAI();
  }catch(e){visualFeedback.invalid();$('status').textContent='⚠️ '+e.message;}
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
    },Math.max(320,lastMotionDuration+240));
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
// Resolve ambiguous legal routes with an accessible in-game dialog instead
// of a browser prompt. The authoritative engine still checks each action.
const moveChoiceDialog=$('dog-move-choice-dialog');
const moveChoiceOptions=$('dog-move-choice-options');
function chooseDogMove(choices,description){
 if(!choices.length||moveChoiceDialog.open)return;
 $('dog-move-choice-description').textContent=description;
 moveChoiceOptions.replaceChildren(...choices.map(({m,i},choice)=>{
  const button=document.createElement('button');
  button.type='button';button.className='dog-move-choice-button';
  const cardType=m.as==='swap'?'Tauschkarte':m.as==='1/11'?'1 oder 11':m.as||'Karte';
  const route=m.type==='swap'?'Figuren tauschen':m.type==='start'?'Figur starten':m.steps!=null?m.steps+' Felder ziehen':'Figur ziehen';
  button.textContent=(choice+1)+'. '+cardType+' · '+route+(m.viaGoal?' · ins Ziel':'');
  button.addEventListener('click',()=>{
   moveChoiceDialog.close();
   // A new server snapshot must not turn this older choice into a different move.
   if(onlineBusy||available[i]!==m){
    $('status').textContent='Der Spielstand hat sich geändert. Bitte wähle den Zug erneut.';
    return;
   }
   onMove(i);
  });
  return button;
 }));
 moveChoiceDialog.showModal();
}
$('dog-move-choice-cancel').addEventListener('click',()=>moveChoiceDialog.close());
enableHandTouchGestures($('hand'),{status:$('dog-hand-zoom-status')});
$('hand').addEventListener('click',e=>{const btn=e.target.closest('[data-card]');if(btn)onCard(Number(btn.dataset.card));});
$('moves').addEventListener('click',e=>{const research=e.target.closest('[data-research-action]');if(research){onResearchAction(research.dataset.researchAction);return;}const btn=e.target.closest('[data-special]');if(!btn)return;const index=available.findIndex(m=>m.type===btn.dataset.special&&(jokerAs===null||m.as===jokerAs));if(index>=0)onMove(index);});
$('board').addEventListener('click',e=>{
 if(performance.now()<suppressBoardClickUntil)return;
 if(pieceAnimator.isActive()){$('status').textContent='🐾 Die Figuren bewegen sich noch. Danach kannst du ziehen.';return;}
 if(!revealed||currentHuman()<0||onlineBusy)return;
 const node=e.target.closest('[data-piece]');
 if(node&&selectedPiece===null){if(!available.some(m=>m.pieceId===Number(node.dataset.piece))){visualFeedback.invalid();return;}selectedPiece=Number(node.dataset.piece);drawBoard();$('move-help').textContent='Wähle das Zielfeld selbst.';return;}
 if(node&&Number(node.dataset.piece)===selectedPiece){selectedPiece=null;drawBoard();$('move-help').textContent='Figur abgewählt.';return;}
 // A target pawn must be resolved before allowing a different source pawn.
 // Otherwise clicking an opponent (or another selectable pawn) can silently
 // change the selection instead of performing a legal swap.
 if(node&&selectedPiece!==null){
  const targetId=Number(node.dataset.piece);
  const swapChoices=available.map((m,i)=>({m,i})).filter(({m})=>m.type==='swap'&&m.pieceId===selectedPiece&&m.targetId===targetId);
  if(swapChoices.length===1){onMove(swapChoices[0].i);return;}
  if(swapChoices.length>1){
   chooseDogMove(swapChoices,'Wähle aus, wie du die beiden Figuren tauschen möchtest.');
   return;
  }
 }
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
  chooseDogMove(matches,'Mehrere erlaubte Wege führen auf dieses Feld. Wähle die Variante.');
  return;
 }
 selectedPiece=null;drawBoard();visualFeedback.invalid();$('move-help').textContent='Zug nicht erlaubt. Bitte selbst erneut rechnen.';
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
  // Only pre-registered same-origin art is allowed, independent of the board skin.
  const sidebarAsset=look.sidebar?.image;
  const hud=look.hudTone||HUD_TONES.classic;
  const opacity=normalizeHudOpacity(look.selected.hudOpacity);
  for(const key of HUD_OPACITY_BLOCKS){
    const prop='dogHudOpacity'+key.charAt(0).toUpperCase()+key.slice(1);
    document.documentElement.dataset[prop]=opacity[key]===null?'default':'custom';
  }
  const frame=look.boardFrame||BOARD_FRAMES.classic;
  document.documentElement.dataset.dogBoardFrame=appearance.boardFrame;
  document.documentElement.dataset.dogHudTone=appearance.hudTone;
  document.documentElement.dataset.dogHudLayout=appearance.hudLayout;
  const sidebarWallpaper=validAssetPath(sidebarAsset)
    ?'url("'+new URL(sidebarAsset,import.meta.url).href+'")'
    :'none';
  const variables={
    '--dog-sidebar-wallpaper':sidebarWallpaper,
    '--dog-hud-panel':hud.panel,
    '--dog-hud-seat':hud.seat,
    '--dog-hud-inner':hud.inner,
    '--dog-hud-button':hud.button,
    '--dog-hud-border':hud.border,
    '--dog-hud-accent':hud.accent,
    '--dog-hud-text':hud.text,
    '--dog-hud-muted':hud.muted,
    '--dog-hud-players-panel-fill':hudOpacityColor(hud,'panel',opacity.players),
    '--dog-hud-players-seat-fill':hudOpacityColor(hud,'seat',opacity.players),
    '--dog-hud-piles-panel-fill':hudOpacityColor(hud,'panel',opacity.piles),
    '--dog-hud-piles-inner-fill':hudOpacityColor(hud,'inner',opacity.piles),
    '--dog-hud-hand-panel-fill':hudOpacityColor(hud,'panel',opacity.hand),
    '--dog-hud-hand-inner-fill':hudOpacityColor(hud,'inner',opacity.hand),
    '--dog-hud-extras-button-fill':hudOpacityColor(hud,'button',opacity.extras),
    '--dog-page-bg':look.scene?.image&&validAssetPath(look.scene.image)
      ?assetBackground(look.scene.image,look.board.page)
      :look.board.page,
    '--dog-frame-bg':look.board.frame,
    '--dog-outer-frame-line':frame.stroke,
    '--dog-outer-frame-inner':frame.inner,
    '--dog-outer-frame-glow':frame.glow,
    '--dog-outer-frame-glow-size':frame.glowSize,
    '--dog-outer-frame-fill':frame.fill,
    '--dog-outer-frame-radius':frame.radius,
    '--dog-card-face':assetBackground(look.cards.faceImage,look.cards.face),
    '--dog-card-special':assetBackground(look.cards.specialImage,look.cards.special),
    '--dog-card-border':look.cards.border,
    '--dog-card-special-border':look.cards.specialBorder,
    '--dog-card-ink':look.cards.ink,
    '--dog-card-back':assetBackground(look.cards.backImage,look.cards.back)
  };
  for(const [name,value] of Object.entries(variables))
    document.documentElement.style.setProperty(name,value);
  const edition=loadCardEdition();
  const backPreview=$('appearance-preview-back');
  backPreview.textContent='';
  backPreview.style.backgroundImage=cardBackBackground(edition);
  backPreview.style.backgroundPosition='center';
  backPreview.style.backgroundSize='contain';
  backPreview.style.backgroundRepeat='no-repeat';
  $('appearance-preview-face').innerHTML=cardMarkup('7',{tag:'div'});
  $('appearance-card-edition').value=edition;
  for(const field of ['board','boardFrame','sidebar','pieces','pieceShape','cards','hudTone']){
    const select=$('appearance-'+field);
    if(select)select.value=appearance[field];
  }
  document.querySelectorAll('[data-appearance-seat]').forEach(element=>{
    const seat=Number(element.dataset.appearanceSeat);
    if(Number.isInteger(seat)&&seat>=0&&seat<4)element.style.backgroundColor=look.pieces.colors[seat];
  });
  const controls=$('appearance-hud-opacity-controls');
  if(controls){
    controls.querySelectorAll('input[data-hud-opacity]').forEach(input=>{
      const key=input.dataset.hudOpacity,chosen=opacity[key];
      const source=hud[key==='extras'?'button':key==='players'?'panel':'inner'];
      const alpha=/,\s*(0?(?:\.\d+)?|1(?:\.0+)?)\s*\)$/.exec(source)?.[1];
      const value=chosen===null?Math.round(Number(alpha??0.75)*100):chosen;
      input.value=String(value);
      const output=controls.querySelector('[data-hud-opacity-value="'+key+'"]');
      if(output)output.textContent=value+' %'+(chosen===null?' · Standard':'');
    });
  }
  if(game)render();
}
function prepareAppearanceUI(){
  const groups={board:BOARD_STYLES,boardFrame:BOARD_FRAMES,sidebar:SIDEBAR_BACKGROUNDS,hudTone:HUD_TONES,pieces:PIECE_STYLES,pieceShape:PIECE_SHAPES,cards:Object.fromEntries(PUBLISHED_CARD_STYLE_IDS.map(id=>[id,CARD_STYLES[id]]))};
  for(const [type,registry] of Object.entries(groups)){
    const select=$('appearance-'+type);
    select.replaceChildren();
    for(const [id,design] of Object.entries(registry)){
      const option=document.createElement('option');
      const locked=type==='board'?!isBoardUnlocked(id):type==='pieceShape'?!isPieceShapeUnlocked(id):false;
      const lockLabel=type==='pieceShape'?' · 🔒 Spielerlevel '+design.minPlayerLevel:' · 🔒 Weihnachtsevent';
      option.value=id;option.textContent=design.label+(locked?lockLabel:'');
      option.disabled=locked;
      select.appendChild(option);
    }
    select.addEventListener('change',()=>{
      if(type==='board'&&!isBoardUnlocked(select.value)){select.value=appearance.board;return;}
      if(type==='pieceShape'&&!isPieceShapeUnlocked(select.value)){select.value=appearance.pieceShape;return;}
      appearance=saveAppearance({...appearance,[type]:select.value});
      applyAppearance();
    });
  }
  const opacityHost=$('appearance-hud-opacity-controls');
  if(opacityHost){
    const names={players:'👥 Spieleranzeige',piles:'🗂️ Kartenbereich',hand:'🃏 Handkartenbereich',extras:'✨ Extras'};
    for(const key of HUD_OPACITY_BLOCKS){
      const row=document.createElement('div');row.className='dog-hud-opacity-row';
      const head=document.createElement('div');head.className='dog-hud-opacity-head';
      const label=document.createElement('label');const slider=document.createElement('input');
      slider.type='range';slider.min='0';slider.max='100';slider.step='1';slider.id='appearance-hud-opacity-'+key;
      slider.dataset.hudOpacity=key;label.htmlFor=slider.id;label.textContent=names[key];
      const output=document.createElement('output');output.dataset.hudOpacityValue=key;output.htmlFor=slider.id;
      head.append(label,output);row.append(head,slider);opacityHost.append(row);
      slider.addEventListener('input',()=>{
        appearance=saveAppearance({...appearance,hudOpacity:{...appearance.hudOpacity,[key]:Number(slider.value)}});
        applyAppearance();
      });
    }
    $('appearance-hud-opacity-reset')?.addEventListener('click',()=>{
      appearance=saveAppearance({...appearance,hudOpacity:normalizeHudOpacity(null)});
      applyAppearance();
    });
  }
  const motionSelect=$('appearance-motion');
  if(motionSelect){
    motionSelect.value=loadMotionMode();
    motionSelect.addEventListener('change',()=>{
      applyMotionMode(saveMotionMode(motionSelect.value));pieceAnimator.cancel();
    });
  }
  const editionSelect=$('appearance-card-edition');
  editionSelect.replaceChildren();
  for(const [id,entry] of Object.entries(CARD_EDITIONS)){
    const option=document.createElement('option');
    const locked=!isCardEditionUnlocked(id);
    option.value=id;option.textContent=entry.label+(locked?(entry.minPlayerLevel?' · 🔒 Level '+entry.minPlayerLevel:' · 🔒 Weihnachtsevent'):'');
    option.disabled=locked;
    editionSelect.appendChild(option);
  }
  editionSelect.value=loadCardEdition();
  // Authenticated level data arrives asynchronously. Recheck without rebuilding
  // the game or altering any server-side online state.
  window.addEventListener('dog-cosmetics-verified',()=>{
   // Server-verified player XP governs the 3D reward, including account switches.
   appearance=normalizeAppearance(appearance);
   const shapeSelect=$('appearance-pieceShape');
   for(const option of shapeSelect.options){
    const design=PIECE_SHAPES[option.value];
    const locked=!isPieceShapeUnlocked(option.value);
    option.disabled=locked;
    option.textContent=design.label+(locked?' · 🔒 Spielerlevel '+design.minPlayerLevel:'');
   }
   shapeSelect.value=appearance.pieceShape;
   for(const option of editionSelect.options){
    const entry=CARD_EDITIONS[option.value];
    const locked=!isCardEditionUnlocked(option.value);
    option.disabled=locked;
    option.textContent=entry.label+(locked?(entry.minPlayerLevel?' · 🔒 Level '+entry.minPlayerLevel:' · 🔒 Weihnachtsevent'):'');
   }
   editionSelect.value=loadCardEdition();
   applyAppearance();
  });
  editionSelect.addEventListener('change',()=>{
    if(!isCardEditionUnlocked(editionSelect.value)){
      editionSelect.value=loadCardEdition();
      return;
    }
    saveCardEdition(editionSelect.value);
    applyAppearance();
    if(game)render(); // Purely local artwork choice. Never write card edition into online game state.
  });
  $('appearance-button').addEventListener('click',()=>{$('appearance-dialog').showModal();void refreshVerifiedCosmetics({force:true});});
  $('appearance-close').addEventListener('click',()=>{$('appearance-dialog').close();});
  $('appearance-reset').addEventListener('click',()=>{
    appearance=saveAppearance(DEFAULT_APPEARANCE);
    saveCardEdition(CARD_EDITION);
    applyAppearance();
    if(game)render();
  });
  applyAppearance();
}

$('rules-button').addEventListener('click',()=>{$('rules').showModal();});
$('rules-close').addEventListener('click',()=>{$('rules').close();});
prepareAppearanceUI();
mountDogEmojiGame({send:async emojiId=>{
 if(online){
  if(!emojiSocketReady||!onlineSocket||onlineSocket.readyState!==1||!acceptedMatchId||!user())throw Error('NOT_CONNECTED');
  onlineSocket.send(JSON.stringify({type:'dog_emoji',matchId:acceptedMatchId,emojiId}));
 }else{
  const actor=game?.players?.find(p=>!p.bot);
  showDogEmoji({emojiId,senderName:actor?.name||'Spieler',eventId:'local_'+Date.now()});
 }
}});
if(online){void initOnline();}else if(!recover())newGame();else{render();scheduleAI();}
window.addEventListener('pageshow',()=>{if(game)drawBoard();});
