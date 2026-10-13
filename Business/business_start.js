/* Das große Business · gemeinsamer Online-Vorraum V11
   Authenticated Firebase hub is authoritative; cards/dice are illustrative previews. */
(()=>{
'use strict';
const $=id=>document.getElementById(id);
const params=new URL(location.href).searchParams;
const code=String(params.get('room')||'').toUpperCase();
const CODE=/^[A-HJ-NP-Z2-9]{6}$/;
const api=String(window.SPIELPORTAL_CONFIG?.apiBase||'https://serverfinal-ynbe.onrender.com').replace(/\/+$/,'');
const designNames=['Klassisch','Nachtstadt','Gold'];
let room=null,busy=false,loading=false,ws=null,retry=null,pollTimer=null,themeIndex=0,closed=false;
const onlineHome=extra=>'../spielauswahl-online.html?room='+encodeURIComponent(code)+(extra||'');
const errors={LOGIN_REQUIRED:'Bitte melde dich mit deinem Online-Profil an.',ROOM_NOT_FOUND:'Der Raum ist nicht mehr vorhanden.',
 NOT_A_MEMBER:'Du gehörst nicht zu diesem Raum. Bitte tritt ihm zunächst bei.',HOST_ONLY:'Nur der Host kann die Rundenanzahl ändern.',
 INVALID_SETTINGS:'Ungültige Rundenanzahl.',NO_BUSINESS_SETUP:'Dieses Spiel ist nicht mehr ausgewählt.',
 MATCH_IN_PROGRESS:'Die Partie läuft bereits.',PLAYERS_NOT_READY:'Es müssen mindestens zwei aktive Spieler bereit sein.',
 SPECTATOR_CANNOT_READY:'Zuschauer melden sich nicht bereit.',GAME_SEATS_FULL:'Alle aktiven Spielerplätze sind belegt.',
 HOST_MUST_PLAY:'Der Host muss mitspielen.'};
const errorText=e=>errors[e?.message]||e?.message||'Ein Verbindungsfehler ist aufgetreten.';
const note=(value='',bad=false)=>{$('status').textContent=value;$('status').classList.toggle('error',bad)};
const state=()=>window.SpielOnline?.state?.();
const profile=()=>{const p=state();return p?.status==='online'&&p?.profile?.setupComplete!==false&&p?.user?.getIdToken?p:null;};
async function request(suffix='',method='GET',payload){
 const p=profile();if(!p)throw Error('LOGIN_REQUIRED');
 const uid=p.user.uid,token=await p.user.getIdToken();
 if(profile()?.user.uid!==uid)throw Error('LOGIN_REQUIRED');
 const abort=new AbortController(),timeout=setTimeout(()=>abort.abort(),14000);
 try{
  const response=await fetch(api+'/api/hub/rooms/'+code+suffix,{
   method,mode:'cors',cache:'no-store',signal:abort.signal,
   headers:{Authorization:'Bearer '+token,...(payload===undefined?{}:{'Content-Type':'application/json'})},
   body:payload===undefined?undefined:JSON.stringify(payload)
  });
  const result=await response.json();
  if(!response.ok||result?.ok!==true)throw Error(result?.error||'SERVER_ERROR');
  return result.room;
 }finally{clearTimeout(timeout);}
}
const create=(tag,cls,txt)=>{
 const el=document.createElement(tag);
 if(cls)el.className=cls;
 if(txt!==undefined)el.textContent=txt;
 return el;
};
function gameLink(r){
 const m=r.match;
 if(!m?.participating||!/^D[A-HJ-NP-Z2-9]{9}$/.test(m.gameCode)||!/^[0-9a-f-]{36}$/i.test(m.id))throw Error('INVALID_MATCH_CODE');
 return 'business_online.html?'+new URLSearchParams({hub:r.code,match:m.id,gameCode:m.gameCode}).toString();
}
function receive(snapshot){
 if(!snapshot||snapshot.code!==code)return;
 if(snapshot.game!=='business'){
  location.replace(onlineHome());
  return;
 }
 room=snapshot;
 if(room.phase==='playing'&&room.match?.participating){try{location.replace(gameLink(room));}catch(e){note(errorText(e),true);}return;}
 render();
}
async function mutate(suffix,payload){
 if(busy||!room)return;
 busy=true;render();
 try{receive(await request(suffix,'POST',payload));}
 catch(e){note(errorText(e),true);}
 finally{busy=false;if(room)render();}
}
function renderPlayers(){
 const list=$('players-list'),max=room.maxPlayers||5;
 list.replaceChildren();
 const active=room.players.filter(p=>p.participating);
 $('room-count').textContent=room.players.length+' im Raum · '+active.length+'/'+max+' spielen';
 room.players.forEach((p,i)=>{
  const item=create('div','biz-player'+(p.host?' host':''));
  const avatar=create('span','avatar',(p.name||'?').slice(0,1).toUpperCase());avatar.style.borderColor=['#e6bd68','#e88ba3','#5db9ec','#93c76a','#bf95e7'][i%5];
  const person=create('div','person',p.name||'Spieler');
  person.append(create('small','',(p.host?'👑 Host · ':'')+(p.me?'Du · ':'')+(p.participating?'Mitspieler':'Zuschauer')));
  const state=create('span','state'+(p.ready&&p.participating?' ok':''),p.participating?(p.ready?'✔ Bereit':'○ Wartet'):'Zuschauer');
  item.append(avatar,person,state);
  if(room.host&&room.phase==='preparing'&&!p.host){
   const seat=create('button','seat-btn',p.participating?'Zuschauen':'Mitspielen');
   seat.type='button';seat.disabled=busy;
   seat.addEventListener('click',()=>mutate('/seats',{seat:p.seat,participating:!p.participating}));
   item.append(seat);
  }
  list.append(item);
 });
 for(let i=active.length;i<max;i++){
  const empty=create('div','empty-seat');empty.append(create('span','','+'),create('small','','Spielerplatz frei · Freunde einladen'));list.append(empty);
 }
}
function render(){
 if(!room)return;
 $('room-code').textContent=code;
 const host=room.host&&room.phase==='preparing'&&!busy;
 const rounds=room.settings?.rounds??20;
 document.querySelectorAll('[data-rounds]').forEach(btn=>{
  btn.classList.toggle('selected',Number(btn.dataset.rounds)===rounds);
  btn.setAttribute('aria-pressed',String(Number(btn.dataset.rounds)===rounds));
  btn.disabled=!host;
 });
 $('host-notice').textContent=room.host?'👑 Du bist der Host. Du bestimmst die Rundenanzahl.':'🔒 Nur der Host kann Einstellungen ändern.';
 renderPlayers();
 const me=room.players.find(p=>p.me);
 const playing=room.players.filter(p=>p.participating),ready=playing.filter(p=>p.ready).length;
 const isPreparing=room.phase==='preparing';
 $('ready-btn').disabled=busy||!isPreparing||!me?.participating;
 $('ready-btn').textContent=me?.ready?'✔ Bereitmeldung zurücknehmen':'✓ Ich bin bereit';
 $('ready-btn').classList.toggle('active',!!me?.ready);
 // The backend also starts the game automatically as soon as the last player is ready.
 const launchAllowed=isPreparing&&room.host&&playing.length>=2&&ready===playing.length;
 $('start-btn').textContent=room.phase==='playing'?'▶ ZUM SPIEL':'▶ SPIEL STARTEN';
 $('start-btn').disabled=busy||!(launchAllowed||(room.phase==='playing'&&room.match?.participating));
 $('start-help').textContent=room.phase==='playing'?'Die Partie läuft. Zum aktuellen Spiel wechseln.':
  playing.length<2?'Mindestens zwei Spieler müssen mitspielen.':
  ready===playing.length?'Alle bereit – der Spielserver startet automatisch.':ready+' von '+playing.length+' Spielern bereit.';
 $('leave-btn').disabled=busy||room.phase==='playing';
 $('chat-content').querySelector('.system-line').textContent='Raum '+code+' · '+room.players.length+' Teilnehmer verbunden.';
 note(room.phase==='playing'?'Spiel läuft. Zuschauer bleiben im gemeinsamen Raum.':'Runde: '+rounds+' · Bereitmeldungen: '+ready+'/'+playing.length);
}
function poll(){
 if(!room||busy||loading||document.hidden||!profile())return;
 loading=true;
 request().then(receive).catch(e=>note(errorText(e),true)).finally(()=>{loading=false});
}
function stopSocket(){
 if(retry){clearTimeout(retry);retry=null;}
 if(ws){const old=ws;ws=null;try{old.onclose=null;old.close();}catch(_e){}}
}
function connect(){
 if(ws||closed||!room||!profile())return;
 const socket=new WebSocket(api.replace(/^http/i,'ws')+'/hub');
 ws=socket;
 socket.onopen=async()=>{
  try{const p=profile();if(!p)return socket.close();const token=await p.user.getIdToken();
    if(ws===socket&&socket.readyState===1)socket.send(JSON.stringify({type:'subscribe',code,profileIdToken:token}));
  }catch(_e){try{socket.close()}catch(_x){}}
 };
 socket.onmessage=e=>{let data;try{data=JSON.parse(e.data)}catch(_e){return;}
  if(data?.type==='room'&&data.room?.code===code)receive(data.room);
 };
 socket.onerror=()=>{};
 socket.onclose=()=>{if(ws!==socket)return;ws=null;
  if(!closed)retry=setTimeout(()=>{retry=null;connect()},5000);
 };
}
function share(source){
 const url=new URL('../hub-lobby.html?invite='+encodeURIComponent(code),location.href).href;
 const msg='Das große Business: Komm in unseren Spielraum '+code+'! '+url;
 return (async()=>{
  try{
   if(source==='whatsapp'){window.open('https://wa.me/?text='+encodeURIComponent(msg),'_blank','noopener,noreferrer');return}
   if(navigator.share&&source==='share'){await navigator.share({title:'Das große Business',text:'Raumcode: '+code,url});return}
   await navigator.clipboard.writeText(source==='code'?code:msg);
   note(source==='code'?'📋 Raumcode kopiert.':'🔗 Einladung kopiert.');
  }catch(e){if(e?.name!=='AbortError')note('Teile den Code '+code+' mit deinen Freunden.');}
 })();
}
function rotateTheme(direction){
 themeIndex=(themeIndex+direction+designNames.length)%designNames.length;
 const theme=['classic','night','gold'][themeIndex];
 $('theme-preview').dataset.theme=theme;
 $('theme-label').textContent=designNames[themeIndex]+(themeIndex===0?'':' · Vorschau');
 $('theme-hint').textContent=themeIndex===0?'Klassisches Brett. Alternative Designs sind für später geplant.':'„'+designNames[themeIndex]+'“ ist eine Vorschau und noch nicht im laufenden Business-Spiel verfügbar.';
}
document.querySelectorAll('[data-rounds]').forEach(btn=>btn.addEventListener('click',()=>{
 if(!room?.host||room.phase!=='preparing'||busy)return;
 void mutate('/business-settings',{settings:{rounds:Number(btn.dataset.rounds)}});
}));
$('ready-btn').addEventListener('click',()=>{
 const me=room?.players?.find(p=>p.me);
 if(room?.phase==='preparing'&&me?.participating&&!busy)void mutate('/ready',{ready:!me.ready});
});
$('start-btn').addEventListener('click',()=>{
 if(!room||busy)return;
 if(room.phase==='playing'&&room.match?.participating){location.assign(gameLink(room));return;}
 if(!room.host)return;
 const active=room.players.filter(p=>p.participating);
 if(active.length<2||!active.every(p=>p.ready)){note('Bitte warten, bis alle aktiven Spieler bereit sind.');return;}
 void mutate('/start',{});
});
$('leave-btn').addEventListener('click',async()=>{
 if(!room||room.phase==='playing'||busy)return;
 busy=true;
 try{await request('/leave','POST');room=null;location.assign('../hub-lobby.html');}
 catch(e){busy=false;note(errorText(e),true);render();}
});
$('copy-btn').addEventListener('click',()=>share('code'));
$('invite-btn').addEventListener('click',()=>share('share'));
$('theme-prev').addEventListener('click',()=>rotateTheme(-1));
$('theme-next').addEventListener('click',()=>rotateTheme(1));
$('help-btn').addEventListener('click',()=>note('👑 Nur der Host ändert die Rundenanzahl und Spielplätze. Jeder aktive Spieler klickt auf „Ich bin bereit“. Danach startet das Spiel automatisch.'));
$('refresh-btn').addEventListener('click',()=>poll());
window.addEventListener('spielonline-change',()=>{
 if(!profile()){
  stopSocket();room=null;
  $('room-count').textContent='Bitte erneut anmelden';
  note('Online-Profil nicht verbunden.',true);
 }else if(room){void poll();connect();}
});
window.addEventListener('pagehide',()=>{closed=true;stopSocket();if(pollTimer)clearInterval(pollTimer);});
document.addEventListener('visibilitychange',()=>{if(!document.hidden)poll()});
async function boot(){
 if(!CODE.test(code)){note('Ungültiger Raumcode. Bitte öffne die gemeinsame Spielauswahl.',true);return}
 $('back-link').href=onlineHome('&choose=1');
 $('room-code').textContent=code;
 let elapsed=0;
 const check=setInterval(async()=>{
  elapsed+=250;
  if(!profile()&&elapsed<15000)return;
  clearInterval(check);
  if(!profile()){note('Bitte melde dich mit deinem Online-Profil an.',true);return}
  try{
   receive(await request());
   connect();pollTimer=setInterval(poll,4500);
  }catch(e){note('Raum konnte nicht geladen werden: '+errorText(e),true)}
 },250);
}
void boot();
})();