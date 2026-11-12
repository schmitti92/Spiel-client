/* Boss-Siegel: shared 1-10 forge ascent with zero extra subscriptions.
   Reuses the existing GET forge view and an idempotent POST receipt. */
(()=>{'use strict';
 const $=id=>document.getElementById(id);
 if(!$('forge-level-panel'))return;
 const API=String(window.SPIELPORTAL_CONFIG?.apiBase||'https://serverfinal-ynbe.onrender.com').replace(/\/+$/,'');
 const button=$('forge-level-up'),dialog=$('forge-level-dialog');
 let accountUid=null,forge=null,working=false;
 const key=uid=>'dog:forge:level-pending:'+uid;
 function previous(uid){
  try{const p=JSON.parse(localStorage.getItem(key(uid))||'null');
   return p&&/^[A-Za-z0-9_-]{12,90}$/.test(p.requestId)&&Number.isSafeInteger(p.expectedLevel)?p:null;
  }catch{return null;}
 }
 const auth=()=>{const state=window.SpielOnline?.state?.();
  return state?.status==='online'&&state.user?.uid===accountUid?state:null;
 };
 const message=text=>{$('forge-level-status').hidden=!text;$('forge-level-status').textContent=text||'';};
 function draw(){
  const level=Number.isSafeInteger(forge?.forgeLevel)?forge.forgeLevel:1;
  const seals=Number.isSafeInteger(forge?.bossSeals)?forge.bossSeals:0;
  const equipment=Number.isSafeInteger(forge?.equipmentCap)?forge.equipmentCap:level*5;
  const skills=Number.isSafeInteger(forge?.skillsCap)?forge.skillsCap:level*5;
  $('forge-level-value').textContent=String(level);
  $('forge-level-progress').setAttribute('aria-valuenow',String(level));
  $('forge-level-fill').style.width=(level*10)+'%';
  $('forge-level-cap').textContent='Waffe & Rüstung bis Level '+equipment+' · Fähigkeiten bis Level '+skills;
  $('forge-level-sigils').textContent='🔱 Boss-Siegel: '+(forge?seals:'–');
  const pending=accountUid?previous(accountUid):null;
  button.disabled=working||!forge||!auth()||level>=10||(!pending&&seals<1);
  button.textContent=level>=10?'🏆 Schmiedestufe 10 erreicht':
   pending?'↻ Aufstieg sicher prüfen':seals>0?'⚒️ Aufstieg auf Stufe '+(level+1):
   '🔒 Boss-Siegel benötigt';
 }
 function handleView(event){
  if(working)return;
  accountUid=event.detail?.uid||null;
  forge=event.detail?.view||null;
  draw();
 }
 window.addEventListener('dog-forge-view',handleView);
 const initial=window.DogForgeState?.();
 if(initial)handleView({detail:initial});
 const close=()=>{if(dialog.open)dialog.close()};
 $('forge-level-cancel').addEventListener('click',close);
 dialog.addEventListener('click',e=>{if(e.target===dialog)close()});
 button.addEventListener('click',()=>{
  if(button.disabled||!forge||!accountUid)return;
  if(previous(accountUid)){void upgrade();return;}
  const next=forge.forgeLevel+1;
  $('forge-level-dialog-title').textContent='Schmiede auf Stufe '+next+' verbessern?';
  $('forge-level-dialog-desc').textContent='Du verbrauchst 1 Boss-Siegel. Danach können alle Helden Waffen, Rüstungen und Fähigkeiten bis Level '+(next*5)+' verbessern.';
  dialog.showModal();
 });
 $('forge-level-confirm').addEventListener('click',()=>{close();void upgrade()});
 async function upgrade(){
  const uid=accountUid,state=auth();
  if(working||!state||!forge)return;
  const old=previous(uid);
  if(!old&&(forge.bossSeals<1||forge.forgeLevel>=10))return;
  const generated='forgelevel-'+(globalThis.crypto?.randomUUID?.()||
   Date.now()+'-'+Math.random().toString(36).slice(2,16));
  const op=old||{requestId:generated,expectedLevel:forge.forgeLevel};
  if(!old){
   try{const serialized=JSON.stringify(op);
    localStorage.setItem(key(uid),serialized);
    if(localStorage.getItem(key(uid))!==serialized)throw Error('NO_STORAGE');
   }catch{message('⚠️ Auftragskennung kann nicht gespeichert werden. Aufstieg nicht gestartet.');return;}
  }
  working=true;draw();message('⚒️ Boss-Siegel wird eingelöst …');
  try{
   const token=await state.user.getIdToken();
   if(auth()?.user?.uid!==uid)throw Error('ACCOUNT_CHANGED');
   const controller=typeof AbortController==='function'?new AbortController():null;
   const timer=controller?setTimeout(()=>controller.abort(),20000):null;
   let res;
   try{
    res=await fetch(API+'/api/dog/forge/level-up',{
     method:'POST',cache:'no-store',
     headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},
     body:JSON.stringify(op),
     ...(controller?{signal:controller.signal}:{})
    });
   }finally{if(timer!==null)clearTimeout(timer);}
   const data=await res.json().catch(()=>({error:'DOG_FORGE_UNAVAILABLE'}));
   if(!res.ok||data.ok!==true)throw Error(data.error||'DOG_FORGE_UNAVAILABLE');
   if(auth()?.user?.uid!==uid)throw Error('ACCOUNT_CHANGED');
   localStorage.removeItem(key(uid));
   forge={...forge,forgeLevel:data.progress.forgeLevel,
    bossSeals:data.progress.bossSeals,equipmentCap:data.progress.equipmentCap,
    skillsCap:data.progress.skillsCap};
   message(data.replayed?'✓ Aufstieg sicher wiederhergestellt.':
    '🎉 Schmiedestufe '+data.result.newLevel+' für alle Helden freigeschaltet!');
   await window.DogForgeReload?.();
  }catch(error){
   if(['DOG_FORGE_LEVEL_STALE','DOG_FORGE_LEVEL_MAX',
    'DOG_FORGE_BOSS_SEAL_REQUIRED','DOG_FORGE_LEVEL_RECEIPT_CONFLICT',
    'NOT_DOG_TEAM_MEMBER','INVALID_FORGE_REQUEST'].includes(error.message)){
    try{localStorage.removeItem(key(uid));}catch{}
    message('↻ Schmiedestufe hat sich geändert. Bitte erneut prüfen.');
    await window.DogForgeReload?.();
   }else message('⚠️ Verbindung unklar. Tippe auf „Aufstieg sicher prüfen“, um dieselbe Anfrage zu wiederholen.');
  }finally{working=false;draw();}
 }
})();