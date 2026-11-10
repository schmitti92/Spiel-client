/* Christmas Hats event tab: one read on entry, no polling and no client-side prize settlement. */
(()=>{
'use strict';
const $=id=>document.getElementById(id);
const launch=$('hats-entry-launch'),status=$('hats-ticket-status'),number=$('hats-voucher-number');
const label=$('hats-voucher-label'),refresh=$('hats-entry-refresh');
if(!launch||!status||!number||!label||!refresh)return;
const api=String(window.SPIELPORTAL_CONFIG?.apiBase||'https://serverfinal-ynbe.onrender.com').replace(/\/+$/,'');
let loading=false,epoch=0,lastUid='';
function isVisible(){return document.body.dataset.view==='hats'}
function auth(){
 const state=window.SpielOnline?.state?.();
 return state?.status==='online'&&state.user?.getIdToken?state.user:null;
}
function roomHref(){
 const params=new URLSearchParams(location.search);
 const room=params.get('room')||sessionStorage.getItem('deal-active-room');
 const match=/^(?:\d{3}|[A-HJ-NP-Z2-9]{6})$/i;
 return './weihnachtsmuetzen.html'+(match.test(room||'')?'?room='+encodeURIComponent(room):'');
}
function setLink(enabled,title){
 launch.href=roomHref();launch.textContent=title;
 launch.setAttribute('aria-disabled',String(!enabled));
 launch.tabIndex=enabled?0:-1;
}
function setWaiting(){
 number.textContent='–';label.textContent='wird geprüft …';
 status.textContent='🔄 Spielerprofil und Gutschein werden geprüft …';
 setLink(false,'⏳ Zugang wird geladen');
}
function showLoggedOut(){
 number.textContent='–';label.textContent='Profil nicht angemeldet';
 status.textContent='🔐 Bitte zuerst mit einem Spielerprofil anmelden.';
 setLink(false,'🔒 Anmeldung erforderlich');
}
function showVoucher(data){
 const vouchers=data?.vouchers||{};
 const remaining=Number.isSafeInteger(vouchers.total)?Math.max(0,vouchers.total):0;
 const playing=Boolean(data?.state?.status==='playing');
 const used=Boolean(vouchers.used);
 number.textContent=String(remaining);
 label.textContent=remaining===1?'Gutschein verfügbar':'Gutscheine verfügbar';
 if(playing){
  const room=Math.max(1,Math.min(10,Number(data.state.room)||1));
  status.textContent='✅ Partie läuft · Raum '+room+' / 10 · Fortsetzen verbraucht keinen weiteren Gutschein.';
  setLink(true,'🎩 Deine Partie in Raum '+room+' fortsetzen');
 }else if(remaining>0){
  status.textContent=vouchers.free>0?'🎁 Dein kostenloses Startticket wartet auf dich!':'🎟️ Du hast einen freigeschalteten Spielgutschein.';
  setLink(true,'🎁 Kostenloses Spiel öffnen');
 }else{
  status.textContent=used?'🔒 Der kostenlose Gutschein ist aufgebraucht. Weitere Gutscheine werden später freigeschaltet.':'🔒 Zurzeit ist kein Spielgutschein verfügbar.';
  setLink(false,'🔒 Weitere Spiele noch gesperrt');
 }
}
async function loadVoucher(){
 if(!isVisible()||loading)return;
 const user=auth(),stamp=++epoch;
 if(!user){lastUid='';showLoggedOut();return;}
 lastUid=user.uid;
 loading=true;refresh.disabled=true;setWaiting();
 const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),18000);
 try{
  const token=await user.getIdToken();
  const resp=await fetch(api+'/api/christmas-hats/me',{headers:{Authorization:'Bearer '+token},cache:'no-store',signal:controller.signal});
  const data=await resp.json().catch(()=>({}));
  if(stamp!==epoch||auth()?.uid!==user.uid)return;
  if(!resp.ok||data.ok!==true)throw Error(data.error||'HTTP '+resp.status);
  showVoucher(data);
 }catch(error){
  if(stamp!==epoch)return;
  number.textContent='–';label.textContent='nicht erreichbar';
  status.textContent='⚠️ Gutschein konnte nicht geprüft werden. '+(error.name==='AbortError'?'Zeitüberschreitung.':String(error.message||''))+' Bitte aktualisieren.';
  setLink(false,'↻ Gutscheinprüfung erforderlich');
 }finally{
  clearTimeout(timeout);loading=false;refresh.disabled=false;
 }
}
launch.addEventListener('click',event=>{
 if(launch.getAttribute('aria-disabled')==='true')event.preventDefault();
});
refresh.addEventListener('click',loadVoucher);
window.addEventListener('christmas-hats-view-open',loadVoucher);
window.addEventListener('spielonline-change',()=>{
 epoch++;loading=false;refresh.disabled=false;setLink(false,'⏳ Zugang wird geladen');
 if(isVisible())loadVoucher();
});
window.addEventListener('pageshow',event=>{
 if(isVisible()&&(event.persisted||auth()?.uid!==lastUid))loadVoucher();
});
})();
