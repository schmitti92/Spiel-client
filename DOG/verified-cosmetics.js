/** Runtime-only, server-verified ownership for personal DOG cosmetics.
 * Never trust localStorage, URL parameters or a catalogue image to unlock.
 * One authenticated GET per login/page, cached briefly in memory only.
 */
let verifiedUid='',known=new Set(),verifiedDogLevel=0,checkedAt=0,inflight=null,epoch=0;
const apiBase=()=>String(window.SPIELPORTAL_CONFIG?.apiBase||'https://serverfinal-ynbe.onrender.com').replace(/\/+$/,'');
const currentUser=()=>{const state=window.SpielOnline?.state?.();return state?.status==='online'&&state.user?.getIdToken?state.user:null};
export const isVerifiedCosmeticUnlocked=id=>typeof id==='string'&&known.has(id);
export const verifiedCosmeticCount=()=>known.size;
/** Signed-in level is verified exclusively by the server's authenticated DOG XP endpoint. */
export const isVerifiedDogPlayerLevelAtLeast=level=>Number.isInteger(level)&&level>=1&&verifiedDogLevel>=level;
export async function refreshVerifiedCosmetics({force=false}={}){
 if(typeof window==='undefined')return false;
 const user=currentUser(),uid=user?.uid||'';
 // Switching accounts must revoke the previous owner's images immediately.
 // Never keep the old account's entitlements visible while the new GET runs.
 if(uid!==verifiedUid){
  verifiedUid=uid;known=new Set();verifiedDogLevel=0;checkedAt=0;inflight=null;epoch++;
  window.dispatchEvent(new Event('dog-cosmetics-verified'));
 }
 if(!uid)return false;
 if(!force&&verifiedUid===uid&&Date.now()-checkedAt<60000)return true;
 if(inflight&&verifiedUid===uid)return inflight;
 const token=++epoch;
 inflight=(async()=>{
  try{
   const authToken=await user.getIdToken();
   // Read-only requests; level 3 is never awarded by localStorage or a UI click.
   const headers={Authorization:'Bearer '+authToken};
   const [scratch,level]=await Promise.allSettled([
    (async()=>{
     const res=await fetch(apiBase()+'/api/hub/scratch',{cache:'no-store',headers});
     const data=await res.json();
     if(!res.ok||data.ok!==true||!Array.isArray(data.scratch?.ownedUnlockIds))throw Error('ENTITLEMENTS_UNAVAILABLE');
     return data.scratch.ownedUnlockIds;
    })(),
    (async()=>{
     const res=await fetch(apiBase()+'/api/hub/dog/level',{cache:'no-store',headers});
     const data=await res.json();
     const current=data.level;
     if(!res.ok||data.ok!==true||!Number.isInteger(current?.level))throw Error('DOG_LEVEL_UNAVAILABLE');
     // Validate that the trusted server actually configured this specific prize.
     const reward=current.rewards?.find(item=>item.level===3);
     if(reward?.configured!==true||reward.reward?.id!=='kartendesign-05')return 0;
     return Math.max(0,Math.min(10,current.level));
    })()
   ]);
   if(token!==epoch||currentUser()?.uid!==uid)return false;
   known=scratch.status==='fulfilled'?
    new Set(scratch.value.filter(id=>typeof id==='string'&&/^christmas2026:[a-z-]+:/.test(id))):new Set();
   verifiedDogLevel=level.status==='fulfilled'?level.value:0;
   checkedAt=scratch.status==='fulfilled'||level.status==='fulfilled'?Date.now():0;
   window.dispatchEvent(new Event('dog-cosmetics-verified'));
   return checkedAt>0;
  }catch{
   if(token!==epoch)return false;
   known=new Set();verifiedDogLevel=0;checkedAt=0;
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
