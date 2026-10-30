/* Gemeinsamer Online-Raum · Phase 1 (nur Browser-UI, Firestore bleibt maßgeblich). */
(()=>{
'use strict';
const el=id=>document.getElementById(id);
const config=window.SPIELPORTAL_CONFIG||{};
const API=String(config.apiBase||'https://serverfinal-ynbe.onrender.com').replace(/\/+$/,'');
const GAME={barikade:'Barikade',skyjo:'SKYJO Action',kreuz:'KreuzKunter',business:'Das große Business',partychallenge:'Party Challenge'};
let code=null,room=null,operation=false,poll=null,accountUid=null,pollErrors=0;
let playMode=new URL(location.href).searchParams.get('view')==='local'?'local':'online';
let choosingGame=false,displayGame=null;
const GAME_ICON={barikade:'🎲',skyjo:'🃏',kreuz:'🎯',business:'💼',partychallenge:'🏆'};
const GAME_DESCRIPTIONS={
 barikade:'Das Brettspiel mit Barikaden, Action-Regeln und optionalem Bossmodus.',
 skyjo:'Karten, Joker und spannende Runden. Der Host legt die Regeln fest.',
 kreuz:'Würfeln, Farben ankreuzen und gemeinsam Punkte sammeln.',
 business:'Unternehmen, Aktien und Branchen – mit 10, 20 oder 30 Runden.',
 partychallenge:'Neun Online-Minispiele in einem Raum – inklusive Preisjäger.'
};
function setPlayMode(next){
 playMode=next==='local'?'local':'online';
 el('mode-online').classList.toggle('active',playMode==='online');
 el('mode-local').classList.toggle('active',playMode==='local');
 el('mode-online').setAttribute('aria-pressed',String(playMode==='online'));
 el('mode-local').setAttribute('aria-pressed',String(playMode==='local'));
 el('online-area').classList.toggle('hidden',playMode!=='online');
 el('local-view').classList.toggle('hidden',playMode!=='local');
 if(playMode==='local')notice('');
 render();
}
const stayInMatchId=new URL(location.href).searchParams.get('stayMatch');
let launchedMatchId=null,hubSocket=null,retrySocket=null,streamReady=false,streamLast=0,hubHeartbeat=null,pollInFlight=false,lastRoomPollAt=0;
function stopWatch(){
 streamReady=false;
 if(hubHeartbeat){clearInterval(hubHeartbeat);hubHeartbeat=null;}
 if(retrySocket){clearTimeout(retrySocket);retrySocket=null;}
 if(hubSocket){const old=hubSocket;hubSocket=null;try{old.onclose=null;old.close();}catch(_e){}}
}
function startWatch(){
 if(!code||!room||!activeProfile()||hubSocket)return;
 const subscribedCode=code;
 const socket=new WebSocket(API.replace(/^http/i,'ws')+'/hub');hubSocket=socket;
 const connectTimeout=setTimeout(()=>{if(hubSocket===socket&&socket.readyState===0)socket.close();},15000);
 let lastPong=Date.now();
 socket.onopen=async()=>{
  clearTimeout(connectTimeout);
  try{const token=await logged().user.getIdToken();
    if(hubSocket===socket&&code===subscribedCode&&socket.readyState===1){
      socket.send(JSON.stringify({type:'subscribe',code:subscribedCode,profileIdToken:token}));
      hubHeartbeat=setInterval(()=>{
        if(hubSocket!==socket||socket.readyState!==1)return;
        if(Date.now()-lastPong>95000){socket.close();return;}
        socket.send(JSON.stringify({type:'ping'}));
      },30000);
    }
  }catch(_e){try{socket.close();}catch(_x){}}
 };
 socket.onmessage=event=>{
  let data;try{data=JSON.parse(event.data);}catch(_e){return;}
  if(data?.type==='pong')lastPong=Date.now();
  if(hubSocket===socket&&code===subscribedCode&&data?.type==='room'&&data.room?.code===subscribedCode){lastPong=Date.now();streamReady=true;streamLast=Date.now();acceptRoom(data.room);}
 };
 socket.onclose=()=>{
  clearTimeout(connectTimeout);
  if(hubSocket!==socket)return;
  hubSocket=null;streamReady=false;
  if(hubHeartbeat){clearInterval(hubHeartbeat);hubHeartbeat=null;}
  if(code&&room&&activeProfile()&&code===subscribedCode)retrySocket=setTimeout(()=>{retrySocket=null;if(code===subscribedCode)startWatch();},4500);
 };
 socket.onerror=()=>{}; // close event triggers HTTP fallback and retry
}
async function refreshRoomAfterReconnect(){
 if(!code||!room||!activeProfile()||pollInFlight||operation)return;
 const requestedCode=code;pollInFlight=true;
 try{const result=await request('/rooms/'+encodeURIComponent(requestedCode));if(code!==requestedCode)return;pollErrors=0;acceptRoom(result.room);}
 catch(e){if(code!==requestedCode)return;if(['ROOM_NOT_FOUND','NOT_A_MEMBER'].includes(e.message)){pollStop();room=null;choosingGame=false;displayGame=null;pendingRoomRecovery=requestedCode;render();showError(e);}else if(e.message==='LOGIN_REQUIRED'){pollStop();room=null;choosingGame=false;displayGame=null;pendingRoomRecovery=requestedCode;render();notice('Anmeldung wird erneuert. Dein Raumcode bleibt erhalten.');}else if(++pollErrors===3)showError(e);}
 finally{pollInFlight=false;}
}
window.addEventListener('online',()=>{if(!code||!room)return;if(!hubSocket||hubSocket.readyState>1){stopWatch();startWatch();}void refreshRoomAfterReconnect();});
document.addEventListener('visibilitychange',()=>{if(document.hidden||!code||!room)return;if(!hubSocket||hubSocket.readyState>1){stopWatch();startWatch();}void refreshRoomAfterReconnect();});
function enterKreuz(){
 if(room?.phase!=='playing'||room.match?.game!=='kreuz'||!room.match.participating)return;
 const match=room.match;
 if(!/^K[A-HJ-NP-Z2-9]{9}$/.test(match.gameCode))throw Error('MATCH_CODE_INVALID');
 location.assign('KreuzKunter/kreuzkunter.html?hub='+encodeURIComponent(room.code)+'&match='+encodeURIComponent(match.id)+'&gameCode='+encodeURIComponent(match.gameCode));
}
function enterSkyjo(){
 if(room?.phase!=='playing'||room.match?.game!=='skyjo'||!room.match.participating)return;
 const m=room.match;
 if(!/^S[A-HJ-NP-Z2-9]{9}$/.test(m.gameCode))throw Error('MATCH_CODE_INVALID');
 const q=new URLSearchParams({mode:'online',hub:room.code,match:m.id,room:m.gameCode});
 // Wald is enabled consistently for every participant of a three-player match.
 // The Wald online mode is restricted to exactly three participants.
 const participants=Array.isArray(room.players)?room.players.filter(p=>p.participating).length:0;
 // Hub match payload does not consistently expose playerCount; use room roster.
 // Never silently launch a different board for a Wald-only 3-player session.
 if(participants!==3){
  throw Error('🌲 SKYJO Wald Online benötigt genau 3 aktive Spieler. Aktuell: '+participants+'.');
 }
 q.set('board','wald');
 location.assign('Skyjo/skyjo_action.html?'+q.toString());
}
function enterBusiness(){
 if(room?.phase!=='playing'||room.match?.game!=='business'||!room.match.participating)return;
 const m=room.match;
 if(!/^D[A-HJ-NP-Z2-9]{9}$/.test(m.gameCode))throw Error('MATCH_CODE_INVALID');
 const q=new URLSearchParams({hub:room.code,match:m.id,gameCode:m.gameCode});
 location.assign('Business/business_online.html?'+q.toString());
}
function enterCurrentMatch(){
 if(room?.match?.game==='barikade')return enterBarikade();
 if(room?.match?.game==='kreuz')return enterKreuz();
 if(room?.match?.game==='skyjo')return enterSkyjo();
 if(room?.match?.game==='business')return enterBusiness();
 if(room?.match?.game==='partychallenge')return;
 throw Error('GAME_NOT_CONNECTED');
}
function enterBarikade(){
 if(room?.phase!=='playing'||room.match?.game!=='barikade'||!room.match.participating)return;
 const match=room.match,profile=logged();
 if(!/^B[A-HJ-NP-Z2-9]{9}$/.test(match.gameCode))throw Error('MATCH_CODE_INVALID');
 // Only game connection preferences; the authoritative hub, identities and match live in Firestore.
 localStorage.setItem('barikade_room',match.gameCode);
 localStorage.setItem('barikade_mode',room.host?'host':'client');
 localStorage.setItem('barikade_playerName',profile.profile?.name||'Spieler');
 localStorage.setItem('barikade_nameKey',profile.profile?.name||'Spieler');
 localStorage.setItem('barikade_requested_color_'+match.gameCode,match.myColor);
 const settings=match.settings||{};
 localStorage.setItem('barikade_action_mode',settings.mode==='action'?'action':'classic');
 localStorage.setItem('barikade_boss_mode',settings.bossMode?'boss':'off');
 localStorage.setItem('barikade_joker_count_'+match.gameCode,String(settings.jokerStartCount||3));
 localStorage.setItem('barikade_event_field_count_'+match.gameCode,String(settings.eventFieldCount||8));
 localStorage.setItem('barikade_boss_event_trigger_'+match.gameCode,String(settings.bossEventTrigger??2));
 localStorage.setItem('barikade_board_theme_'+match.gameCode,settings.boardTheme||'wood');
 localStorage.removeItem('barikade_sessionToken');
 location.assign('Barikade/barikade.html?compact=1&hub='+encodeURIComponent(room.code)+'&players='+match.playerCount+'&match='+encodeURIComponent(match.id));
}

const activeProfile=()=>{const p=window.SpielOnline?.state?.();return p?.status==='online'&&p?.profile?.setupComplete!==false&&p?.user?p:null;};
const messages={DATABASE_UNAVAILABLE:'Der Spielserver hat derzeit keine Firestore-Verbindung.',LOGIN_REQUIRED:'Bitte melde dich mit deinem Online-Profil an.',PROFILE_REQUIRED:'Bitte vervollständige dein Spielerprofil.',ROOM_NOT_FOUND:'Der Raum wurde nicht gefunden oder ist abgelaufen.',NOT_A_MEMBER:'Du bist diesem Raum noch nicht beigetreten.',ROOM_FULL:'Der Raum ist bereits voll.',GAME_FULL:'Für dieses Spiel sind schon zu viele Personen im Raum.',TOO_MANY_PLAYERS_FOR_GAME:'Für dieses Spiel sind zu viele Personen im Raum.',HOST_ONLY:'Nur der Host darf das ändern.',GAME_NOT_CONNECTED:'Dieses Spiel ist noch nicht mit der zentralen Lobby verbunden.',PLAYERS_NOT_READY:'Noch sind nicht alle Mitspieler bereit.',GAME_SEATS_FULL:'Für dieses Spiel sind alle Mitspielerplätze belegt. Der Host kann zunächst jemanden auf Zuschauer setzen.',SPECTATOR_CANNOT_READY:'Als Zuschauer musst du dich nicht bereit melden.',ROOM_ALREADY_PLAYING:'Diese Partie hat bereits begonnen.',MATCH_IN_PROGRESS:'Während einer laufenden Partie kannst du den Raum nicht verlassen.',MATCH_NOT_FINISHED:'Die Partie ist noch nicht beendet. Der Server hat noch keinen Sieger festgestellt.',HOST_MUST_PLAY:'Der Host muss bei der Partie mitspielen.',NO_ACTIVE_MATCH:'Es läuft keine Partie.',INVALID_SETTINGS:'Diese Einstellungen sind ungültig.',NO_BARIKADE_SETUP:'Bitte zuerst Barikade auswählen.',NO_SKYJO_SETUP:'Bitte zuerst SKYJO auswählen.',NO_BUSINESS_SETUP:'Bitte zuerst Business auswählen.',COLOR_TAKEN:'Diese Spielfarbe ist bereits vergeben.',COLORS_BY_WHEEL:'Die Spielerfarben werden ausgelost.',SPECTATOR_CANNOT_SELECT_COLOR:'Zuschauer können keine Spielfarbe wählen.'};
function notice(message='',isError=false){el('main-status').textContent=message;el('main-status').classList.toggle('error',!!isError);}
function showError(error){const message=messages[error?.message]||error?.message||'Unbekannter Fehler';notice(message,true);}
function logged(){const p=activeProfile();if(!p)throw Error('LOGIN_REQUIRED');return p;}
async function request(path,method='GET',data){
 const uid=logged().user.uid;
 const token=await logged().user.getIdToken();
 if(logged().user.uid!==uid)throw Error('LOGIN_REQUIRED');
 const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),14000);
 try{
  const response=await fetch(API+'/api/hub'+path,{method,mode:'cors',cache:'no-store',signal:controller.signal,headers:{Authorization:'Bearer '+token,...(data?{'Content-Type':'application/json'}:{})},body:data?JSON.stringify(data):undefined});
  const r=await response.json();if(!response.ok||r.ok!==true)throw Error(r.error||'SERVER_ERROR');return r;
 }finally{clearTimeout(timeout);}
}
function setRoomCode(next){code=next;const u=new URL(location.href);if(code)u.searchParams.set('room',code);else u.searchParams.delete('room');history.replaceState(null,'',u);}
let preisjaegerClockReceivedAt=Date.now();
function acceptRoom(next){
 if(!next||next.code!==code)return false;
 if(room?.code===next.code&&Number.isFinite(Number(next.revision))&&Number.isFinite(Number(room.revision))&&Number(next.revision)<Number(room.revision))return false;
 room=next;preisjaegerClockReceivedAt=Date.now();render();return true;
}
function activateRoom(result){if(!result?.code)return;cancelPendingRecovery();setRoomCode(result.code);acceptRoom(result);}

function pollStop(){if(poll){clearInterval(poll);poll=null;}stopWatch();}
function pollStart(){pollStop();startWatch();poll=setInterval(async()=>{if(!code||operation||pollInFlight||!activeProfile()||document.hidden)return;
 // Keep a periodic authoritative Firestore-backed HTTP reconciliation even while WS is open.
 // A live socket can miss Firestore notifications without being disconnected.
 if(streamReady && hubSocket?.readyState===1 && (Date.now()-streamLast<45000 || Date.now()-lastRoomPollAt<90000))return;
 const requestedCode=code;pollInFlight=true;lastRoomPollAt=Date.now();
 try{const result=await request('/rooms/'+requestedCode);if(code!==requestedCode)return;pollErrors=0;acceptRoom(result.room);}catch(e){if(code!==requestedCode)return;if(['ROOM_NOT_FOUND','NOT_A_MEMBER','LOGIN_REQUIRED'].includes(e.message)){pollStop();room=null;choosingGame=false;displayGame=null;pendingRoomRecovery=requestedCode;render();showError(e);if(e.message==='LOGIN_REQUIRED')notice('Anmeldung unterbrochen. Raumcode '+requestedCode+' bleibt erhalten; Verbindung wird nach Anmeldung wiederhergestellt.');else if(e.message==='NOT_A_MEMBER')notice('Kein Zugriff auf Raum '+requestedCode+'. Raumcode bleibt zur erneuten Anmeldung erhalten.');else notice('Raum '+requestedCode+' wurde nicht gefunden. Der Code bleibt zur Prüfung erhalten.');}else if(++pollErrors===3)showError(e);}finally{pollInFlight=false;}
 },12000);}
function leaveView(){cancelPendingRecovery();pollStop();room=null;choosingGame=false;displayGame=null;setRoomCode(null);render();}

