/* Gemeinsamer Online-Raum · Phase 1 (nur Browser-UI, Firestore bleibt maßgeblich). */
(()=>{
'use strict';
const el=id=>document.getElementById(id);
const config=window.SPIELPORTAL_CONFIG||{};
const API=String(config.apiBase||'https://serverfinal-ynbe.onrender.com').replace(/\/+$/,'');
const GAME={barikade:'Barikade',skyjo:'SKYJO Action',kreuz:'KreuzKunter',business:'Das große Business'};
let code=null,room=null,operation=false,poll=null,accountUid=null,pollErrors=0;
const activeProfile=()=>{const p=window.SpielOnline?.state?.();return p?.status==='online'&&p?.profile?.setupComplete!==false&&p?.user?p:null;};
const messages={DATABASE_UNAVAILABLE:'Der Spielserver hat derzeit keine Firestore-Verbindung.',LOGIN_REQUIRED:'Bitte melde dich mit deinem Online-Profil an.',PROFILE_REQUIRED:'Bitte vervollständige dein Spielerprofil.',ROOM_NOT_FOUND:'Der Raum wurde nicht gefunden oder ist abgelaufen.',NOT_A_MEMBER:'Du bist diesem Raum noch nicht beigetreten.',ROOM_FULL:'Der Raum ist bereits voll.',GAME_FULL:'Für dieses Spiel sind schon zu viele Personen im Raum.',TOO_MANY_PLAYERS_FOR_GAME:'Für dieses Spiel sind zu viele Personen im Raum.',HOST_ONLY:'Nur der Host darf das ändern.',GAME_NOT_CONNECTED:'Dieses Spiel ist noch nicht mit der zentralen Lobby verbunden.',PLAYERS_NOT_READY:'Noch sind nicht alle Mitspieler bereit.',GAME_SEATS_FULL:'Für dieses Spiel sind alle Mitspielerplätze belegt. Der Host kann zunächst jemanden auf Zuschauer setzen.',SPECTATOR_CANNOT_READY:'Als Zuschauer musst du dich nicht bereit melden.',ROOM_ALREADY_PLAYING:'Diese Partie hat bereits begonnen.'};
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
function pollStop(){if(poll){clearInterval(poll);poll=null;}}
function pollStart(){pollStop();poll=setInterval(async()=>{if(!code||operation||!activeProfile()||document.hidden)return;
 try{const result=await request('/rooms/'+code);pollErrors=0;room=result.room;render();}catch(e){if(['ROOM_NOT_FOUND','NOT_A_MEMBER','LOGIN_REQUIRED'].includes(e.message)){leaveView();showError(e);}else if(++pollErrors===3)showError(e);}
 },4000);}
function leaveView(){pollStop();room=null;setRoomCode(null);render();}
function render(){
 const account=activeProfile();
 el('account-name').textContent=account?.profile?.name||account?.user?.email||'Noch nicht angemeldet';
 el('account-info').textContent=account?'Dein verifiziertes Online-Spielerprofil ist verbunden.':'Bitte anmelden oder ein Profil erstellen, um einen Raum zu betreten.';
 el('login-btn').textContent=account?'Profil ansehen':'Anmelden';
 const inside=!!room;
 el('entry-view').classList.toggle('hidden',inside);
 el('room-view').classList.toggle('hidden',!inside);
 el('create-btn').disabled=!account||operation;el('join-btn').disabled=!account||operation;
 if(!inside)return;
 el('room-code').textContent=room.code;
 el('select-help').textContent=room.host?'Du bist Host: Wähle ein Spiel für deine Gruppe.':'Der Host wählt das nächste Spiel. Du kannst dich anschließend bereit melden.';
 const player=room.players.find(p=>p.me);
 el('players').replaceChildren(...room.players.map(p=>{
  const div=document.createElement('div');div.className='player';
  const avatar=document.createElement('span');avatar.className='avatar';avatar.textContent='🙂';
  const name=document.createElement('span');name.className='name';name.textContent=p.name;
  const tag=document.createElement('span');tag.className='tag';tag.textContent=(p.host?'👑 Host ':'')+(p.me?'(Du)':'');name.append(tag);
  const ready=document.createElement('span');ready.className='ready'+(!p.participating?' spectator':p.ready?' yes':'');ready.textContent=!p.participating?'Zuschauer':p.ready?'✓ Bereit':'Wartet';
  div.append(avatar,name,ready);
  if(room.host&&room.game){
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
  btn.disabled=!room.host||operation;
  btn.setAttribute('aria-pressed',String(btn.dataset.game===room.game));
 });
 el('ready-help').textContent=room.game?`${GAME[room.game]||room.game} ist ausgewählt. Nur die ausgewählten Mitspieler melden sich bereit; Zuschauer bleiben im Raum.`:'Der Host wählt zuerst ein Spiel.';
 el('ready-btn').textContent=player?.ready?'Bereitmeldung zurücknehmen':'Ich bin bereit';
 el('ready-btn').disabled=!room.game||!player?.participating||operation;
 const playing=room.players.filter(p=>p.participating);
 el('ready-status').textContent=`${playing.filter(p=>p.ready).length} von ${playing.length} Mitspielern bereit · ${room.players.length-playing.length} Zuschauer${room.allReady?' · Alle bereit!':''}`;
 el('start-btn').disabled=true;
 el('start-btn').textContent=room.allReady?'Spielanbindung folgt':'Partie starten';
 el('start-btn').title='Noch nicht freigeschaltet: Die einzelnen Spiele werden im nächsten Arbeitsschritt angeschlossen.';
}
async function command(run){if(operation)return;operation=true;render();notice('');
 try{await run();pollErrors=0;}catch(e){showError(e);}finally{operation=false;render();}
}
el('login-btn').addEventListener('click',()=>{if(activeProfile())location.assign('profile.html');else window.SpielOnline?.openLogin?.();});
el('create-btn').addEventListener('click',()=>command(async()=>{
 const {room:r}=await request('/rooms','POST');activateRoom(r);pollStart();notice('Raum erstellt – teile den Code mit deinen Freunden.');
}));
el('join-code').addEventListener('input',event=>{event.target.value=event.target.value.toUpperCase().replace(/[^A-HJ-NP-Z2-9]/g,'').slice(0,6);});
el('join-code').addEventListener('keydown',e=>{if(e.key==='Enter')el('join-btn').click();});
el('join-btn').addEventListener('click',()=>command(async()=>{
 const c=el('join-code').value.trim().toUpperCase();if(!/^[A-HJ-NP-Z2-9]{6}$/.test(c))throw Error('Bitte einen gültigen Raumcode mit 6 Zeichen eingeben.');
 const {room:r}=await request('/rooms/'+c+'/join','POST');activateRoom(r);pollStart();notice('Du bist dem Raum beigetreten.');
}));
document.querySelectorAll('[data-game]').forEach(btn=>btn.addEventListener('click',()=>command(async()=>{
 if(!room?.host)return;const {room:r}=await request('/rooms/'+code+'/select','POST',{game:btn.dataset.game});activateRoom(r);
}))); 
el('ready-btn').addEventListener('click',()=>command(async()=>{
 const me=room?.players.find(p=>p.me);if(!me)return;
 const {room:r}=await request('/rooms/'+code+'/ready','POST',{ready:!me.ready});activateRoom(r);
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
async function boot(){render();const fromUrl=new URL(location.href).searchParams.get('room');
 if(!fromUrl||!/^[A-HJ-NP-Z2-9]{6}$/i.test(fromUrl))return;
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
boot();
})();
