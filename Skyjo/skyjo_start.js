/* SKYJO Action V9 – Echtzeit-Spielvorraum. Server/Firestore sind allein maßgeblich. */
(()=>{
'use strict';
const $=id=>document.getElementById(id);
const query=new URL(location.href).searchParams;
const code=String(query.get('room')||'').toUpperCase();
const CODE=/^[A-HJ-NP-Z2-9]{6}$/;
const api=String(window.SPIELPORTAL_CONFIG?.apiBase||'https://serverfinal-ynbe.onrender.com').replace(/\/+$/,'');
let room=null,busy=false,refreshBusy=false,socket=null,lastSocket=null,reconnectTimer=null,pollTimer=null;
const limits={target:{min:50,max:500,step:10},jokerCount:{min:0,max:30,step:1}};
const supported=['target','jokerCount','streetModeEnabled','jokerEnabled','beginner'];
const descriptions={
 target:'Der Zielwert kann zwischen 50 und 500 Punkten eingestellt werden.',
 jokerCount:'0 bis 30 Jokerkarten – Änderungen werden für alle Spieler gespeichert.',
 streetModeEnabled:'Aktiviert oder deaktiviert Straßen und die Regeln für gleiche Karten.',
 streetScoring:'Eine alternative Straßen-Wertung ist noch nicht in die Spielengine integriert. Derzeit gelten die Originalregeln.',
 specialCards:'Zusätzliche Spezialkarten-Regelpakete sind für eine spätere Version vorgesehen. Bestehende Joker-Effekte lassen sich separat einstellen.',
 jokerEnabled:'Damit werden die vorhandenen Joker-Spezialeffekte ein- oder ausgeschaltet.',
 beginner:'Verwendet die vorhandenen vereinfachten Einsteigerregeln.',
 maxPlayers:'SKYJO Action unterstützt online 2 bis 5 aktive Spieler. Weitere Mitglieder bleiben Zuschauer.'
};
function onlineHome(extra=''){
 return '../spielauswahl-online.html?room='+encodeURIComponent(code)+extra;
}
function gameUrl(snapshot){
 const m=snapshot.match;
 const params=new URLSearchParams({mode:'online',hub:snapshot.code,match:m.id,room:m.gameCode,board:m.settings?.boardTheme==='illustrated'?'illustrated':'classic'});
 params.set('skin',localStorage.getItem('skyjo-visual-skin')==='wood'?'wood':'classic');
 return 'skyjo_action.html?'+params.toString();
}
function note(message='',bad=false){
 $('status').textContent=message;
 $('status').classList.toggle('error',bad);
}
function identity(){
 const p=window.SpielOnline?.state?.();
 return p?.status==='online'&&p?.profile?.setupComplete!==false&&p?.user?.getIdToken?p.user:null;
}
async function request(suffix,method='GET',body){
 const user=identity();
 if(!user)throw Error('LOGIN_REQUIRED');
 const uid=user.uid,token=await user.getIdToken();
 if(identity()?.uid!==uid)throw Error('LOGIN_REQUIRED');
 const abort=new AbortController(),timeout=setTimeout(()=>abort.abort(),14000);
 try{
  const response=await fetch(api+'/api/hub/rooms/'+code+suffix,{
   method,cache:'no-store',mode:'cors',signal:abort.signal,
   headers:{Authorization:'Bearer '+token,...(body!==undefined?{'Content-Type':'application/json'}:{})},
   body:body===undefined?undefined:JSON.stringify(body)
  });
  const data=await response.json();
  if(!response.ok||data?.ok!==true)throw Error(data?.error||'SERVER_ERROR');
  return data.room;
 }finally{clearTimeout(timeout);}
}
const cleanError=e=>({
 LOGIN_REQUIRED:'Bitte mit deinem Online-Profil anmelden.',
 NOT_A_MEMBER:'Du bist diesem Raum nicht beigetreten.',
 ROOM_NOT_FOUND:'Der Raum wurde nicht gefunden oder ist abgelaufen.',
 HOST_ONLY:'Nur der Host darf diese Einstellung ändern.',
 INVALID_SETTINGS:'Diese Einstellung ist nicht zulässig.',
 NO_SKYJO_SETUP:'Die SKYJO-Vorbereitung ist nicht mehr aktiv.',
 PLAYERS_NOT_READY:'Bitte warten, bis alle aktiven Spieler bereit sind.',
 MATCH_IN_PROGRESS:'Die Partie läuft bereits.',
 GAME_SEATS_FULL:'Alle fünf Spielplätze sind bereits belegt.',
 SPECTATOR_CANNOT_READY:'Zuschauer können sich nicht bereit melden.'
})[e?.message]||e?.message||'Verbindungsfehler';
function updating(){return busy||!room||room.phase!=='preparing';}
async function mutate(suffix,data){
 if(busy)return;
 busy=true;
 render();
 try{
  const next=await request(suffix,'POST',data);
  receive(next);
 }catch(e){note(cleanError(e),true)}
 finally{busy=false;render();}
}
function avatar(name,i){
 const emoji=['🎲','🃏','⭐','🎯','💎','🎮'];
 return emoji[i%emoji.length];
}
function elem(tag,className,text){
 const n=document.createElement(tag);
 if(className)n.className=className;
 if(text!==undefined)n.textContent=text;
 return n;
}
function playerRow(p,i){
 const row=elem('div','sj-person');
 row.style.setProperty('--avatar',['#f9b63c','#ec78a9','#46b37c','#629df0','#ff8a54','#a48bff'][i%6]);
 row.append(elem('span','crown',p.host?'👑':''));
 row.append(elem('span','portrait',avatar(p.name,i)));
 const who=elem('div','person-name',p.name);
 who.append(elem('small','',p.host?'Spielleiter':p.me?'Du':p.participating?'Mitspieler':'Zuschauer'));
 row.append(who);
 const state=elem('span','sj-state '+(p.ready?'yes':'no'),p.participating?(p.ready?'✔ Bereit':'○ Nicht bereit'):'Zuschauer');
 row.append(state);
 if(room.host&&room.phase==='preparing'&&!p.host){
  const control=elem('button','sj-seat-action',p.participating?'Zu Zuschauer machen':'Mitspielen lassen');
  control.type='button';
  control.title=p.participating?'Diesen aktiven Spieler zum Zuschauer machen':'Diesem Zuschauer einen aktiven Spielplatz geben';
  control.disabled=busy;
  control.addEventListener('click',()=>mutate('/seats',{seat:p.seat,participating:!p.participating}));
  row.append(control);
 }
 return row;
}
function render(){
 if(!room)return;
 $('loading-view').classList.add('sj-hidden');
 $('lobby-view').classList.remove('sj-hidden');
 $('copy-code-btn').textContent=code+' ⧉';
 const hostReady=room.host&&room.phase==='preparing'&&!busy;
 const testBtn=$('host-test-button');if(testBtn){testBtn.hidden=!room.host||room.phase!=='preparing';testBtn.style.display=testBtn.hidden?'none':'inline-flex';testBtn.href='skyjo_host_test.html?room='+encodeURIComponent(code);}
 $('host-banner').textContent=room.host?'👑 Du bist der Host – nur du änderst die Einstellungen.':'🔒 Nur der Spielleiter kann die Einstellungen ändern.';
 $('host-note').textContent=room.host?'👑 Du kannst die Regeln ändern und Teilnehmerplätze verteilen. Alle Bereitmeldungen werden nach Änderungen zurückgesetzt.':'👑 Der Host bestimmt die Regeln. Du kannst dich bereit melden; der letzte Bereit-Klick startet die Partie automatisch.';
 const settings=room.settings||{};
 const wood=$('skyjo-wood-choice');if(wood){const selected=localStorage.getItem('skyjo-visual-skin')==='wood';wood.classList.toggle('active',selected);wood.setAttribute('aria-pressed',String(selected));}
 for(const key of supported){
  const value=$('value-'+key);
  if(value)value.textContent=typeof settings[key]==='boolean'?(settings[key]?'An':'Aus'):String(settings[key]??'–');
  document.querySelectorAll('[data-step="'+key+'"]').forEach(btn=>{
   const limitsFor=limits[key];
   btn.disabled=!hostReady||(limitsFor&&(Number(settings[key])+(Number(btn.dataset.dir)*limitsFor.step)>limitsFor.max||Number(settings[key])+(Number(btn.dataset.dir)*limitsFor.step)<limitsFor.min));
  });
 }
 $('value-maxPlayers').textContent=String(room.maxPlayers||5)+' Spieler';
 document.querySelectorAll('[data-board]').forEach(btn=>{const selected=btn.dataset.board===(settings.boardTheme||'classic');btn.classList.toggle('active',selected);btn.setAttribute('aria-pressed',String(selected));btn.disabled=!hostReady;});
 const list=$('players-list');
 list.replaceChildren();
 (room.players||[]).forEach((p,i)=>list.append(playerRow(p,i)));
 const count=room.players.filter(p=>p.participating).length;
 for(let i=count;i<(room.maxPlayers||5);i++){
  const empty=elem('div','sj-empty');
  empty.append(elem('span','plus','＋'),elem('span','','Warte auf weiteren Spieler …'));
  list.append(empty);
 }
 const nReady=room.players.filter(p=>p.participating&&p.ready).length;
 $('ready-counter').textContent=nReady+' von '+count+' Spielern bereit';
 $('ready-segments').replaceChildren(...Array.from({length:Math.max(2,count)},(_,i)=>elem('span','sj-segment'+(i<nReady?' on':''))));
 const me=room.players.find(p=>p.me);
 const readyButton=$('ready-button');
 readyButton.disabled=busy||room.phase!=='preparing'||!me?.participating;
 readyButton.textContent=me?.ready?'✔ Bereit – zurücknehmen':'✓ Ich bin bereit';
 readyButton.classList.toggle('is-ready',!!me?.ready);
 const start=$('start-button');
 start.textContent=room.phase==='playing'?'▶ Zum Spiel':'▶ Spiel starten';
 start.disabled=busy||(!room.host&&room.phase!=='playing')||room.phase==='playing'&&!room.match?.participating;
 if(room.phase==='preparing'&&!room.host)start.disabled=true;
 const missing=Math.max(0,count-nReady);
 if(count<2)note('Es müssen mindestens zwei Spieler mitspielen.');
 else if(room.phase==='preparing'&&!missing)note('Alle bereit – die Partie wird gestartet.');
 else if(room.phase==='preparing')note(missing+' Bereitmeldung'+(missing===1?'':'en')+' fehlt/fehlen.');
 else note('Die Partie läuft.');
}
function receive(data){
 if(!data||data.code!==code)return;
 if(data.game!=='skyjo'){
  location.replace(onlineHome());
  return;
 }
 room=data;
 if(data.phase==='playing'&&data.match?.participating){
  location.replace(gameUrl(data));
  return;
 }
 render();
}
async function refresh(){
 if(refreshBusy||busy||document.hidden||!identity())return;
 refreshBusy=true;
 try{receive(await request(''))}
 catch(e){if(!room)note(cleanError(e),true)}
 finally{refreshBusy=false;}
}
function closeSocket(){
 if(reconnectTimer){clearTimeout(reconnectTimer);reconnectTimer=null;}
 if(socket){let old=socket;socket=null;try{old.onclose=null;old.close()}catch(_e){}}
}
function connect(){
 if(socket||!room||!identity())return;
 const ws=new WebSocket(api.replace(/^http/i,'ws')+'/hub');
 socket=ws;
 ws.onopen=async()=>{
  try{const token=await identity().getIdToken();if(socket===ws&&ws.readyState===1)ws.send(JSON.stringify({type:'subscribe',code,profileIdToken:token}));}
  catch(_e){ws.close();}
 };
 ws.onmessage=e=>{
  let data;try{data=JSON.parse(e.data)}catch(_e){return}
  if(data?.type==='room'&&data.room?.code===code)receive(data.room);
 };
 ws.onerror=()=>{};
 ws.onclose=()=>{
  if(socket!==ws)return;
  socket=null;
  reconnectTimer=setTimeout(()=>{reconnectTimer=null;connect()},5000);
 };
}
async function boot(){
 if(!CODE.test(code)){
  $('loading-view').textContent='Ungültiger Raumcode. Bitte über die gemeinsame Spielauswahl eintreten.';
  return;
 }
 $('back-link').href=onlineHome('&choose=1');
 $('loading-view').textContent='🔄 Verbinde mit Raum '+code+' …';
 let elapsed=0;
 const authWait=setInterval(async()=>{
  elapsed+=250;
  if(!identity()&&elapsed<15000)return;
  clearInterval(authWait);
  if(!identity()){
   $('loading-view').textContent='Bitte melde dich mit deinem Online-Profil an und öffne die Lobby erneut.';
   return;
  }
  try{
   receive(await request(''));
   connect();
   pollTimer=setInterval(refresh,4000);
  }catch(e){
   $('loading-view').textContent='Verbindung nicht möglich: '+cleanError(e);
   note(cleanError(e),true);
  }
 },250);
}
document.querySelectorAll('[data-step]').forEach(button=>button.addEventListener('click',()=>{
 const key=button.dataset.step;
 if(!room?.host||updating()||!supported.includes(key))return;
 const old=room.settings||{},change=Number(button.dataset.dir)||1;
 let next;
 if(typeof old[key]==='boolean')next=!old[key];
 else{
  const rule=limits[key];if(!rule)return;
  next=Math.min(rule.max,Math.max(rule.min,Number(old[key])+rule.step*change));
  if(next===old[key])return;
 }
 void mutate('/skyjo-settings',{settings:{...old,[key]:next}});
}));
document.querySelectorAll('[data-info]').forEach(button=>button.addEventListener('click',()=>note(descriptions[button.dataset.info]||'')));
document.querySelectorAll('[data-board]').forEach(btn=>btn.addEventListener('click',()=>{
 if(updating()||!room.host)return;
 const theme=btn.dataset.board;
 if(!['classic','illustrated'].includes(theme))return;
 void mutate('/skyjo-settings',{settings:{...room.settings,boardTheme:theme}});
}));
$('skyjo-wood-choice')?.addEventListener('click',()=>{const selected=localStorage.getItem('skyjo-visual-skin')==='wood';localStorage.setItem('skyjo-visual-skin',selected?'classic':'wood');render();});

$('ready-button').addEventListener('click',()=>{
 const me=room?.players.find(p=>p.me);
 if(!me?.participating||updating())return;
 void mutate('/ready',{ready:!me.ready});
});
$('start-button').addEventListener('click',()=>{
 if(!room||busy)return;
 if(room.phase==='playing'&&room.match?.participating){location.assign(gameUrl(room));return;}
 if(!room.host)return;
 const count=room.players.filter(p=>p.participating).length;
 const ready=room.players.filter(p=>p.participating&&p.ready).length;
 if(count<2||ready<count){note('⏳ '+ready+' von '+count+' Spielern bereit. Bitte erst alle Bereitmeldungen abwarten.');return;}
 void mutate('/start',{});
});
$('copy-code-btn').addEventListener('click',async()=>{
 try{await navigator.clipboard.writeText(code);note('📋 Raumcode '+code+' kopiert.');}
 catch(_e){note('Raumcode: '+code);}
});
$('invite-button').addEventListener('click',async()=>{
 const url=new URL('../hub-lobby.html?invite='+encodeURIComponent(code),location.href).href;
 const message='SKYJO Action: Komm in unseren Spielraum '+code+'! '+url;
 try{
  if(navigator.share){await navigator.share({title:'SKYJO Action – Spieleabend',text:'Unser Raumcode ist '+code,url});note('Einladung geöffnet.');}
  else{await navigator.clipboard.writeText(message);note('🔗 Einladung mit Raumcode kopiert.');}
 }catch(e){if(e.name!=='AbortError')note('Teile den Raumcode '+code+' mit deinen Freunden.');}
});
$('help-btn').addEventListener('click',()=>note('👑 Host: Einstellungen und Spielerplätze festlegen. 👥 Alle: Bereit anklicken. Sobald alle aktiven Spieler bereit sind, startet SKYJO automatisch.'));
$('refresh-btn').addEventListener('click',()=>{note('🔄 Raumstatus wird aktualisiert …');void refresh();});
window.addEventListener('spielonline-change',()=>{if(identity()){void refresh();if(room)connect();}else{closeSocket();room=null;$('lobby-view').classList.add('sj-hidden');$('loading-view').classList.remove('sj-hidden');$('loading-view').textContent='Bitte melde dich mit deinem Online-Profil an.';}});
window.addEventListener('pagehide',()=>{closeSocket();if(pollTimer)clearInterval(pollTimer);});
document.addEventListener('visibilitychange',()=>{if(!document.hidden)void refresh();});
boot();
})();