const CHALLENGE_LABELS={'lava-arena':'Lava Arena','maulwurf-arena':'Maulwurf Arena',recheninsel:'Recheninsel',flusssprung:'Flusssprung',zeitgefuehl:'Zeitgefühl','huetchen-challenge':'Hütchen Challenge','snake-arena':'Snake Arena','bomber-strand-arena':'Bomber Strand Arena',preisjaeger:'Preisjäger','eisstock':'Eisstock','fallende-gegenstaende':'Fallende Gegenstände'};
const CHALLENGE_STAGE_CSS=`
#challenge-progress:not(.hidden){position:fixed!important;inset:0!important;z-index:10020!important;margin:0!important;border-radius:0!important;overflow:auto!important;overscroll-behavior:contain;display:flex!important;flex-direction:column;align-items:center;justify-content:center;gap:clamp(6px,1.4vh,16px);padding:clamp(20px,4vh,46px) clamp(18px,5vw,70px)!important;box-sizing:border-box;background:radial-gradient(ellipse at 50% 105%,#d5b575 0%,#b68c55 12%,transparent 38%),radial-gradient(ellipse at 7% 88%,#163f30 0%,#163f30 14%,transparent 31%),radial-gradient(ellipse at 96% 82%,#124f3a 0%,#124f3a 12%,transparent 30%),linear-gradient(180deg,#051b30 0%,#0b4765 45%,#1b8290 75%,#174f56 100%)!important;color:#fff!important;text-shadow:0 2px 12px #001b2e88;box-shadow:none!important}
#challenge-single-actions[hidden],#challenge-single-actions button[hidden]{display:none!important}
#challenge-progress.preisjaeger-playing{justify-content:flex-start!important;gap:clamp(4px,.8vh,10px)!important;padding:clamp(8px,1.6vh,16px)!important;overflow:auto!important}
#challenge-progress.preisjaeger-playing>h2,#challenge-progress.preisjaeger-playing>#challenge-progress-order{display:none!important}
#challenge-progress.preisjaeger-playing>#challenge-clock{font-size:clamp(28px,6vh,54px)!important;line-height:1!important}
#challenge-progress.preisjaeger-playing>#challenge-progress-name{font-size:clamp(15px,2.2vh,22px)!important}
#challenge-progress.preisjaeger-playing>#challenge-progress-status{font-size:clamp(13px,1.9vh,18px)!important}
#challenge-progress.preisjaeger-playing>#challenge-preisjaeger{box-sizing:border-box;padding:clamp(10px,2vh,22px)!important;max-width:min(96vw,780px)!important}
#challenge-progress.preisjaeger-playing>#challenge-preisjaeger #pj-product-photo{max-height:clamp(85px,23vh,230px)!important}
#challenge-progress.preisjaeger-playing>#challenge-preisjaeger #pj-product-icon{margin:0!important;font-size:clamp(35px,7vh,60px)!important}
#challenge-fullscreen-button{position:fixed;right:calc(10px + env(safe-area-inset-right,0px));top:calc(10px + env(safe-area-inset-top,0px));z-index:10100;border:1px solid #ffe6a2;border-radius:12px;background:#10283be8;color:#ffe5a6;padding:8px 13px;font:700 14px system-ui;box-shadow:0 4px 15px #0008;cursor:pointer;touch-action:manipulation}
#challenge-fullscreen-button[hidden]{display:none!important}
/* Zeitgefühl: the original game alone fills the entire stage; no surrounding lobby chrome. */
#challenge-progress.zeitgefuehl-playing:not(.hidden){position:fixed!important;inset:0!important;width:100vw!important;height:100dvh!important;max-width:none!important;display:block!important;margin:0!important;padding:0!important;overflow:hidden!important;border:0!important;border-radius:0!important;background:#061624!important}
#challenge-progress.zeitgefuehl-playing:not(.hidden)>:not(#challenge-original-frame):not(#challenge-fullscreen-button):not(#challenge-single-actions):not(#challenge-next){display:none!important}
#challenge-progress.zeitgefuehl-playing:not(.hidden)>#challenge-single-actions:not([hidden]){position:fixed!important;z-index:10110!important;bottom:calc(12px + env(safe-area-inset-bottom,0px));left:50%;transform:translateX(-50%);display:flex!important;align-items:center;justify-content:center;gap:clamp(8px,1.2vw,18px);width:min(92vw,620px);padding:6px 10px;border-radius:20px;background:#071b2ce8;box-shadow:0 6px 28px #0009}#challenge-progress.zeitgefuehl-playing:not(.hidden)>#challenge-single-actions:not([hidden]) button{flex:1;min-width:0;font-size:clamp(13px,1.8vw,20px)!important;padding:clamp(9px,1.6vh,16px) clamp(8px,1.2vw,20px)!important}
#challenge-progress.zeitgefuehl-playing:not(.hidden)>#challenge-next:not([hidden]){position:fixed!important;z-index:10110!important;bottom:calc(10px + env(safe-area-inset-bottom,0px));left:50%;transform:translateX(-50%);display:block!important}
#challenge-progress.zeitgefuehl-playing:not(.hidden)>#challenge-original-frame{display:block!important;position:absolute!important;inset:0!important;width:100%!important;height:100%!important;max-width:none!important;min-height:0!important;margin:0!important;padding:0!important;border:0!important;border-radius:0!important;overflow:hidden!important;box-shadow:none!important}
#challenge-progress.zeitgefuehl-playing:not(.hidden)>#challenge-fullscreen-button:not([hidden]){display:block;top:auto;bottom:calc(8px + env(safe-area-inset-bottom,0px));right:calc(8px + env(safe-area-inset-right,0px));opacity:.55;font-size:12px;padding:5px 9px}
#challenge-progress.zeitgefuehl-playing{justify-content:flex-start!important;gap:0!important;padding:0!important;overflow:hidden!important}
#challenge-progress.zeitgefuehl-playing::before,#challenge-progress.zeitgefuehl-playing::after{display:none!important}
#challenge-progress.zeitgefuehl-playing>h2,#challenge-progress.zeitgefuehl-playing>#challenge-progress-name,#challenge-progress.zeitgefuehl-playing>#challenge-progress-status,#challenge-progress.zeitgefuehl-playing>#challenge-progress-order,#challenge-progress.zeitgefuehl-playing>#challenge-clock,#challenge-progress.zeitgefuehl-playing>#challenge-time-stop,#challenge-progress.zeitgefuehl-playing>#challenge-time-target{display:none!important}
#challenge-progress.zeitgefuehl-playing>#challenge-original-frame{width:100%!important;max-width:none!important;height:100%!important;min-height:0!important;flex:1!important;border:0!important;border-radius:0!important;box-shadow:none!important}
#challenge-progress.zeitgefuehl-playing>#challenge-results{display:none!important}
/* Recheninsel: dedicated pirate-style fullscreen results instead of the generic lobby ending. */
#challenge-progress.rechen-finale:not(.hidden){position:fixed!important;inset:0!important;width:100vw!important;height:100dvh!important;max-width:none!important;margin:0!important;padding:clamp(12px,2.6vh,30px) clamp(12px,3vw,44px) calc(84px + env(safe-area-inset-bottom,0px))!important;overflow-y:auto!important;display:flex!important;flex-direction:column!important;align-items:center!important;justify-content:flex-start!important;gap:clamp(6px,1.2vh,15px)!important;z-index:10000!important;border:0!important;border-radius:0!important;box-shadow:none!important;background:radial-gradient(ellipse at 50% 110%,#86582a88,transparent 58%),linear-gradient(150deg,#051827ee,#0b3449ed)!important;color:#fff!important}
#challenge-progress.rechen-finale:not(.hidden)>h2,#challenge-progress.rechen-finale:not(.hidden)>#challenge-clock,#challenge-progress.rechen-finale:not(.hidden)>#challenge-progress-status,#challenge-progress.rechen-finale:not(.hidden)>#challenge-progress-order,#challenge-progress.rechen-finale:not(.hidden)>#challenge-progress-name,#challenge-progress.rechen-finale:not(.hidden)>#challenge-time-target{display:none!important}
#challenge-progress.rechen-finale:not(.hidden)>#challenge-results{display:flex!important;flex-direction:column;align-items:center;gap:clamp(8px,1.5vh,18px);width:min(96vw,1050px);max-width:none!important;margin:0 auto!important;padding:0!important}
#challenge-progress.rechen-finale #challenge-results>.rechen-finale-heading{margin:0!important;text-align:center;font-size:clamp(26px,5vw,54px);font-weight:1000;color:#ffdf93;text-shadow:0 4px 0 #4b280e,0 10px 24px #000b;letter-spacing:.025em}
#challenge-progress.rechen-finale #challenge-results>.rechen-finale-subtitle{font-size:clamp(13px,2vw,19px);color:#e9cda1;text-align:center}
#challenge-progress.rechen-finale #challenge-results>.rechen-finale-winner{box-sizing:border-box;width:min(96%,740px);padding:clamp(9px,2vh,20px)!important;margin:0 auto!important;border:2px solid #f4ce77;border-radius:18px!important;background:linear-gradient(125deg,#67401be8,#c68a3de8,#543018e8)!important;color:#fff5d9!important;text-shadow:0 2px 6px #0008;box-shadow:0 10px 28px #0008}
#challenge-progress.rechen-finale #challenge-results>.rechen-finale-podium{display:grid!important;grid-template-columns:repeat(auto-fit,minmax(min(190px,90vw),1fr));width:100%;max-width:980px!important;gap:clamp(8px,1.2vw,18px)!important;margin:0!important}
#challenge-progress.rechen-finale #challenge-results>.rechen-finale-podium>div{display:flex!important;flex-direction:column;align-items:center;justify-content:center;gap:8px;padding:clamp(14px,2.6vh,30px)!important;border:2px solid #c79c55!important;border-radius:20px!important;background:linear-gradient(155deg,#203f53ee,#081c2fe9)!important;color:#fff!important;box-shadow:0 8px 24px #0008;font-size:clamp(16px,2vw,24px)}
#challenge-progress.rechen-finale #challenge-results>.rechen-finale-podium>div:first-child{background:linear-gradient(150deg,#8e652bdc,#372719f2)!important;border-color:#ffe6a1!important;transform:translateY(-2px)}
#challenge-progress.rechen-finale #challenge-results>.rechen-finale-podium strong{font-size:clamp(20px,3vw,36px);color:#ffe6a1}
#challenge-progress.rechen-finale #challenge-results>.rechen-finale-rounds{width:min(100%,980px)!important;max-width:none!important;display:grid!important;grid-template-columns:repeat(auto-fit,minmax(min(220px,90vw),1fr));gap:9px!important;margin:0!important}
#challenge-progress.rechen-finale #challenge-results>.rechen-finale-rounds>div{padding:clamp(8px,1.3vh,14px)!important;background:#091f31df!important;border:1px solid #ad854d!important}
#challenge-progress.rechen-finale:not(.hidden)>#challenge-single-actions:not([hidden]){position:fixed!important;bottom:calc(12px + env(safe-area-inset-bottom,0px))!important;left:50%!important;transform:translateX(-50%)!important;z-index:10110!important;display:flex!important;justify-content:center;gap:12px;width:min(94vw,650px);padding:8px;border-radius:18px;background:#071a28f0;box-shadow:0 5px 25px #0008}
#challenge-progress.rechen-finale:not(.hidden)>#challenge-single-actions:not([hidden]) button{flex:1;min-width:0;padding:clamp(10px,1.5vh,16px)!important;font-size:clamp(13px,2vw,20px)!important}
#challenge-progress.rechen-finale:not(.hidden)>#challenge-fullscreen-button:not([hidden]){position:fixed!important;top:4px!important;right:4px!important;z-index:10120!important;opacity:.6;font-size:12px!important}
@media(max-height:650px){#challenge-progress.rechen-finale:not(.hidden){padding-top:7px!important;gap:5px!important}#challenge-progress.rechen-finale #challenge-results>.rechen-finale-winner{padding:8px!important}#challenge-progress.rechen-finale #challenge-results>.rechen-finale-podium>div{padding:9px!important;gap:3px}}

/* Recheninsel victory screen: readable single-viewport landscape layout. */
#challenge-progress.rechen-finale:not(.hidden){overflow:hidden!important;padding:clamp(7px,1.3vh,14px) clamp(12px,2vw,30px) calc(73px + env(safe-area-inset-bottom,0px))!important;gap:0!important;background:radial-gradient(ellipse at 50% 105%,#138e9f55,transparent 60%),radial-gradient(ellipse at 52% 3%,#4e809b55,transparent 45%),linear-gradient(155deg,#051326,#092d42 65%,#06334b)!important}
#challenge-progress.rechen-finale:not(.hidden)::before{content:"";position:absolute;inset:0;pointer-events:none;background:repeating-linear-gradient(110deg,transparent 0 75px,#ffffff03 76px 77px);opacity:.6}
#challenge-progress.rechen-finale:not(.hidden)>#challenge-results{position:relative;display:grid!important;grid-template-columns:minmax(0,.83fr) minmax(0,1.17fr)!important;grid-template-rows:auto auto minmax(0,1fr) auto!important;column-gap:clamp(12px,2vw,28px)!important;row-gap:clamp(5px,1vh,10px)!important;align-items:stretch!important;width:min(100%,1280px)!important;height:100%!important;min-height:0!important;overflow:hidden!important}
#challenge-progress.rechen-finale #challenge-results>.rechen-finale-heading{grid-column:1/-1;font-size:clamp(25px,4.4vw,54px)!important;line-height:1.02!important;letter-spacing:.02em;margin:0!important}
#challenge-progress.rechen-finale #challenge-results>.rechen-finale-subtitle{grid-column:1/-1;font-size:clamp(11px,1.35vw,16px)!important;margin:0!important}
#challenge-progress.rechen-finale #challenge-results>.rechen-finale-hero{grid-column:1;grid-row:3;display:flex;flex-direction:column;justify-content:center;align-items:center;min-height:0;padding:clamp(9px,2vh,22px);border:2px solid #e6b95e;border-radius:24px;background:radial-gradient(circle at 50% 20%,#ffd87f44,transparent 60%),linear-gradient(155deg,#78511f,#3c2b27 65%,#10283c);box-shadow:inset 0 0 35px #ffe6a014,0 12px 34px #0008;text-align:center}
.rechen-finale-emblem{font-size:clamp(33px,8vh,78px);line-height:1;filter:drop-shadow(0 6px 6px #0008)}.rechen-finale-kicker{font-size:clamp(10px,1.6vw,16px);letter-spacing:.12em;color:#ffe7a0;font-weight:900;margin-top:7px}.rechen-finale-champion{font-weight:1000;font-size:clamp(24px,3.6vw,44px);overflow-wrap:anywhere;line-height:1.1;margin:6px 0;color:#fff7df;text-shadow:0 4px 12px #000a}.rechen-finale-lead{font-size:clamp(14px,1.8vw,20px);font-weight:850;color:#ffdf8c}
#challenge-progress.rechen-finale #challenge-results>.rechen-finale-podium{grid-column:2;grid-row:3;display:flex!important;flex-direction:column!important;justify-content:center!important;gap:clamp(5px,1vh,10px)!important;width:100%!important;margin:0!important;min-height:0;overflow:auto;max-width:none!important}
#challenge-progress.rechen-finale .rechen-finale-rank{display:grid!important;grid-template-columns:auto minmax(0,1fr) auto!important;align-items:center!important;gap:clamp(8px,1.3vw,15px)!important;min-height:0;flex:1;max-height:100px;padding:clamp(8px,1.4vh,16px) clamp(11px,1.5vw,20px)!important;background:linear-gradient(120deg,#163c51,#0b253b)!important;border:1px solid #6d9fa9!important;border-radius:16px!important;color:white!important;box-shadow:0 5px 15px #0006;font-size:clamp(13px,1.7vw,22px)!important;transform:none!important}
#challenge-progress.rechen-finale .rechen-finale-rank.first{border:2px solid #ffd57d!important;background:linear-gradient(120deg,#9e6a30,#4d361d)!important}
.rechen-finale-rank strong{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.rechen-finale-medal{font-size:clamp(20px,2.7vw,32px)}.rechen-finale-points{color:#ffe3a1;font-weight:1000;font-size:clamp(15px,2vw,26px);white-space:nowrap}
#challenge-progress.rechen-finale .rechen-finale-details-label{display:none!important}
#challenge-progress.rechen-finale #challenge-results>.rechen-finale-rounds{grid-column:1/-1;grid-row:4;width:100%!important;max-width:none!important;grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:clamp(6px,1vw,12px)!important;min-height:0;overflow:hidden;margin:0!important}
#challenge-progress.rechen-finale .rechen-round-card{padding:clamp(7px,1vh,12px)!important;border-radius:13px;background:#061b2cdd!important;border:1px solid #b68e58!important;min-width:0;min-height:0}
.rechen-round-heading{display:block;font-size:clamp(12px,1.2vw,16px);color:#ffe2a5;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.rechen-round-entries{display:grid;gap:2px;margin-top:5px}.rechen-round-entry{display:flex;justify-content:space-between;gap:6px;font-size:clamp(10px,1.1vw,14px);white-space:nowrap}.rechen-round-entry span:first-child{overflow:hidden;text-overflow:ellipsis}.rechen-correct{color:#85f0b8}.rechen-incorrect{color:#ffb3ae}
#challenge-progress.rechen-finale:not(.hidden)>#challenge-single-actions:not([hidden]){bottom:calc(8px + env(safe-area-inset-bottom,0px))!important;width:min(92vw,720px)!important;padding:5px!important;gap:9px!important;background:#061728eb!important}
#challenge-progress.rechen-finale:not(.hidden)>#challenge-single-actions:not([hidden]) button{padding:clamp(8px,1.4vh,14px)!important;min-height:43px!important}
@media(max-width:650px),(max-height:430px){#challenge-progress.rechen-finale:not(.hidden){overflow-y:auto!important}#challenge-progress.rechen-finale:not(.hidden)>#challenge-results{height:auto!important;min-height:100%;overflow:visible!important}#challenge-progress.rechen-finale .rechen-finale-rank{min-height:44px!important}#challenge-progress.rechen-finale .rechen-round-entries{display:none!important}}
@media(max-width:650px) and (orientation:portrait){#challenge-progress.rechen-finale:not(.hidden)>#challenge-results{grid-template-columns:1fr!important;grid-template-rows:auto auto auto auto auto!important}#challenge-progress.rechen-finale #challenge-results>.rechen-finale-hero{grid-column:1;grid-row:3}#challenge-progress.rechen-finale #challenge-results>.rechen-finale-podium{grid-column:1;grid-row:4}#challenge-progress.rechen-finale #challenge-results>.rechen-finale-rounds{grid-column:1;grid-row:5;grid-template-columns:1fr!important}#challenge-progress.rechen-finale .rechen-round-entries{display:grid!important}}
/* Shared edge-to-edge presentation for every embedded original minigame. */
#challenge-progress.original-edge-playing:not(.hidden){position:fixed!important;inset:0!important;width:100vw!important;height:100dvh!important;max-width:none!important;display:block!important;margin:0!important;padding:0!important;overflow:hidden!important;border:0!important;border-radius:0!important;background:#061624!important;box-shadow:none!important;z-index:10000!important}
#challenge-progress.original-edge-playing:not(.hidden)::before,#challenge-progress.original-edge-playing:not(.hidden)::after{display:none!important}
#challenge-progress.original-edge-playing:not(.hidden)>:not(#challenge-original-frame):not(#preisjaeger-original-online):not(#challenge-fullscreen-button):not(#challenge-single-actions):not(#challenge-next){display:none!important}
#challenge-progress.original-edge-playing:not(.hidden)>#challenge-original-frame:not([hidden]),#challenge-progress.original-edge-playing.preisjaeger-original-playing:not(.hidden)>#preisjaeger-original-online:not([hidden]){position:absolute!important;inset:0!important;display:block!important;width:100%!important;height:100%!important;max-width:none!important;min-height:0!important;margin:0!important;padding:0!important;border:0!important;border-radius:0!important;overflow:hidden!important;box-shadow:none!important}
#challenge-progress.original-edge-playing:not(.hidden)>#challenge-fullscreen-button:not([hidden]){position:fixed!important;top:calc(4px + env(safe-area-inset-top,0px))!important;right:calc(4px + env(safe-area-inset-right,0px))!important;left:auto!important;bottom:auto!important;z-index:10120!important;opacity:.55;padding:4px 8px!important;font-size:12px!important}
#challenge-progress.original-edge-playing:not(.hidden)>#challenge-single-actions:not([hidden]){position:fixed!important;z-index:10110!important;bottom:calc(12px + env(safe-area-inset-bottom,0px))!important;left:50%!important;transform:translateX(-50%)!important;display:flex!important;gap:12px!important;width:min(92vw,620px)!important;padding:7px 10px!important;border-radius:20px!important;background:#071b2ce8!important}
#challenge-progress.original-edge-playing:not(.hidden)>#challenge-single-actions:not([hidden]) button{flex:1;min-width:0}
#challenge-progress.original-edge-playing:not(.hidden)>#challenge-next:not([hidden]){position:fixed!important;z-index:10110!important;bottom:calc(12px + env(safe-area-inset-bottom,0px))!important;left:50%!important;transform:translateX(-50%)!important}
#challenge-progress.maulwurf-playing{justify-content:flex-start!important;gap:4px!important;padding:4px!important;overflow:hidden!important}
#challenge-progress.maulwurf-playing::before,#challenge-progress.maulwurf-playing::after{display:none!important}
#challenge-progress.maulwurf-playing>h2,#challenge-progress.maulwurf-playing>#challenge-progress-order,#challenge-progress.maulwurf-playing>#challenge-progress-status,#challenge-progress.maulwurf-playing>#challenge-progress-name,#challenge-progress.maulwurf-playing>#challenge-clock{display:none!important}
#challenge-progress.maulwurf-playing>#challenge-original-frame{width:100%!important;max-width:none!important;height:calc(100dvh - 12px)!important;min-height:0!important;flex:1!important;border:0!important;border-radius:12px!important;box-shadow:none!important}
#challenge-progress::before{content:"🏝️";position:fixed;left:2vw;bottom:3vh;font-size:clamp(75px,16vw,220px);opacity:.72;pointer-events:none;filter:drop-shadow(0 12px 20px #001b2b)}
#challenge-progress::after{content:"⛵";position:fixed;right:5vw;bottom:12vh;font-size:clamp(58px,10vw,135px);opacity:.72;pointer-events:none;filter:drop-shadow(0 12px 20px #001b2b)}
#challenge-progress>*{position:relative;z-index:1;max-width:min(92vw,900px);margin:0!important}
#challenge-progress>h2{font-size:clamp(25px,4.5vw,52px);letter-spacing:.025em;color:#ffe3a1;filter:drop-shadow(0 4px 12px #0008)}
#challenge-progress-name{font-size:clamp(17px,2.5vw,26px);font-weight:750;color:#ffebc4}
#challenge-progress-status{font-size:clamp(17px,2.3vw,24px);font-weight:650}
#challenge-progress-order{background:#071c2a99;padding:8px 16px;border-radius:30px}
#challenge-math:not([hidden]){display:flex;flex-direction:column;align-items:center;gap:clamp(12px,2vh,24px);width:min(92vw,780px);padding:clamp(20px,4vw,42px);border:2px solid #f6d99a7a;border-radius:28px;background:linear-gradient(145deg,#132e3cdd,#091d2cdd);box-shadow:0 22px 65px #00152288, inset 0 1px #ffffff30}
#challenge-math-question{font-size:clamp(42px,8vw,96px)!important;line-height:1.1;margin:0!important;letter-spacing:.02em}
#challenge-math-input{width:min(72vw,280px)!important;font-size:clamp(28px,4vw,42px)!important;text-align:center;background:#fff9eb;color:#152d39;border:3px solid #f7d68c;padding:12px!important}
#challenge-math-send,#challenge-next,#challenge-time-stop{border:0!important;border-radius:18px!important;padding:15px 30px!important;background:linear-gradient(#ffebad,#e7ab45)!important;color:#24323b!important;font-size:clamp(18px,2.5vw,25px)!important;font-weight:850!important;box-shadow:0 6px 0 #926223,0 12px 25px #00152266;cursor:pointer}
#challenge-math-send:disabled,#challenge-time-stop:disabled{opacity:.58;cursor:default}
#challenge-results{width:min(92vw,720px);max-height:55vh;overflow:auto}
#challenge-math-board{width:min(94vw,960px);display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:clamp(6px,1vw,14px);margin:12px auto 0}
#challenge-math-board button{position:relative;min-height:clamp(58px,10vh,100px);border:2px solid #d9ac6e;border-radius:15px;color:#fff4d6;font-size:clamp(20px,3vw,36px);font-weight:950;background:linear-gradient(145deg,#86582d,#4e2a1c 55%,#2e1c18);box-shadow:inset 0 3px #ffe7ae42,0 6px 0 #201313,0 10px 18px #0009;cursor:pointer;touch-action:manipulation}
#challenge-math-board button:before{content:'⚓';position:absolute;top:3px;left:7px;font-size:12px;opacity:.6}
#challenge-math-board button.selected{background:linear-gradient(145deg,#65db8d,#1d8459);border-color:#b8ffd0;box-shadow:0 0 0 3px #8affab,0 0 24px #54f8a077}
#challenge-math-board button:disabled:not(.selected){opacity:.55;cursor:default}
#challenge-math-board button:focus-visible{outline:3px solid #ffe3a1;outline-offset:3px}
#challenge-math:not([hidden]){width:min(98vw,1060px);padding:clamp(10px,2vw,24px)}
@media(max-width:650px){#challenge-math-board{grid-template-columns:repeat(3,minmax(0,1fr))}#challenge-math-board button{min-height:52px}}

/* Recheninsel V30 – Spielbrett nach dem Original-Layout */
#challenge-progress:has(#challenge-math:not([hidden])){justify-content:flex-start!important;padding-top:clamp(12px,2vh,25px)!important;gap:8px!important}
#challenge-progress:has(#challenge-math:not([hidden]))>h2{font-family:Georgia,serif;font-size:clamp(22px,3vw,38px);color:#ffdc87;margin:0}
#challenge-progress:has(#challenge-math:not([hidden])) #challenge-clock{font-size:clamp(20px,3vw,36px)!important;line-height:1.1}
#challenge-math:not([hidden]){position:relative;width:min(97vw,1180px)!important;max-width:1180px!important;gap:9px!important;padding:clamp(12px,2vw,25px)!important;border:2px solid #b58c4c!important;border-radius:25px!important;background:linear-gradient(145deg,#203f5df0,#0d2039f5 55%,#152d47f0)!important;box-shadow:0 25px 60px #0009,inset 0 0 0 5px #ffffff08!important}
#challenge-math-question{font-family:Georgia,serif;color:#fff0c9;text-shadow:0 7px 22px #0008;font-weight:1000!important;font-size:clamp(34px,6vw,75px)!important}
#challenge-math-board{width:100%!important;gap:clamp(6px,1.1vw,13px)!important}
#challenge-math-board button{background:linear-gradient(145deg,#346a9a,#173956)!important;border:2px solid #ffffff3c!important;border-radius:15px!important;box-shadow:inset 0 3px 0 #ffffff20,0 7px 0 #081b2e,0 10px 18px #0006!important;font-family:Georgia,serif;transition:transform .12s,filter .12s}
#challenge-math-board button:before{content:'✦';font-size:11px;opacity:.45}
#challenge-math-board button:not(:disabled):hover{filter:brightness(1.18)}
#challenge-math-board button.selected{background:linear-gradient(145deg,#248c6d,#165b56)!important;border-color:#75f0a6!important;box-shadow:0 0 0 3px #75f0a655,0 0 24px #54f8a077!important;opacity:1!important}
#challenge-math-players{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;width:min(97vw,1180px);margin:4px auto}
#challenge-math-players .pirate-player{border:2px solid #ffffff22;background:#132942dd;border-radius:16px;padding:10px;text-align:left;min-height:65px}
#challenge-math-players .pirate-player.me{border-color:#ffda79;box-shadow:0 0 0 2px #ffda7933}
#challenge-math-players .pirate-player.done{border-color:#75e4b1}
#challenge-math-players strong{display:block;color:#fff0c9;font-size:clamp(12px,1.5vw,17px)}
#challenge-math-players small{display:block;color:#c4d4e9;margin-top:4px}
@media(max-width:650px){#challenge-math-players{grid-template-columns:repeat(2,minmax(0,1fr));gap:6px}#challenge-math-players .pirate-player{padding:7px;min-height:52px}#challenge-math-board button{min-height:53px}}
#challenge-start-overlay:not([hidden]){position:fixed!important;inset:0!important;z-index:10030!important;display:flex!important;flex-direction:column;align-items:center;justify-content:center;gap:18px;background:#031526e8;backdrop-filter:blur(7px);pointer-events:auto}
#challenge-start-number{font-size:clamp(110px,28vw,290px);font-weight:1000;line-height:1;color:#ffe2a1;text-shadow:0 0 50px #e5a643aa,0 12px 0 #4b321e}
#challenge-start-caption{font-size:clamp(18px,3vw,35px);font-weight:850;letter-spacing:.05em}
#challenge-progress [hidden]{display:none!important}
@media(max-height:650px){#challenge-progress:not(.hidden){justify-content:flex-start;padding-top:15px!important;gap:7px}#challenge-progress>h2{font-size:23px}#challenge-math:not([hidden]){padding:12px;gap:8px}#challenge-math-question{font-size:40px!important}}
`;
function ensureChallengeStageStyle(){if(document.getElementById('challenge-stage-style'))return;const style=document.createElement('style');style.id='challenge-stage-style';style.textContent=CHALLENGE_STAGE_CSS;document.head.append(style);}
let challengeClockTimer=null;
let challengeStopBusy=false;
let huetchenOriginalBridge=null,huetchenOriginalLoading=false,huetchenOriginalFailed=false;
async function ensureHuetchenOriginalBridge(){
 if(huetchenOriginalBridge||huetchenOriginalLoading||huetchenOriginalFailed)return;
 huetchenOriginalLoading=true;
 try{
  const {mountHuetchenOriginal}=await import('./huetchen-online-bridge.js?v=3');
  const container=el('challenge-original-frame');if(!container)return;
  recheninselOriginalBridge?.destroy();recheninselOriginalBridge=null;
  zeitgefuehlOriginalBridge?.destroy();zeitgefuehlOriginalBridge=null;
  huetchenOriginalBridge=mountHuetchenOriginal({container,getRoom:()=>room,request,acceptRoom,onError:showError});
  huetchenOriginalBridge.sync();
 }catch(error){huetchenOriginalFailed=true;showError(error)}
 finally{huetchenOriginalLoading=false;}
}
let eisstockOriginalBridge=null,eisstockOriginalLoading=false,eisstockOriginalFailed=false;
async function ensureEisstockOriginalBridge(){
 if(eisstockOriginalBridge||eisstockOriginalLoading||eisstockOriginalFailed)return;
 eisstockOriginalLoading=true;
 try{const {mountEisstockOriginal}=await import('./eisstock-online-bridge.js?v=1');
 const container=el('challenge-original-frame');if(!container)return;
 eisstockOriginalBridge=mountEisstockOriginal({container,getRoom:()=>room,request,acceptRoom,onError:showError});eisstockOriginalBridge.sync();
 }catch(e){eisstockOriginalFailed=true;showError(e)}finally{eisstockOriginalLoading=false}
}
let fallingOriginalBridge=null,fallingOriginalLoading=false,fallingOriginalFailed=false;
async function ensureFallingOriginalBridge(){
 if(fallingOriginalBridge||fallingOriginalLoading||fallingOriginalFailed)return;
 fallingOriginalLoading=true;
 try{const {mountFallingOriginal}=await import('./fallende-gegenstaende-online-bridge.js?v=1');
  const container=el('challenge-original-frame');if(!container)return;
  fallingOriginalBridge=mountFallingOriginal({container,getRoom:()=>room,request,acceptRoom,onError:showError});
  fallingOriginalBridge.sync();
 }catch(e){fallingOriginalFailed=true;showError(e)}finally{fallingOriginalLoading=false}
}
let zeitgefuehlOriginalBridge=null,zeitgefuehlOriginalLoading=false,zeitgefuehlOriginalFailed=false;
async function ensureZeitgefuehlOriginalBridge(){
 if(zeitgefuehlOriginalBridge||zeitgefuehlOriginalLoading||zeitgefuehlOriginalFailed)return;
 zeitgefuehlOriginalLoading=true;
 try{
  const {mountZeitgefuehlOriginal}=await import('./zeitgefuehl-online-bridge.js?v=8');
  const container=el('challenge-original-frame');
  if(!container)return;
  recheninselOriginalBridge?.destroy();recheninselOriginalBridge=null;
  huetchenOriginalBridge?.destroy();huetchenOriginalBridge=null;
  zeitgefuehlOriginalBridge=mountZeitgefuehlOriginal({container,getRoom:()=>room,request,acceptRoom,onError:showError});
  zeitgefuehlOriginalBridge.sync();
 }catch(error){zeitgefuehlOriginalFailed=true;showError(error);}
 finally{zeitgefuehlOriginalLoading=false;}
}
let bomberOriginalBridge=null,bomberOriginalLoading=false,bomberOriginalFailed=false;
async function ensureBomberOriginalBridge(){
 if(bomberOriginalBridge||bomberOriginalLoading||bomberOriginalFailed)return;
 bomberOriginalLoading=true;
 try{
  const {mountBomberOriginal}=await import('./bomber-strand-online-bridge.js?v=4');
  const ch=room?.match?.challenge;
  if(!ch||ch.order?.[ch.index]!=='bomber-strand-arena'||ch.phase!=='countdown')return;
  const target=el('challenge-original-frame');if(!target)return;
  bomberOriginalBridge=mountBomberOriginal({container:target,getRoom:()=>room,request,acceptRoom,onError:showError});
  bomberOriginalBridge.sync();
 }catch(e){bomberOriginalFailed=true;showError(e)}finally{bomberOriginalLoading=false;}
}
let snakeOriginalBridge=null,snakeOriginalLoading=false,snakeOriginalFailed=false;
async function ensureSnakeOriginalBridge(){
 if(snakeOriginalBridge||snakeOriginalLoading||snakeOriginalFailed)return;
 snakeOriginalLoading=true;
 try{
  const {mountSnakeOriginal}=await import('./snake-arena-online-bridge.js?v=37');
  const ch=room?.match?.challenge;
  if(!ch||ch.order?.[ch.index]!=='snake-arena'||ch.phase!=='countdown')return;
  const target=el('challenge-original-frame');if(!target)return;
  snakeOriginalBridge=mountSnakeOriginal({container:target,getRoom:()=>room,request,acceptRoom,onError:showError});
  snakeOriginalBridge.sync();
 }catch(e){snakeOriginalFailed=true;showError(e)}finally{snakeOriginalLoading=false;}
}
let lavaOriginalBridge=null,lavaOriginalLoading=false,lavaOriginalFailed=false;
async function ensureLavaOriginalBridge(){
 if(lavaOriginalBridge||lavaOriginalLoading||lavaOriginalFailed)return;
 lavaOriginalLoading=true;
 try{
  const {mountLavaOriginal}=await import('./lava-arena-online-bridge.js?v=13');
  const ch=room?.match?.challenge;
  if(!ch||ch.order?.[ch.index]!=='lava-arena'||!['countdown','results','finished'].includes(ch.phase))return;
  const target=el('challenge-original-frame');if(!target)return;
  lavaOriginalBridge=mountLavaOriginal({container:target,getRoom:()=>room,request,acceptRoom,onError:showError});
  lavaOriginalBridge.sync();
 }catch(e){lavaOriginalFailed=true;showError(e)}finally{lavaOriginalLoading=false}
}
let flusssprungOriginalBridge=null,flusssprungOriginalLoading=false,flusssprungOriginalFailed=false;
async function ensureFlusssprungOriginalBridge(){
 if(flusssprungOriginalBridge||flusssprungOriginalLoading||flusssprungOriginalFailed)return;
 flusssprungOriginalLoading=true;
 try{
  const {mountFlusssprungOriginal}=await import('./flusssprung-online-bridge.js?v=13');
  const ch=room?.match?.challenge;
  if(!ch||ch.phase!=='countdown'||ch.order?.[ch.index]!=='flusssprung')return;
  const target=el('challenge-original-frame');if(!target)return;
  flusssprungOriginalBridge=mountFlusssprungOriginal({container:target,getRoom:()=>room,request,acceptRoom,onError:showError});
  flusssprungOriginalBridge.sync();
 }catch(e){flusssprungOriginalFailed=true;showError(e)}
 finally{flusssprungOriginalLoading=false}
}
let maulwurfOriginalBridge=null,maulwurfOriginalLoading=false,maulwurfOriginalFailed=false;
async function ensureMaulwurfOriginalBridge(){
 if(maulwurfOriginalBridge||maulwurfOriginalLoading||maulwurfOriginalFailed)return;
 maulwurfOriginalLoading=true;
 try{
  const {mountMaulwurfOriginal}=await import('./maulwurf-online-bridge.js?v=11');
  // The player may have left the room while the module was downloading.
  const current=room?.match?.challenge;
  if(!current||current.phase!=='countdown'||current.order?.[current.index]!=='maulwurf-arena')return;
  const target=el('challenge-original-frame');if(!target)return;
  recheninselOriginalBridge?.destroy();recheninselOriginalBridge=null;
  zeitgefuehlOriginalBridge?.destroy();zeitgefuehlOriginalBridge=null;
  huetchenOriginalBridge?.destroy();huetchenOriginalBridge=null;
  maulwurfOriginalBridge=mountMaulwurfOriginal({container:target,getRoom:()=>room,request,acceptRoom,onError:showError});
  maulwurfOriginalBridge.sync();
 }catch(error){maulwurfOriginalFailed=true;showError(error);}
 finally{maulwurfOriginalLoading=false;}
}
let recheninselOriginalBridge=null;
let recheninselOriginalLoading=false;
let recheninselOriginalFailed=false;
async function ensureRecheninselOriginalBridge(){
 if(recheninselOriginalBridge||recheninselOriginalLoading||recheninselOriginalFailed)return;
 recheninselOriginalLoading=true;
 try{
  const {mountRecheninselOriginal}=await import('./recheninsel-online-bridge.js?v=3');
  const target=el('challenge-original-frame');
  zeitgefuehlOriginalBridge?.destroy();zeitgefuehlOriginalBridge=null;
  huetchenOriginalBridge?.destroy();huetchenOriginalBridge=null;
  if(!target)return;
  recheninselOriginalBridge=mountRecheninselOriginal({
   container:target,src:'recheninsel-original-online.html?v=3',
   getRoom:()=>room,request,acceptRoom,onError:showError
  });
  recheninselOriginalBridge.sync();
 }catch(error){recheninselOriginalFailed=true;console.error('Original-Recheninsel nicht geladen',error);showError(error);}
 finally{recheninselOriginalLoading=false;}
}

