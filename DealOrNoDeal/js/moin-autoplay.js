'use strict';
/* Deal or No Deal: optional autoplay for every player who has completed
   Christmas Ice picture 40. The previous Moin/Vanessa settings remain valid.
   Permission comes from authenticated server progress, never localStorage.
   This only opens an available case on the player's turn; banker votes and
   personal case selection remain manual. No extra game/database polling. */
(()=>{
 const legacyKeys=new Map([
  ['moin','deal-moin-autoplay-open-v1'],
  ['vanessa','deal-vanessa-autoplay-open-v1']
 ]);
 const base=String(window.SPIELPORTAL_CONFIG?.apiBase||'https://serverfinal-ynbe.onrender.com').replace(/\\/+$/,'');
 let enabled=false,unlocked=false,checking=false,checkError=false,checked=false;
 let timer=null,scheduledKey='',lastAttemptKey='',stoppedForError=false;
 let activeStorageKey=null,activeUid='',profileEpoch=0,lastCheckedAt=0;
 const button=document.createElement('button');
 button.type='button';button.id='player-autoplay-toggle';button.className='studio-tool';
 button.setAttribute('aria-label','Automatisches Kofferöffnen: Freischaltung ab Weihnachtsbild 40');
 const mine=()=>typeof g!=='undefined'&&g?.players?.find(p=>p.id===myId());
 const account=()=>{const u=user();return u?.uid&&typeof u.getIdToken==='function'?u:null};
 function cancel(){clearTimeout(timer);timer=null;scheduledKey=''}
 const isLegacy=()=>legacyKeys.has(mine()?.name?.trim().toLocaleLowerCase('de-DE')||'');
 function storageKey(u){return isLegacy()?legacyKeys.get(mine()?.name?.trim().toLocaleLowerCase('de-DE')):'deal-autoplay-open:'+u.uid}
 function paint(){
  const signed=!!account();
  button.hidden=false;
  button.disabled=checking;
  button.setAttribute('aria-busy',String(checking));
  button.setAttribute('aria-pressed',String(unlocked&&enabled));
  button.classList.toggle('autoplay-locked',!unlocked);
  button.classList.toggle('autoplay-unlocked',unlocked);
  button.textContent=checking?'⏳ Autoplay prüfen':unlocked?(enabled?'⏸ Autoplay AN':'▶ Autoplay AUS'):'🔒 Autoplay · Bild 40';
  button.title=unlocked
   ?(enabled?'Automatisches Kofferöffnen ausschalten':'Automatisches Kofferöffnen einschalten')
   :checking?'Deine Weihnachtsbild-Freischaltung wird geprüft …'
   :!signed?'Melde dich mit deinem Spielerprofil an.'
   :checkError?'Freischaltung konnte nicht geprüft werden. Hier erneut prüfen.'
   :'Ab 40 abgeschlossenen Weihnachtsbildern verfügbar. Zum Prüfen tippen.';
 }
 function syncPlayer(){
  const u=account(),uid=u?.uid||'';
  const nextKey=u?storageKey(u):null;
  if(uid!==activeUid||nextKey!==activeStorageKey){
   cancel();profileEpoch++;
   activeUid=uid;activeStorageKey=nextKey;
   unlocked=!!u&&isLegacy();
   enabled=false;checking=false;checkError=false;checked=unlocked;
   stoppedForError=false;lastAttemptKey='';lastCheckedAt=0;
   if(unlocked&&nextKey){try{enabled=localStorage.getItem(nextKey)==='true'}catch{}}
   if(u&&!unlocked)void verify(u,profileEpoch);
  }
  return unlocked;
 }
 async function verifiedReward(u){
  const headers={Authorization:'Bearer '+await u.getIdToken()};
  // Older Render revisions may not yet expose the new dealAutoplay flag.
  // The fallback reads the same signed-in Christmas progress document.
  const response=await fetch(base+'/api/christmas-ice/unlocks',{headers,cache:'no-store'});
  if(response.ok){
   const data=await response.json();
   if(data.ok&&typeof data.dealAutoplay==='boolean')return data.dealAutoplay;
   if(!data.ok)throw Error(data.error||'UNLOCK_UNAVAILABLE');
  }else if(response.status!==404)throw Error('UNLOCK_'+response.status);
  const progress=await fetch(base+'/api/christmas-ice/me',{headers,cache:'no-store'});
  if(!progress.ok)throw Error('PROGRESS_'+progress.status);
  const data=await progress.json();
  if(!data.ok)throw Error(data.error||'PROGRESS_UNAVAILABLE');
  const best=Math.max(Number(data.state?.completed)||0,Number(data.state?.maxRewarded)||0);
  return best>=40;
 }
 async function verify(u,epoch){
  if(!u||checking||!activeStorageKey)return;
  checking=true;checkError=false;paint();
  try{
   const earned=await verifiedReward(u);
   if(epoch!==profileEpoch||account()?.uid!==u.uid)return;
   unlocked=!!earned;checked=true;
   enabled=false;
   if(unlocked){try{enabled=localStorage.getItem(activeStorageKey)==='true'}catch{}}
   if(!unlocked)cancel();
  }catch(error){
   if(epoch!==profileEpoch||account()?.uid!==u.uid)return;
   checkError=true;checked=false;
   // Losing the network should not silently enable an unverified player.
   if(!unlocked){enabled=false;cancel()}
   console.warn('[Deal Autoplay] Weihnachtsfreischaltung nicht prüfbar',error);
  }finally{
   if(epoch===profileEpoch){
    checking=false;lastCheckedAt=Date.now();paint();schedule();
   }
  }
 }
 function schedule(){
  const allowed=syncPlayer();
  paint();
  if(!enabled||!allowed||document.hidden||busy||stoppedForError||!g||g.phase!=='open'||turn()!==myId()){cancel();return}
  const available=Array.from({length:g.caseCount||g.values?.length||26},(_,i)=>i).filter(i=>free(i));
  if(!available.length){cancel();return}
  const key=String(g.id)+':'+String(g.revision)+':'+String(myId());
  if(lastAttemptKey===key||scheduledKey===key)return;
  cancel();scheduledKey=key;
  timer=setTimeout(async()=>{
   timer=null;scheduledKey='';
   if(!enabled||!syncPlayer()||document.hidden||busy||!g||g.phase!=='open'||turn()!==myId())return;
   if(String(g.id)+':'+String(g.revision)+':'+String(myId())!==key)return;
   const freeCases=Array.from({length:g.caseCount||g.values?.length||26},(_,i)=>i).filter(i=>free(i));
   if(!freeCases.length)return;
   lastAttemptKey=key;
   const selected=freeCases[Math.floor(Math.random()*freeCases.length)];
   await action('open',{case:selected});
   if(lastError){
    stoppedForError=true;enabled=false;
    try{if(activeStorageKey)localStorage.setItem(activeStorageKey,'false')}catch{}
    paint();
   }
  },1400);
 }
 button.addEventListener('click',()=>{
  if(checking)return;
  syncPlayer();
  const u=account();
  if(!unlocked){
   if(!u){window.SpielOnline?.openLogin?.();return}
   void verify(u,profileEpoch);
   return;
  }
  enabled=!enabled;stoppedForError=false;
  try{if(activeStorageKey)localStorage.setItem(activeStorageKey,String(enabled))}catch{}
  if(!enabled)cancel();
  schedule();
 });
 const refreshButton=document.getElementById('studio-refresh');
 if(refreshButton?.parentElement)refreshButton.insertAdjacentElement('afterend',button);
 else (document.querySelector('.studio-header-controls')||document.body).append(button);
 // Recheck a locked profile when it returns from the Christmas event; no
 // repeating reads during ongoing turns or local autoplay timers.
 const recheck=()=>{
  syncPlayer();
  if(!document.hidden&&!checking&&!unlocked&&account()&&Date.now()-lastCheckedAt>10000)
   void verify(account(),profileEpoch);
  schedule();
 };
 window.addEventListener('spielonline-change',schedule);
 window.addEventListener('deal-game-state-change',schedule);
 window.addEventListener('focus',recheck);
 window.addEventListener('pageshow',event=>{if(event.persisted)recheck()});
 document.addEventListener('visibilitychange',()=>{if(document.hidden)cancel();else recheck()});
 // Keep the same local scheduling fallback without additional HTTP requests.
 setInterval(schedule,700);
 schedule();
})();
