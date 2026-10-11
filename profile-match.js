/** Spielerportal V8 – online identity bridge for server-authoritative games.
 * No login secret is stored by this script and it never awards results.
 */
(function(){
'use strict';
async function getToken(){
 const start=Date.now();
 while(Date.now()-start<4500){
  const s=window.SpielOnline?.state?.();
  if(s?.status==='online'&&s.user&&s.profile?.setupComplete!==false){
   try{return await s.user.getIdToken();}catch{return null;}
  }
  if(['guest','error','unconfigured','onboarding'].includes(s?.status))return null;
  await new Promise(resolve=>setTimeout(resolve,180));
 }
 return null; // Guests can still play; games without verifiable identities are unranked.
}
window.SpielMatchIdentity={getToken};
})();
