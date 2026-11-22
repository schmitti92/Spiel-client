/**
 * Authoritative DOG designer unlock: level 2 for each signed-in player.
 * No client-side XP guesses or write operations. A failed verification stays locked.
 */
const API=String(window.SPIELPORTAL_CONFIG?.apiBase||'https://serverfinal-ynbe.onrender.com').replace(/\/+$/,'');
export const DESIGNER_MIN_LEVEL=2;
let cache=null,pending=null;
export function dogLevelIdentity(){
 const s=window.SpielOnline?.state?.();
 return s?.status==='online'&&s.user?.getIdToken?s.user:null;
}
export async function fetchDogPlayerLevel({force=false}={}){
 const player=dogLevelIdentity();
 if(!player)throw Error('LOGIN_REQUIRED');
 const uid=player.uid;
 if(!force&&cache?.uid===uid&&Date.now()-cache.at<60000)return cache.level;
 // A forced refresh must bypass the *stale cache*, not duplicate an
 // already running authenticated request for the same verified player.
 if(pending?.uid===uid)return pending.promise;
 const task=(async()=>{
  const token=await player.getIdToken();
  const response=await fetch(API+'/api/hub/dog/level',{
   method:'GET',mode:'cors',cache:'no-store',
   headers:{Authorization:'Bearer '+token}
  });
  const result=await response.json().catch(()=>({}));
  if(!response.ok||result.ok!==true)throw Error(result.error||'LEVEL_UNAVAILABLE');
  const level=result?.level?.level;
  if(!Number.isInteger(level)||level<1||level>50)throw Error('LEVEL_INVALID');
  if(dogLevelIdentity()?.uid!==uid)throw Error('PROFILE_CHANGED');
  cache={uid,level,at:Date.now()};
  return level;
 })();
 pending={uid,promise:task};
 try{return await task;}finally{if(pending?.promise===task)pending=null;}
}
export function resetDogLevelCache(){cache=null;pending=null;}
/**
 * Keep a designer anchor visible but non-navigable until level 2.
 * Returns an updateTarget callback for dynamic room links.
 */
export function guardDesignerLink(link,{target,lockedText,unlockedText,onStatus}={}){
 if(!link)return {refresh:async()=>{},updateTarget:()=>{}};
 let targetHref=target||link.getAttribute('href')||'';
 let generation=0;
 const apply=(allowed,level=null,error=null)=>{
  link.dataset.levelLocked=allowed?'false':'true';
  link.classList.toggle('dog-designer-locked',!allowed);
  link.setAttribute('aria-disabled',allowed?'false':'true');
  link.tabIndex=allowed?0:-1;
  if(allowed){if(targetHref)link.href=targetHref;else link.removeAttribute('href');link.title='Brettdesigner geöffnet · Spielerlevel '+level;}
  else{
   link.removeAttribute('href');
   link.title=error==='LOGIN_REQUIRED'?'🔒 Bitte anmelden: Brettdesigner ab Level 2':
    error?'🔒 Spielerlevel konnte nicht geprüft werden':
    '🔒 Brettdesigner ab Level 2'+(level?' · Aktuell Level '+level:'');
  }
  // Preserve descriptive child spans on the main lobby links.
  if(typeof lockedText==='string'&&typeof unlockedText==='string'){
   const textNode=Array.from(link.childNodes).find(n=>n.nodeType===3);
   if(textNode)textNode.textContent=allowed?unlockedText:lockedText;
   else link.textContent=allowed?unlockedText:lockedText;
  }
  if(onStatus)onStatus({allowed,level,error});
 };
 apply(false);
 async function refresh({force=false}={}){
  const attempt=++generation;
  if(!dogLevelIdentity()){
   apply(false,null,'LOGIN_REQUIRED');
   return;
  }
  try{
   const level=await fetchDogPlayerLevel({force});
   if(attempt===generation)apply(level>=DESIGNER_MIN_LEVEL,level);
  }catch(e){if(attempt===generation)apply(false,null,e?.message||'LEVEL_UNAVAILABLE');}
 }
 function updateTarget(url){targetHref=url;if(link.dataset.levelLocked==='false')link.href=url;}
 window.addEventListener('spielonline-change',()=>void refresh());
 // pageshow fires on normal first load too. The initial refresh() below
 // already verifies unlocks; only an actual back/forward-cache restoration
 // needs a forced fresh request after the page may have been suspended.
 window.addEventListener('pageshow',event=>{
  if(event?.persisted)void refresh({force:true});
 });
 void refresh();
 return {refresh,updateTarget};
}
