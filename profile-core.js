/* SPIELEPORTAL V5: ausschliesslich authentifizierte Online-Profile.
 * Alte lokale Daten werden nicht verwendet, nicht dargestellt und nicht geloescht.
 * Spielregeln und bisherige Raum-Logik bleiben unberuehrt.
 */
(function(){
'use strict';
const COLORS=['#328cff','#ff5268','#20b986','#ffc741','#9261ec','#f281af'];
const GAME_NAMES={skyjo:'SKYJO Action',kreuz:'KreuzKunter',barikade:'Barikade',business:'Das große Business'};
const STAMP='profileAutoSet';
const SESS='spielportal.online-display-name';
// Use an absolute URL relative to THIS script, not the current page/route.
const ASSET_URL=new URL('profile-avatars.webp',document.currentScript?.src||document.baseURI).href;
let editQueue=Promise.resolve();
function state(){return window.SpielOnline?.state?.()||null;}
function active(){const s=state();return s?.status==='online'&&s?.profile?.setupComplete!==false?s.profile:null;}
function saveName(){try{const p=active();if(p)sessionStorage.setItem(SESS,p.name);else if(state()?.status==='guest')sessionStorage.removeItem(SESS);}catch{}}
window.addEventListener('spielonline-change',saveName);
function cleanName(v){return String(v||'').replace(/[<>\u0000-\u001f\u007f]/g,'').replace(/\s+/g,' ').trim().slice(0,24);}
function update(values){
 // Serialize edits; do not change the visible profile until the server accepts the write.
 // A second rapid edit must build on the first confirmed revision.
 editQueue=editQueue.catch(()=>{}).then(async()=>{
  const p=active();
  if(!p)throw Error('Bitte zuerst online anmelden.');
  const uid=state()?.user?.uid;
  const saved=await window.SpielOnline.saveProfile({...p,...values});
  if(state()?.user?.uid!==uid)throw Error('Das Konto wurde inzwischen gewechselt.');
  window.dispatchEvent(new CustomEvent('spielprofil-change'));
  return saved;
 });
 return editQueue;
}
function rename(name){name=cleanName(name);if(name.length<2)throw Error('Mindestens zwei Zeichen eingeben.');return update({name,edited:true});}
function escapeHTML(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));}
function avatarCSS(avatarOrProfile){
 const p=(avatarOrProfile&&typeof avatarOrProfile==='object')?avatarOrProfile:{avatar:avatarOrProfile};
 if(p.avatarImage&&/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(p.avatarImage))return `background-image:url("${p.avatarImage}");background-size:cover;background-position:center`;
 const n=Number(p.avatar);
 const idx=Number.isInteger(n)?Math.max(0,Math.min(7,n)):0;
 return `background-image:url("${ASSET_URL}");background-size:400% 200%;background-position:${(idx%4)*100/3}% ${Math.floor(idx/4)*100}%;background-repeat:no-repeat`;
}
function registerLaunch(){/* Spielaufrufe werden nicht als verifizierte Spielergebnisse gespeichert. */}
// Keep names for compatibility with existing game code, but NEVER invent a local player.
window.SpielProfile={active,update,rename,COLORS,escapeHTML,avatarCSS,registerLaunch};
function setupIndex(){
 const head=document.querySelector('.page-head');if(!head)return;
 head.style.position='relative';head.style.paddingRight='min(290px,31vw)';
 const wrapper=document.createElement('div');wrapper.className='sp-index-wrap';
 wrapper.innerHTML=`<button type="button" class="sp-profile-button" aria-expanded="false" aria-label="Online-Spielerkonto"><span class="sp-avatar" aria-hidden="true"></span><span class="sp-person-name">Anmelden</span><span aria-hidden="true">⌄</span></button>
 <div class="sp-index-menu" hidden><div class="sp-menu-head">☁ Online-Spielerkonto</div><div class="sp-options"></div><div class="sp-menu-actions"><a href="profile.html" class="sp-view">👤 Mein Spielerprofil</a><button type="button" class="sp-login">🔐 Anmelden</button><button type="button" class="sp-new">＋ Neues Profil anlegen</button><button type="button" class="sp-resume" hidden>✍️ Profil fertigstellen</button><button type="button" class="sp-logout">⇄ Abmelden / Konto wechseln</button></div></div>`;
 head.append(wrapper);
 const button=wrapper.querySelector('.sp-profile-button'),menu=wrapper.querySelector('.sp-index-menu');
 function render(){
  const p=active(),s=state(),isOnline=!!p;
  wrapper.querySelector('.sp-avatar').style.cssText=p?avatarCSS(p):'background:#dbe8ff;';
  wrapper.querySelector('.sp-person-name').textContent=p?p.name:(s?.status==='initializing'||s?.status==='loading'?'Bitte warten …':s?.status==='onboarding'?'Profil fertigstellen':'Anmelden');
  wrapper.querySelector('.sp-view').hidden=!isOnline;
  wrapper.querySelector('.sp-login').hidden=!!s?.user;
  wrapper.querySelector('.sp-new').hidden=!!s?.user;
  wrapper.querySelector('.sp-logout').hidden=!s?.user;
  wrapper.querySelector('.sp-resume').hidden=s?.status!=='onboarding';
  const option=wrapper.querySelector('.sp-options');option.innerHTML='';
  if(!isOnline){const hint=document.createElement('div');hint.className='sp-menu-head';hint.style.fontWeight='500';hint.style.lineHeight='1.5';hint.textContent=s?.status==='onboarding'?'Dein neues Online-Profil ist noch nicht fertig.':s?.error||'Noch kein Konto? Registriere dich kostenlos Schritt für Schritt.';option.append(hint);}
 }
 button.onclick=()=>{menu.hidden=!menu.hidden;button.setAttribute('aria-expanded',String(!menu.hidden));render();};
 wrapper.querySelector('.sp-login').onclick=()=>{menu.hidden=true;window.SpielOnline?.openLogin?.();};
 wrapper.querySelector('.sp-new').onclick=()=>{menu.hidden=true;window.SpielOnline?.openRegistration?.();};
 wrapper.querySelector('.sp-resume').onclick=()=>{menu.hidden=true;window.SpielOnline?.openRegistration?.(true);};
 wrapper.querySelector('.sp-logout').onclick=async()=>{menu.hidden=true;try{await window.SpielOnline?.logout?.();}catch(e){alert(e.message);}};
 document.addEventListener('pointerdown',e=>{if(!wrapper.contains(e.target)){menu.hidden=true;button.setAttribute('aria-expanded','false');}});
 window.addEventListener('spielonline-change',render);window.addEventListener('spielprofil-change',render);render();
}
function initProfilePage(){
 const root=document.getElementById('profile-root');if(!root)return;
 const $=id=>document.getElementById(id);
 const dialog=$('profile-dialog'),form=$('dialog-form');
 const status=$('profile-save-status'),notice=$('profile-access-status');
 let busy=false;
 function feedback(text,type='info'){
  if(!status)return;
  status.textContent=text;status.dataset.state=type;
 }
 function readyControls(enabled){
  root.querySelectorAll('[data-choice-color],[data-choice-game],[data-choice-avatar],#profile-gallery-upload,#profile-edit').forEach(b=>b.disabled=!enabled);
 }
 function render(){
  const p=active(),s=state();
  if(!p){
   if(notice){notice.textContent=s?.status==='error'?'⚠ '+(s.error||'Online-Profil kann momentan nicht geladen werden.'):'⏳ Spielerprofil wird sicher aus Firebase geladen …';}
   return;
  }
  if(notice)notice.textContent='';
  $('profile-title-name').textContent=p.name||'Spieler';
  $('profile-short-name').textContent=p.name||'Spieler';
  $('profile-header-avatar').style.cssText=avatarCSS(p);
  $('profile-side-avatar').style.cssText=avatarCSS(p);
  // Avatar sprite is always painted, even if the user chose a gallery image.
  const created=Number(p.created);
  $('profile-created').textContent=Number.isFinite(created)&&created>0
   ?new Date(created).toLocaleDateString('de-DE',{month:'long',year:'numeric'}) : '–';
  $('favorite-game-name').textContent=GAME_NAMES[p.favorite]||'Noch nicht ausgewählt';
  root.style.setProperty('--profile-accent',COLORS.includes(p.color)?p.color:COLORS[0]);
  document.querySelectorAll('[data-choice-color]').forEach(b=>{
   const selected=b.dataset.choiceColor===p.color;
   b.classList.toggle('selected',selected);b.setAttribute('aria-pressed',String(selected));
  });
  document.querySelectorAll('[data-choice-game]').forEach(b=>{
   const selected=b.dataset.choiceGame===p.favorite;
   b.classList.toggle('selected',selected);b.setAttribute('aria-pressed',String(selected));
  });
  document.querySelectorAll('[data-choice-avatar]').forEach(b=>{
   const n=Number(b.dataset.choiceAvatar);
   b.style.cssText=avatarCSS(n);
   const selected=!p.avatarImage&&n===p.avatar;
   b.classList.toggle('selected',selected);b.setAttribute('aria-pressed',String(selected));
   b.setAttribute('aria-label','Avatar '+(n+1)+(selected?' ausgewählt':''));
  });
  $('stat-launches').textContent='–';$('stat-games').textContent='–';$('stat-profiles').textContent='1';$('stat-achievements').textContent='–';
  $('achievement-list').innerHTML='<div class="achievement"><span>👑</span><b>Online-Profil</b><small>Konto eingerichtet</small></div><div class="achievement locked"><span>🏆</span><b>Spielerfolge</b><small>Folgen mit der sicheren Spielanbindung</small></div>';
  $('profile-manage-note').textContent='🔐 Einstellungen werden in deinem Firebase-Online-Profil gespeichert. Kontolöschung ist noch nicht verfügbar.';
 }
 function synced(){render();if(active()&&!busy)feedback('✓ Online-Profil geladen und synchronisiert.','success');}
 async function modify(change,success='✓ Änderung sicher online gespeichert.'){
  if(busy)return;
  busy=true;readyControls(false);feedback('⏳ Änderung wird online gespeichert …','busy');
  try{await update(change);render();feedback(success,'success');}
  catch(e){render();feedback('⚠ Speichern fehlgeschlagen: '+(e?.message||'Unbekannter Fehler'),'error');}
  finally{busy=false;readyControls(true);}
 }
 function showRename(){const p=active();if(!p||busy)return;
  $('dialog-title').textContent='Spielernamen ändern';
  $('dialog-content').innerHTML=`<label>Spielername<input name="name" maxlength="24" minlength="2" required autocomplete="nickname" value="${escapeHTML(p.name)}"></label>`;
  $('dialog-error').textContent='';dialog.showModal();
  form.onsubmit=async ev=>{
   ev.preventDefault();const save=form.querySelector('button[type="submit"]');save.disabled=true;
   try{
    const name=cleanName(new FormData(form).get('name'));
    if(name.length<2)throw Error('Mindestens zwei Zeichen eingeben.');
    // Save before closing. No optimistic local mutation.
    if(busy)throw Error('Bitte warte, bis die letzte Änderung gespeichert ist.');
    busy=true;feedback('⏳ Spielername wird gespeichert …','busy');
    await rename(name);dialog.close();render();feedback('✓ Spielername online gespeichert.','success');
   }catch(e){$('dialog-error').textContent=e?.message||'Speichern fehlgeschlagen.';feedback('⚠ Spielername wurde nicht geändert.','error');}
   finally{busy=false;save.disabled=false;}
  };
 }
 $('profile-edit').addEventListener('click',showRename);
 const signOut=async()=>{try{await window.SpielOnline.logout();}catch(e){feedback('⚠ Abmelden fehlgeschlagen: '+e.message,'error');}};
 $('profile-switch').addEventListener('click',signOut);
 $('profile-edit-top').addEventListener('click',signOut);
 $('dialog-cancel').addEventListener('click',()=>dialog.close());
 document.querySelectorAll('[data-choice-color]').forEach(b=>b.addEventListener('click',()=>modify({color:b.dataset.choiceColor},'✓ Lieblingsfarbe online gespeichert.')));
 document.querySelectorAll('[data-choice-game]').forEach(b=>b.addEventListener('click',()=>modify({favorite:b.dataset.choiceGame},'✓ Lieblingsspiel online gespeichert.')));
 document.querySelectorAll('[data-choice-avatar]').forEach(b=>b.addEventListener('click',()=>modify({avatar:Number(b.dataset.choiceAvatar),avatarImage:null},'✓ Profilbild online gespeichert.')));
 const upload=$('profile-gallery-upload');
 if(upload)upload.addEventListener('change',async()=>{
  const file=upload.files?.[0];if(!file||busy)return;
  busy=true;readyControls(false);feedback('⏳ Bild wird verarbeitet und online gespeichert …','busy');
  try{
   const data=await window.SpielOnline.processImage(file);
   await update({avatarImage:data});render();
   feedback('✓ Eigenes Profilbild online gespeichert.','success');
   $('profile-upload-status').textContent='✓ Galeriebild gespeichert – auch auf anderen Geräten verfügbar.';
  }catch(e){render();feedback('⚠ Foto wurde nicht gespeichert: '+(e?.message||'Fehler'),'error');$('profile-upload-status').textContent='⚠ '+(e?.message||'Bildverarbeitung fehlgeschlagen.');}
  finally{busy=false;readyControls(true);upload.value='';}
 });
 window.addEventListener('spielonline-change',synced);
 window.addEventListener('spielprofil-change',render);
 window.addEventListener('pageshow',()=>{render();});
 // Keep a useful, nonempty profile in the UI if the script loads after auth.
 render();if(active())feedback('✓ Online-Profil geladen und synchronisiert.','success');
}

