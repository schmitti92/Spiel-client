/** Runtime-only, server-verified ownership for personal DOG cosmetics.
 * Never trust localStorage, URL parameters or a catalogue image to unlock.
 * One authenticated GET per login/page, cached briefly in memory only.
 */
let verifiedUid='',known=new Set(),checkedAt=0,inflight=null,epoch=0;
const apiBase=()=>String(window.SPIELPORTAL_CONFIG?.apiBase||'https://serverfinal-ynbe.onrender.com').replace(/\/+$/,'');
const currentUser=()=>{const state=window.SpielOnline?.state?.();return state?.status==='online'&&state.user?.getIdToken?state.user:null};
export const isVerifiedCosmeticUnlocked=id=>typeof id==='string'&&known.has(id);
export const verifiedCosmeticCount=()=>known.size;
export async function refreshVerifiedCosmetics({force=false}={}){
 if(typeof window==='undefined')return false;
 const user=currentUser(),uid=user?.uid||'';
 // Switching accounts must revoke the previous owner's images immediately.
 // Never keep the old account's entitlements visible while the new GET runs.
 if(uid!==verifiedUid){
  verifiedUid=uid;known=new Set();checkedAt=0;inflight=null;epoch++;
  window.dispatchEvent(new Event('dog-cosmetics-verified'));
 }
 if(!uid)return false;
 if(!force&&verifiedUid===uid&&Date.now()-checkedAt<60000)return true;
 if(inflight&&verifiedUid===uid)return inflight;
 const token=++epoch;
 inflight=(async()=>{
  try{
   const authToken=await user.getIdToken();
   const res=await fetch(apiBase()+'/api/hub/scratch',{
    cache:'no-store',headers:{Authorization:'Bearer '+authToken}
   });
   const data=await res.json();
   if(!res.ok||data.ok!==true||!Array.isArray(data.scratch?.ownedUnlockIds))throw Error('ENTITLEMENTS_UNAVAILABLE');
   if(token!==epoch||currentUser()?.uid!==uid)return false;
   known=new Set(data.scratch.ownedUnlockIds.filter(id=>typeof id==='string'&&/^christmas2026:[a-z-]+:/.test(id)));
   checkedAt=Date.now();
   window.dispatchEvent(new Event('dog-cosmetics-verified'));
   return true;
  }catch{
   if(token!==epoch)return false;
   known=new Set();checkedAt=0;
   window.dispatchEvent(new Event('dog-cosmetics-verified'));
   return false;
  }finally{inflight=null}
 })();
 return inflight;
}
if(typeof window!=='undefined'){
 window.addEventListener('spielonline-change',()=>{void refreshVerifiedCosmetics({force:true})});
 queueMicrotask(()=>{void refreshVerifiedCosmetics()});
}
