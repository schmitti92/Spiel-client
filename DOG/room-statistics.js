/* DOG player statistics. Read-only; no lobby polling, no Firebase writes.
 * Counts come exclusively from finished, verified server matches. */
const $=id=>document.getElementById(id);
const dialog=$('dog-room-stats');
const status=$('dog-room-stats-feedback');
const grid=$('dog-room-stats-grid');
const refresh=$('dog-room-stats-refresh');
const open=$('dog-room-stats-open');
const base=String(window.SPIELPORTAL_CONFIG?.apiBase||'https://serverfinal-ynbe.onrender.com').replace(/\/+$/,'');
let pending=null;
function profile(){
 const s=window.SpielOnline?.state?.();
 return s?.status==='online'&&s?.profile?.setupComplete!==false&&s?.user?.getIdToken?s.user:null;
}
function feedback(message,error=false){
 status.textContent=message;
 status.dataset.status=error?'error':'ok';
 status.hidden=!message;
}
async function loadStatistics(){
 if(pending)return pending;
 const p=profile();
 if(!p){
  grid.hidden=true;
  feedback('🔐 Melde dich mit deinem Online-Spielerprofil an, damit deine persönliche Statistik angezeigt werden kann.',true);
  return;
 }
 const uid=p.uid;
 refresh.disabled=true;
 feedback('📊 Deine DOG-Statistik wird vom Server geladen …');
 pending=(async()=>{
  const token=await p.getIdToken();
  if(profile()?.uid!==uid)throw Error('PROFILE_CHANGED');
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),15000);
  try{
   const response=await fetch(base+'/api/hub/dog/stats',{
    method:'GET',mode:'cors',cache:'no-store',signal:controller.signal,
    headers:{Authorization:'Bearer '+token}
   });
   const result=await response.json();
   if(!response.ok||result?.ok!==true)throw Error(result?.error||'SERVER_ERROR');
   if(profile()?.uid!==uid)throw Error('PROFILE_CHANGED');
   const stats=result.stats||{};
   for(const [id,key] of [
    ['dog-room-stats-wins','wins'],
    ['dog-room-stats-knocked','knockedOut'],
    ['dog-room-stats-hit','wasKnockedOut'],
    ['dog-room-stats-played','played']
   ]){
    const n=stats[key];
    $(id).textContent=Number.isSafeInteger(n)&&n>=0?n.toLocaleString('de-DE'):'0';
   }
   grid.hidden=false;
   feedback('');
  }finally{clearTimeout(timer);}
 })();
 try{await pending;}
 catch(e){
  grid.hidden=true;
  const message=e?.name==='AbortError'?'Render antwortet gerade nicht. Bitte erneut versuchen.':
   e?.message==='PROFILE_CHANGED'?'Das Online-Profil wurde gewechselt. Bitte erneut öffnen.':
   e?.message==='LOGIN_REQUIRED'?'Bitte mit dem Online-Spielerprofil anmelden.':
   'Die Statistik konnte nicht geladen werden. Bitte die Verbindung zu Render prüfen.';
  feedback('⚠️ '+message,true);
 }finally{pending=null;refresh.disabled=false;}
}
open.addEventListener('click',()=>{
 if(!dialog.open)dialog.showModal();
 void loadStatistics();
});
refresh.addEventListener('click',()=>void loadStatistics());
$('dog-room-stats-close').addEventListener('click',()=>dialog.close());
dialog.addEventListener('close',()=>{status.hidden=true;});
