/* Schnellzugang zum gemeinsamen Raum – nur Firebase-authentifizierte Profile. */
(()=>{
'use strict';
const API=String(window.SPIELPORTAL_CONFIG?.apiBase||'https://serverfinal-ynbe.onrender.com').replace(/\/+$/,'');
const CODE=/^[A-HJ-NP-Z2-9]{6}$/;
function init(){
 const head=document.querySelector('.page-head');if(!head)return;
 const wrap=document.createElement('form');wrap.className='index-room-quick';
 wrap.setAttribute('aria-label','Online-Raum beitreten oder erstellen');
 wrap.innerHTML='<input name="code" aria-label="Raumcode" placeholder="Raumcode" maxlength="6" autocomplete="off" spellcheck="false" inputmode="text"><button type="submit" class="index-room-join">Beitreten</button><button type="button" class="index-room-create">+ Erstellen</button><div class="index-room-error" role="status" hidden></div>';
 head.append(wrap);
 const input=wrap.querySelector('input'),join=wrap.querySelector('.index-room-join'),create=wrap.querySelector('.index-room-create'),status=wrap.querySelector('.index-room-error');
 let busy=false;
 function message(value){status.textContent=value;status.hidden=!value;}
 function user(){
  const state=window.SpielOnline?.state?.();
  if(state?.status!=='online'||!state.user||!state.profile||state.profile.setupComplete===false)throw Error('Bitte melde dich zuerst mit deinem vollständigen Online-Profil an.');
  return state.user;
 }
 async function request(path){
  const account=user();
  const token=await account.getIdToken();
  if(window.SpielOnline?.state?.()?.user?.uid!==account.uid)throw Error('Die Anmeldung hat sich geändert. Bitte erneut versuchen.');
  const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),14000);
  try{
   const response=await fetch(API+'/api/hub'+path,{method:'POST',mode:'cors',cache:'no-store',signal:controller.signal,headers:{Authorization:'Bearer '+token},});
   const result=await response.json();
   if(!response.ok||result.ok!==true)throw Error(({ROOM_NOT_FOUND:'Raum nicht gefunden.',ROOM_FULL:'Der Raum ist voll.',NOT_A_MEMBER:'Kein Zugriff auf diesen Raum.',PROFILE_REQUIRED:'Bitte vervollständige dein Profil.',DATABASE_UNAVAILABLE:'Der Spielserver ist momentan nicht erreichbar.'})[result.error]||result.error||'Raum konnte nicht geöffnet werden.');
   if(!result.room?.code||!CODE.test(result.room.code))throw Error('Der Server hat keinen gültigen Raumcode zurückgegeben.');
   location.assign('spielauswahl-online.html?room='+encodeURIComponent(result.room.code));
  }finally{clearTimeout(timeout);}
 }
 async function perform(path){
  if(busy)return;
  busy=true;join.disabled=create.disabled=true;message('');
  try{await request(path);}catch(e){message(e.name==='AbortError'?'Zeitüberschreitung beim Server. Bitte erneut versuchen.':e.message||'Verbindung fehlgeschlagen.');}
  finally{busy=false;join.disabled=create.disabled=false;}
 }
 wrap.addEventListener('submit',e=>{e.preventDefault();const code=input.value.trim().toUpperCase();input.value=code;if(!CODE.test(code)){message('Bitte einen gültigen sechsstelligen Raumcode eingeben.');return;}perform('/rooms/'+encodeURIComponent(code)+'/join');});
 create.addEventListener('click',()=>perform('/rooms'));
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();