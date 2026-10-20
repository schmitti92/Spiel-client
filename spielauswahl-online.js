/* Online game-selection home (V8). Single existing Firebase hub, no second room. */
(()=>{
'use strict';
const input=new URL(location.href).searchParams;
const code=String(input.get('room')||'').toUpperCase();
const codeValid=/^[A-HJ-NP-Z2-9]{6}$/.test(code);
const chooseAnother=input.get('choose')==='1';
const base=String(window.SPIELPORTAL_CONFIG?.apiBase||'https://serverfinal-ynbe.onrender.com').replace(/\/+$/,'');
const GAME={barikade:'Barikade',skyjo:'SKYJO Action',kreuz:'KreuzKunter',business:'Das große Business'};
const byId=id=>document.getElementById(id);
const buttons=[...document.querySelectorAll('[data-select-game]')];
let loading=false,choosing=false,room=null,notifiedUid=null;
const roomLocation=game=>game==='skyjo'?'Skyjo/skyjo_start.html?room='+encodeURIComponent(code):game==='barikade'?'Barikade/barikade_start.html?room='+encodeURIComponent(code):game==='business'?'Business/business_start.html?room='+encodeURIComponent(code):game==='kreuz'?'KreuzKunter/kreuzkunter_start.html?room='+encodeURIComponent(code):'hub-lobby.html?room='+encodeURIComponent(code)+'&stage=1';
function status(message,error=false){
 const box=byId('online-notice');
 if(box){box.textContent=message;box.classList.toggle('error',!!error);}
}
function user(){
 const state=window.SpielOnline?.state?.();
 return state?.status==='online'&&state?.profile?.setupComplete!==false&&state?.user?.getIdToken?state.user:null;
}
async function request(path,method='GET',payload){
 const person=user();if(!person)throw Error('LOGIN_REQUIRED');
 const uid=person.uid;
 const token=await person.getIdToken();
 if(user()?.uid!==uid)throw Error('LOGIN_REQUIRED');
 const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),14000);
 try{
  const response=await fetch(base+'/api/hub'+path,{
   method,mode:'cors',cache:'no-store',signal:controller.signal,
   headers:{Authorization:'Bearer '+token,...(payload?{'Content-Type':'application/json'}:{})},
   body:payload?JSON.stringify(payload):undefined
  });
  const data=await response.json();
  if(!response.ok||data?.ok!==true)throw Error(data?.error||'SERVER_ERROR');
  return data;
 }finally{clearTimeout(timeout);}
}

function renderProfileShortcut(){
 const el=byId('online-profile-avatar');if(!el)return;
 const p=window.SpielOnline?.state?.()?.profile;
 if(!p){el.textContent='👤';el.style.backgroundImage='';return;}
 const data=typeof p.avatarImage==='string'&&/^data:image\\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(p.avatarImage)?p.avatarImage:null;
 if(data){el.style.backgroundImage='url('+JSON.stringify(data)+')';el.style.backgroundSize='cover';el.style.backgroundPosition='center';el.textContent='';return;}
 const n=Number(p.avatar),idx=Number.isInteger(n)?Math.max(0,Math.min(15,n)):0;
 const asset=idx<8?'profile-avatars.webp':'profile-avatars-extra.webp';const cell=idx<8?idx:idx-8;
 el.style.backgroundImage='url('+JSON.stringify(asset)+')';el.style.backgroundSize='400% 200%';el.style.backgroundPosition=((cell%4)*100/3)+'% '+(Math.floor(cell/4)*100)+'%';el.textContent='';
}
function update(snapshot){
 if(snapshot.code!==code)return;
 room=snapshot;
 byId('online-room-code').textContent=code;
 byId('online-room-players').textContent=snapshot.players?.map(p=>(p.host?'👑 ':'')+p.name).join(' · ')||'';
 byId('online-room-status').textContent=snapshot.host?'👑 Du bist Host – wähle euer nächstes Spiel.':'Du bist verbunden. Der Host wählt das nächste Spiel.';
 const permitted=!!snapshot.host&&snapshot.phase!=='playing'&&!choosing;
 for(const btn of buttons)btn.disabled=!permitted;
 if(snapshot.game&&['preparing','playing'].includes(snapshot.phase)&&!(chooseAnother&&snapshot.host&&snapshot.phase==='preparing')){
  location.replace(roomLocation(snapshot.game));
  return;
 }
 status(snapshot.host?'Wähle unten ein Spiel, um den Online-Vorraum für alle zu öffnen.':'Warte, bis der Host ein Spiel ausgewählt hat. Alle bleiben im selben Raum.');
}
async function refresh(){
 if(!codeValid){status('Der Raumcode fehlt oder ist ungültig. Bitte gehe zurück zur Raum-Lobby.',true);return;}
 if(loading||choosing||document.hidden)return;
 if(!user()){
  if(notifiedUid!==null)room=null;
  buttons.forEach(b=>b.disabled=true);
  status('Bitte melde dich mit deinem Online-Profil an, um auf diesen Raum zuzugreifen.');
  return;
 }
 loading=true;
 try{
  const person=user();
  if(!room||notifiedUid!==person.uid)status('Spielraum wird mit dem Server abgeglichen …');
  notifiedUid=person.uid;
  const result=await request('/rooms/'+code);
  update(result.room);
 }catch(e){
  buttons.forEach(b=>b.disabled=true);
  if(['LOGIN_REQUIRED','PROFILE_REQUIRED','NOT_A_MEMBER','ROOM_NOT_FOUND'].includes(e?.message)){
   room=null;
   status(e.message==='NOT_A_MEMBER'?'Du gehörst noch nicht zu diesem Raum. Bitte über die Raum-Lobby beitreten.':
    e.message==='ROOM_NOT_FOUND'?'Diesen Raum gibt es nicht mehr. Bitte erstelle einen neuen.':'Bitte melde dich an und tritt dem Raum erneut bei.',true);
  }else status('Die Verbindung zum Spielserver ist derzeit nicht verfügbar. Wir versuchen es erneut.',true);
 }finally{loading=false;}
}
for(const button of buttons){
 button.disabled=true;
 button.addEventListener('click',async()=>{
  const game=button.dataset.selectGame;
  if(!room?.host||choosing||!Object.hasOwn(GAME,game))return;
  choosing=true;buttons.forEach(b=>b.disabled=true);
  status('Der Host wählt '+GAME[game]+' …');
  try{
   const result=await request('/rooms/'+code+'/select','POST',{game});
   if(result?.room?.game!==game)throw Error('GAME_SELECT_FAILED');
   location.assign(roomLocation(game));
  }catch(e){
   choosing=false;
   status(e?.message==='HOST_ONLY'?'Nur der Host kann das Spiel auswählen.':'Die Spielauswahl ist fehlgeschlagen: '+(e.message||'Netzwerkfehler'),true);
   void refresh();
  }
 });
}
if(!codeValid)status('Kein gültiger Online-Raum angegeben. Bitte zuerst einen Raum betreten.',true);
else{byId('online-room-code').textContent=code;}
window.addEventListener('spielonline-change',()=>{renderProfileShortcut();void refresh();});
document.addEventListener('visibilitychange',()=>{if(!document.hidden)void refresh();});
setInterval(refresh,3500);
renderProfileShortcut();
void refresh();
})();