/* Original Preisjäger V11: server-authoritative presentation, never local game state. */
let preisjaegerOriginalReady=false;
function ensurePreisjaegerOriginalFrame(){
 let frame=document.getElementById('preisjaeger-original-online');
 if(frame)return frame;
 frame=document.createElement('iframe');
 frame.id='preisjaeger-original-online';
 frame.hidden=true;
 frame.title='Preisjäger Original V11 – gemeinsamer Online-Raum';
 frame.setAttribute('referrerpolicy','same-origin');
 frame.style.cssText='display:none;width:min(98vw,1100px);height:min(78dvh,730px);min-height:400px;border:0;border-radius:14px;background:#09111f';
 frame.src='Minispiele/Preisjaeger_v11_0_RC23.html?onlineView=1&build=52';
 el('challenge-progress').append(frame);
 return frame;
}
function syncPreisjaegerOriginal(ch){
 const frame=ensurePreisjaegerOriginalFrame();
 const active=ch?.order?.[ch.index]==='preisjaeger'&&(ch.phase==='countdown'||ch.phase==='finished')&&!!ch.preisjaeger;
 frame.hidden=!active;
 frame.style.display=active?'block':'none';
 el('challenge-preisjaeger').hidden=true;
 if(!active)return;
 if(!preisjaegerOriginalReady)return;
 const pj=ch.preisjaeger;
 const mySeat=room.players.find(p=>p.me)?.seat;
 const state={
  challengeId:ch.id,round:pj.round,finished:ch.phase==='finished',totals:ch.phase==='finished'?(ch.totals||[]):[],startsInMs:Math.max(0,(ch.startAt||0)-((room.serverNow||Date.now())+Math.max(0,Date.now()-preisjaegerClockReceivedAt))),product:{
   name:pj.product?.name||'',category:pj.product?.category||'',shop:pj.product?.shop||'',description:pj.product?.description||'',
   image:pj.product?.image||'',icon:pj.product?.icon||'🛒'
  },
  history:Array.isArray(pj.history)?pj.history.slice(-1):[],
  answered:(pj.answered||[]).includes(mySeat),
  players:(room.players||[]).filter(p=>p.participating).map(p=>({name:p.name,answered:(pj.answered||[]).includes(p.seat)}))
 };
 frame.contentWindow?.postMessage({type:'PREISJAEGER_ONLINE_STATE',state},location.origin);
}
// Refresh the round countdown locally even when the room socket is idle.
setInterval(()=>{
 const ch=room?.match?.challenge;
 if(!ch||ch.order?.[ch.index]!=='preisjaeger'||ch.phase!=='countdown')return;
 syncPreisjaegerOriginal(ch);
 const now=(room.serverNow||Date.now())+Math.max(0,Date.now()-preisjaegerClockReceivedAt);
 const pj=ch.preisjaeger;
 if(pj&&now>=ch.startAt+45000){
  const key=ch.id+':'+ch.index+':'+pj.round;
  if(pjTimeoutKey!==key){
   pjTimeoutKey=key;
   request('/rooms/'+encodeURIComponent(room.code)+'/challenge-preisjaeger-timeout','POST',{challengeId:ch.id,round:pj.round})
    .then(r=>{if(r?.room)acceptRoom(r.room)})
    .catch(()=>{pjTimeoutKey=''});
  }
 }
},1000);
window.addEventListener('message',async event=>{
 if(event.origin!==location.origin||event.source!==document.getElementById('preisjaeger-original-online')?.contentWindow)return;
 if(event.data?.type==='PREISJAEGER_ONLINE_READY'){
  preisjaegerOriginalReady=true;
  const ch=room?.match?.challenge;
  if(ch)syncPreisjaegerOriginal(ch);
  return;
 }
 if(event.data?.type!=='PREISJAEGER_ONLINE_GUESS')return;
 const ch=room?.match?.challenge,pj=ch?.preisjaeger;
 if(!ch||ch.phase!=='countdown'||ch.order[ch.index]!=='preisjaeger'||!pj)return;
 if(event.data.challengeId!==ch.id||event.data.round!==pj.round)return;
 const fail=message=>document.getElementById('preisjaeger-original-online')?.contentWindow?.postMessage({type:'PREISJAEGER_ONLINE_ERROR',key:ch.id+':'+pj.round,message},location.origin);
 if((pj.answered||[]).includes(room.players.find(p=>p.me)?.seat))return fail('Deine Schätzung ist bereits gespeichert.');
 const guess=Math.round(Number(event.data.guess)*100);
 if(!Number.isSafeInteger(guess)||guess<1||guess>100000000)return fail('Bitte einen gültigen Preis eingeben.');
 const key=ch.id+':'+ch.index+':'+pj.round;
 if(pjSubmitPendingKey===key)return;
 pjSubmitPendingKey=key;
 try{const response=await request('/rooms/'+encodeURIComponent(room.code)+'/challenge-preisjaeger-answer','POST',{challengeId:ch.id,round:pj.round,guess});acceptRoom(response.room)}
 catch(error){showError(error);fail(error?.message||'Speichern fehlgeschlagen. Bitte erneut versuchen.')}
 finally{if(pjSubmitPendingKey===key)pjSubmitPendingKey=''}
});

