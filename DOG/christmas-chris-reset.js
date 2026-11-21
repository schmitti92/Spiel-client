/**
 * Chris-only one-time Lichtertal restart control.
 * Account identity is verified again on Render for every action. This
 * client never submits a UID and cannot reset another profile.
 */
const KEY='CHRIS_WEIHNACHT_NEUSTART';
const BASE=String(window.SPIELPORTAL_CONFIG?.apiBase||'https://serverfinal-ynbe.onrender.com').replace(/\/+$/,'');
function clearChrisLocalPreviewOnce(uid){
 const marker='dog-chris-personal-restart-local-cleanup-v1:'+uid;
 try{
  if(localStorage.getItem(marker)==='1')return false;
  // The verified server reset does not change device-only developer sliders.
  // Clear them once so Chris really sees the fresh, non-preview event state.
  for(const prefix of [
   'dog-christmas-video-seen-v1:','dog-christmas-reveal-baseline-v1:',
   'dog-christmas-dev-preview-v1:','dog-christmas-dev-pin-v1:'
  ]){
   localStorage.removeItem(prefix+uid);
   sessionStorage.removeItem(prefix+uid);
  }
  localStorage.setItem(marker,'1');
  return true;
 }catch{return false;}
}
const account=()=>{
 const state=window.SpielOnline?.state?.();
 return state?.status==='online'&&state.user?.uid&&state.user.getIdToken&&
   String(state.profile?.name||'').trim().toLowerCase()==='chris'?state.user:null;
};
async function request(user,path,method='GET',body=null){
 const uid=user.uid,token=await user.getIdToken();
 if(account()?.uid!==uid)throw Error('PROFIL_GEWECHSELT');
 const response=await fetch(BASE+'/api/hub/dog/chris-christmas-reset'+path,{
  method,cache:'no-store',
  headers:{Authorization:'Bearer '+token,...(body?{'Content-Type':'application/json'}:{})},
  ...(body?{body:JSON.stringify(body)}:{})
 });
 const payload=await response.json().catch(()=>({}));
 if(!response.ok||payload.ok!==true)throw Error(payload.error||'SERVER_NICHT_ERREICHBAR');
 if(account()?.uid!==uid)throw Error('PROFIL_GEWECHSELT');
 return payload;
}
export function initChrisChristmasRestart(){
 // Reuse Chris's existing Entwickler-Einstellungen dialog, not the tightly
 // sized nine-tab sidebar. The backend still requires his verified account.
 const parent=document.querySelector('.dog-dev-dialog .dog-dev-fields');
 if(!parent)return;
 const box=document.createElement('section');
 box.id='dog-chris-personal-restart';
 box.hidden=true;
 box.style.cssText='margin-top:10px;padding:12px;border:1px solid rgba(232,188,117,.45);border-radius:12px;background:rgba(16,29,46,.8)';
 box.innerHTML='<strong style="color:#ffdb9b;font-size:13px">🔁 Chris · Event-Neustart</strong>'+
  '<p style="font-size:12px;margin:7px 0;line-height:1.5">Einmaliger Reset nur deines persönlichen Weihnachtsfortschritts. Gemeinsames Dorf und andere Spieler bleiben erhalten.</p>'+
  '<button type="button" style="width:100%;padding:9px;border-radius:8px;border:1px solid #efc280;background:#513426;color:#fff4d7;cursor:pointer">Persönlichen Fortschritt zurücksetzen</button>'+
  '<p role="status" aria-live="polite" style="font-size:12px;margin:8px 0 0;line-height:1.4"></p>';
 parent.append(box);
 const button=box.querySelector('button'),status=box.querySelector('[role=status]');
 let shownUid=null,pending=false,resetDone=false;
 const refresh=async()=>{
  const user=account(),uid=user?.uid;
  if(!uid){box.hidden=true;shownUid=null;return;}
  if(shownUid===uid&&pending)return;
  shownUid=uid;box.hidden=false;
  if(resetDone)return;
  status.textContent='Prüfe die persönliche Reset-Freigabe …';
  button.disabled=true;
  try{
   const data=await request(user,'/status');
   if(account()?.uid!==uid)return;
   resetDone=Boolean(data.alreadyReset);
   if(resetDone&&clearChrisLocalPreviewOnce(uid)){
    window.location.reload();
    return;
   }
   button.hidden=resetDone;
   status.textContent=resetDone?
    '✅ Der einmalige persönliche Weihnachts-Neustart wurde bereits ausgeführt.':
    'Persönliche gespeicherte Bereiche: '+data.personalDocumentsPresent+' von '+data.collections+'. Nur für Chris.';
   button.disabled=false;
  }catch(e){
   if(account()?.uid===uid){status.textContent='⚠️ Serverprüfung nicht verfügbar. '+e.message;button.disabled=true;}
  }
 };
 button.addEventListener('click',async()=>{
  const user=account();
  if(!user||pending||resetDone)return;
  const uid=user.uid;
  const approved=window.confirm(
   'WIRKLICH CHRIS ZURÜCKSETZEN?\n\n'+
   'DOG-Partien, Spielerlevel/XP, persönliche Weihnachtsforschung, Rubbellose, Münzen, Gewinne, Baum-Belohnungen, Grinch-Fortschritt und Intro-Quittung von Chris beginnen wieder von vorn.\n\n'+
   'Vanessa, David, das gemeinsame Dorf, ihre Gewinne und andere Spiele bleiben unverändert. Der Vorgang kann nur über eine Administrator-Sicherung rückgängig gemacht werden.'
  );
  if(!approved)return;
  pending=true;button.disabled=true;status.textContent='Sichere und setze Chris-Daten auf Render zurück …';
  try{
   const result=await request(user,'','POST',{confirmation:KEY});
   if(account()?.uid!==uid)throw Error('PROFIL_GEWECHSELT');
   if(!result.resetCompleted)throw Error('RESET_NICHT_BESTÄTIGT');
   // Also clear the local sliders and old film flags after a manual reset.
   clearChrisLocalPreviewOnce(uid);
   resetDone=true;button.hidden=true;
   status.textContent='✅ Chris beginnt wieder von vorn. '+result.cleared+' gespeicherte Bereiche archiviert und zurückgesetzt. Aktualisiere die Eventseite.';
   // Refresh every on-page personal cache and reward panel after the server
   // commits. This is not a second reset.
   window.location.reload();
  }catch(e){
   status.textContent=e.message==='CHRIS_RESET_ACTIVE_DOG_MATCH'?
    '⚠️ Chris spielt noch eine DOG-Partie. Bitte diese erst beenden und erneut zurücksetzen.':
    '⚠️ Reset nicht bestätigt: '+e.message;
   button.disabled=false;
  }finally{pending=false;}
 });
 window.addEventListener('spielonline-change',()=>void refresh());
 void refresh();
}
