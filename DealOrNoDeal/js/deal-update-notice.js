/* Per-profile first-time Deal/DOG update announcement. */
(()=>{
'use strict';
const ID='slot-dog-season2',URL=String(window.SPIELPORTAL_CONFIG?.apiBase||'https://serverfinal-ynbe.onrender.com').replace(/\/+$/,'')+'/api/deal-or-no-deal/update-notice/'+ID;
const FILE='./assets/updates/deal-update-slot-dog-season2.png',KEY='deal-update-ack-v1-'+ID+'-';
let dialog,button,info,activeUid='',generation=0,busy=false,checking=false;
const player=()=>{const s=window.SpielOnline?.state?.();return s?.status==='online'&&s.user?.uid&&s.user?.getIdToken?s.user:null};
const saved=uid=>{try{return localStorage.getItem(KEY+uid)==='yes'}catch{return false}};
const save=uid=>{try{localStorage.setItem(KEY+uid,'yes')}catch{}};
async function request(user,method){
 const token=await user.getIdToken();
 const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),6500);
 try{
  const response=await fetch(URL+(method==='POST'?'/ack':''),{method,headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:method==='POST'?'{}':undefined,signal:controller.signal,cache:'no-store'});
  const data=await response.json();
  if(!response.ok||!data.ok)throw Error(data.error||'UPDATE_NOTICE_UNAVAILABLE');
  return data;
 }finally{clearTimeout(timeout)}
}
function mount(){
 if(dialog)return;
 dialog=document.createElement('dialog');dialog.id='deal-update-notice';dialog.setAttribute('aria-modal','true');
 dialog.setAttribute('aria-labelledby','deal-update-notice-title');
 const head=document.createElement('header');head.className='deal-update-head';
 head.innerHTML='<div class="deal-update-tag">✨ NEUES UPDATE · DEAL OR NO DEAL</div><h2 id="deal-update-notice-title">🎉 Das große DOG-Update ist da!</h2>';
 const picture=document.createElement('div');picture.className='deal-update-picture';
 const image=document.createElement('img');image.src=FILE;image.alt='Neuer Slot statt Glücksrad und DOG-Sammelalbum Saison 2 mit sechs Sammelwelten';
 const fallback=document.createElement('div');fallback.className='deal-update-fallback';fallback.textContent='🎰 NEU: Der Slot ersetzt das Glücksrad. 🃏 DOG-Sammelkarten Saison 2: 96 Karten, sechs Alben und neue Bingo-Belohnungen.';fallback.hidden=true;
 image.onerror=()=>{image.hidden=true;fallback.hidden=false};picture.append(image,fallback);
 const foot=document.createElement('footer');foot.className='deal-update-footer';
 const desc=document.createElement('p');desc.className='deal-update-description';desc.textContent='🎰 Slot statt Glücksrad · 🃏 DOG-Sammelkarten · 🎁 Mehr Bingo-Gewinne';
 button=document.createElement('button');button.type='button';button.className='deal-update-confirm';button.textContent='✅ Verstanden – weiter zum Spiel';
 info=document.createElement('p');info.className='deal-update-status';info.setAttribute('role','status');info.textContent='Bestätige diese Neuerungen einmalig für dein Spielerprofil.';
 foot.append(desc,button,info);dialog.append(head,picture,foot);document.body.append(dialog);
 dialog.addEventListener('cancel',e=>e.preventDefault());
 button.addEventListener('click',async()=>{
  const u=player(),uid=u?.uid,seq=generation;if(!u||uid!==activeUid||busy)return;
  busy=true;button.disabled=true;button.textContent='⏳ Bestätigung wird gespeichert …';
  try{await request(u,'POST')}catch(e){console.warn('Update acknowledgement saved locally:',e.message)}
  finally{
   save(uid);
   if(seq===generation&&uid===activeUid&&dialog.open)dialog.close();
   busy=false;button.disabled=false;button.textContent='✅ Verstanden – weiter zum Spiel';
  }
 });
}
async function check(){
 const u=player(),uid=u?.uid||'';
 if(!uid){activeUid='';++generation;checking=false;if(dialog?.open)dialog.close();return}
 if(saved(uid)){activeUid=uid;++generation;if(dialog?.open)dialog.close();return}
 if(uid===activeUid&&(checking||dialog?.open||busy))return;
 activeUid=uid;const seq=++generation;mount();if(!dialog.open)dialog.showModal();
 info.textContent='Bitte einmal bestätigen, um zum Spiel fortzufahren.';
 checking=true;
 try{
  const result=await request(u,'GET');
  if(seq!==generation||player()?.uid!==uid)return;
  if(result.acknowledged){save(uid);if(dialog.open)dialog.close()}
 }catch(e){if(seq===generation)info.textContent='Du kannst jetzt bestätigen und weiterspielen.'}
 finally{if(seq===generation)checking=false}
}
window.addEventListener('spielonline-change',()=>void check());
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>void check(),{once:true});else void check();
})();
