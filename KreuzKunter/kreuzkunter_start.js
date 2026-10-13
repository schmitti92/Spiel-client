/* KreuzKunter Online-Startmaske V12 · Server ist maßgeblich.
   Nur bestätigte Firestore-Mitglieder dürfen Plätze und Start benutzen. */
(()=>{
'use strict';
const $=id=>document.getElementById(id);
const query=new URL(location.href).searchParams;
const roomCode=String(query.get('room')||'').toUpperCase();
const codeValid=/^[A-HJ-NP-Z2-9]{6}$/;
const base=String(window.SPIELPORTAL_CONFIG?.apiBase||'https://serverfinal-ynbe.onrender.com').replace(/\/+$/,'');
const onlineHome=(extra='')=>'../spielauswahl-online.html?room='+encodeURIComponent(roomCode)+extra;
const inviteURL=()=>new URL('../hub-lobby.html?invite='+encodeURIComponent(roomCode),location.href).href;
const COLORS={r:'red',b:'blue',g:'green',y:'yellow',o:'orange'};
const COLOR_ROWS=[
 'rrryrrbbogggyyy','ggoyyyoooyyoyyy','gggbbyoggoooboo',
 'bbgbrorggoogrro','bbbooorrrgggrrr','roobbbyrrgybygg','rrrbbbyygbbbyyy'
];
let room=null,busy=false,loading=false,ws=null,reconnect=null,pollTimer=null,leaving=false,initWaiting=null,qrCreated=false,redirected=false;
const messages={
 LOGIN_REQUIRED:'Bitte mit deinem Online-Profil anmelden.',ROOM_NOT_FOUND:'Der Raum ist nicht mehr vorhanden.',
 NOT_A_MEMBER:'Du bist diesem Raum nicht beigetreten.',GAME_SEATS_FULL:'Alle sechs Spielplätze sind belegt.',
 HOST_ONLY:'Nur der Host darf Spielplätze zuweisen.',SPECTATOR_CANNOT_READY:'Zuschauer können sich nicht bereit melden.',
 PLAYERS_NOT_READY:'Mindestens zwei Spieler müssen bereit sein.',HOST_MUST_PLAY:'Der Host muss mitspielen.',
 NO_GAME_SELECTED:'Es ist noch kein Spiel ausgewählt.',MATCH_IN_PROGRESS:'Die Partie läuft bereits.'
};
const errorMessage=e=>messages[e?.message]||e?.message||'Verbindungsproblem';
const setStatus=(t='',bad=false)=>{$('status').textContent=t;$('status').classList.toggle('error',!!bad)};
function auth(){
 const s=window.SpielOnline?.state?.();
 return s?.status==='online'&&s?.profile?.setupComplete!==false&&s?.user?.getIdToken?s.user:null;
}
async function api(suffix='',method='GET',payload){
 const u=auth();
 if(!u)throw Error('LOGIN_REQUIRED');
 const uid=u.uid,token=await u.getIdToken();
 if(auth()?.uid!==uid)throw Error('LOGIN_REQUIRED');
 const c=new AbortController(),t=setTimeout(()=>c.abort(),14000);
 try{
  const res=await fetch(base+'/api/hub/rooms/'+roomCode+suffix,{
   method,signal:c.signal,mode:'cors',cache:'no-store',
   headers:{Authorization:'Bearer '+token,...(payload===undefined?{}:{'Content-Type':'application/json'})},
   body:payload===undefined?undefined:JSON.stringify(payload)
  });
  const data=await res.json();
  if(!res.ok||data?.ok!==true)throw Error(data?.error||'SERVER_ERROR');
  return data.room;
 }finally{clearTimeout(t);}
}
function gameURL(r){
 const m=r.match;
 if(m?.game!=='kreuz'||!m?.participating||!/^K[A-HJ-NP-Z2-9]{9}$/.test(m.gameCode)||!/^[0-9a-f-]{36}$/i.test(m.id)){
  throw Error('MATCH_CODE_INVALID');
 }
 return 'kreuzkunter.html?'+new URLSearchParams({hub:r.code,match:m.id,gameCode:m.gameCode}).toString();
}
function receive(r){
 if(!r||r.code!==roomCode||redirected)return;
 if(r.game!=='kreuz'){redirected=true;location.replace(onlineHome());return;}
 room=r;
 if(r.phase==='playing'&&r.match?.participating){
  try{redirected=true;location.replace(gameURL(r));}catch(e){redirected=false;setStatus(errorMessage(e),true);}
  return;
 }
 render();
}
async function mutate(route,payload){
 if(busy||!room)return;
 busy=true;render();
 try{receive(await api(route,'POST',payload));}
 catch(e){setStatus(errorMessage(e),true);}
 finally{busy=false;if(room)render();}
}
function dom(tag,cls,text){
 const n=document.createElement(tag);
 if(cls)n.className=cls;
 if(text!==undefined)n.textContent=text;
 return n;
}
function createPaper(){
 const container=$('board-grid');
 const marks=new Set([3,20,21,40,53,67,74,86,99]);
 const fragment=document.createDocumentFragment();
 for(let row=0;row<COLOR_ROWS.length;row++){
  fragment.append(dom('span','board-label',String(row+1)));
  for(let col=0;col<15;col++){
   const color=COLORS[COLOR_ROWS[row][col]]||'blue';
   fragment.append(dom('span','board-cell '+color+(marks.has(row*15+col)?' cross':''),marks.has(row*15+col)?'✕':''));
  }
 }
 container.replaceChildren(fragment);
}
function render(){
 if(!room)return;
 $('loading').classList.add('hidden');
 $('lobby').classList.remove('hidden');
 $('launch-area').classList.remove('hidden');
 $('room-code').textContent=roomCode;
 const all=room.players||[],active=all.filter(p=>p.participating),ready=active.filter(p=>p.ready);
 $('player-count').textContent='('+active.length+'/'+(room.maxPlayers||6)+')';
 $('players-hint').textContent=(all.length-active.length)+' Zuschauer im Raum · '+active.length+' von '+(room.maxPlayers||6)+' Plätzen';
 $('seats-info').textContent=active.length+' von '+(room.maxPlayers||6)+' Spielplätzen besetzt';
 $('host-note').textContent=room.host?'👑 Du bist Host. Nur du darfst die Spielplätze einstellen.':'🔒 Nur der Host darf die aktiven Spieler bestimmen.';
 const list=$('player-list');
 list.replaceChildren(...all.map((p,i)=>{
  const row=dom('div','player'+(p.host?' host':''));
  const avatar=dom('span','avatar',(p.name||'?').slice(0,1).toUpperCase());
  const label=dom('div','name',p.name||'Spieler');
  label.append(dom('small','',(p.host?'👑 Host · ':'')+(p.me?'Du · ':'')+(p.participating?'Mitspieler':'Zuschauer')));
  const badge=dom('span','state'+(p.ready&&p.participating?' ready':''),p.participating?(p.ready?'✔ Bereit':'◯ Wartet'):'👁 Zuschauer');
  row.append(avatar,label,badge);
  if(room.host&&room.phase==='preparing'&&!p.host){
   const seat=dom('button','seat-control',p.participating?'Zuschauen':'Mitspielen');
   seat.type='button';seat.disabled=busy;
   seat.addEventListener('click',()=>mutate('/seats',{seat:p.seat,participating:!p.participating}));
   row.append(seat);
  }
  return row;
 }));
 const free=Math.max(0,(room.maxPlayers||6)-active.length);
 for(let i=0;i<free;i++){const empty=dom('div','player-empty');empty.append(dom('span','plus','+'),dom('span','','Freier Spielplatz'));list.append(empty);}
 $('ready-count').textContent=ready.length+' von '+active.length+' Spielern bereit';
 $('meter-segments').replaceChildren(...Array.from({length:Math.max(2,active.length)},(_,i)=>dom('span',i<ready.length?'on':'')));
 const me=all.find(p=>p.me);
 $('ready-btn').disabled=busy||room.phase!=='preparing'||!me?.participating;
 $('ready-btn').textContent=me?.ready?'✔ Bereit – zurücknehmen':'✓ Ich bin bereit';
 $('ready-btn').classList.toggle('ready',!!me?.ready);
 const readyToStart=room.phase==='preparing'&&room.host&&active.length>=2&&ready.length===active.length;
 $('start-btn').disabled=busy||!(readyToStart||(room.phase==='playing'&&room.match?.participating));
 $('start-btn').textContent=room.phase==='playing'?'▶ Zum laufenden Spiel':'▶ Spiel starten';
 $('start-hint').textContent=room.phase==='playing'?'Die Partie läuft bereits.':active.length<2?'Mindestens zwei Spieler erforderlich.':ready.length===active.length?'Alle bereit! Das Spiel startet automatisch.':ready.length+' von '+active.length+' Spielern bereit.';
 setStatus(room.phase==='playing'?'KreuzKunter läuft. Zuschauer bleiben im gemeinsamen Raum.':'KreuzKunter-Online-Raum verbunden.');
}
async function refresh(){
 if(loading||busy||redirected||!auth()||document.hidden)return;
 loading=true;
 try{receive(await api());}
 catch(e){setStatus(errorMessage(e),true);}
 finally{loading=false;}
}
function disconnect(){
 if(reconnect){clearTimeout(reconnect);reconnect=null;}
 if(ws){const old=ws;ws=null;try{old.onclose=null;old.close();}catch(_e){}}
}
function openSocket(){
 if(ws||leaving||!room||!auth())return;
 const sock=new WebSocket(base.replace(/^http/i,'ws')+'/hub');
 ws=sock;
 sock.onopen=async()=>{
  try{
   const u=auth();if(!u)throw Error('LOGIN_REQUIRED');
   const token=await u.getIdToken();
   if(ws===sock&&sock.readyState===1)sock.send(JSON.stringify({type:'subscribe',code:roomCode,profileIdToken:token}));
  }catch(_e){try{sock.close();}catch(_x){}}
 };
 sock.onmessage=e=>{
  let data;try{data=JSON.parse(e.data);}catch(_e){return;}
  if(data?.type==='room'&&data.room?.code===roomCode)receive(data.room);
 };
 sock.onerror=()=>{};
 sock.onclose=()=>{
  if(ws!==sock)return;
  ws=null;
  if(!leaving)reconnect=setTimeout(()=>{reconnect=null;openSocket();},5000);
 };
}
async function share(){
 const url=inviteURL();
 try{
  if(navigator.share){await navigator.share({title:'KreuzKunter – Spieleabend',text:'Unser Raumcode: '+roomCode,url});return;}
  await navigator.clipboard.writeText(url);
  setStatus('🔗 Einladungslink kopiert.');
 }catch(e){if(e?.name!=='AbortError')setStatus('Teile den Raumcode '+roomCode+' mit deinen Freunden.');}
}
async function copy(value){
 try{await navigator.clipboard.writeText(value);setStatus('📋 '+(value===roomCode?'Raumcode':'Einladungslink')+' kopiert.');}
 catch(_e){setStatus('Dein Raumcode: '+roomCode);}
}
function qrOpen(){
 const modal=$('qr-modal'),target=$('qr-target');
 modal.classList.remove('hidden');
 $('qr-code').textContent='Raumcode: '+roomCode;
 if(!qrCreated&&typeof QRCode==='function'){
  qrCreated=true;
  new QRCode(target,{text:inviteURL(),width:190,height:190,colorDark:'#143a70',colorLight:'#ffffff',correctLevel:QRCode.CorrectLevel.M});
 }else if(typeof QRCode!=='function'){target.textContent='QR-Code derzeit nicht verfügbar. Nutze den Einladungslink.';}
 $('close-qr').focus();
}
function qrClose(){$('qr-modal').classList.add('hidden');$('invite-qr').focus();}
document.querySelector('#invite-link').addEventListener('click',share);
$('invite-player').addEventListener('click',share);
$('copy-code').addEventListener('click',()=>copy(roomCode));
$('invite-qr').addEventListener('click',qrOpen);
$('close-qr').addEventListener('click',qrClose);
$('copy-invite').addEventListener('click',()=>copy(inviteURL()));
$('qr-modal').addEventListener('click',e=>{if(e.target===$('qr-modal'))qrClose();});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('qr-modal').classList.contains('hidden'))qrClose();});
$('ready-btn').addEventListener('click',()=>{
 const p=room?.players.find(x=>x.me);
 if(room?.phase==='preparing'&&p?.participating&&!busy)void mutate('/ready',{ready:!p.ready});
});
$('start-btn').addEventListener('click',()=>{
 if(!room||busy)return;
 if(room.phase==='playing'&&room.match?.participating){location.assign(gameURL(room));return;}
 if(!room.host||room.phase!=='preparing')return;
 const players=room.players.filter(p=>p.participating);
 if(players.length<2||!players.every(p=>p.ready)){setStatus('Warte, bis alle aktiven Spieler bereit sind.');return;}
 void mutate('/start',{});
});
window.addEventListener('spielonline-change',()=>{
 if(!auth()){disconnect();room=null;$('lobby').classList.add('hidden');$('launch-area').classList.add('hidden');$('loading').classList.remove('hidden');$('loading').textContent='Bitte melde dich mit deinem Online-Profil an.';}
 else if(room){void refresh();openSocket();}
});
window.addEventListener('pagehide',()=>{leaving=true;disconnect();if(pollTimer)clearInterval(pollTimer);if(initWaiting)clearInterval(initWaiting);});
document.addEventListener('visibilitychange',()=>{if(!document.hidden)void refresh();});
function boot(){
 createPaper();
 if(!codeValid.test(roomCode)){$('loading').textContent='Ungültiger Raumcode. Bitte gehe zur Online-Spielauswahl.';return;}
 $('back-link').href=onlineHome('&choose=1');
 $('room-code').textContent=roomCode;
 let waited=0;
 initWaiting=setInterval(async()=>{
  waited+=250;
  if(!auth()&&waited<15000)return;
  clearInterval(initWaiting);initWaiting=null;
  if(!auth()){$('loading').textContent='Bitte melde dich zunächst mit deinem Online-Profil an.';return;}
  try{receive(await api());openSocket();pollTimer=setInterval(refresh,4500);}
  catch(e){$('loading').textContent='Raum konnte nicht geladen werden: '+errorMessage(e);}
 },250);
}
boot();
})();