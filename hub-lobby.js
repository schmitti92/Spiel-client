/* Gemeinsamer Online-Raum · Phase 1 (nur Browser-UI, Firestore bleibt maßgeblich). */
(()=>{
'use strict';
const el=id=>document.getElementById(id);
const config=window.SPIELPORTAL_CONFIG||{};
const API=String(config.apiBase||'https://serverfinal-ynbe.onrender.com').replace(/\/+$/,'');
const GAME={barikade:'Barikade',skyjo:'SKYJO Action',kreuz:'KreuzKunter',business:'Das große Business'};
let code=null,room=null,operation=false,poll=null,accountUid=null,pollErrors=0;
let playMode=new URL(location.href).searchParams.get('view')==='local'?'local':'online';
let choosingGame=false,displayGame=null;
const GAME_ICON={barikade:'🎲',skyjo:'🃏',kreuz:'🎯',business:'💼'};
const GAME_DESCRIPTIONS={
 barikade:'Das Brettspiel mit Barikaden, Action-Regeln und optionalem Bossmodus.',
 skyjo:'Karten, Joker und spannende Runden. Der Host legt die Regeln fest.',
 kreuz:'Würfeln, Farben ankreuzen und gemeinsam Punkte sammeln.',
 business:'Unternehmen, Aktien und Branchen – mit 10, 20 oder 30 Runden.'
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
let launchedMatchId=null,hubSocket=null,retrySocket=null,streamReady=false,streamLast=0,hubHeartbeat=null;
function stopWatch(){
 streamReady=false;
 if(hubHeartbeat){clearInterval(hubHeartbeat);hubHeartbeat=null;}
 if(retrySocket){clearTimeout(retrySocket);retrySocket=null;}
 if(hubSocket){const old=hubSocket;hubSocket=null;try{old.onclose=null;old.close();}catch(_e){}}
}
function startWatch(){
 if(!code||!room||!activeProfile()||hubSocket)return;
 const socket=new WebSocket(API.replace(/^http/i,'ws')+'/hub');hubSocket=socket;
 let lastPong=Date.now();
 socket.onopen=async()=>{
  try{const token=await logged().user.getIdToken();
    if(hubSocket===socket&&socket.readyState===1){
      socket.send(JSON.stringify({type:'subscribe',code,profileIdToken:token}));
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
  if(data?.type==='room'&&data.room?.code===code){lastPong=Date.now();streamReady=true;streamLast=Date.now();room=data.room;render();}
 };
 socket.onclose=()=>{
  if(hubSocket!==socket)return;
  hubSocket=null;streamReady=false;
  if(hubHeartbeat){clearInterval(hubHeartbeat);hubHeartbeat=null;}
  if(code&&room&&activeProfile())retrySocket=setTimeout(()=>{retrySocket=null;startWatch();},4500);
 };
 socket.onerror=()=>{}; // close event triggers HTTP fallback and retry
}
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
function activateRoom(result){room=result;setRoomCode(result.code);render();}
function pollStop(){if(poll){clearInterval(poll);poll=null;}stopWatch();}
function pollStart(){pollStop();startWatch();poll=setInterval(async()=>{if(!code||operation||!activeProfile()||document.hidden)return;
 if(streamReady && hubSocket?.readyState===1)return;
 try{const result=await request('/rooms/'+code);pollErrors=0;room=result.room;render();}catch(e){if(['ROOM_NOT_FOUND','NOT_A_MEMBER','LOGIN_REQUIRED'].includes(e.message)){leaveView();showError(e);}else if(++pollErrors===3)showError(e);}
 },4500);}
function leaveView(){pollStop();room=null;choosingGame=false;displayGame=null;setRoomCode(null);render();}
function render(){
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
   launchedMatchId=room.match.id;
   try{enterCurrentMatch();}catch(e){showError(e);}
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
 document.querySelectorAll('[data-game]').forEach(btn=>{
  btn.classList.toggle('active',btn.dataset.game===room.game);
  btn.disabled=!room.host||operation||room.phase==='playing';
  btn.setAttribute('aria-pressed',String(btn.dataset.game===room.game));
 });
 el('ready-help').textContent=room.game?`${GAME[room.game]||room.game} ist ausgewählt. Nur die ausgewählten Mitspieler melden sich bereit; Zuschauer bleiben im Raum.`:'Der Host wählt zuerst ein Spiel.';
 el('ready-btn').textContent=room.phase==='playing'?'Zur laufenden Partie':player?.ready?'Bereitmeldung zurücknehmen':'Ich bin bereit';
 el('ready-btn').disabled=!room.game||!player?.participating||operation;
 el('ready-btn').classList.toggle('is-ready',!!player?.ready);
 const playing=room.players.filter(p=>p.participating);
 const readyCount=playing.filter(p=>p.ready).length;
 const percent=playing.length?Math.round(readyCount/playing.length*100):0;
 el('ready-counter').textContent=room.phase==='playing'?'Partie läuft':playing.length<2?'Mindestens 2 Spieler benötigt':room.allReady?'Alle bereit!':'Warten auf Bereitmeldungen';
 el('ready-fraction').textContent=readyCount+' / '+playing.length;
 el('ready-progress-fill').style.width=percent+'%';
 el('ready-progressbar').setAttribute('aria-valuenow',String(percent));
 el('ready-title').textContent=room.phase==='playing'?'🎮 Eure Partie läuft':'Bereit für '+(GAME[room.game]||'die Partie')+'?';
 el('ready-status').textContent=`${readyCount} von ${playing.length} Mitspielern bereit · ${room.players.length-playing.length} Zuschauer${room.allReady?' · Alle bereit!':''}`;
 el('start-btn').classList.toggle('hidden',!room.host||room.phase!=='playing');
 el('start-btn').disabled=!(room.phase==='playing'&&room.host)||operation;
 el('start-btn').textContent=room.phase==='playing'?'Beendete Partie abschließen':room.canLaunch?'Startet automatisch bei allen Bereitmeldungen':'Spielanbindung folgt';
 el('start-btn').title=room.phase==='playing'?'Nur nach beendetem Spiel möglich; der Server prüft den Sieger.':room.canLaunch?'Alle gewählten Mitspieler melden sich bereit.':'Dieses Spiel wird später angeschlossen.';
 el('leave-btn').disabled=room.phase==='playing'||operation;
 el('integration-note').textContent=room.phase==='playing'
  ?'Die Partie läuft. Nach dem bestätigten Spielende kehren alle automatisch in diesen Raum zurück.'
  :room.phase==='lobby'&&room.lastCompleted?.id
   ?'🎉 Letzte Partie abgeschlossen: '+(GAME[room.lastCompleted.game]||room.lastCompleted.game)+'. Ihr seid weiterhin im selben Raum – der Host kann das nächste Spiel auswählen.'
   :room.canLaunch
    ?'Alle ausgewählten Mitspieler melden sich bereit. Das Spiel startet automatisch.'
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
el('join-code').addEventListener('input',event=>{event.target.value=event.target.value.toUpperCase().replace(/[^A-HJ-NP-Z2-9]/g,'').slice(0,6);notice('');});
el('join-code').addEventListener('keydown',e=>{if(e.key==='Enter')el('join-btn').click();});
el('join-btn').addEventListener('click',()=>command(async()=>{
 const c=el('join-code').value.trim().toUpperCase();if(!/^[A-HJ-NP-Z2-9]{6}$/.test(c))throw Error('Bitte einen gültigen Raumcode mit 6 Zeichen eingeben.');
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
 if(room?.phase!=='playing'||!room.host)return;
 const {room:r}=await request('/rooms/'+code+'/finish','POST');
 activateRoom(r);notice('Partie abgeschlossen. Ihr könnt das nächste Spiel auswählen.');
}));
el('refresh-btn').addEventListener('click',()=>command(async()=>{const {room:r}=await request('/rooms/'+code);activateRoom(r);notice('Raum aktualisiert.');}));
el('copy-btn').addEventListener('click',async()=>{
 try{await navigator.clipboard.writeText(room?.code||'');notice('Raumcode kopiert.');}catch{notice('Raumcode: '+room?.code);}
});
el('leave-btn').addEventListener('click',()=>command(async()=>{await request('/rooms/'+code+'/leave','POST');leaveView();notice('Du hast den Raum verlassen.');}));
window.addEventListener('spielonline-change',()=>{
 const uid=activeProfile()?.user?.uid||null;
 if(uid!==accountUid){accountUid=uid;if(room){leaveView();notice('Das Spielerprofil hat gewechselt. Bitte dem Raum erneut beitreten.');}}
 render();
});
async function boot(){
 render();
 const params=new URL(location.href).searchParams;
 const invite=params.get('invite');
 if(invite&&/^[A-HJ-NP-Z2-9]{6}$/i.test(invite)){
  el('join-code').value=invite.toUpperCase();
  notice('Einladung erhalten: Bitte dem Raum '+invite.toUpperCase()+' beitreten.');
 }
 const fromUrl=params.get('room');
 if(!fromUrl||!/^[A-HJ-NP-Z2-9]{6}$/i.test(fromUrl))return;
 if(new URL(location.href).searchParams.get('stage')!=='1'&&!stayInMatchId){
   location.replace('spielauswahl-online.html?room='+encodeURIComponent(fromUrl.toUpperCase()));
   return;
 }
 let elapsed=0;const timer=setInterval(async()=>{
  elapsed+=250;
  if(!activeProfile()&&elapsed<12000)return;
  clearInterval(timer);
  if(!activeProfile())return;
  code=fromUrl.toUpperCase();
  try{const {room:r}=await request('/rooms/'+code);activateRoom(r);pollStart();}
  catch(e){setRoomCode(null);el('join-code').value=fromUrl.toUpperCase();notice('Gib den Raumcode ein und klicke auf „Beitreten“.');}
 },250);
}
setPlayMode(playMode);
boot();
})();
