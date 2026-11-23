/* DOG avatar picker: cosmetic, shared between local and online DOG lobbies.
   Only small numeric avatar IDs are persisted; no image payloads or polling. */
(function(){
 'use strict';
 const KEY='spielportal:dog:avatars:v1';
 const MAX=16;
 const ASSET_BASE=new URL('../',document.currentScript?.src||document.baseURI).href;
 const DOG_ASSET_BASE=new URL('./',document.currentScript?.src||document.baseURI).href;
 let christmasAvatars=[],verifiedCosmetics=null;
 const valid=n=>Number.isInteger(n)&&n>=0&&n<36;
 const christmasItem=n=>christmasAvatars.find(item=>item.avatar===n)||null;
 const selectable=n=>valid(n)&&(n<MAX||!!verifiedCosmetics?.isVerifiedCosmeticUnlocked(christmasItem(n)?.unlockId));
 const profile=()=>window.SpielOnline?.state?.()?.profile||null;
 const uid=()=>String(window.SpielOnline?.state?.()?.user?.uid||'');
 function preferences(){
  try{const obj=JSON.parse(localStorage.getItem(KEY)||'{}');return obj&&typeof obj==='object'?obj:{};}catch{return {};}
 }
 function write(next){
  try{localStorage.setItem(KEY,JSON.stringify(next));}catch{}
  window.dispatchEvent(new Event('dog-avatar-change'));
 }
 function localAvatar(seat){
  const n=preferences().local?.[seat];
  return selectable(n)?n:seat%MAX;
 }
 function onlineAvatar(){
  const p=preferences();
  const n=p.online?.[uid()]??p.online?.guest;
  if(selectable(n))return n;
  const fallback=Number(profile()?.avatar);
  return selectable(fallback)?fallback:0;
 }
 function setLocal(seat,avatar){
  if(!selectable(avatar)||!Number.isInteger(seat)||seat<0||seat>3)return false;
  const p=preferences();const arr=Array.from({length:4},(_,i)=>localAvatar(i));arr[seat]=avatar;write({...p,local:arr});
  return true;
 }
 function setOnline(avatar){
  if(!selectable(avatar))return false;
  const key=uid()||'guest';
  const p=preferences();
  write({...p,online:{...(p.online||{}),[key]:avatar}});
  return true;
 }
 function css(avatar){
  const n=valid(Number(avatar))?Number(avatar):0;
  const portrait=n>=16?christmasItem(n):null;
  if(portrait){
   const src=new URL(portrait.image,DOG_ASSET_BASE).href;
   return "background-image:url('"+src+"');background-size:cover;background-position:center;background-repeat:no-repeat";
  }
  const fallback=n<16?n:0,i=fallback%8;
  const src=new URL(fallback<8?'profile-avatars.webp':'profile-avatars-extra.webp',ASSET_BASE).href;
  // Single-quote URL: app.js embeds this CSS inside a double-quoted style.
  return "background-image:url('"+src+"');background-size:400% 200%;background-position:"+(i%4)*100/3+"% "+Math.floor(i/4)*100+"%;background-repeat:no-repeat";
 }
 async function syncRoomAvatar(avatar,notice){
  const code=new URL(location.href).searchParams.get('room');
  if(!/^(?:\d{3}|[A-HJ-NP-Z2-9]{6})$/.test(code||''))return;
  const user=window.SpielOnline?.state?.()?.user;
  if(!user?.getIdToken)return;
  const api=String(window.SPIELPORTAL_CONFIG?.apiBase||'https://serverfinal-ynbe.onrender.com').replace(/\/+$/,'');
  try{
   notice.textContent='Profilbild wird übernommen …';
   const token=await user.getIdToken();
   const response=await fetch(api+'/api/hub/rooms/'+encodeURIComponent(code)+'/dog/avatar',{
    method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({avatar})
   });
   const data=await response.json();
   if(!response.ok||data.ok!==true)throw Error(data.error||'Konnte nicht speichern');
   notice.textContent='✓ Profilbild im DOG-Raum gespeichert';
   if(data.room)window.dispatchEvent(new CustomEvent('dog-avatar-room-sync',{detail:{room:data.room}}));
  }catch(err){
   notice.textContent=err.message==='NOT_DOG_MATCH'?'Auswahl gespeichert – beim nächsten DOG-Spiel sichtbar.':'Lokal gespeichert · Online: '+(err?.message||'Fehler');
  }
 }
 function mount(root){
  if(root.dataset.dogAvatarReady)return;
  root.dataset.dogAvatarReady='1';
  const mode=root.dataset.mode==='local'?'local':'online';
  const select=root.querySelector('[data-dog-avatar-seat]');
  const options=root.querySelector('[data-dog-avatar-options]');
  const notice=root.querySelector('[data-dog-avatar-notice]');
  if(!options||!notice)return;
  let seat=0;
  function draw(){
   const selected=mode==='local'?localAvatar(seat):onlineAvatar();
   options.replaceChildren(...Array.from({length:MAX},(_,n)=>{
    const btn=document.createElement('button');btn.type='button';btn.className='dog-avatar-option'+(n===selected?' is-selected':'');
    btn.title='Profilbild '+(n+1);btn.setAttribute('aria-label','Profilbild '+(n+1)+(n===selected?' ausgewählt':''));
    btn.setAttribute('aria-pressed',String(n===selected));
    const picture=document.createElement('span');picture.className='dog-avatar-face';picture.style.cssText=css(n);
    btn.append(picture);
    btn.addEventListener('click',()=>{
     if(n===(mode==='local'?localAvatar(seat):onlineAvatar()))return;
     if(mode==='local'){setLocal(seat,n);notice.textContent='✓ Profilbild für Spieler '+(seat+1)+' gespeichert';}
     else{setOnline(n);notice.textContent='✓ Profilbild ausgewählt';void syncRoomAvatar(n,notice);}
     draw();
    });
    return btn;
   }));
   // Earned portraits can be equipped; others stay disabled.
   // Only the Render-verified collection, never local flags, grants access.
   if(christmasAvatars.length){
    const heading=document.createElement('span');
    heading.className='dog-avatar-event-heading';
    heading.textContent='🎄 Weihnachtsevent · 20 Profilbilder zum Freischalten';
    options.append(heading);
    for(const item of christmasAvatars){
     const btn=document.createElement('button');
     const owned=selectable(item.avatar),active=item.avatar===selected;
     btn.type='button';btn.className='dog-avatar-option'+(owned?'':' dog-avatar-locked')+(active?' is-selected':'');
     btn.disabled=!owned;
     btn.setAttribute('aria-label',item.name+(owned?' – gewonnen':' – im Weihnachtsevent freischaltbar'));
     btn.setAttribute('aria-pressed',String(active));
     btn.title=item.name+(owned?' · ✓ Freigeschaltet':' · 🔒 Noch nicht freigeschaltet');
     const picture=document.createElement('span');
     picture.className='dog-avatar-face';
     picture.style.backgroundImage='url("'+new URL(item.image,DOG_ASSET_BASE).href+'")';
     picture.style.backgroundPosition='center';
     picture.style.backgroundSize='cover';
     btn.append(picture);
     if(!owned){const lock=document.createElement('span');lock.className='dog-avatar-lock-symbol';
       lock.textContent='🔒';lock.setAttribute('aria-hidden','true');btn.append(lock);}
     btn.addEventListener('click',()=>{
      if(!selectable(item.avatar)||item.avatar===(mode==='local'?localAvatar(seat):onlineAvatar()))return;
      if(mode==='local'){
       if(setLocal(seat,item.avatar))notice.textContent='✓ '+item.name+' für Spieler '+(seat+1)+' ausgewählt';
      }else if(setOnline(item.avatar)){
       notice.textContent='✓ '+item.name+' ausgewählt';void syncRoomAvatar(item.avatar,notice);
      }
      draw();
     });
     options.append(btn);
    }
   }
  }
  select?.addEventListener('change',()=>{seat=Number(select.value)||0;draw();notice.textContent='Wähle ein Profilbild für diesen Platz.';});
  window.addEventListener('spielonline-change',draw);
  window.addEventListener('dog-christmas-avatars-ready',draw);
  window.addEventListener('dog-cosmetics-verified',draw);
  draw();
 }
 window.DogAvatars={localAvatar,onlineAvatar,setLocal,setOnline,css,isSelectable:selectable};
 function init(){document.querySelectorAll('[data-dog-avatar-picker]').forEach(mount);}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
 // Both catalog and verified ownership are loaded only once as ES modules.
 // Showing another player's portrait does not grant its unlock locally.
 Promise.all([
  import(new URL('christmas-avatar-catalog.js?v=1',DOG_ASSET_BASE).href),
  import(new URL('verified-cosmetics.js?v=3',DOG_ASSET_BASE).href)
 ]).then(([module,ownership])=>{
  christmasAvatars=module.CHRISTMAS_AVATARS;
  verifiedCosmetics=ownership;
  window.dispatchEvent(new Event('dog-christmas-avatars-ready'));
  void ownership.refreshVerifiedCosmetics();
 }).catch(error=>console.warn('[DOG] Weihnachtsprofilbilder konnten nicht geladen werden:',error));
})();