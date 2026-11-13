/* Einmaliger, serverbestätigter Eintrittsbonus für 100 Tore.
 * Der Client vergibt keine Belohnungen und merkt nur die Bestätigung. */
(()=>{
 'use strict';
 if(window.__dogWelcomeGiftInstalled)return;
 window.__dogWelcomeGiftInstalled=true;
 const GIFT='dog-100-welcome-2026-11';
 const BASE=String(window.SPIELPORTAL_CONFIG?.apiBase||'https://serverfinal-ynbe.onrender.com').replace(/\/+$/,'');
 let uid='',busy=false,completed=false,shown=false,pending=false,dialog=null,button=null,status=null,previousFocus=null;
 const user=()=>{
  const s=window.SpielOnline?.state?.();
  return s?.status==='online'&&s.user?.uid&&typeof s.user.getIdToken==='function'?s.user:null;
 };
 const key=id=>'dog-100-welcome:ack:'+GIFT+':'+id;
 const acknowledged=id=>{try{return localStorage.getItem(key(id))==='1'}catch{return false}};
 const saveAck=id=>{try{localStorage.setItem(key(id),'1')}catch{}};
 const setStatus=message=>{if(status)status.textContent=message||''};
 async function request(route,method='GET'){
  const current=user();if(!current)throw Error('LOGIN_REQUIRED');
  const token=await current.getIdToken();
  if(user()?.uid!==current.uid)throw Error('PROFILE_CHANGED');
  const reply=await fetch(BASE+'/api/dog/welcome/'+route,{
   method,cache:'no-store',headers:{Authorization:'Bearer '+token}
  });
  const data=await reply.json().catch(()=>({}));
  if(!reply.ok||data?.ok!==true)throw Error(data?.error||'SERVER_UNAVAILABLE');
  return data;
 }
 function build(){
  if(dialog)return;
  dialog=document.createElement('dialog');
  dialog.id='dog-welcome-gift';dialog.className='dog-welcome-dialog';
  dialog.setAttribute('aria-labelledby','dog-welcome-heading');
  dialog.setAttribute('aria-describedby','dog-welcome-intro');
  dialog.addEventListener('cancel',event=>event.preventDefault());
  dialog.innerHTML=`
   <div class="dog-welcome-card">
    <header class="dog-welcome-top">
     <div class="dog-welcome-eyebrow">✦ DEIN GESCHENK ZUM EVENTSTART ✦</div>
     <h2 id="dog-welcome-heading">🎁 Willkommen bei den 100 Toren!</h2>
     <p id="dog-welcome-intro">Schön, dass du dabei bist! Zum Einstieg schenken wir dir eine kleine Starthilfe für dein Abenteuer.</p>
    </header>
    <div class="dog-welcome-grid">
     <div class="dog-welcome-photo">
      <img src="./dog-welcome-photo.jpg?v=20261114-1" alt="Persönliches Gruppenfoto als Gruß zum Eventstart" loading="eager" decoding="async">
      <div class="dog-welcome-photo-missing">❤️ Ein persönlicher Gruß zum Start der 100 Tore!</div>
      <div class="dog-welcome-photo-caption">❤️ Gemeinsam auf Abenteuerreise</div>
     </div>
     <div class="dog-welcome-gifts">
      <div class="dog-welcome-gifts-heading">✧ DEINE SOFORTBELOHNUNGEN ✧</div>
      <div class="dog-welcome-items">
       <div class="dog-welcome-item"><span class="dog-welcome-icon">📦</span><strong class="dog-welcome-qty">5×</strong><span class="dog-welcome-label">Einfache Holzkisten</span></div>
       <div class="dog-welcome-item"><span class="dog-welcome-icon">👑</span><strong class="dog-welcome-qty">2×</strong><span class="dog-welcome-label">DOG-Premiumpakete</span></div>
       <div class="dog-welcome-item"><span class="dog-welcome-icon">🎡</span><strong class="dog-welcome-qty">3×</strong><span class="dog-welcome-label">Monster-Rad-Drehungen</span></div>
       <div class="dog-welcome-item"><span class="dog-welcome-icon">🃏</span><strong class="dog-welcome-qty">2×</strong><span class="dog-welcome-label">Kofferblick-Joker</span></div>
      </div>
     </div>
    </div>
    <footer class="dog-welcome-foot">
     <p>✅ Deine Geschenke wurden deinem Spielerprofil sicher gutgeschrieben – <strong>einmalig pro Spieler</strong>.</p>
     <p class="dog-welcome-state" role="status" aria-live="polite"></p>
     <button class="dog-welcome-confirm" type="button">🎁 Geschenke bestätigen & Abenteuer starten</button>
    </footer>
   </div>`;
  const img=dialog.querySelector('img');
  img.addEventListener('error',()=>img.closest('.dog-welcome-photo')?.classList.add('is-missing'));
  button=dialog.querySelector('.dog-welcome-confirm');
  status=dialog.querySelector('.dog-welcome-state');
  button.addEventListener('click',()=>void confirm());
  document.body.append(dialog);
 }
 function show(){
  if(completed||shown)return;
  // Die bestehende Spielanleitung darf nicht hinter dem Geschenk verschwinden.
  if(document.body.classList.contains('dog-guide-open')){pending=true;return;}
  build();
  pending=false;shown=true;previousFocus=document.activeElement;
  document.body.classList.add('dog-welcome-open');
  try{dialog.showModal()}catch{
   dialog.setAttribute('open','');
  }
  button.disabled=false;setStatus('');
  button.focus({preventScroll:true});
 }
 function close(){
  pending=false;shown=false;
  if(dialog?.open)dialog.close();
  document.body.classList.remove('dog-welcome-open');
  if(previousFocus?.isConnected)try{previousFocus.focus({preventScroll:true})}catch{}
  previousFocus=null;
 }
 async function confirm(){
  if(!shown||busy||!uid)return;
  busy=true;button.disabled=true;setStatus('Bestätigung wird sicher gespeichert …');
  const currentUid=uid;
  try{
   const result=await request('ack','POST');
   if(user()?.uid!==currentUid)return;
   if(!result.acknowledged||result.id!==GIFT)throw Error('GIFT_NOT_ACKNOWLEDGED');
   saveAck(currentUid);completed=true;close();
  }catch{
   if(user()?.uid===currentUid){setStatus('Verbindung unterbrochen. Bitte erneut bestätigen.');button.disabled=false;}
  }finally{busy=false}
 }
 async function check(){
  const current=user(),nextUid=current?.uid||'';
  if(nextUid!==uid){uid=nextUid;completed=false;pending=false;close();}
  if(!current||busy||completed||shown||pending||document.hidden)return;
  if(acknowledged(uid)){completed=true;return}
  busy=true;const checkUid=uid;
  try{
   const s=await request('status');
   if(user()?.uid!==checkUid)return;
   if(s.id!==GIFT)throw Error('GIFT_VERSION');
   if(s.acknowledged){saveAck(uid);completed=true;return}
   if(!s.claimed){
    const claim=await request('claim','POST');
    if(user()?.uid!==checkUid)return;
    if(!claim.claimed||claim.id!==GIFT)throw Error('GIFT_NOT_CLAIMED');
    if(claim.acknowledged){saveAck(uid);completed=true;return}
   }
   show();
  }catch(e){
   // Keine lokale Vergabe bei Fehlern; beim nächsten Öffnen/Online-Wechsel wiederholen.
   console.warn('[dog-welcome]',String(e?.message||e));
  }finally{busy=false}
 }
 function init(){
  const observer=new MutationObserver(()=>{
   if(pending&&!document.body.classList.contains('dog-guide-open')&&user()?.uid===uid)show();
  });
  observer.observe(document.body,{attributes:true,attributeFilter:['class']});
  window.addEventListener('spielonline-change',()=>void check());
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)void check()});
  window.addEventListener('pageshow',()=>void check());
  void check();
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
 else init();
})();
