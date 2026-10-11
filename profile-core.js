/* SPIELEPORTAL V2: ausschliesslich authentifizierte Online-Profile.
 * Alte lokale Daten werden nicht verwendet, nicht dargestellt und nicht geloescht.
 * Spielregeln und bisherige Raum-Logik bleiben unberuehrt.
 */
(function(){
'use strict';
const COLORS=['#328cff','#ff5268','#20b986','#ffc741','#9261ec','#f281af'];
const GAME_NAMES={skyjo:'SKYJO Action',kreuz:'KreuzKunter',barikade:'Barikade',business:'Das große Business'};
const STAMP='profileAutoSet';
const SESS='spielportal.online-display-name';
function state(){return window.SpielOnline?.state?.()||null;}
function active(){const s=state();return s?.status==='online'&&s?.profile?.setupComplete!==false?s.profile:null;}
function saveName(){try{const p=active();if(p)sessionStorage.setItem(SESS,p.name);else if(state()?.status==='guest')sessionStorage.removeItem(SESS);}catch{}}
window.addEventListener('spielonline-change',saveName);
function cleanName(v){return String(v||'').replace(/[<>\u0000-\u001f\u007f]/g,'').replace(/\s+/g,' ').trim().slice(0,24);}
function update(values){const p=active();if(!p)throw Error('Bitte zuerst online anmelden.');
 const next={...p,...values};Object.assign(p,next);
 window.dispatchEvent(new CustomEvent('spielprofil-change'));
 return window.SpielOnline.saveProfile(next);
}
function rename(name){name=cleanName(name);if(name.length<2)throw Error('Mindestens zwei Zeichen eingeben.');return update({name,edited:true});}
function escapeHTML(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));}
function avatarCSS(avatarOrProfile){
 const p=(avatarOrProfile&&typeof avatarOrProfile==='object')?avatarOrProfile:{avatar:avatarOrProfile};
 if(p.avatarImage&&/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(p.avatarImage))return `background-image:url("${p.avatarImage}");background-size:cover;background-position:center`;
 const idx=Math.max(0,Math.min(7,Number(p.avatar)||0));
 const sub=['Barikade','Skyjo','KreuzKunter','Business'].some(folder=>location.pathname.includes('/'+folder+'/'))?'../':'';
 return `background-image:url('${sub}profile-avatars.webp');background-size:400% 200%;background-position:${(idx%4)*100/3}% ${Math.floor(idx/4)*100}%`;
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
 function render(){
  const p=active();if(!p)return;
  $('profile-title-name').textContent=p.name;$('profile-short-name').textContent=p.name;
  $('profile-header-avatar').style.cssText=avatarCSS(p);$('profile-side-avatar').style.cssText=avatarCSS(p);
  $('profile-created').textContent=new Date(p.created||Date.now()).toLocaleDateString('de-DE',{month:'long',year:'numeric'});
  $('favorite-game-name').textContent=GAME_NAMES[p.favorite]||GAME_NAMES.skyjo;
  document.querySelectorAll('[data-choice-color]').forEach(b=>{const selected=b.dataset.choiceColor===p.color;b.classList.toggle('selected',selected);b.setAttribute('aria-pressed',String(selected));});
  document.querySelectorAll('[data-choice-game]').forEach(b=>{const selected=b.dataset.choiceGame===p.favorite;b.classList.toggle('selected',selected);b.setAttribute('aria-pressed',String(selected));});
  document.querySelectorAll('[data-choice-avatar]').forEach(b=>{const n=+b.dataset.choiceAvatar;b.style.cssText=avatarCSS(n);const selected=!p.avatarImage&&n===p.avatar;b.classList.toggle('selected',selected);b.setAttribute('aria-pressed',String(selected));});
  $('stat-launches').textContent='–';$('stat-games').textContent='–';$('stat-profiles').textContent='1';$('stat-achievements').textContent='–';
  $('achievement-list').innerHTML='<div class="achievement"><span>👑</span><b>Online-Profil</b><small>Konto eingerichtet</small></div><div class="achievement locked"><span>🏆</span><b>Spielerfolge</b><small>Folgen mit der sicheren Spielanbindung</small></div>';
  $('profile-manage-note').textContent='🔐 Dein Profil wird online in Firebase gespeichert. Die sichere Kontolöschung ist noch nicht freigeschaltet.';
 }
 function showRename(){if(!active())return;
  $('dialog-title').textContent='Spielernamen ändern';$('dialog-content').innerHTML=`<label>Spielername<input name="name" maxlength="24" minlength="2" required autocomplete="nickname" value="${escapeHTML(active().name)}"></label>`;
  $('dialog-error').textContent='';dialog.showModal();
  form.onsubmit=async ev=>{ev.preventDefault();const save=form.querySelector('button[type="submit"]');save.disabled=true;try{await rename(new FormData(form).get('name'));dialog.close();render();}catch(e){$('dialog-error').textContent=e.message;}finally{save.disabled=false;}};
 }
 $('profile-edit').onclick=showRename;
 $('profile-switch').onclick=$('profile-edit-top').onclick=async()=>{try{await window.SpielOnline.logout();}catch(e){alert(e.message);}};
 $('dialog-cancel').onclick=()=>dialog.close();
 document.querySelectorAll('[data-choice-color]').forEach(b=>b.addEventListener('click',async()=>{try{await update({color:b.dataset.choiceColor});render();}catch(e){alert(e.message);}}));
 document.querySelectorAll('[data-choice-game]').forEach(b=>b.addEventListener('click',async()=>{try{await update({favorite:b.dataset.choiceGame});render();}catch(e){alert(e.message);}}));
 document.querySelectorAll('[data-choice-avatar]').forEach(b=>b.addEventListener('click',async()=>{try{await update({avatar:Number(b.dataset.choiceAvatar),avatarImage:null});render();}catch(e){alert(e.message);}}));
 const upload=$('profile-gallery-upload');
 if(upload)upload.addEventListener('change',async()=>{
  const f=upload.files?.[0];if(!f)return;
  const status=$('profile-upload-status');status.textContent='Bild wird verkleinert und gespeichert …';
  try{const data=await window.SpielOnline.processImage(f);await update({avatarImage:data});status.textContent='✓ Eigenes Profilbild online gespeichert.';render();}
  catch(e){status.textContent='⚠️ '+e.message;}
  finally{upload.value='';}
 });
 window.addEventListener('spielonline-change',render);window.addEventListener('spielprofil-change',render);render();
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
