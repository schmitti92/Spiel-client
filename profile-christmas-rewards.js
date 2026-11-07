/* Christmas event rewards belong to the signed-in SPIELEPORTAL account. */
(()=>{'use strict';
const el=document.getElementById('christmas-collector-reward');
const status=document.getElementById('christmas-collector-status');
if(!el||!status)return;
const api=String(window.SPIELPORTAL_CONFIG?.apiBase||'https://serverfinal-ynbe.onrender.com').replace(/\/+$/,'');
const santa=document.getElementById('christmas-santa-reward');
const santaStatus=document.getElementById('christmas-santa-status');
const equip=document.getElementById('christmas-santa-equip');
const santaAsset=new URL('DealOrNoDeal/assets/weihnachts_event/a_high_quality_cartoon_3d_style_santa_claus_charac.png',document.baseURI).href;
let santaUnlocked=false;
function paintSanta(unlocked,message){santaUnlocked=unlocked;if(!santa||!santaStatus||!equip)return;santa.classList.toggle('locked',!unlocked);const preview=santa.querySelector('.santa-profile-preview');preview.textContent=unlocked?'':'🔒';preview.style.backgroundImage=unlocked?'url("'+santaAsset+'")':'none';santaStatus.textContent=message;equip.hidden=!unlocked;}
let uid='',serial=0;
function paint(unlocked,message){el.classList.toggle('locked',!unlocked);el.querySelector('.christmas-frame-preview').textContent=unlocked?'👑':'🔒';status.textContent=message;}
async function refresh(){
 const state=window.SpielOnline?.state?.();
 const user=state?.status==='online'?state.user:null;
 const id=user?.uid||'';
 if(!user?.getIdToken){uid='';serial++;paint(false,'🔒 Melde dich an, um deine Belohnungen zu sehen.');paintSanta(false,'🔒 Bitte anmelden.');return;}
 const request=++serial;uid=id;paint(false,'⏳ Weihnachts-Belohnungen werden geprüft …');paintSanta(false,'⏳ Freischaltung wird geprüft …');
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
  const total=Math.min(20,Number(data.progress.totalBingos)||((Number(data.progress.bingos)||0)+(Number(data.progress.secondBingos)||0)));
  const santaOk=total>=12&&Array.isArray(data.progress.rewards)&&data.progress.rewards.includes('santa-profile-avatar');
  paintSanta(santaOk,santaOk?'✓ Freigeschaltet · jetzt als Profilbild auswählbar':'🔒 '+total+' / 12 Bingos');
 }catch(e){if(request===serial){paint(false,'⚠ Freischaltung konnte nicht geprüft werden. Bitte später erneut laden.');paintSanta(false,'⚠ Freischaltung konnte nicht geprüft werden.');}}
}
if(equip)equip.addEventListener('click',async()=>{
 if(!santaUnlocked||equip.disabled)return;
 const before=window.SpielOnline?.state?.()?.user?.uid;
 if(!before)return;
 equip.disabled=true;
 try{
  const image=new Image();image.src=santaAsset;await image.decode();
  const canvas=document.createElement('canvas');canvas.width=160;canvas.height=160;
  const ctx=canvas.getContext('2d');if(!ctx)throw Error('Bildverarbeitung nicht verfügbar');
  const size=Math.min(image.naturalWidth,image.naturalHeight);
  ctx.drawImage(image,(image.naturalWidth-size)/2,(image.naturalHeight-size)/2,size,size,0,0,160,160);
  const data=canvas.toDataURL('image/jpeg',0.8);
  if(window.SpielOnline?.state?.()?.user?.uid!==before)throw Error('Spielerkonto gewechselt');
  await window.SpielProfile.update({avatarImage:data});
  santaStatus.textContent='✓ Weihnachtsmann ist jetzt dein Profilbild!';
 }catch(error){santaStatus.textContent='⚠ Profilbild konnte nicht gespeichert werden: '+(error?.message||'Unbekannter Fehler');}
 finally{equip.disabled=false;}
});
window.addEventListener('spielonline-change',refresh);
window.addEventListener('pageshow',refresh);
refresh();
})();