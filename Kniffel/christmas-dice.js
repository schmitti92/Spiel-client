/* Cosmetic Christmas dice, unlocked by server-verified progress in Weihnachtsevent 2.
 * No gameplay data is modified and no extra requests run during dice rolls. */
(function(global){
 'use strict';
 const button=document.getElementById('christmas-dice-toggle');
 const base=String(global.SPIELPORTAL_CONFIG?.apiBase||'https://serverfinal-ynbe.onrender.com').replace(/\/+$/,'');
 let uid='',verifiedUid='',unlocked=false,enabled=false,inFlight=null,sequence=0;
 const account=()=>{
  const state=global.SpielOnline?.state?.();
  return state?.status==='online'&&state.user?.uid&&state.user.getIdToken?state.user:null;
 };
 const key=value=>'kniffel:christmas-dice:'+value;
 function updateButton(){
  if(!button)return;
  button.hidden=!unlocked;
  button.textContent=enabled?'🎄 Weihnachtswürfel: An':'🎄 Weihnachtswürfel: Aus';
  button.setAttribute('aria-pressed',String(enabled));
  button.title='Weihnachtswürfel nach 20 Bildern im Weihnachtsevent 2';
 }
 function clearArt(die){
  die.classList.remove('christmas-die');
  die.querySelectorAll('img.christmas-die-art').forEach(el=>el.remove());
 }
 function decorate(die,n){
  if(!die||!enabled||!Number.isInteger(n)||n<1||n>6)return;
  const picture=document.createElement('img');
  picture.className='christmas-die-art';
  picture.alt='';picture.setAttribute('aria-hidden','true');picture.decoding='async';
  picture.onerror=()=>{picture.remove();die.classList.remove('christmas-die')};
  picture.onload=()=>{if(picture.parentNode===die&&enabled)die.classList.add('christmas-die')};
  picture.src='./Bilder/weihnachtswuerfel-'+n+'.png';
  die.append(picture);
 }
 function updateRendered(){
  document.querySelectorAll('#dice button.die').forEach(die=>{
   clearArt(die);
   if(enabled)decorate(die,Number(die.dataset.diceValue||0));
  });
 }
 function reset(){
  sequence++;uid='';verifiedUid='';unlocked=false;enabled=false;updateButton();updateRendered();
 }
 async function refresh(force=false){
  const user=account();
  if(!user){if(uid||unlocked)reset();return}
  if(uid!==user.uid){sequence++;uid=user.uid;verifiedUid='';unlocked=false;enabled=false;updateButton();updateRendered()}
  if(!force&&verifiedUid===uid)return;
  if(inFlight?.uid===uid)return inFlight.promise;
  const requestId=++sequence,personUid=uid;
  const promise=(async()=>{
   try{
    const token=await user.getIdToken();
    const response=await fetch(base+'/api/christmas-ice/unlocks',{
     headers:{Authorization:'Bearer '+token},cache:'no-store'
    });
    if(!response.ok)throw Error('CHRISTMAS_UNLOCK_UNAVAILABLE');
    const result=await response.json();
    if(!result.ok)throw Error('CHRISTMAS_UNLOCK_UNAVAILABLE');
    if(requestId!==sequence||account()?.uid!==personUid)return;
    verifiedUid=personUid;
    unlocked=result.kniffelChristmasDice===true;
    let stored=null;
    try{stored=localStorage.getItem(key(personUid))}catch{}
    enabled=unlocked&&stored!=='off';
    updateButton();updateRendered();
   }catch(error){
    if(requestId!==sequence||account()?.uid!==personUid)return;
    verifiedUid='';unlocked=false;enabled=false;updateButton();updateRendered();
    console.warn('[Kniffel Christmas dice] Server unlock could not be verified',error);
   }finally{if(inFlight?.promise===promise)inFlight=null}
  })();
  inFlight={uid:personUid,promise};
  return promise;
 }
 if(button)button.addEventListener('click',()=>{
  if(!unlocked)return;
  enabled=!enabled;
  try{localStorage.setItem(key(uid),enabled?'on':'off')}catch{}
  updateButton();updateRendered();
 });
 global.addEventListener('spielonline-change',()=>{void refresh()});
 document.addEventListener('visibilitychange',()=>{if(!document.hidden&&account()?.uid!==uid)void refresh()});
 global.KniffelChristmasDice=Object.freeze({decorate,isEnabled:()=>enabled,refresh});
 updateButton();void refresh();
})(window);
