/* Christmas event rewards belong to the signed-in SPIELEPORTAL account. */
(()=>{'use strict';
const el=document.getElementById('christmas-collector-reward');
const status=document.getElementById('christmas-collector-status');
if(!el||!status)return;
const api=String(window.SPIELPORTAL_CONFIG?.apiBase||'https://serverfinal-ynbe.onrender.com').replace(/\/+$/,'');
let uid='',serial=0;
function paint(unlocked,message){el.classList.toggle('locked',!unlocked);el.querySelector('.christmas-frame-preview').textContent=unlocked?'👑':'🔒';status.textContent=message;}
async function refresh(){
 const state=window.SpielOnline?.state?.();
 const user=state?.status==='online'?state.user:null;
 const id=user?.uid||'';
 if(!user?.getIdToken){uid='';serial++;paint(false,'🔒 Melde dich an, um deine Belohnungen zu sehen.');return;}
 const request=++serial;uid=id;paint(false,'⏳ Weihnachts-Belohnungen werden geprüft …');
 try{
  const token=await user.getIdToken();
  const response=await fetch(api+'/api/deal-or-no-deal/christmas/me',{headers:{Authorization:'Bearer '+token},cache:'no-store'});
  if(!response.ok)throw Error('HTTP '+response.status);
  const data=await response.json();
  if(!data.ok||!data.progress)throw Error('Ungültige Antwort');
  if(request!==serial||window.SpielOnline?.state?.()?.user?.uid!==id)return;
  const unlocked=data.progress.collectorFrameUnlocked===true&&Array.isArray(data.progress.rewards)&&data.progress.rewards.includes('collector-frame');
  const bingos=Math.max(0,Math.min(10,Number(data.progress.bingos)||0));
  paint(unlocked,unlocked?'✓ Freigeschaltet · dauerhaft in deinem Spielprofil': '🔒 '+bingos+' / 10 echte Weihnachts-Bingos');
 }catch(e){if(request===serial)paint(false,'⚠ Freischaltung konnte nicht geprüft werden. Bitte später erneut laden.');}
}
window.addEventListener('spielonline-change',refresh);
window.addEventListener('pageshow',refresh);
refresh();
})();