function initGame(){
 let name=active()?.name||'';if(!name)try{name=sessionStorage.getItem(SESS)||'';}catch{}
 if(!name)return;const path=location.pathname.toLowerCase();
 function updateInput(input){if(!input||input.dataset[STAMP])return;const max=Number(input.maxLength)>0?input.maxLength:24;input.value=name.slice(0,max);input.dataset[STAMP]='1';input.dispatchEvent(new Event('input',{bubbles:true}));}
 function sync(){
  if(path.includes('skyjo')){updateInput(document.getElementById('onlineName'));updateInput(document.getElementById('aiHumanName'));updateInput(document.querySelector('#names input.pname'));}
  else if(path.includes('kreuzkunter')){updateInput(document.getElementById('name0'));updateInput(document.getElementById('net-name'));}
  else if(path.includes('business')){updateInput(document.getElementById('name0'));updateInput(document.getElementById('boCustomName'));}
  else if(path.includes('barikade')){
   const b=document.querySelector('.names button[data-name="Gast"]');
   if(b&&!['David','Vanessa','Christoph','Gast'].includes(name)){
    b.dataset.name=name;
    const label=b.querySelector('.player-choice-name'),avatar=b.querySelector('.player-choice-avatar');
    if(label)label.textContent=name;if(avatar)avatar.textContent=name[0].toUpperCase();b.setAttribute('title','Angemeldeter Spielername');
   }
   const choice=Array.from(document.querySelectorAll('.names button[data-name]')).find(b=>b.dataset.name===name);
   if(choice&&!choice.dataset[STAMP]){choice.dataset[STAMP]='1';if(!choice.disabled)choice.click();}
  }
 }
 sync();let count=0;const observer=new MutationObserver(()=>{sync();if(++count>1500)observer.disconnect();});observer.observe(document.body,{childList:true,subtree:true});setTimeout(()=>observer.disconnect(),45000);
}
function start(){const path=location.pathname.toLowerCase();if(document.getElementById('profile-root'))initProfilePage();else if(document.querySelector('.page-head')&&document.querySelector('.game-grid'))setupIndex();else if(['/barikade/','/skyjo/','/kreuzkunter/','/business/'].some(v=>path.includes(v)))initGame();}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();
