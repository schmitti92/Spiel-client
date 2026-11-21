/** Runtime-only, server-verified ownership for personal DOG cosmetics.
 * Never trust localStorage, URL parameters or a catalogue image to unlock.
 * One authenticated GET per login/page, cached briefly in memory only.
 */
let verifiedUid='',known=new Set(),verifiedDogLevel=0,nikolausConfigured=false,checkedAt=0,inflight=null,epoch=0;
const apiBase=()=>String(window.SPIELPORTAL_CONFIG?.apiBase||'https://serverfinal-ynbe.onrender.com').replace(/\/+$/,'');
const currentUser=()=>{const state=window.SpielOnline?.state?.();return state?.status==='online'&&state.user?.getIdToken?state.user:null};
export const isVerifiedCosmeticUnlocked=id=>typeof id==='string'&&known.has(id);
export const verifiedCosmeticCount=()=>known.size;
/** Signed-in level is verified exclusively by the server's authenticated DOG XP endpoint. */
export const isVerifiedDogPlayerLevelAtLeast=level=>Number.isInteger(level)&&level>=1&&verifiedDogLevel>=level;
export const isVerifiedNikolausCardConfigured=()=>nikolausConfigured;
export async function refreshVerifiedCosmetics({force=false}={}){
 if(typeof window==='undefined')return false;
 const user=currentUser(),uid=user?.uid||'';
 // Switching accounts must revoke the previous owner's images immediately.
 // Never keep the old account's entitlements visible while the new GET runs.
 if(uid!==verifiedUid){
  verifiedUid=uid;known=new Set();verifiedDogLevel=0;nikolausConfigured=false;checkedAt=0;inflight=null;epoch++;
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
   // One small authenticated endpoint reads only the wallet, tree claims
   // and XP stats (3 docs), rather than full scratch editions/settings,
   // village/research plus a second four-document level request.
   const reply=await fetch(apiBase()+'/api/hub/dog/cosmetics',{cache:'no-store',headers});
   let ownedIds,level,nikolaus;
   if(reply.status===404){
    // Compatibility during a rolling Render deployment. Legacy URLs are
    // used ONLY while the new endpoint is not yet installed.
    const [scratchReply,levelReply]=await Promise.all([
     fetch(apiBase()+'/api/hub/scratch',{cache:'no-store',headers}),
     fetch(apiBase()+'/api/hub/dog/level',{cache:'no-store',headers})
    ]);
    const [scratchData,levelData]=await Promise.all([scratchReply.json(),levelReply.json()]);
    const reward=levelData.level?.rewards?.find(item=>item.level===20);
    if(!scratchReply.ok||scratchData.ok!==true||!Array.isArray(scratchData.scratch?.ownedUnlockIds)||
       !levelReply.ok||levelData.ok!==true||!Number.isInteger(levelData.level?.level))
     throw Error('DOG_COSMETICS_UNAVAILABLE');
    ownedIds=scratchData.scratch.ownedUnlockIds;level=levelData.level.level;
    nikolaus=reward?.configured===true&&reward.reward?.id==='kartendesign-05';
   }else{
    const data=await reply.json();
    if(!reply.ok||data.ok!==true||!Array.isArray(data.ownedUnlockIds)||
       !Number.isInteger(data.level)||typeof data.nikolausCardRewardConfigured!=='boolean')
      throw Error('DOG_COSMETICS_UNAVAILABLE');
    ownedIds=data.ownedUnlockIds;level=data.level;
    nikolaus=data.nikolausCardRewardConfigured;
   }
   if(token!==epoch||currentUser()?.uid!==uid)return false;
   known=new Set(ownedIds.filter(id=>typeof id==='string'&&/^christmas2026:[a-z-]+:/.test(id)));
   verifiedDogLevel=Math.max(0,Math.min(50,level));
   nikolausConfigured=nikolaus===true;
   checkedAt=Date.now();
   window.dispatchEvent(new Event('dog-cosmetics-verified'));
   return checkedAt>0;
  }catch{
   if(token!==epoch)return false;
   known=new Set();verifiedDogLevel=0;nikolausConfigured=false;checkedAt=0;
   window.dispatchEvent(new Event('dog-cosmetics-verified'));
   return false;
  }finally{inflight=null}
 })();
 return inflight;
}
if(typeof window!=='undefined'){
 // Auth token refreshes/profile broadcasts should not repeatedly reload
 // 3 personal documents while the verified identity is unchanged.
 window.addEventListener('spielonline-change',()=>{void refreshVerifiedCosmetics()});
 queueMicrotask(()=>{void refreshVerifiedCosmetics()});
}
