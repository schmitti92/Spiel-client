/* 100 Tore: 30 Holzkisten pro Spieler als EIGENSTÄNDIGES Extra-Geschenk.
 * Server-Transaktion/Receipt ist autoritativ; keine lokalen Belohnungswrites. */
(()=>{
 'use strict';
 if(window.__dogWood30Installed)return;
 window.__dogWood30Installed=true;
 const PROMO='dog-100-wood30-2026-11-14';
 const API=String(window.SPIELPORTAL_CONFIG?.apiBase||'https://serverfinal-ynbe.onrender.com').replace(/\/+$/,'');
 let uid='',requesting=false,credited=false,pending=false,dialog=null,wasFocused=null,showing=false;
 const account=()=>{
  const state=window.SpielOnline?.state?.();
  return state?.status==='online'&&state.user?.uid&&typeof state.user.getIdToken==='function'?state.user:null;
 };
 const key=id=>'dog-wood30-bonus:'+PROMO+':'+id;
 const seen=id=>{try{return localStorage.getItem(key(id))==='1'}catch{return false}};
 const mark=id=>{try{localStorage.setItem(key(id),'1')}catch{}};
 const blocked=()=>document.body.classList.contains('dog-guide-open')||
   document.body.classList.contains('dog-welcome-open')||
   !!document.querySelector('.dog-guide-dialog[open],.dog-welcome-dialog[open]');
 function prepare(){
  if(dialog)return;
  const style=document.createElement('style');
  style.textContent=`
   .dog-wood30-dialog{width:min(94vw,550px);max-height:92dvh;overflow:auto;border:1px solid #ffe3a8;border-radius:24px;padding:0;background:linear-gradient(145deg,#25304f,#131b30 74%);color:#ffecd0;box-shadow:0 25px 90px #000b;text-align:center;font-family:system-ui,-apple-system,"Segoe UI",sans-serif}
   .dog-wood30-dialog::backdrop{background:#020613d9;backdrop-filter:blur(9px)}
   .dog-wood30-shell{padding:28px clamp(18px,5vw,38px) 30px}
   .dog-wood30-eyebrow{font-size:11px;color:#edc479;font-weight:900;letter-spacing:.16em}
   .dog-wood30-title{font:900 clamp(27px,6vw,40px)/1.14 Georgia,serif;color:#ffe4a5;margin:10px 0 10px}
   .dog-wood30-emoji{display:block;font-size:76px;filter:drop-shadow(0 10px 15px #0008);margin:8px 0}
   .dog-wood30-quantity{font:900 clamp(43px,10vw,67px)/1 Georgia,serif;color:#ffe4a5}
   .dog-wood30-desc{font-size:16px;line-height:1.55;color:#e2e8f5;margin:15px 0 23px}
   .dog-wood30-proof{color:#a6ebc0;font-size:13px;font-weight:800;margin:0 0 17px}
   .dog-wood30-ok{width:100%;min-height:49px;border:1px solid #ffeaba;border-radius:13px;background:linear-gradient(120deg,#fff0c5,#e1b460);color:#2e2339;font-size:15px;font-weight:900;cursor:pointer}
   .dog-wood30-ok:focus-visible{outline:3px solid #87d7ff;outline-offset:4px}
  `;
  document.head.append(style);
  dialog=document.createElement('dialog');
  dialog.className='dog-wood30-dialog';
  dialog.setAttribute('aria-labelledby','dog-wood30-title');
  dialog.addEventListener('cancel',e=>e.preventDefault());
  dialog.innerHTML=`<div class="dog-wood30-shell">
   <div class="dog-wood30-eyebrow">✦ EXTRAGESCHENK FÜR ALLE 100-TORE-SPIELER ✦</div>
   <h2 id="dog-wood30-title" class="dog-wood30-title">🎉 Ein Geschenk für dich!</h2>
   <span class="dog-wood30-emoji" aria-hidden="true">📦</span>
   <div class="dog-wood30-quantity">30×</div>
   <div class="dog-wood30-desc"><strong>Holzkisten geschenkt!</strong><br>Öffne sie in deinem 100-Tore-Kistenlager und sammle Materialien für deinen Helden.</div>
   <p class="dog-wood30-proof">✓ Einmalig und sicher deinem Profil gutgeschrieben</p>
   <button type="button" class="dog-wood30-ok">🎁 Danke! Weiter zum Event</button>
  </div>`;
  dialog.querySelector('button').addEventListener('click',()=>{
   mark(uid);credited=true;pending=false;showing=false;
   if(dialog.open)dialog.close();
   if(wasFocused?.isConnected)try{wasFocused.focus({preventScroll:true})}catch{}
   wasFocused=null;
  });
  document.body.append(dialog);
 }
 function show(){
  if(!credited||!pending||!uid||showing||blocked())return;
  prepare();
  showing=true;pending=false;wasFocused=document.activeElement;
  try{dialog.showModal()}catch{dialog.setAttribute('open','')}
  dialog.querySelector('button').focus({preventScroll:true});
 }
 async function claim(){
  const a=account(),who=a?.uid||'';
  if(who!==uid){
   uid=who;credited=false;pending=false;
   if(dialog?.open)dialog.close();
   showing=false;
  }
  if(!a||requesting||credited||pending||showing||seen(uid)||document.hidden)return;
  requesting=true;
  const startedUid=uid;
  try{
   const token=await a.getIdToken();
   if(account()?.uid!==startedUid)return;
   const reply=await fetch(API+'/api/dog/welcome/wood30',{
    method:'POST',headers:{Authorization:'Bearer '+token},cache:'no-store'
   });
   const body=await reply.json().catch(()=>({}));
   if(!reply.ok||body.ok!==true||body.id!==PROMO||body.claimed!==true||body.woodChests!==30)
    throw Error(body.error||'GIFT_UNAVAILABLE');
   if(account()?.uid!==startedUid)return;
   credited=true;
   if(body.alreadyClaimed){mark(uid);return;}
   pending=true;show();
  }catch(error){
   console.warn('[dog-wood30]',String(error?.message||error));
  }finally{requesting=false}
 }
 function init(){
  const observer=new MutationObserver(()=>{if(pending)show()});
  observer.observe(document.body,{attributes:true,attributeFilter:['class']});
  window.addEventListener('spielonline-change',()=>void claim());
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)void claim()});
  window.addEventListener('pageshow',()=>void claim());
  void claim();
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
 else init();
})();
