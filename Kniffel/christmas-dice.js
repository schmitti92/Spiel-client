/* Cosmetic Christmas dice earned after 20 completed Christmas ice pictures.
 * The SIX uploaded PNGs are local assets. The verified reward belongs to the
 * signed-in profile, never to the browser or a particular Kniffel match.
 * One account check per entry/revisit; no reads per roll or dice animation. */
(function(global){
 'use strict';
 const button=document.getElementById('christmas-dice-toggle');
 const status=document.getElementById('christmas-dice-status');
 const base=String(global.SPIELPORTAL_CONFIG?.apiBase||'https://serverfinal-ynbe.onrender.com').replace(/\/+$/,'');
 let uid='',verifiedUid='',unlocked=false,enabled=false,inFlight=null,sequence=0;
 let loading=false,failed=false,lastCheckAt=0;
 const account=()=>{
  const state=global.SpielOnline?.state?.();
  return state?.status==='online'&&state.user?.uid&&typeof state.user.getIdToken==='function'?state.user:null;
 };
 const key=value=>'kniffel:christmas-dice:'+value;
 function paint(){
  if(!button)return;
  // NEVER hide the control. A formerly hidden button gave no clue that the
  // 20-picture reward existed, and prevented a manual account re-check.
  button.hidden=false;
  button.disabled=loading;
  button.setAttribute('aria-pressed',String(unlocked&&enabled));
  button.setAttribute('aria-busy',String(loading));
  button.classList.toggle('dice-unlocked',unlocked);
  button.classList.toggle('dice-locked',!unlocked);
  if(loading)button.textContent='⏳ Weihnachtswürfel prüfen';
  else if(unlocked)button.textContent=enabled?'🎄 Weihnachtswürfel AN':'🎄 Weihnachtswürfel AUS';
  else button.textContent='🔒 Weihnachtswürfel prüfen';
  let message;
  if(unlocked)message='✅ Nach 20 Bildern freigeschaltet · '+(enabled?'Weihnachtswürfel aktiv':'Weihnachtswürfel ausgeschaltet');
  else if(loading)message='⏳ Dein Weihnachtsevent-Fortschritt wird geprüft …';
  else if(!account())message='🔐 Mit dem Profil aus dem Weihnachtsevent anmelden, um die Würfel freizuschalten.';
  else if(failed)message='⚠️ Freischaltung konnte nicht geprüft werden. Tippe auf „Weihnachtswürfel prüfen“.';
  else message='🔒 Belohnung ab 20 abgeschlossenen Bildern im Weihnachtsevent 2. Zum Aktualisieren antippen.';
  button.title=message;
  if(status)status.textContent=message;
 }
 function clearArt(die){
  if(!die?.classList)return;
  die.classList.remove('christmas-die');
  die.querySelectorAll('img.christmas-die-art').forEach(el=>el.remove());
 }
 function decorate(die,n){
  if(!die||!enabled||!Number.isInteger(n)||n<1||n>6)return;
  const art=document.createElement('img');
  art.className='christmas-die-art';
  art.alt='';art.setAttribute('aria-hidden','true');art.decoding='async';
  art.onerror=()=>{art.remove();die.classList.remove('christmas-die')};
  art.onload=()=>{if(art.parentNode===die&&enabled)die.classList.add('christmas-die')};
  art.src='./Bilder/weihnachtswuerfel-'+n+'.png';
  die.append(art);
 }
 function updateRendered(){
  document.querySelectorAll('#dice button.die').forEach(die=>{
   clearArt(die);
   if(enabled)decorate(die,Number(die.dataset.diceValue||0));
  });
 }
 function reset(){
  sequence++;uid='';verifiedUid='';unlocked=false;enabled=false;
  loading=false;failed=false;lastCheckAt=0;
  updateRendered();paint();
 }
 async function verifiedReward(user){
  const token=await user.getIdToken();
  const headers={Authorization:'Bearer '+token};
  let response=await fetch(base+'/api/christmas-ice/unlocks',{headers,cache:'no-store'});
  if(response.status===404){
   // Older Render revisions may lack the small /unlocks endpoint. In that
   // case use the EXISTING authenticated /me progress, never guess or bypass.
   response=await fetch(base+'/api/christmas-ice/me',{headers,cache:'no-store'});
   if(!response.ok)throw Error('CHRISTMAS_PROGRESS_'+response.status);
   const result=await response.json();
   if(!result.ok)throw Error(result.error||'CHRISTMAS_PROGRESS_UNAVAILABLE');
   const state=result.state;
   return Math.max(Number(state?.completed)||0,Number(state?.maxRewarded)||0)>=20;
  }
  if(!response.ok)throw Error('CHRISTMAS_UNLOCK_'+response.status);
  const result=await response.json();
  if(!result.ok||typeof result.kniffelChristmasDice!=='boolean')throw Error('CHRISTMAS_UNLOCK_INVALID');
  return result.kniffelChristmasDice;
 }
 async function refresh(force=false){
  const user=account();
  if(!user){if(uid||unlocked||loading)reset();else paint();return}
  if(uid!==user.uid){
   sequence++;uid=user.uid;verifiedUid='';unlocked=false;enabled=false;
   failed=false;loading=false;updateRendered();
  }
  if(!force&&verifiedUid===uid){paint();return}
  if(inFlight?.uid===uid)return inFlight.promise;
  const requestId=++sequence,personUid=uid;
  loading=true;failed=false;paint();
  const promise=(async()=>{
   try{
    const earned=await verifiedReward(user);
    if(requestId!==sequence||account()?.uid!==personUid)return;
    verifiedUid=personUid;unlocked=earned;failed=false;
    let stored=null;
    try{stored=localStorage.getItem(key(personUid))}catch{}
    enabled=unlocked&&stored!=='off';
    updateRendered();
   }catch(error){
    if(requestId!==sequence||account()?.uid!==personUid)return;
    // A temporary connection error must not erase an already verified skin.
    failed=true;
    if(!unlocked){enabled=false;updateRendered()}
    console.warn('[Kniffel Christmas dice] Freischaltung noch nicht bestätigt',error);
   }finally{
    if(requestId===sequence){loading=false;lastCheckAt=Date.now();paint()}
    if(inFlight?.promise===promise)inFlight=null;
   }
  })();
  inFlight={uid:personUid,promise};
  return promise;
 }
 if(button)button.addEventListener('click',()=>{
  if(loading)return;
  if(!unlocked){
   if(!account()&&typeof global.SpielOnline?.openLogin==='function'){
    global.SpielOnline.openLogin();return;
   }
   void refresh(true);return;
  }
  enabled=!enabled;
  try{localStorage.setItem(key(uid),enabled?'on':'off')}catch{}
  updateRendered();paint();
 });
 global.addEventListener('spielonline-change',()=>{void refresh()});
 // Previously we refreshed ONLY on an account change, so returning from the
 // 20th picture with the same account left the reward locked indefinitely.
 const revisit=()=>{if(!document.hidden&&account()&&Date.now()-lastCheckAt>1800)void refresh(true)};
 document.addEventListener('visibilitychange',revisit);
 global.addEventListener('focus',revisit);
 global.addEventListener('pageshow',event=>{if(event.persisted)revisit()});
 global.KniffelChristmasDice=Object.freeze({decorate,isEnabled:()=>unlocked&&enabled,refresh});
 paint();void refresh();
})(window);
