/* One-time surprise from Christoph: shared across authenticated Deal players.
 * Claims are granted only by the server in an atomic Firestore transaction.
 * Local storage merely suppresses already acknowledged popups; it never credits
 * vouchers. No room or gameplay state is altered. */
(()=>{
 'use strict';
 if(window.__christophSurpriseInstalled)return;
 window.__christophSurpriseInstalled=true;
 const EVENT_ID='christoph-gruss-2026-11';
 const base=String(window.SPIELPORTAL_CONFIG?.apiBase||'https://serverfinal-ynbe.onrender.com').replace(/\/+$/,'');
 const script=document.currentScript;
 if(script?.src){
  const css=document.createElement('link');
  css.rel='stylesheet';
  css.href=new URL('../css/christoph-surprise.css?v=20261110-v1',script.src).href;
  document.head.append(css);
 }
 let uid='',running=false,shown=false,completed=false,checkingGeneration=0,lastCheck=0;
 let modal=null,button=null,status=null,previousFocus=null;
 const account=()=>{
  const auth=window.SpielOnline?.state?.();
  return auth?.status==='online'&&auth.user?.uid&&typeof auth.user.getIdToken==='function'?auth.user:null;
 };
 const marker=id=>'christoph-surprise:ack:'+EVENT_ID+':'+id;
 function locallyAcknowledged(id){try{return localStorage.getItem(marker(id))==='yes'}catch{return false}}
 function markAcknowledged(id){try{localStorage.setItem(marker(id),'yes')}catch{}}
 function ensureModal(){
  if(modal)return;
  modal=document.createElement('div');
  modal.id='christoph-surprise';
  modal.className='christoph-surprise-backdrop';
  modal.hidden=true;
  modal.setAttribute('role','dialog');
  modal.setAttribute('aria-modal','true');
  modal.setAttribute('aria-labelledby','christoph-surprise-title');
  modal.setAttribute('aria-describedby','christoph-surprise-message');
  modal.innerHTML=`
   <div class="christoph-surprise-snow" aria-hidden="true">✦ ❄ ✧ ♡ ✧ ❄ ✦</div>
   <div class="christoph-surprise-panel">
    <div class="christoph-surprise-kicker">✦ EINE ÜBERRASCHUNG FÜR EUCH ALLE ✦</div>
    <div class="christoph-surprise-heart" aria-hidden="true">❤️</div>
    <h2 id="christoph-surprise-title">Ein lieber Gruß von Christoph</h2>
    <p id="christoph-surprise-message">Hallo ihr Lieben! Ich möchte euch einfach sagen, dass ich euch sehr gerne habe. ❤️ Danke für die schöne gemeinsame Zeit und unseren Spielspaß. Deshalb habe ich eine kleine Überraschung für euch. Viel Glück und ganz viel Freude damit!<br><strong>Euer Christoph ❤️</strong></p>
    <div class="christoph-surprise-divider">✧ EURE GESCHENKE ✧</div>
    <div class="christoph-surprise-prizes">
     <div class="christoph-surprise-prize"><span class="christoph-surprise-prize-icon">🎰</span><strong>2×</strong><span>Monster-Rad-Drehungen</span></div>
     <div class="christoph-surprise-prize"><span class="christoph-surprise-prize-icon">🎩</span><strong>2×</strong><span>Weihnachtsmützen-Jackpot-Gutscheine</span></div>
    </div>
    <p class="christoph-surprise-confirm">✅ Bereits sicher deinem Spielerprofil gutgeschrieben!</p>
    <p class="christoph-surprise-status" id="christoph-surprise-status" role="status"></p>
    <button type="button" id="christoph-surprise-thanks">❤️ Danke, Christoph! Geschenke annehmen</button>
   </div>`;
  document.body.append(modal);
  button=modal.querySelector('#christoph-surprise-thanks');
  status=modal.querySelector('#christoph-surprise-status');
  button.addEventListener('click',acknowledge);
 }
 function show(){
  ensureModal();
  if(shown)return;
  shown=true;
  previousFocus=document.activeElement;
  button.disabled=false;
  status.textContent='';
  modal.hidden=false;
  button.focus({preventScroll:true});
 }
 function hide(){
  shown=false;
  if(modal)modal.hidden=true;
  if(previousFocus?.isConnected)try{previousFocus.focus({preventScroll:true})}catch{}
  previousFocus=null;
 }
 async function api(path,method='GET'){
  const current=account();
  if(!current)throw Error('LOGIN_REQUIRED');
  const token=await current.getIdToken();
  if(account()?.uid!==current.uid)throw Error('PROFILE_CHANGED');
  const response=await fetch(base+'/api/christoph-surprise/'+path,{
   method,headers:{Authorization:'Bearer '+token},cache:'no-store'
  });
  const data=await response.json().catch(()=>({}));
  if(!response.ok||!data.ok)throw Error(data.error||'GIFT_UNAVAILABLE');
  return data;
 }
 async function check(){
  const person=account();
  const currentUid=person?.uid||'';
  if(uid!==currentUid){
   uid=currentUid;checkingGeneration++;completed=false;lastCheck=0;hide();
  }
  if(!person||document.hidden||running||shown||completed)return;
  if(locallyAcknowledged(uid)){completed=true;return}
  running=true;const generation=checkingGeneration,personUid=uid;
  lastCheck=Date.now();
  try{
   const result=await api('status');
   if(generation!==checkingGeneration||account()?.uid!==personUid)return;
   if(result.id!==EVENT_ID)throw Error('INVALID_GIFT');
   if(result.acknowledged){markAcknowledged(uid);completed=true;return}
   if(!result.claimed){
    const claim=await api('claim','POST');
    if(generation!==checkingGeneration||account()?.uid!==personUid)return;
    if(!claim.claimed||claim.id!==EVENT_ID)throw Error('GIFT_NOT_CONFIRMED');
    if(claim.acknowledged){markAcknowledged(uid);completed=true;return}
   }
   show();
  }catch(error){
   // No client-side reward, no fabricated balance. Retry on next page/focus
   // or with limited polling while a player is still signed in.
   if(error.message!=='PROFILE_CHANGED')
    console.warn('[Christoph surprise] Server response pending:',error.message);
  }finally{running=false}
 }
 async function acknowledge(){
  if(!shown||button.disabled)return;
  button.disabled=true;status.textContent='🎁 Deine Überraschung wird bestätigt …';
  const personUid=uid,generation=checkingGeneration;
  try{
   const result=await api('ack','POST');
   if(generation!==checkingGeneration||account()?.uid!==personUid)return;
   if(!result.acknowledged||result.id!==EVENT_ID)throw Error('ACK_NOT_CONFIRMED');
   markAcknowledged(uid);completed=true;hide();
  }catch(error){
   if(generation!==checkingGeneration)return;
   status.textContent='⚠️ Bestätigung noch nicht möglich. Bitte erneut tippen; deine Geschenke sind bereits gespeichert.';
   console.warn('[Christoph surprise] Confirmation pending:',error);
  }finally{button.disabled=false}
 }
 window.addEventListener('spielonline-change',()=>{void check()});
 window.addEventListener('pageshow',()=>{void check()});
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)void check()});
 window.addEventListener('focus',()=>{if(Date.now()-lastCheck>10000)void check()});
 // One light profile check at most every 45 seconds while the gift remains
 // unacknowledged. Successful claims/acks trigger no ongoing database reads.
 setInterval(()=>{if(!document.hidden&&Date.now()-lastCheck>45000)void check()},45000);
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{void check()},{once:true});
 else void check();
})();