const challengeMathTimeoutPending=new Set();
const challengeTimeTimeoutPending=new Set();
let pjTimeoutKey='';
let pjSubmitPendingKey='';
let challengeFullscreenRequested=false;
function offerChallengeFullscreen(){
 const stage=el('challenge-progress');
 if(!stage||stage.classList.contains('hidden'))return;
 if(document.fullscreenElement||challengeFullscreenRequested)return;
 // Browsers require a real user gesture; never repeatedly trigger a blocked request.
 const request=stage.requestFullscreen||stage.webkitRequestFullscreen;
 if(!request)return;
 challengeFullscreenRequested=true;
 try{Promise.resolve(request.call(stage)).catch(()=>{});}catch{}
}
document.addEventListener('pointerdown',event=>{
 const stage=el('challenge-progress');
 if(stage&&!stage.classList.contains('hidden')&&stage.contains(event.target)&&room?.match?.challenge?.order?.[room.match.challenge.index]!=='lava-arena')offerChallengeFullscreen();
},true);
document.addEventListener('fullscreenchange',()=>{if(!document.fullscreenElement)challengeFullscreenRequested=false;});
function renderChallengeProgress(){
 ensureChallengeStageStyle();
 let box=el('challenge-progress');
 if(!box){
  box=document.createElement('section');box.id='challenge-progress';box.style.cssText='margin:16px 0;padding:22px;border-radius:22px;background:linear-gradient(135deg,#122946,#223f69);color:white;text-align:center;box-shadow:0 14px 30px #10294b30';
  box.innerHTML='<h2 style="margin:0 0 10px">🏴‍☠️ Party Challenge</h2><p id="challenge-progress-name"></p><div id="challenge-clock" aria-live="off" style="font-size:clamp(58px,15vw,130px);font-weight:900;line-height:1.1;color:#ffcf6b"></div><p id="challenge-progress-status" role="status"></p><p id="challenge-progress-order" style="font-size:13px;opacity:.85"></p><button id="challenge-time-stop" type="button" style="font-size:24px;padding:16px 36px;border-radius:16px;background:#ffcf6b;color:#122946;font-weight:900;border:0" hidden>⏱️ STOPP!</button><p id="challenge-time-target"></p><div id="challenge-results"></div><div id="challenge-preisjaeger" hidden style="width:min(96vw,780px);padding:24px;border:2px solid #d4b56b;border-radius:24px;background:linear-gradient(135deg,#152b44,#102035);box-shadow:0 18px 45px #0006"><div style="font-size:13px;letter-spacing:3px;color:#ffd27b">🛒 PREISJÄGER · GOLD EDITION ONLINE</div><div id="pj-product-icon" style="font-size:64px;margin:14px">🛍️</div><img id="pj-product-photo" alt="" hidden loading="eager" referrerpolicy="no-referrer" style="max-height:min(28dvh,230px);max-width:min(80vw,430px);width:auto;object-fit:contain;border-radius:14px;background:#fff;padding:10px;margin:8px auto"><h2 id="pj-product-name" style="font-size:clamp(20px,4vw,35px);margin:12px 0"></h2><p id="pj-product-category" style="opacity:.8"></p><p id="pj-round-label" style="color:#ffd27b"></p><div aria-hidden="true" style="height:8px;border-radius:10px;background:#ffffff29;overflow:hidden;margin:6px 0 16px"><div id="pj-timebar" style="height:100%;width:100%;background:linear-gradient(90deg,#e6c66c,#54d7ad);transition:width .15s linear"></div></div><form id="pj-guess-form" style="display:flex;justify-content:center;gap:10px;flex-wrap:wrap"><input id="pj-guess" type="text" inputmode="decimal" autocomplete="off" placeholder="Dein Preis in €" aria-label="Geschätzter Preis in Euro" style="padding:14px;border-radius:12px;font-size:22px;width:200px"><button id="pj-submit" type="submit" style="background:#ffd27b;color:#152b44;border:0;border-radius:12px;padding:14px 20px;font-weight:900">🔒 Schätzung abgeben</button></form><p id="pj-feedback" role="status"></p><p id="pj-opponents" style="opacity:.85"></p></div><div id="challenge-original-frame" hidden style="width:min(98vw,1300px);height:min(77dvh,850px);min-height:340px;flex-shrink:0;margin:0 auto;border-radius:18px;overflow:hidden;border:2px solid #c8a56c;box-shadow:0 18px 45px #0007"></div><div id="challenge-math" hidden><p id="challenge-math-question" style="font-size:clamp(30px,7vw,58px);font-weight:900"></p><div id="challenge-math-board" role="group" aria-label="15 Schatzfässer – wähle deine Antwort"></div><div id="challenge-math-players" aria-label="Mitspieler"></div><input id="challenge-math-input" type="number" min="0" max="1000" inputmode="numeric" aria-label="Ergebnis eingeben" style="width:140px;padding:12px;font-size:24px;border-radius:12px" hidden><button type="button" id="challenge-math-send" style="padding:14px;border-radius:12px" hidden>Antwort abgeben</button><p id="challenge-math-feedback" role="status"></p></div><div id="challenge-single-actions" hidden style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap;margin:14px auto"><button id="challenge-replay" type="button" style="padding:16px 23px;border-radius:15px;border:2px solid #ffe4a2;background:linear-gradient(135deg,#ffe6a0,#e8ad4a);color:#21314b;font-size:18px;font-weight:900;cursor:pointer">🔁 Nochmal spielen</button><button id="challenge-select" type="button" style="padding:16px 23px;border-radius:15px;border:2px solid #94e9e1;background:linear-gradient(135deg,#227f8b,#134a67);color:white;font-size:18px;font-weight:900;cursor:pointer">🎮 Zur Spielauswahl</button></div><button type="button" id="challenge-next" hidden>▶ Nächstes Minispiel starten</button>';
  const stage=el('game-stage-hero');stage.parentNode.insertBefore(box,stage);
  const overlay=document.createElement('div');overlay.id='challenge-start-overlay';overlay.hidden=true;overlay.setAttribute('aria-live','off');overlay.innerHTML='<div id="challenge-start-caption">🏴‍☠️ Macht euch bereit!</div><div id="challenge-start-number">3</div>';box.append(overlay);
  el('challenge-math-send').addEventListener('click',async()=>{
   const ch=room?.match?.challenge;
   if(!ch)return;
   const answer=Number(el('challenge-math-input').value);
   if(!Number.isInteger(answer)||el('challenge-math-input').value.trim()===''){el('challenge-math-feedback').textContent='Bitte eine ganze Zahl eingeben.';return;}
   const button=el('challenge-math-send');button.disabled=true;
   try{const response=await request('/rooms/'+encodeURIComponent(room.code)+'/challenge-math-answer','POST',{challengeId:ch.id,answer});acceptRoom(response.room);}
   catch(e){el('challenge-math-feedback').textContent=e.message;button.disabled=false;el('challenge-math-board').querySelectorAll('button').forEach(b=>{b.disabled=false;b.classList.remove('selected');});}
  });
  el('pj-guess-form').addEventListener('submit',async event=>{
   event.preventDefault();const ch=room?.match?.challenge,pj=ch?.preisjaeger;
   if(!ch||!pj||ch.order[ch.index]!=='preisjaeger')return;
   const raw=el('pj-guess').value.trim().replace(/\s|€/g,'').replace(',','.');
   if(!/^\d+(?:\.\d{1,2})?$/.test(raw)){el('pj-feedback').textContent='Bitte einen gültigen Preis eingeben.';return;}
   const guess=Math.round(Number(raw)*100);
   if(!Number.isSafeInteger(guess)||guess<1||guess>100000000){el('pj-feedback').textContent='Preis außerhalb des erlaubten Bereichs.';return;}
   const key=ch.id+':'+ch.index+':'+pj.round;
   if(pjSubmitPendingKey===key)return;
   pjSubmitPendingKey=key;
   el('pj-submit').disabled=true;el('pj-feedback').textContent='⏳ Schätzung wird sicher übertragen …';
   try{const response=await request('/rooms/'+encodeURIComponent(room.code)+'/challenge-preisjaeger-answer','POST',{challengeId:ch.id,round:pj.round,guess});acceptRoom(response.room);}
   catch(e){if(room?.match?.challenge?.preisjaeger?.round===pj.round){el('pj-feedback').textContent='⚠️ '+e.message;el('pj-submit').disabled=false;}}
   finally{if(pjSubmitPendingKey===key)pjSubmitPendingKey='';}
  });
  el('challenge-math-input').addEventListener('keydown',event=>{if(event.key==='Enter'&&!event.isComposing&&!el('challenge-math-send').disabled){event.preventDefault();el('challenge-math-send').click();}});
  for(const [id,route] of [['challenge-replay','challenge-replay'],['challenge-select','challenge-select']]){
   el(id).addEventListener('click',async()=>{
    if(!room?.host||!room?.match?.challenge)return;
    const btn=el(id);if(btn.disabled)return;
    btn.disabled=true;
    try{const requestedCode=room.code;const challengeId=room.match.challenge.id;const response=await request('/rooms/'+encodeURIComponent(requestedCode)+'/'+route,'POST',{challengeId});if(code!==requestedCode)return;acceptRoom(response.room);}
    catch(e){showError(e);}finally{btn.disabled=false;}
   });
  }
  el('challenge-next').addEventListener('click',async()=>{if(!room?.host||!room?.match?.challenge)return;const btn=el('challenge-next');if(btn.disabled)return;btn.disabled=true;try{const requestedCode=room.code;const challengeId=room.match.challenge.id;const response=await request('/rooms/'+encodeURIComponent(requestedCode)+'/challenge-next','POST',{challengeId});if(code!==requestedCode)return;acceptRoom(response.room);}catch(e){showError(e);}finally{btn.disabled=false;}});
  el('challenge-time-stop').addEventListener('click',async()=>{if(challengeStopBusy||!room?.match?.challenge)return;challengeStopBusy=true;el('challenge-time-stop').disabled=true;try{const response=await request('/rooms/'+encodeURIComponent(room.code)+'/challenge-time-stop','POST',{challengeId:room.match.challenge.id});acceptRoom(response.room);}catch(e){showError(e);}finally{challengeStopBusy=false;}});
 }
 const ch=room?.match?.game==='partychallenge'?room.match.challenge:null;
 let fullscreenButton=el('challenge-fullscreen-button');
 if(!fullscreenButton){
  fullscreenButton=document.createElement('button');
  fullscreenButton.id='challenge-fullscreen-button';
  fullscreenButton.type='button';
  fullscreenButton.textContent='⛶ Vollbild';
  fullscreenButton.addEventListener('click',event=>{
   event.preventDefault();event.stopPropagation();
   const stage=el('challenge-progress');
   if(document.fullscreenElement){document.exitFullscreen?.().catch(()=>{});return;}
   challengeFullscreenRequested=false;
   if(stage&&stage.requestFullscreen){
    challengeFullscreenRequested=true;
    Promise.resolve(stage.requestFullscreen()).catch(()=>{challengeFullscreenRequested=false;});
   }else if(stage?.webkitRequestFullscreen){
    try{stage.webkitRequestFullscreen()}catch{challengeFullscreenRequested=false}
   }
  });
  box.append(fullscreenButton);
 }
 fullscreenButton.hidden=!ch;
 box.classList.toggle('hidden',!ch);
 if(challengeClockTimer){clearInterval(challengeClockTimer);challengeClockTimer=null;}
 if(!ch){if(document.fullscreenElement===box)document.exitFullscreen?.().catch(()=>{});challengeFullscreenRequested=false;box.classList.remove('maulwurf-playing','zeitgefuehl-playing','original-edge-playing','rechen-finale');if(maulwurfOriginalBridge){maulwurfOriginalBridge.destroy();maulwurfOriginalBridge=null;}const overlay=el('challenge-start-overlay');if(overlay)overlay.hidden=true;el('challenge-original-frame').hidden=true;return;}
 const index=Math.min(Math.max(0,ch.index||0),ch.order.length-1);
 el('challenge-progress-name').textContent='Spiel '+(index+1)+' von '+ch.order.length+' · '+(CHALLENGE_LABELS[ch.order[index]]||ch.order[index]);
 el('challenge-progress-order').textContent=ch.order.map((g,i)=>(i===index?'➤ ':'')+(i+1)+'. '+(CHALLENGE_LABELS[g]||g)).join('  ·  ');
 el('challenge-next').hidden=!room.host||ch.phase!=='results';
 el('challenge-single-actions').hidden=!(ch.phase==='finished'&&ch.order.length===1);
 el('challenge-single-actions').style.display=ch.phase==='finished'&&ch.order.length===1&&room.host?'flex':'none';
 el('challenge-replay').hidden=!room.host;
 el('challenge-select').hidden=!room.host;
 if(ch.phase==='finished'&&ch.order.length===1&&!room.host){el('challenge-progress-status').textContent='🏁 Partie beendet. Der Host kann erneut spielen oder ein anderes Minispiel wählen.';}
 box.classList.toggle('rechen-finale',ch.order[index]==='recheninsel'&&ch.phase==='finished'&&ch.order.length===1);
 box.classList.toggle('zeitgefuehl-playing',ch.order[index]==='zeitgefuehl'&&['countdown','results','finished'].includes(ch.phase));
 const isPreisjaeger=ch.order[index]==='preisjaeger';
 box.classList.toggle('preisjaeger-original-playing',isPreisjaeger&&(ch.phase==='countdown'||ch.phase==='finished'));
 if(!isPreisjaeger)pjTimeoutKey='';

 const pj=ch.preisjaeger;
 el('challenge-preisjaeger').hidden=true;
 syncPreisjaegerOriginal(ch);
 if(isPreisjaeger&&pj){
  const key=ch.id+':'+ch.index+':'+pj.round;
  if(el('challenge-preisjaeger').dataset.round!==key){el('challenge-preisjaeger').dataset.round=key;el('pj-guess').value='';el('pj-feedback').textContent='';}
  el('pj-product-name').textContent=pj.product?.name||'Produkt wird vorbereitet';
  el('pj-product-icon').textContent=pj.product?.icon||'🛍️';
  const photo=el('pj-product-photo'),icon=el('pj-product-icon'),url=pj.product?.image||'';
  if(photo.dataset.src!==url){
   photo.dataset.src=url;
   photo.hidden=true;icon.hidden=false;
   photo.onload=()=>{if(photo.dataset.src===url){photo.hidden=false;icon.hidden=true;}};
   photo.onerror=()=>{if(photo.dataset.src===url){photo.hidden=true;icon.hidden=false;}};
   photo.removeAttribute('src');
   if(url&&/^https:\/\//.test(url))photo.src=url;
  }
  if(!url){photo.hidden=true;icon.hidden=false;}

  el('pj-product-category').textContent=[pj.product?.category,pj.product?.shop].filter(Boolean).join(' · ');
  el('pj-round-label').textContent='Preisfrage '+pj.round+' von 3';
  const mySeat=room.players.find(p=>p.me)?.seat,done=pj.answered?.includes(mySeat);
  el('pj-guess').disabled=!!done||ch.phase!=='countdown'||room.serverNow<ch.startAt;
  el('pj-submit').disabled=!!done||ch.phase!=='countdown'||room.serverNow<ch.startAt;
  el('pj-feedback').textContent=done?'🔒 Deine Schätzung: '+(typeof pj.myGuess==='number'?pj.myGuess.toLocaleString('de-DE',{style:'currency',currency:'EUR'}):'gespeichert')+' · Warte auf die Mitspieler.':'';
  el('pj-opponents').textContent=(room.players||[]).filter(m=>m.participating).map(m=>(pj.answered||[]).includes(m.seat)?'✓ '+m.name:'⏳ '+m.name).join('  ·  ');
  const previous=pj.history?.[pj.history.length-1];
  let reveal=el('pj-last-reveal');
  if(!reveal){reveal=document.createElement('div');reveal.id='pj-last-reveal';reveal.style.cssText='margin:16px 0;padding:15px;border-radius:14px;background:#263e59;border:1px solid #e8c479';el('pj-round-label').after(reveal);}
  reveal.hidden=!previous;
  if(previous){
   reveal.replaceChildren();
   const heading=document.createElement('strong');heading.textContent='🏆 Letzte Frage: '+previous.product.name+' · Richtiger Preis: '+Number(previous.product.price).toLocaleString('de-DE',{style:'currency',currency:'EUR'});reveal.append(heading);
   for(const entry of previous.entries){const line=document.createElement('p');line.style.margin='6px 0';line.textContent=entry.name+': '+(entry.guess?Number(entry.guess).toLocaleString('de-DE',{style:'currency',currency:'EUR'}):'Keine Antwort')+' · +'+entry.challengePoints+' Punkte';reveal.append(line);}
  }
  if(room.serverNow>=ch.startAt+45000&&pjTimeoutKey!==key){pjTimeoutKey=key;request('/rooms/'+encodeURIComponent(room.code)+'/challenge-preisjaeger-timeout','POST',{challengeId:ch.id,round:pj.round}).then(r=>{if(r?.room)acceptRoom(r.room)}).catch(e=>{pjTimeoutKey='';console.warn('Preisjäger Timeout',e)});}

 }
 const isMath=ch.order[index]==='recheninsel';
 const originalMathActive=isMath&&ch.phase==='countdown'&&!recheninselOriginalFailed;
 const originalEisstockActive=ch.order[index]==='eisstock'&&['countdown','results','finished'].includes(ch.phase)&&!eisstockOriginalFailed;
 const originalFallingActive=ch.order[index]==='fallende-gegenstaende'&&['countdown','results','finished'].includes(ch.phase)&&!fallingOriginalFailed;
 const originalTimeActive=ch.order[index]==='zeitgefuehl'&&['countdown','results','finished'].includes(ch.phase)&&!zeitgefuehlOriginalFailed;
 const originalHuetchenActive=ch.order[index]==='huetchen-challenge'&&ch.phase==='countdown'&&!huetchenOriginalFailed;
 const originalMaulwurfActive=ch.order[index]==='maulwurf-arena'&&ch.phase==='countdown'&&!maulwurfOriginalFailed;
 const originalBomberActive=ch.order[index]==='bomber-strand-arena'&&(ch.phase==='countdown'||ch.phase==='results'||ch.phase==='finished')&&!bomberOriginalFailed;
 const originalSnakeActive=ch.order[index]==='snake-arena'&&ch.phase==='countdown'&&!snakeOriginalFailed;
 const originalLavaActive=ch.order[index]==='lava-arena'&&(ch.phase==='countdown'||ch.phase==='results'||ch.phase==='finished')&&!lavaOriginalFailed;
 const originalFlusssprungActive=ch.order[index]==='flusssprung'&&(ch.phase==='countdown'||ch.phase==='results'||ch.phase==='finished')&&!flusssprungOriginalFailed;
 const originalActive=originalEisstockActive||originalFallingActive||originalMathActive||originalTimeActive||originalHuetchenActive||originalMaulwurfActive||originalFlusssprungActive||originalLavaActive||originalSnakeActive||originalBomberActive;
 if(!originalEisstockActive&&eisstockOriginalBridge){eisstockOriginalBridge.destroy();eisstockOriginalBridge=null;}
 if(!originalFallingActive&&fallingOriginalBridge){fallingOriginalBridge.destroy();fallingOriginalBridge=null;}
 if(!originalMaulwurfActive&&maulwurfOriginalBridge){maulwurfOriginalBridge.destroy();maulwurfOriginalBridge=null;}
 if(!originalBomberActive&&bomberOriginalBridge){bomberOriginalBridge.destroy();bomberOriginalBridge=null;}
 if(!originalSnakeActive&&snakeOriginalBridge){snakeOriginalBridge.destroy();snakeOriginalBridge=null;}
 if(!originalLavaActive&&lavaOriginalBridge){lavaOriginalBridge.destroy();lavaOriginalBridge=null;}
 if(!originalFlusssprungActive&&flusssprungOriginalBridge){flusssprungOriginalBridge.destroy();flusssprungOriginalBridge=null;}
 box.classList.toggle('original-edge-playing',originalActive||(isPreisjaeger&&ch.phase==='countdown'));
 el('challenge-original-frame').hidden=!originalActive;
 box.classList.toggle('maulwurf-playing',originalMaulwurfActive||originalFlusssprungActive||originalLavaActive||originalSnakeActive||originalBomberActive);
 box.classList.toggle('preisjaeger-playing',isPreisjaeger&&ch.phase==='countdown');
 if(originalEisstockActive){ensureEisstockOriginalBridge();eisstockOriginalBridge?.sync();}
 if(originalFallingActive){ensureFallingOriginalBridge();fallingOriginalBridge?.sync();}
 if(originalMathActive){ensureRecheninselOriginalBridge();recheninselOriginalBridge?.sync();}
 if(originalTimeActive){ensureZeitgefuehlOriginalBridge();zeitgefuehlOriginalBridge?.sync();}
 if(originalHuetchenActive){ensureHuetchenOriginalBridge();huetchenOriginalBridge?.sync();}
 if(originalMaulwurfActive){ensureMaulwurfOriginalBridge();maulwurfOriginalBridge?.sync();}
 if(originalFlusssprungActive){ensureFlusssprungOriginalBridge();flusssprungOriginalBridge?.sync();}
 if(originalLavaActive){ensureLavaOriginalBridge();lavaOriginalBridge?.sync();}
 if(originalSnakeActive){ensureSnakeOriginalBridge();snakeOriginalBridge?.sync();}
 if(originalBomberActive){ensureBomberOriginalBridge();bomberOriginalBridge?.sync();}

 const myMathSeat=room.players.find(p=>p.me)?.seat;
 const answered=!!ch.math?.answered?.includes(myMathSeat);
 const mathBoard=el('challenge-math-board');
 const mathBoardKey=ch.id+':'+index+':'+(ch.math?.round||1)+':'+(ch.math?.a??'')+':'+(ch.math?.b??'');
 if(isMath&&ch.math&&mathBoard.dataset.round!==mathBoardKey){
  mathBoard.dataset.round=mathBoardKey;
  mathBoard.replaceChildren();
  const a=Number(ch.math.a),b=Number(ch.math.b),op=ch.math.operator;
  const correct=op==='+'?a+b:op==='-'||op==='−'?a-b:op==='×'||op==='*'?a*b:op==='÷'?a/b:NaN;
  const candidates=new Set(Number.isInteger(correct)&&correct>=0?[correct]:[0]);
  for(let i=1;candidates.size<15&&i<300;i++){
   const delta=Math.ceil(i/2)*(i%2?-1:1)*(correct<30?1:correct<100?2:5);
   if(Number.isInteger(correct+delta)&&correct+delta>=0&&correct+delta<=1000)candidates.add(correct+delta);
  }
  const choices=[...candidates].sort((x,y)=>{
   const hash=n=>{let v=(Math.imul((n+101)|0,2654435761)^Math.imul((a+11)|0,2246822519)^Math.imul((b+7)|0,3266489917)^Math.imul((ch.math.round||1),668265263))>>>0;return v;};
   return hash(x)-hash(y);
  });
  choices.forEach(value=>{const btn=document.createElement('button');btn.type='button';btn.textContent=String(value);btn.dataset.value=String(value);btn.setAttribute('aria-label','Antwort '+value);btn.addEventListener('click',()=>{if(btn.disabled||answered||Number(ch.startAt)>(Number(room.serverNow)||Date.now()))return;mathBoard.querySelectorAll('button').forEach(b=>{b.classList.remove('selected');b.disabled=true;});btn.classList.add('selected');el('challenge-math-input').value=String(value);el('challenge-math-send').click();});mathBoard.append(btn);});
 }
 mathBoard.querySelectorAll('button').forEach(btn=>{btn.disabled=answered||Number(ch.startAt)>Number(room.serverNow);});
 if(isMath&&answered)mathBoard.querySelectorAll('button').forEach(btn=>btn.disabled=true);
 const mathRoundKey=ch.id+':'+index+':'+(ch.math?.round||1);
 if(el('challenge-math').dataset.round!==mathRoundKey){el('challenge-math').dataset.round=mathRoundKey;el('challenge-math-input').value='';}
 if(isMath&&ch.phase==='countdown'){
  const playerList=el('challenge-math-players');playerList.replaceChildren();
  (room.players||[]).filter(p=>p.participating).forEach(p=>{
   const card=document.createElement('div');card.className='pirate-player'+(p.me?' me':'')+(ch.math?.answered?.includes(p.seat)?' done':'');
   const name=document.createElement('strong');name.textContent=(p.me?'⭐ ':'🏴‍☠️ ')+(p.name||'Spieler');
   const status=document.createElement('small');status.textContent=ch.math?.answered?.includes(p.seat)?'✓ Antwort abgegeben':'⏳ Überlegt noch';
   card.append(name,status);playerList.append(card);
  });
 }
 el('challenge-math').hidden=!isMath||ch.phase!=='countdown'||originalActive;
 el('challenge-math-question').textContent=isMath&&ch.math?'Runde '+(ch.math.round||1)+' / '+(ch.math.totalRounds||3)+' · '+ch.math.a+' '+ch.math.operator+' '+ch.math.b+' = ?':'';
 el('challenge-math-send').disabled=answered||Number(ch.startAt)>Number(room.serverNow);
 el('challenge-math-input').disabled=answered;
 el('challenge-math-feedback').textContent=answered?'✓ Antwort gespeichert. Warte auf die Mitspieler.':'';
 const isTime=ch.order[index]==='zeitgefuehl';
 const mySeat=room.players.find(p=>p.me)?.seat;
 const stopped=(ch.stopped||[]).includes(mySeat);
 el('challenge-time-target').textContent=isTime?'🎯 Ziel: '+ch.targetSeconds+' Sekunden · Die ersten drei Sekunden werden angezeigt. Danach schätze die Zeit!':'';
 el('challenge-time-stop').hidden=!isTime||ch.phase!=='countdown'||stopped||originalTimeActive;
 el('challenge-time-stop').disabled=challengeStopBusy||Number(ch.startAt)>Number(room.serverNow)||stopped;
 const resultsBox=el('challenge-results');
 resultsBox.replaceChildren();
 if(ch.phase==='results'||ch.phase==='finished'){
  const result=ch.results[ch.results.length-1];
  const rechenFinale=ch.phase==='finished'&&ch.order.length===1&&ch.order[index]==='recheninsel';
  const title=document.createElement('h3');title.textContent=rechenFinale?'🏴‍☠️ PIRATEN-SIEGEREHRUNG':ch.phase==='finished'?'🏆 Finale Siegerehrung':'🎉 Minispiel abgeschlossen';if(rechenFinale)title.className='rechen-finale-heading';resultsBox.append(title);
  if(rechenFinale){const subtitle=document.createElement('div');subtitle.className='rechen-finale-subtitle';subtitle.textContent='⚓ Recheninsel · Alle drei Schatzrätsel gemeistert';resultsBox.append(subtitle);}
  if(result?.game==='preisjaeger'&&Array.isArray(result.rounds)){
   const rounds=document.createElement('div');rounds.style.cssText='display:grid;gap:12px;max-width:680px;margin:15px auto';
   for(const round of result.rounds){
    const section=document.createElement('section');section.style.cssText='padding:16px;border-radius:16px;background:#071d33;border:1px solid #d4b56b;text-align:left';
    const heading=document.createElement('h4');heading.style.cssText='margin:0 0 10px;color:#ffd27b';heading.textContent='🛒 Frage '+round.round+' · '+round.product.name;section.append(heading);
    const price=document.createElement('strong');price.textContent='💰 Richtiger Preis: '+Number(round.product.price).toLocaleString('de-DE',{style:'currency',currency:'EUR'});section.append(price);
    for(const entry of round.entries){
     const line=document.createElement('p');line.style.cssText='display:flex;justify-content:space-between;gap:10px;margin:9px 0 0';
     const name=document.createElement('span');name.textContent=entry.name;
     const value=document.createElement('span');value.textContent=(entry.guess?Number(entry.guess).toLocaleString('de-DE',{style:'currency',currency:'EUR'}):'Keine Antwort')+' · +'+entry.challengePoints+' Punkte';
     line.append(name,value);section.append(line);
    }
    rounds.append(section);
   }
   resultsBox.append(rounds);
  }
  if(result?.game==='recheninsel'&&Array.isArray(result.rounds)){
   const rounds=document.createElement('div');rounds.className=rechenFinale?'rechen-finale-rounds':'rechen-rounds';
   result.rounds.forEach(r=>{
    const section=document.createElement('section');section.className='rechen-round-card';
    const heading=document.createElement('strong');heading.className='rechen-round-heading';heading.textContent='🧭 Runde '+r.round+' · '+r.question+' = '+r.answer;section.append(heading);
    const entries=document.createElement('div');entries.className='rechen-round-entries';
    (r.standings||[]).forEach(entry=>{
     const line=document.createElement('div');line.className='rechen-round-entry';
     const name=document.createElement('span');name.textContent=entry.name;
     const score=document.createElement('span');score.className=entry.correct?'rechen-correct':'rechen-incorrect';
     score.textContent=(entry.correct?'✓ ':'✕ ')+(entry.challengePoints||0)+' P.';
     line.append(name,score);entries.append(line);
    });section.append(entries);rounds.append(section);
   });resultsBox.append(rounds);
  }
  if(result?.game==='recheninsel'&&typeof result.answer==='number'){const solution=document.createElement('p');solution.textContent='🏴‍☠️ Lösung: '+result.question+' = '+result.answer;resultsBox.append(solution);}
  if(result?.standings&&!rechenFinale){
   const list=document.createElement('div');list.style.cssText='display:grid;gap:9px;margin:14px auto;max-width:540px';
   result.standings.slice().sort((a,b)=>(b.challengePoints||0)-(a.challengePoints||0)||(a.deltaMs??0)-(b.deltaMs??0)||a.name.localeCompare(b.name)).forEach((entry,i,sorted)=>{
    const card=document.createElement('div');card.style.cssText='padding:12px;border-radius:12px;background:#ffffff1c;display:flex;justify-content:space-between;gap:12px';
    const name=document.createElement('strong');const rank=result.game==='maulwurf-arena'?sorted.findIndex(p=>p.score===entry.score):i;name.textContent=(['🥇','🥈','🥉'][rank]||'🎮')+' '+entry.name;
    const points=document.createElement('span');points.textContent=(typeof entry.elapsedMs==='number'?(entry.elapsedMs/1000).toFixed(2)+' s · ':'')+(typeof entry.correct==='boolean'?(entry.correct?'✓ Richtig · ':'✗ Falsch · '):'')+(result.game==='maulwurf-arena'?entry.score+' Trefferpunkte · ':'')+'+'+entry.challengePoints+' Punkte';
    card.append(name,points);list.append(card);
   });resultsBox.append(list);
  }
  if(ch.phase==='results'&&Array.isArray(ch.totals)&&ch.totals.length){
   const totalTitle=document.createElement('h3');totalTitle.textContent='🏆 Gesamtwertung nach '+(index+1)+' von '+ch.order.length+' Spielen';totalTitle.style.cssText='margin:18px 0 8px;color:#ffe4a2';resultsBox.append(totalTitle);
   const totalList=document.createElement('div');totalList.style.cssText='display:grid;gap:7px;max-width:540px;margin:0 auto 14px';
   const totals=ch.totals.slice().sort((a,b)=>b.points-a.points||a.seat-b.seat);
   totals.forEach((entry,i)=>{const row=document.createElement('div');row.style.cssText='display:flex;justify-content:space-between;gap:12px;padding:11px 15px;border:1px solid #f8d68d66;border-radius:12px;background:#071e2abf';const name=document.createElement('strong');const rank=totals.findIndex(p=>p.points===entry.points);name.textContent=(['🥇','🥈','🥉'][rank]||'🎮')+' '+entry.name;const points=document.createElement('strong');points.textContent=entry.points+' Punkte gesamt';row.append(name,points);totalList.append(row);});resultsBox.append(totalList);
  }
  if(ch.phase==='finished'){
   if(rechenFinale){
    const standings=(ch.totals||[]).slice().sort((a,b)=>b.points-a.points||a.seat-b.seat);
    const winners=standings.filter(p=>p.points===standings[0]?.points);
    const hero=document.createElement('div');hero.className='rechen-finale-hero';
    const emblem=document.createElement('div');emblem.className='rechen-finale-emblem';emblem.textContent='🏆';hero.append(emblem);
    const kicker=document.createElement('div');kicker.className='rechen-finale-kicker';kicker.textContent=winners.length>1?'GEMEINSAMER SCHATZSIEG':'KAPITÄN DER RECHENINSEL';hero.append(kicker);
    const champion=document.createElement('div');champion.className='rechen-finale-champion';champion.textContent=winners.length?winners.map(p=>p.name).join(' & '):'Schatzrunde beendet';hero.append(champion);
    if(winners.length){const lead=document.createElement('div');lead.className='rechen-finale-lead';lead.textContent=winners[0].points+' Punkte · '+(winners.length>1?'Gleichstand!':'Platz 1');hero.append(lead);}
    resultsBox.append(hero);
    const podium=document.createElement('div');podium.className='rechen-finale-podium';
    standings.forEach((entry,i)=>{
     const rank=standings.findIndex(p=>p.points===entry.points)+1;
     const row=document.createElement('div');row.className='rechen-finale-rank'+(rank===1?' first':'');
     const medal=document.createElement('span');medal.className='rechen-finale-medal';medal.textContent=rank===1?'🥇':rank===2?'🥈':rank===3?'🥉':'🏴‍☠️';
     const name=document.createElement('strong');name.textContent=entry.name;
     const points=document.createElement('span');points.className='rechen-finale-points';points.textContent=entry.points+' Punkte';
     row.append(medal,name,points);podium.append(row);
    });resultsBox.append(podium);
    if(result?.rounds?.length){const detail=document.createElement('div');detail.className='rechen-finale-details-label';detail.textContent='📜 Die drei Schatzprüfungen';const rounds=resultsBox.querySelector('.rechen-finale-rounds');if(rounds)resultsBox.insertBefore(detail,rounds);}
   }else{
   const total=document.createElement('h3');total.textContent='Gesamtwertung';if(!rechenFinale)resultsBox.append(total);
   const standings=(ch.totals||[]).slice().sort((a,b)=>b.points-a.points||a.seat-b.seat);
   const winners=standings.filter(p=>p.points===standings[0]?.points);
   if(winners.length){const banner=document.createElement('div');banner.style.cssText='padding:18px;margin:15px auto;border-radius:18px;background:linear-gradient(120deg,#ffe8a3,#ffc964);color:#42310d;font-size:clamp(19px,3vw,29px);font-weight:900;max-width:570px';banner.textContent=winners.length===1?'🏆 Sieger: '+winners[0].name:'🏆 Gemeinsamer Sieg: '+winners.map(p=>p.name).join(' & ');if(rechenFinale)banner.className='rechen-finale-winner';resultsBox.append(banner);}
   const podium=document.createElement('div');podium.style.cssText='display:grid;gap:10px;max-width:570px;margin:12px auto';
   if(rechenFinale)podium.className='rechen-finale-podium';standings.forEach((entry,i)=>{const row=document.createElement('div');const rank=standings.findIndex(p=>p.points===entry.points)+1;row.style.cssText='display:flex;align-items:center;justify-content:space-between;gap:10px;padding:14px 18px;border-radius:15px;background:'+(rank===1?'linear-gradient(120deg,#ffe3a0,#f8c65b);color:#3c2b0c':'#ffffff22;color:white')+';font-weight:750';const name=document.createElement('span');name.textContent=(rank===1?'🥇':rank===2?'🥈':rank===3?'🥉':'🎮')+' '+entry.name;const points=document.createElement('strong');points.textContent=entry.points+' Punkte';row.append(name,points);podium.append(row);});resultsBox.append(podium);
   }
  }
 }
 const estimatedServerNow=Number(room.serverNow)||Date.now();
 const observedAt=Date.now();
 const draw=()=>{
  const remaining=Number(ch.startAt)-(estimatedServerNow+Date.now()-observedAt);
  const clockEl=el('challenge-clock'),statusEl=el('challenge-progress-status');
  if(ch.phase==='results'||ch.phase==='finished'){
   const overlay=el('challenge-start-overlay');if(overlay)overlay.hidden=true;
   clockEl.textContent=ch.phase==='finished'?'🏆':'🎉';
   statusEl.textContent=ch.phase==='finished'?'Die Challenge ist beendet.':'Auswertung abgeschlossen. Der Host startet das nächste Spiel.';
   return;
  }
  const startOverlay=el('challenge-start-overlay');
  if(startOverlay){
   const visible=remaining>0&&remaining<=4000;
   startOverlay.hidden=!visible;
   if(visible)el('challenge-start-number').textContent=String(Math.max(1,Math.ceil(remaining/1000)));
  }
  if(remaining>0){
   clockEl.textContent=String(Math.max(1,Math.ceil(remaining/1000)));
   statusEl.textContent='Start wird vom Server gesteuert. Bitte bereithalten.';
   return;
  }
  if(remaining<=0&&remaining>-950&&startOverlay){startOverlay.hidden=false;el('challenge-start-number').textContent='0';el('challenge-start-caption').textContent='⚔️ LOS GEHT’S!';}
  else if(startOverlay){startOverlay.hidden=true;el('challenge-start-caption').textContent='🏴‍☠️ Macht euch bereit!';}
  if(isTime){
   if(remaining<=-30000){
    statusEl.textContent='⏳ Zeitlimit erreicht – Server wertet aus.';
    el('challenge-time-stop').disabled=true;
    const key=ch.id+':'+index;
    if(!challengeTimeTimeoutPending.has(key)){
     challengeTimeTimeoutPending.add(key);
     request('/rooms/'+encodeURIComponent(room.code)+'/challenge-time-timeout','POST',{challengeId:ch.id})
      .then(response=>acceptRoom(response.room))
      .catch(()=>setTimeout(()=>challengeTimeTimeoutPending.delete(key),1800));
    }
   }
   clockEl.textContent=stopped?'✓':remaining<=-3000?'❓':String(Math.max(1,Math.floor(-remaining/1000)+1));
   statusEl.textContent=stopped?'✓ Stopp gespeichert – warte auf die Mitspieler.':'⏱️ Zeitgefühl läuft – drücke STOPP bei deiner geschätzten Zielzeit.';
   if(!stopped)el('challenge-time-stop').disabled=challengeStopBusy||remaining<=-30000;
  }else if(isMath){
   const round=ch.math?.round||1,limitMs=[18000,16000,15000][Math.min(2,round-1)];
   const elapsedMs=Math.max(0,-remaining);
   const secondsLeft=Math.max(0,Math.ceil((limitMs-elapsedMs)/1000));
   clockEl.textContent=secondsLeft+' s';
   if(elapsedMs>=limitMs){
    statusEl.textContent='⏳ Zeit abgelaufen – Antworten werden ausgewertet.';
    el('challenge-math-board').querySelectorAll('button').forEach(btn=>btn.disabled=true);
    const key=ch.id+':'+index+':'+round;
    if(!challengeMathTimeoutPending.has(key)){
     challengeMathTimeoutPending.add(key);
     request('/rooms/'+encodeURIComponent(room.code)+'/challenge-math-timeout','POST',{challengeId:ch.id,round})
      .then(response=>acceptRoom(response.room))
      .catch(()=>{setTimeout(()=>challengeMathTimeoutPending.delete(key),1800);});
    }
   }else{
   statusEl.textContent=answered?'Antwort gespeichert – warte auf die Mitspieler.':'Löse die Rechenaufgabe und sende deine Antwort ab.';
   if(!answered){el('challenge-math-send').disabled=false;el('challenge-math-board').querySelectorAll('button').forEach(b=>b.disabled=false);}
   }
  }else if(isPreisjaeger){
   const elapsed=Math.max(0,-remaining),left=Math.max(0,Math.ceil((45000-elapsed)/1000));
   clockEl.textContent=left+' s';
   el('pj-timebar').style.width=(100*Math.max(0,Math.min(1,(45000-elapsed)/45000))).toFixed(1)+'%';
   const mySeat=room.players.find(p=>p.me)?.seat,done=!!ch.preisjaeger?.answered?.includes(mySeat);
   statusEl.textContent=done?'🔒 Schätzung gespeichert – warte auf die Mitspieler.':'🛒 Was kostet dieses Produkt? Gib deine geheime Schätzung ein!';
   el('pj-guess').disabled=done||elapsed>=45000;
   el('pj-submit').disabled=done||elapsed>=45000;
   if(elapsed>=45000){
    statusEl.textContent='⏳ Zeit abgelaufen – Preisfrage wird ausgewertet.';
    const key=ch.id+':'+index+':'+(ch.preisjaeger?.round||1);
    if(pjTimeoutKey!==key){pjTimeoutKey=key;request('/rooms/'+encodeURIComponent(room.code)+'/challenge-preisjaeger-timeout','POST',{challengeId:ch.id,round:ch.preisjaeger.round}).then(response=>acceptRoom(response.room)).catch(()=>setTimeout(()=>{if(pjTimeoutKey===key)pjTimeoutKey='';},1800));}
   }
  }else{
   clockEl.textContent='⏳';
   statusEl.textContent='🎮 Das Minispiel läuft.';
  }
 };
 draw();
 if(ch.phase==='countdown'&&(Number(ch.startAt)>estimatedServerNow||isTime&&!stopped||isMath||isPreisjaeger))challengeClockTimer=setInterval(draw,80);
}
function renderChallengeSetup(showStage){
 let box=el('challenge-settings-panel');
 if(!box){
  box=document.createElement('section');box.id='challenge-settings-panel';
  box.style.cssText='padding:18px;margin:12px 0;border:1px solid #49a6c5;border-radius:20px;background:linear-gradient(145deg,#092b47,#06253e);color:#fff;box-shadow:0 12px 32px #00162980';box.classList.add('challenge-premium');
  box.innerHTML=`<div style="display:flex;align-items:center;gap:12px;margin-bottom:10px"><span style="font-size:36px">🏆</span><div><h3 style="margin:0;font-size:25px">Party Challenge</h3><small style="color:#d5eaff">ALLE 11 MINISPIELE · EIN GEMEINSAMER RAUM</small></div></div><p style="color:#d4e7f6;margin:12px 0 20px">Wähle die Challenge. Die Minispiele werden nacheinander gespielt und alle Punkte zusammengezählt.</p><div style="margin:20px 0 12px;padding:16px;border-radius:18px;background:linear-gradient(135deg,#132c48,#285b71);color:white"><div style="font-size:20px;font-weight:900">🎮 Wähle dein Minispiel</div><p style="margin:7px 0 14px;color:#d3e6f5">Wählt euer Spiel. Nach der Runde könnt ihr direkt wiederholen oder ein anderes Spiel auswählen.</p><div id="challenge-single-grid" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(145px,1fr));gap:10px"></div><button type="button" id="challenge-marathon" style="margin-top:14px;padding:12px 18px;border-radius:12px;border:2px solid #d9b878;background:#f8e7bd;color:#24334b;font-weight:900;cursor:pointer">🏆 Challenge spielen</button></div><label for="challenge-count" style="display:block;font-weight:700;margin:18px 0 7px">🎲 Challenge-Umfang</label><select id="challenge-count" style="width:100%;max-width:440px;min-height:45px;border-radius:12px;border:1px solid #c7d4e3;padding:8px 12px;background:white"><option value="11">✅ 11 Online-Minispiele</option><option value="1">🎮 Ein einzelnes Minispiel</option></select><div style="display:flex;flex-wrap:wrap;gap:10px;margin-top:14px"><button type="button" id="challenge-save" style="border:0;border-radius:12px;padding:12px 17px;background:#167d72;color:white;font-weight:700">✓ Auswahl speichern</button><button type="button" id="challenge-bots" style="border:1px solid #c8d7e8;border-radius:12px;padding:12px 17px;background:white;color:#243b5a;font-weight:700">🤖 2 Testspieler hinzufügen</button></div><p id="challenge-feedback" role="status" style="font-size:13px;color:#c6e5f5;margin:12px 0 0"></p>`;
  const anchor=el('game-stage-hero');anchor.parentNode.insertBefore(box,anchor);
  el('challenge-bots').addEventListener('click',async()=>{
   if(!room?.host)return;
   const button=el('challenge-bots');button.disabled=true;
   try{const enabled=!room.players.some(p=>p.testBot);const response=await request('/rooms/'+encodeURIComponent(room.code)+'/challenge-test-players','POST',{enabled});acceptRoom(response.room);el('challenge-feedback').textContent=enabled?'Zwei Testspieler hinzugefügt.':'Testspieler entfernt.';}
   catch(e){el('challenge-feedback').textContent='Testspieler: '+e.message;}
   finally{button.disabled=false;}
  });
  let challengeSettingsBusy=false;
  const totalMinigames=11;
  const singleGames=[['zeitgefuehl','⏱️','Zeitgefühl'],['recheninsel','🏴‍☠️','Recheninsel'],['huetchen-challenge','🎩','Hütchen Challenge'],['maulwurf-arena','🔨','Maulwurf Arena'],['flusssprung','🌊','Flusssprung'],['lava-arena','🌋','Lava Arena'],['snake-arena','🐍','Snake Arena'],['bomber-strand-arena','💣','Bomber Strand'],['preisjaeger','🛒','Preisjäger'],['eisstock','🥌','Eisstock'],['fallende-gegenstaende','🎹','Fallende Gegenstände']];
  const grid=el('challenge-single-grid');
  for(const [id,icon,title] of singleGames){
   const btn=document.createElement('button');btn.type='button';btn.dataset.minigame=id;
   btn.style.cssText='min-height:100px;border-radius:15px;border:2px solid #ffffff55;background:linear-gradient(150deg,#ffffff22,#071b3288);color:white;cursor:pointer;padding:12px;text-align:center;transition:transform .12s,border-color .12s';
   btn.innerHTML='<span class="mini-art" aria-hidden="true">'+icon+'</span><strong>'+title+'</strong><span class="mini-meta"><span class="mini-online">● Online verfügbar</span><span class="mini-players">♟ 2–4</span></span><span class="mini-picked" aria-hidden="true"></span>';
   btn.addEventListener('click',async()=>{
    if(!room?.host||room.phase!=='preparing'||challengeSettingsBusy)return;
    challengeSettingsBusy=true;btn.disabled=true;
    try{const requestedCode=room.code;const response=await request('/rooms/'+encodeURIComponent(requestedCode)+'/challenge-settings','POST',{count:1,selectedGame:id});if(code!==requestedCode)return;acceptRoom(response.room);el('challenge-feedback').textContent='✓ '+title+' ausgewählt! Alle Spieler können sich bereit melden.';}
    catch(e){el('challenge-feedback').textContent='Auswahl fehlgeschlagen: '+e.message;}
    finally{btn.disabled=false;challengeSettingsBusy=false;}
   });grid.append(btn);
  }
  el('challenge-marathon').addEventListener('click',async()=>{
   if(!room?.host||room.phase!=='preparing'||challengeSettingsBusy)return;
   const button=el('challenge-marathon');if(button.disabled)return;
   challengeSettingsBusy=true;button.disabled=true;
   try{const requestedCode=room.code;const response=await request('/rooms/'+encodeURIComponent(requestedCode)+'/challenge-settings','POST',{count:totalMinigames,selectedGame:null});if(code!==requestedCode)return;acceptRoom(response.room);el('challenge-feedback').textContent='🏆 Alle neun Minispiele ausgewählt.';}
   catch(e){el('challenge-feedback').textContent=e.message;}
   finally{button.disabled=false;challengeSettingsBusy=false;}
  });
  el('challenge-save').addEventListener('click',async()=>{
   if(challengeSettingsBusy)return;
   const button=el('challenge-save');if(button.disabled)return;
   challengeSettingsBusy=true;button.disabled=true;
   try{if(!room?.host||room.phase!=='preparing')return;const selectedGame=el('challenge-count').value==='1'?(room.settings?.partychallenge?.selectedGame||'zeitgefuehl'):null;const count=selectedGame?1:totalMinigames;if(count===Number(room.settings?.partychallenge?.count)&&(selectedGame||null)===(room.settings?.partychallenge?.selectedGame||null)){el('challenge-feedback').textContent='✓ Bereits gespeichert – die Bereitmeldungen bleiben erhalten.';return;}const requestedCode=room.code;await request('/rooms/'+encodeURIComponent(requestedCode)+'/challenge-settings','POST',{count,selectedGame});if(code!==requestedCode)return;el('challenge-feedback').textContent='Auswahl gespeichert. Alle Spieler müssen erneut bereit sein.';const updated=await request('/rooms/'+encodeURIComponent(requestedCode));if(code!==requestedCode)return;acceptRoom(updated.room);}
   catch(e){el('challenge-feedback').textContent='Speichern fehlgeschlagen: '+e.message;}
   finally{button.disabled=false;challengeSettingsBusy=false;}
  });
 }
 // Keep exactly one selector and exactly nine buttons even after repeated room refreshes.
 const panels=document.querySelectorAll('#challenge-settings-panel');
 panels.forEach((panel,index)=>{if(index>0)panel.remove();});
 const cardGrid=box.querySelector('#challenge-single-grid');
 if(cardGrid){
  const seen=new Set();
  cardGrid.querySelectorAll('button[data-minigame]').forEach(button=>{
   if(seen.has(button.dataset.minigame))button.remove();
   else seen.add(button.dataset.minigame);
  });
 }
 // Normalize duplicate nodes, including buttons accidentally inserted without data attributes.
 const expectedIds=['zeitgefuehl','recheninsel','huetchen-challenge','maulwurf-arena','flusssprung','lava-arena','snake-arena','bomber-strand-arena','preisjaeger','eisstock','fallende-gegenstaende'];
 if(cardGrid){
  const cards=Array.from(cardGrid.children);
  const kept=new Set();
  cards.forEach(card=>{
   const id=card.dataset?.minigame;
   if(!expectedIds.includes(id)||kept.has(id)){card.remove();return;}
   kept.add(id);
  });
  expectedIds.forEach((id,index)=>{
   const card=Array.from(cardGrid.children).find(item=>item.dataset?.minigame===id);
   if(card&&cardGrid.children[index]!==card)cardGrid.insertBefore(card,cardGrid.children[index]||null);
  });
 }
 const active=showStage&&room?.game==='partychallenge';
// Keep the ready button beside the room seats on Challenge only; restore it
// to its original column for every other game. Moving the same DOM node
// preserves listeners, IDs, readiness state and server-side permissions.
const readyPanel=el('ready-panel');
const roomColumns=el('room-view')?.querySelectorAll(':scope > .stack');
const challengeRoomCard=roomColumns?.[1]?.querySelector(':scope > .panel');
if(readyPanel&&roomColumns?.length===2&&challengeRoomCard){
 if(active&&readyPanel.parentElement!==challengeRoomCard){
  const launch=el('challenge-host-launch');
  if(launch?.parentElement===challengeRoomCard)challengeRoomCard.insertBefore(readyPanel,launch);
  else challengeRoomCard.append(readyPanel);
 }else if(!active&&readyPanel.parentElement!==roomColumns[0]){
  roomColumns[0].append(readyPanel);
 }
}
box.classList.toggle('hidden',!active);document.body.classList.toggle('challenge-room-active',Boolean(active));
// The top navigation must lead to the visible Challenge settings rather than
// the readiness button (which is now docked in the right-hand room rail).
const settingsNav=document.querySelector('.premium-nav a[data-lobby-settings]');
if(settingsNav){
 settingsNav.setAttribute('href',active?'#challenge-settings-panel':'#ready-panel');
 settingsNav.setAttribute('aria-label',active?'Challenge-Einstellungen öffnen':'Spiel-Einstellungen und Bereitschaft öffnen');
}const genericChooser=el('game-chooser');if(genericChooser){genericChooser.hidden=Boolean(active);genericChooser.style.display=active?'none':'';}
 if(!active)return;
 if(room.phase!=='preparing')el('challenge-feedback').textContent='';
 if(document.activeElement!==el('challenge-count'))el('challenge-count').value=String(room.settings?.partychallenge?.selectedGame?1:totalMinigames);
 const selected=room.settings?.partychallenge?.selectedGame||null;
 el('challenge-single-grid').querySelectorAll('button').forEach(btn=>{const chosen=btn.dataset.minigame===selected;btn.style.borderColor=chosen?'#ffdd7b':'#ffffff55';btn.style.boxShadow=chosen?'0 0 0 3px #ffdd7b66':'none';btn.setAttribute('aria-pressed',String(chosen));btn.querySelector('.mini-picked').textContent=chosen?'✓ AUSGEWÄHLT':'';btn.disabled=!room.host||room.phase!=='preparing';});
 let choiceStatus=el('challenge-choice-status');
 if(!choiceStatus){choiceStatus=document.createElement('div');choiceStatus.id='challenge-choice-status';choiceStatus.style.cssText='margin:12px 0;padding:12px 16px;border-radius:14px;background:#e7f4f0;color:#16584d;font-weight:750';el('challenge-single-grid').after(choiceStatus);}
 const selectedTitle=selected?(CHALLENGE_LABELS[selected]||selected):null;
 choiceStatus.textContent=selectedTitle?'🎮 Gewählt: '+selectedTitle+' · '+(room.host?'Warte auf die Bereitmeldungen.':'Der Host hat dieses Minispiel ausgewählt.'):'🏆 Party-Challenge mit allen verfügbaren Spielen ausgewählt.';
 el('challenge-marathon').disabled=!room.host||room.phase!=='preparing';
 el('challenge-count').disabled=!room.host||room.phase!=='preparing';
 el('challenge-save').hidden=!room.host||room.phase!=='preparing';
 el('challenge-bots').hidden=!room.host||room.phase!=='preparing';
 el('challenge-bots').textContent=room.players.some(p=>p.testBot)?'🤖 2 Testspieler entfernen':'🤖 2 Testspieler hinzufügen';
}
function render(){
 if(room?.game==='kreuz'&&room.phase==='preparing'&&new URL(location.href).searchParams.get('stage')==='1'){
  location.replace('KreuzKunter/kreuzkunter_start.html?room='+encodeURIComponent(room.code));
  return;
 }
 if(room?.game==='business'&&room.phase==='preparing'&&new URL(location.href).searchParams.get('stage')==='1'){
  location.replace('Business/business_start.html?room='+encodeURIComponent(room.code));
  return;
 }
 if(room?.game==='barikade'&&room.phase==='preparing'&&new URL(location.href).searchParams.get('stage')==='1'){
  location.replace('Barikade/barikade_start.html?room='+encodeURIComponent(room.code));
  return;
 }
 if(room?.game==='skyjo'&&room.phase==='preparing'&&new URL(location.href).searchParams.get('stage')==='1'){
  location.replace('Skyjo/skyjo_start.html?room='+encodeURIComponent(room.code));
  return;
 }
 const account=activeProfile();
 el('account-name').textContent=account?.profile?.name||account?.user?.email||'Noch nicht angemeldet';
 el('account-info').textContent=account?'Dein verifiziertes Online-Spielerprofil ist verbunden.':'Bitte anmelden oder ein Profil erstellen, um einen Raum zu betreten.';
 el('login-btn').textContent=account?'Profil ansehen':'Anmelden';
 const inside=!!room;
 if(inside&&room.phase==='lobby'&&!room.game&&new URL(location.href).searchParams.get('stage')==='1'){
  location.replace('spielauswahl-online.html?room='+encodeURIComponent(room.code));
  return;
 }
 el('entry-view').classList.toggle('hidden',inside);
 el('room-view').classList.toggle('hidden',!inside);
 el('create-btn').disabled=!account||operation;el('join-btn').disabled=!account||operation;
 if(!inside||playMode!=='online')return;
 if(displayGame!==room.game){choosingGame=false;displayGame=room.game;}
 if(room.phase==='playing')choosingGame=false;
 const showStage=!!room.game&&!choosingGame;
 el('game-chooser').classList.toggle('hidden',showStage);
 el('game-stage-hero').classList.toggle('hidden',!showStage);
 el('ready-panel').classList.toggle('hidden',!showStage);
 el('kreuz-settings-panel').classList.toggle('hidden',!showStage||room.game!=='kreuz');
 renderChallengeSetup(showStage);
 renderChallengeProgress();
 el('change-game-btn').classList.toggle('hidden',!room.host||room.phase==='playing');
 if(showStage){
  el('game-stage-hero').dataset.game=room.game;
  el('selected-game-icon').textContent=GAME_ICON[room.game]||'🎲';
  el('selected-game-title').textContent=GAME[room.game]||room.game;
  el('selected-game-description').textContent=GAME_DESCRIPTIONS[room.game]||'Online-Partie vorbereiten.';
  const selected=room.players.filter(p=>p.participating).length;
  el('selected-game-badge').textContent='👥 '+selected+' von '+room.maxPlayers+' Spielplätzen';
  el('selected-game-host-note').textContent=room.host
    ?'👑 Du bist Host. Nur du kannst Spiel, Regeln und Teilnehmerplätze ändern. Jede Änderung setzt die Bereitmeldungen zurück.'
    :'🔒 Der Host legt Regeln und Teilnehmer fest. Du kannst dich selbst bereit melden, sobald du einen Spielplatz hast.';
 }
 if(room.phase==='playing'&&room.match?.participating&&room.match.id!==stayInMatchId&&room.match.id!==launchedMatchId){
   const matchId=room.match.id;
   try{enterCurrentMatch();launchedMatchId=matchId;}catch(e){showError(e);}
 }
 el('room-code').textContent=room.code;
 el('select-help').textContent=room.phase==='playing'?'Die Partie läuft. Alle bleiben im gemeinsamen Raum.':room.host?'Du bist Host: Wähle ein Spiel für deine Gruppe.':'Der Host wählt das nächste Spiel. Du kannst dich anschließend bereit melden.';
 const player=room.players.find(p=>p.me);
 const barikade=room.game==='barikade'&&!!room.settings;
 const skyjo=room.game==='skyjo'&&!!room.settings;
 const business=room.game==='business'&&!!room.settings;
 const settings=room.settings||{};
 el('business-settings-panel').classList.toggle('hidden',!business||!showStage);
 el('business-host-settings').classList.toggle('hidden',!business||!room.host||room.phase!=='preparing');
 if(business){
  el('business-settings-summary').textContent=room.settings.rounds+' Runden · '+(room.settings.rounds===10?'Schnell':room.settings.rounds===30?'Marathon':'Standard');
  el('business-rounds').value=String(room.settings.rounds);
  el('business-rounds').disabled=operation;
 }
 el('skyjo-settings-panel').classList.toggle('hidden',!skyjo||!showStage);
 el('skyjo-host-settings').classList.toggle('hidden',!skyjo||!room.host||room.phase!=='preparing');
 if(skyjo){
  const settings=room.settings||{};
  el('skyjo-settings-summary').textContent=`${settings.target} Zielpunkte · ${settings.jokerCount} Joker · Spezial ${settings.jokerEnabled?'an':'aus'} · Straßen ${settings.streetModeEnabled?'an':'aus'}`;
  document.querySelectorAll('[data-skyjo-setting]').forEach(field=>{field.value=String(settings[field.dataset.skyjoSetting]);field.disabled=operation;});
 }
 el('barikade-settings-panel').classList.toggle('hidden',!barikade||!showStage);
 el('barikade-host-settings').classList.toggle('hidden',!barikade||!room.host||room.phase!=='preparing');
 if(barikade){
   el('barikade-settings-summary').textContent=[settings.mode==='action'?'⚡ Action':'🎲 Klassisch',settings.bossMode?'👹 Bossmodus':'Ohne Bosse',`Brett: ${settings.boardTheme==='stone'?'Stein':settings.boardTheme==='classic'?'Klassisch':'Holz'}`,settings.colorMode==='wheel'?'🎰 Farben auslosen':'🎨 Farbwahl'].join(' · ');
   document.querySelectorAll('[data-barikade-setting]').forEach(field=>{field.value=String(settings[field.dataset.barikadeSetting]);field.disabled=operation;});
   document.querySelectorAll('.hub-action-setting').forEach(field=>field.classList.toggle('hidden',settings.mode!=='action'));
   document.querySelectorAll('.hub-boss-setting').forEach(field=>field.classList.toggle('hidden',!settings.bossMode));
 }
 const canPick=barikade&&room.phase==='preparing'&&player?.participating&&settings.colorMode==='manual';
 el('barikade-color-select-panel').classList.toggle('hidden',!canPick||!showStage);
 if(canPick){
   const picker=el('barikade-color-select');picker.value=player.colorPref||'';picker.disabled=operation;
   [...picker.options].forEach(opt=>opt.disabled=!!opt.value&&room.players.some(p=>!p.me&&p.participating&&p.colorPref===opt.value));
 }
 el('players').replaceChildren(...room.players.map(p=>{
  const div=document.createElement('div');div.className='player';
  const avatar=document.createElement('span');avatar.className='avatar';avatar.textContent='🙂';
  const name=document.createElement('span');name.className='name';name.textContent=p.name;
  const tag=document.createElement('span');tag.className='tag';tag.textContent=(p.host?'👑 Host ':'')+(p.me?'(Du)':'');name.append(tag);
  const ready=document.createElement('span');ready.className='ready'+(!p.participating?' spectator':p.ready?' yes':'');ready.textContent=!p.participating?'Zuschauer':p.ready?'✓ Bereit':'Wartet';
  div.append(avatar,name,ready);
  if(room.host&&room.game&&room.phase==='preparing'){
    const btn=document.createElement('button');btn.className='seat-button';btn.type='button';
    btn.textContent=p.participating?'Zuschauen':'Mitspielen';
    btn.disabled=operation;btn.setAttribute('aria-label',`${p.name}: ${btn.textContent}`);
    btn.addEventListener('click',()=>command(async()=>{
      const {room:r}=await request('/rooms/'+code+'/seats','POST',{seat:p.seat,participating:!p.participating});activateRoom(r);
    }));
    div.append(btn);
  }
  return div;
 }));
 // Display all four lobby seats without inventing actual participants.
 const playersPanel=el('players');
 playersPanel.querySelectorAll('.seat-placeholder').forEach(node=>node.remove());
 if(room.game==='partychallenge'&&room.phase==='preparing'){
  const occupied=room.players.filter(p=>p.participating).length;
  for(let i=occupied;i<4;i++){
   const seat=document.createElement('div');seat.className='player seat-placeholder';
   seat.innerHTML='<span class="avatar seat-plus" aria-hidden="true">＋</span><span class="name">Freier Platz</span>';
   playersPanel.append(seat);
  }
 }
 document.querySelectorAll('[data-game]').forEach(btn=>{
  btn.classList.toggle('active',btn.dataset.game===room.game);
  btn.disabled=!room.host||operation||room.phase==='playing';
  btn.setAttribute('aria-pressed',String(btn.dataset.game===room.game));
 });
 el('ready-help').textContent=room.game?`${GAME[room.game]||room.game} ist ausgewählt. Nur die ausgewählten Mitspieler melden sich bereit; Zuschauer bleiben im Raum.`:'Der Host wählt zuerst ein Spiel.';
 el('ready-btn').textContent=room.phase==='playing'?'Zur laufenden Partie':player?.ready?'Bereitmeldung zurücknehmen':'Ich bin bereit';
 el('ready-btn').disabled=!room.game||!player?.participating||operation||(room.game==='skyjo'&&room.phase!=='playing'&&room.players.filter(p=>p.participating).length!==3);
 el('ready-btn').classList.toggle('is-ready',!!player?.ready);
 const playing=room.players.filter(p=>p.participating);
 const readyCount=playing.filter(p=>p.ready).length;
 const percent=playing.length?Math.round(readyCount/playing.length*100):0;
 el('ready-counter').textContent=room.phase==='playing'?'Partie läuft':room.game==='skyjo'&&playing.length!==3?'🌲 SKYJO Wald benötigt genau 3 Spieler ('+playing.length+'/3)':playing.length<2?'Mindestens 2 Spieler benötigt':room.allReady?'Alle bereit!':'Warten auf Bereitmeldungen';
 el('ready-fraction').textContent=readyCount+' / '+playing.length;
 el('ready-progress-fill').style.width=percent+'%';
 el('ready-progressbar').setAttribute('aria-valuenow',String(percent));
 el('ready-title').textContent=room.phase==='playing'?'🎮 Eure Partie läuft':'Bereit für '+(GAME[room.game]||'die Partie')+'?';
 el('ready-status').textContent=`${readyCount} von ${playing.length} Mitspielern bereit · ${room.players.length-playing.length} Zuschauer${room.allReady?' · Alle bereit!':''}`;
 el('start-btn').classList.toggle('hidden',!room.host||(room.phase!=='playing'&&!(room.game==='partychallenge'&&room.phase==='preparing'))||(room.game==='partychallenge'&&room.phase==='playing'));
 el('cancel-match-btn').classList.toggle('hidden',!room.host||room.phase!=='playing');
 el('cancel-match-btn').disabled=operation||!room.host||room.phase!=='playing';
 el('start-btn').disabled=operation||!room.host||(room.phase==='preparing'&&!room.allReady);
 el('start-btn').textContent=room.game==='partychallenge'&&room.phase==='preparing'?'🏆 Challenge starten (3–2–1–0)':room.phase==='playing'?'Beendete Partie abschließen':room.canLaunch?'Startet automatisch bei allen Bereitmeldungen':'Spielanbindung folgt';
 el('start-btn').title=room.game==='partychallenge'?'Der Host startet ausdrücklich. Der Server bestimmt die Startzeit.':room.phase==='playing'?'Nur nach beendetem Spiel möglich; der Server prüft den Sieger.':room.canLaunch?'Alle gewählten Mitspieler melden sich bereit.':'Dieses Spiel wird später angeschlossen.';
 // Keep the original start button and its event handlers; only relocate it in Party Challenge.
 const launchSlot=el('challenge-host-launch');
 const startButton=el('start-btn');
 const readyRow=el('ready-btn')?.parentElement;
 const showLaunch=room.game==='partychallenge'&&room.phase==='preparing'&&room.host;
 if(launchSlot&&startButton&&readyRow){
  launchSlot.classList.toggle('hidden',!showLaunch);
  if(showLaunch){
   if(startButton.parentElement!==launchSlot)launchSlot.append(startButton);
  }else if(startButton.parentElement===launchSlot){
   const cancelButton=el('cancel-match-btn');
   if(cancelButton&&cancelButton.parentElement===readyRow)readyRow.insertBefore(startButton,cancelButton);
   else readyRow.append(startButton);
  }
 }
 el('leave-btn').disabled=room.phase==='playing'||operation;
 el('integration-note').textContent=room.phase==='playing'
  ?'Die Partie läuft. Nach dem bestätigten Spielende kehren alle automatisch in diesen Raum zurück.'
  :room.phase==='lobby'&&room.lastCompleted?.id
   ?(room.lastCompleted.status==='aborted'?'⏹ Partie ohne Wertung beendet: ':'🎉 Letzte Partie abgeschlossen: ')+(GAME[room.lastCompleted.game]||room.lastCompleted.game)+'. Ihr seid weiterhin im selben Raum – der Host kann das nächste Spiel auswählen.'
   :room.canLaunch
    ?room.game==='partychallenge'?'Alle bereit? Dann startet der Host die Challenge mit dem Startknopf.':'Alle ausgewählten Mitspieler melden sich bereit. Das Spiel startet automatisch.'
    :'Alle vier Spiele sind mit dem gemeinsamen Raum verbunden – Beta.';
}
async function command(run){if(operation)return;operation=true;render();notice('');
 try{await run();pollErrors=0;}catch(e){showError(e);}finally{operation=false;render();}
}
el('login-btn').addEventListener('click',()=>{if(activeProfile())location.assign('profile.html');else window.SpielOnline?.openLogin?.();});
el('mode-local').addEventListener('click',()=>location.assign('spielauswahl-lokal.html'));
el('mode-online').addEventListener('click',()=>setPlayMode('online'));
el('change-game-btn').addEventListener('click',()=>{if(room?.host&&room.phase==='preparing')location.assign('spielauswahl-online.html?room='+encodeURIComponent(room.code)+'&choose=1');});

el('create-btn').addEventListener('click',()=>command(async()=>{
 const {room:r}=await request('/rooms','POST');location.assign('spielauswahl-online.html?room='+encodeURIComponent(r.code));
}));
el('join-code').addEventListener('input',event=>{event.target.value=event.target.value.toUpperCase().replace(/[^0-9A-HJ-NP-Z]/g,'').slice(0,6);notice('');});
el('join-code').addEventListener('keydown',e=>{if(e.key==='Enter')el('join-btn').click();});
el('join-btn').addEventListener('click',()=>command(async()=>{
 const c=el('join-code').value.trim().toUpperCase();if(!/^(?:\d{3}|[A-HJ-NP-Z2-9]{6})$/.test(c))throw Error('Bitte einen dreistelligen Zahlencode oder bisherigen sechsstelligen Raumcode eingeben.');
 const {room:r}=await request('/rooms/'+c+'/join','POST');location.assign('spielauswahl-online.html?room='+encodeURIComponent(r.code));
}));
document.querySelectorAll('[data-game]').forEach(btn=>btn.addEventListener('click',()=>command(async()=>{
 if(!room?.host)return;const {room:r}=await request('/rooms/'+code+'/select','POST',{game:btn.dataset.game});choosingGame=false;activateRoom(r);
}))); 
document.querySelectorAll('[data-barikade-setting]').forEach(field=>field.addEventListener('change',()=>command(async()=>{
 if(!room?.host||room.phase!=='preparing'||room.game!=='barikade')return;
 const key=field.dataset.barikadeSetting;
 const value=field.value;
 const settings={...room.settings,[key]:key==='bossMode'?value==='true':['jokerStartCount','eventFieldCount','bossEventTrigger'].includes(key)?Number(value):value};
 const {room:r}=await request('/rooms/'+code+'/settings','POST',{settings});activateRoom(r);
})));
document.querySelectorAll('[data-skyjo-setting]').forEach(field=>field.addEventListener('change',()=>command(async()=>{
 if(!room?.host||room.phase!=='preparing'||room.game!=='skyjo')return;
 const key=field.dataset.skyjoSetting;
 const raw=field.value;
 const next={...room.settings,[key]:['beginner','jokerEnabled','streetModeEnabled'].includes(key)?raw==='true':Number(raw)};
 const {room:r}=await request('/rooms/'+code+'/skyjo-settings','POST',{settings:next});activateRoom(r);
})));
el('business-rounds').addEventListener('change',event=>command(async()=>{
 if(!room?.host||room.phase!=='preparing'||room.game!=='business')return;
 const {room:r}=await request('/rooms/'+code+'/business-settings','POST',{settings:{rounds:Number(event.target.value)}});activateRoom(r);
}));
el('barikade-color-select').addEventListener('change',event=>command(async()=>{
 const {room:r}=await request('/rooms/'+code+'/color','POST',{color:event.target.value||null});activateRoom(r);
}));
el('ready-btn').addEventListener('click',()=>command(async()=>{
 if(room?.phase==='playing'){enterCurrentMatch();return;}
 const me=room?.players.find(p=>p.me);if(!me)return;
 const {room:r}=await request('/rooms/'+code+'/ready','POST',{ready:!me.ready});activateRoom(r);
}));
el('start-btn').addEventListener('click',()=>command(async()=>{
 if(!room?.host)return;
 if(room.game==='partychallenge'&&room.phase==='preparing'){
  if(!room.allReady)throw Error('PLAYERS_NOT_READY');
  const {room:r}=await request('/rooms/'+code+'/start','POST');activateRoom(r);notice('Challenge gestartet: gemeinsamer Countdown läuft.');return;
 }
 if(room?.phase!=='playing'||room.game==='partychallenge')return;
 const {room:r}=await request('/rooms/'+code+'/finish','POST');
 activateRoom(r);notice('Partie abgeschlossen. Ihr könnt das nächste Spiel auswählen.');
}));
el('cancel-match-btn').addEventListener('click',()=>{
 if(!room?.host||room.phase!=='playing'||operation)return;
 if(!window.confirm('Die laufende Partie für alle beenden? Es wird kein Sieger und keine Statistik gespeichert.'))return;
 void command(async()=>{
  const {room:r}=await request('/rooms/'+code+'/cancel','POST');
  launchedMatchId=null;
  activateRoom(r);
  location.assign('spielauswahl-online.html?room='+encodeURIComponent(r.code));
 });
});
el('refresh-btn').addEventListener('click',()=>command(async()=>{const {room:r}=await request('/rooms/'+code);activateRoom(r);notice('Raum aktualisiert.');}));
el('copy-btn').addEventListener('click',async()=>{
 try{await navigator.clipboard.writeText(room?.code||'');notice('Raumcode kopiert.');}catch{notice('Raumcode: '+room?.code);}
});
el('leave-btn').addEventListener('click',()=>command(async()=>{await request('/rooms/'+code+'/leave','POST');leaveView();notice('Du hast den Raum verlassen.');}));
let pendingRoomRecovery=null,recoveryInFlight=false,recoveryRetryTimer=null,recoveryAttempts=0;
function clearRecoveryRetry(){if(recoveryRetryTimer){clearTimeout(recoveryRetryTimer);recoveryRetryTimer=null;}recoveryAttempts=0;}
function cancelPendingRecovery(){pendingRoomRecovery=null;clearRecoveryRetry();}
function scheduleRecoveryRetry(){
 if(!pendingRoomRecovery||recoveryRetryTimer||recoveryAttempts>=5)return;
 const delay=Math.min(30000,2000*2**recoveryAttempts++);
 recoveryRetryTimer=setTimeout(()=>{recoveryRetryTimer=null;void recoverPendingRoom();},delay);
}
async function recoverPendingRoom(){
 if(!pendingRoomRecovery||room||(code&&code!==pendingRoomRecovery)||!activeProfile()||recoveryInFlight)return;
 const requestedCode=pendingRoomRecovery;recoveryInFlight=true;
 try{const {room:r}=await request('/rooms/'+encodeURIComponent(requestedCode));if(pendingRoomRecovery!==requestedCode||room||(code&&code!==requestedCode)||r?.code!==requestedCode)return;pendingRoomRecovery=null;clearRecoveryRetry();activateRoom(r);pollStart();}
 catch(e){if(pendingRoomRecovery!==requestedCode||room||(code&&code!==requestedCode))return;if(['ROOM_NOT_FOUND','NOT_A_MEMBER'].includes(e.message)){pendingRoomRecovery=null;clearRecoveryRetry();notice('Raum nicht zugänglich. Prüfe den Raumcode oder tritt erneut bei.');}else{notice('Raum vorübergehend nicht erreichbar. Wiederherstellung wird erneut versucht.');scheduleRecoveryRetry();}}
 finally{recoveryInFlight=false;}
}
window.addEventListener('spielonline-change',()=>{
 const uid=activeProfile()?.user?.uid||null;
 if(uid!==accountUid){const previousUid=accountUid;accountUid=uid;if(room&&previousUid&&uid&&previousUid!==uid){const savedCode=code;pollStop();room=null;choosingGame=false;displayGame=null;pendingRoomRecovery=savedCode;render();notice('Spielerprofil gewechselt. Der bisherige Raumcode bleibt erhalten; Zugriff wird erneut geprüft.');}else if(room&&previousUid&&!uid){const savedCode=code;pollStop();room=null;choosingGame=false;displayGame=null;pendingRoomRecovery=savedCode;render();notice('Anmeldung unterbrochen. Der Raumcode bleibt erhalten.');}}
 render();if(uid)void recoverPendingRoom();
});
async function boot(){
 render();
 const params=new URL(location.href).searchParams;
 const invite=params.get('invite');
 if(invite&&/^(?:[0-9]{3}|[A-HJ-NP-Z2-9]{6})$/i.test(invite)){
  el('join-code').value=invite.toUpperCase();
  notice('Einladung erhalten: Bitte dem Raum '+invite.toUpperCase()+' beitreten.');
 }
 const fromUrl=params.get('room');
 if(!fromUrl||!/^(?:[0-9]{3}|[A-HJ-NP-Z2-9]{6})$/i.test(fromUrl))return;
 // Never create a replacement room when restoring an existing invitation.
 const requestedCode=fromUrl.toUpperCase();
 setRoomCode(requestedCode);
 el('join-code').value=requestedCode;
 pendingRoomRecovery=requestedCode;
 notice('Bestehender Raum '+requestedCode+' wird geladen …');
 if(activeProfile())void recoverPendingRoom();
 // Authentication may finish after the page loads. The profile-change handler
 // retries as soon as a valid profile becomes available.
 else notice('Raum '+requestedCode+' gespeichert. Warte auf die Online-Anmeldung …');
}
setPlayMode(playMode);
boot();
})();
