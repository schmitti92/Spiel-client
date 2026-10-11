/* SPIELEPORTAL V7: ausschliesslich authentifizierte Online-Profile.
 * Alte lokale Daten werden nicht verwendet, nicht dargestellt und nicht geloescht.
 * Spielregeln und bisherige Raum-Logik bleiben unberuehrt.
 */
(function(){
'use strict';
const COLORS=['#328cff','#ff5268','#20b986','#ffc741','#9261ec','#f281af'];
const GAME_NAMES={skyjo:'SKYJO Action',kreuz:'KreuzKunter',barikade:'Barikade',business:'Das große Business'};
const BANNERS={classic:'Standardbanner',ocean:'Ozean',sunset:'Sonnenuntergang',forest:'Natur',cosmos:'Kosmos'};
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
 let busy=false,feedbackTimer=null,feedbackSequence=0;
 function showAccess(text,type='loading'){
  if(!notice)return;
  notice.textContent=text||'';
  notice.hidden=!text;
  notice.dataset.state=type;
 }
 function feedback(text,type='info'){
  if(!status)return;
  // Every state transition replaces the previous message, including its timer.
  if(feedbackTimer!==null){clearTimeout(feedbackTimer);feedbackTimer=null;}
  const seq=++feedbackSequence;
  status.textContent=text||'';
  status.dataset.state=type;
  status.hidden=!text;
  // Success is confirmation, not a permanent loading/status banner.
  if(text&&type==='success')feedbackTimer=setTimeout(()=>{
   if(seq===feedbackSequence){status.hidden=true;status.textContent='';}
   feedbackTimer=null;
  },5000);
 }
 function readyControls(enabled){
  root.querySelectorAll('[data-choice-color],[data-choice-game],[data-choice-avatar],#profile-gallery-upload,#profile-edit,#profile-edit-hero,#profile-edit-design,[data-banner-choice]').forEach(b=>b.disabled=!enabled);
 }
 function render(){
  const p=active(),s=state();
  if(!p){
   if(s?.status==='error')showAccess('⚠ '+(s.error||'Online-Profil kann momentan nicht geladen werden.'),'error');
   else if(s?.status==='loading'||s?.status==='initializing'||!s)showAccess('⏳ Spielerprofil wird sicher aus Firebase geladen …');
   else if(s?.status==='onboarding')showAccess('✍️ Bitte schließe zunächst die Registrierung ab.','info');
   else showAccess('', 'idle');
   return;
  }
  // A confirmed profile always takes precedence over any old loading text.
  showAccess('', 'ready');
  $('profile-title-name').textContent=p.name||'Spieler';
  $('profile-short-name').textContent=p.name||'Spieler';
  $('profile-header-avatar').style.cssText=avatarCSS(p);
  $('profile-side-avatar').style.cssText=avatarCSS(p);
  const bannerId=Object.hasOwn(BANNERS,p.banner)?p.banner:'classic';
  const bannerEl=$('profile-stage-image');
  bannerEl.dataset.banner=p.bannerImage?'custom':bannerId;
  bannerEl.style.backgroundImage=p.bannerImage&&/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(p.bannerImage)?`url("${p.bannerImage}")`:'';
  $('profile-banner-label').textContent='🎨 '+(p.bannerImage?'Eigenes Banner':BANNERS[bannerId]);
  $('profile-banner-summary').textContent=p.bannerImage?'Eigenes Galeriebild':BANNERS[bannerId];
  $('profile-bio').textContent=(p.bio||'').trim()||'Hier ist Platz für deine persönliche Profilbeschreibung.';
  $('profile-bio-summary').textContent=(p.bio||'').trim()||'Gestalte deine Profilbeschreibung und dein persönliches Banner.';
  $('profile-privacy-summary').textContent=p.publicStats?'Für zukünftige Ranglisten freigegeben':'Keine öffentliche Rangliste';
  document.querySelectorAll('[data-banner-choice]').forEach(b=>{
   const sel=!p.bannerImage&&b.dataset.bannerChoice===bannerId;
   b.classList.toggle('selected',sel);b.setAttribute('aria-pressed',String(sel));
  });
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
   const selected=!p.avatarImage&&n===Number(p.avatar);
   b.classList.toggle('selected',selected);b.setAttribute('aria-pressed',String(selected));
   b.setAttribute('aria-label','Avatar '+(n+1)+(selected?' ausgewählt':''));
  });
  $('stat-launches').textContent='–';$('stat-games').textContent='–';$('stat-profiles').textContent='1';$('stat-achievements').textContent='–';
  $('achievement-list').innerHTML='<div class="achievement"><span>👑</span><b>Online-Profil</b><small>Konto eingerichtet</small></div><div class="achievement locked"><span>🏆</span><b>Erster Spielsieg</b><small>Nach sicherer Ergebnisanbindung</small></div><div class="achievement locked"><span>⭐</span><b>Spielerkarriere</b><small>XP und Level folgen</small></div>';
  $('profile-manage-note').textContent='🔐 Einstellungen werden in deinem Firebase-Online-Profil gespeichert. Kontolöschung ist noch nicht verfügbar.';
 }
 function synced(){
  render();
  if(active()&&!busy)feedback('✓ Online-Profil geladen und synchronisiert.','success');
  else if(state()?.status==='error'&&!busy)feedback('⚠ Online-Profil konnte nicht synchronisiert werden.','error');
 }
 async function modify(change,success='✓ Änderung sicher online gespeichert.'){
  if(busy)return;
  busy=true;readyControls(false);feedback('⏳ Änderung wird online gespeichert …','busy');
  try{await update(change);render();feedback(success,'success');}
  catch(e){render();feedback('⚠ Speichern fehlgeschlagen: '+(e?.message||'Unbekannter Fehler'),'error');}
  finally{busy=false;readyControls(true);}
 }
 function bannerPreviewStyle(p){
  if(p.bannerImage&&/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(p.bannerImage))return `background-image:url("${p.bannerImage}");background-size:cover;background-position:center`;
  const bg={classic:`url('profile-hero.webp') right center/cover no-repeat`,ocean:'linear-gradient(125deg,#bce9ff,#3d8cca 52%,#154874)',sunset:'linear-gradient(140deg,#ffe3a7,#ff9d85 50%,#9b5c9f)',forest:'linear-gradient(125deg,#d1f7c8,#60b999 55%,#277363)',cosmos:'linear-gradient(140deg,#b4cffd,#687ec9 50%,#4f4b8c)'};
  return `background:${bg[p.banner]||bg.classic}`;
 }
 async function processBannerImage(file){
  if(!file||!['image/jpeg','image/png','image/webp'].includes(file.type))throw Error('Nur JPG, PNG und WebP sind erlaubt.');
  if(file.size>12*1024*1024)throw Error('Das ausgewählte Foto darf höchstens 12 MB groß sein.');
  const url=URL.createObjectURL(file);
  try{
   const im=new Image();im.decoding='async';
   await new Promise((ok,fail)=>{im.onload=ok;im.onerror=()=>fail(Error('Foto kann nicht gelesen werden.'));im.src=url;});
   if(!im.naturalWidth||!im.naturalHeight)throw Error('Ungültiges Bild.');
   const canvas=document.createElement('canvas');canvas.width=1120;canvas.height=350;
   const ctx=canvas.getContext('2d');if(!ctx)throw Error('Bildbearbeitung wird nicht unterstützt.');
   const scale=Math.max(canvas.width/im.naturalWidth,canvas.height/im.naturalHeight);
   const w=im.naturalWidth*scale,h=im.naturalHeight*scale;
   ctx.drawImage(im,(canvas.width-w)/2,(canvas.height-h)/2,w,h);
   for(const q of [.82,.7,.55,.43,.32]){
    const result=canvas.toDataURL('image/jpeg',q);
    if(result.length<198000)return result;
   }
   throw Error('Foto konnte nicht ausreichend verkleinert werden.');
  }finally{URL.revokeObjectURL(url);}
 }
 function editAll(){
  const p=active();if(!p||busy)return;
  const draft={name:p.name||'',bio:p.bio||'',banner:p.banner||'classic',bannerImage:p.bannerImage||null,
   avatar:Number(p.avatar)||0,avatarImage:p.avatarImage||null,color:p.color||COLORS[0],favorite:p.favorite||'skyjo',publicStats:p.publicStats===true};
  let tab='info',processing=false;
  $('dialog-title').textContent='✦ Mein Spielerprofil gestalten';
  const dContent=$('dialog-content');
  const basePreview=()=>`<aside class="v7-edit-preview"><div id="v7-preview-banner" class="v7-preview-banner" style="${bannerPreviewStyle(draft)}"></div><div class="v7-preview-content"><div class="v7-preview-avatar" id="v7-preview-avatar" style="${avatarCSS(draft)};--v7-preview-accent:${draft.color}"></div><strong id="v7-preview-name">${escapeHTML(draft.name||'Dein Spielername')}</strong><p id="v7-preview-bio">${escapeHTML(draft.bio||'Dein Profil. Deine Spiele. Deine Erfolge.')}</p><span class="chip">☁️ Online-Profil</span></div></aside>`;
  function formContent(){
   const menu=`<div class="v7-edit-tabs" role="tablist" aria-label="Profilbereiche">${[['info','👤 Über mich'],['design','🎨 Gestaltung'],['privacy','🔐 Konto & Privatsphäre']].map(([id,t])=>`<button type="button" role="tab" data-edit-tab="${id}" aria-selected="${String(id===tab)}" class="${id===tab?'current':''}">${t}</button>`).join('')}</div>`;
   let fields='';
   if(tab==='info')fields=`<label>Spielername<input type="text" name="name" maxlength="24" minlength="2" required autocomplete="nickname" value="${escapeHTML(draft.name)}" placeholder="Dein Spielername"></label><label>Deine Profilbeschreibung <small>Maximal 180 Zeichen. Keine E-Mail-Adresse oder privaten Kontaktdaten angeben.</small><textarea name="bio" maxlength="180" rows="4" placeholder="Erzähle kurz, welche Spiele du gerne spielst …">${escapeHTML(draft.bio)}</textarea><small id="v7-bio-counter">${draft.bio.length} / 180 Zeichen</small></label><div class="v7-privacy-note">✦ Spielername und Beschreibung sind deine persönliche Spieleridentität. Eine öffentliche Profilfreigabe ist noch nicht eingerichtet.</div>`;
   else if(tab==='design')fields=`<label>Profilbanner</label><div class="v7-banner-options">${Object.entries(BANNERS).map(([id,t])=>`<button type="button" data-edit-banner="${id}" class="${!draft.bannerImage&&draft.banner===id?'on':''}">${escapeHTML(t)}</button>`).join('')}</div><label class="v7-upload">🖼️ Eigenes Bannerfoto aus Galerie wählen<input type="file" data-edit-banner-upload accept="image/jpeg,image/png,image/webp"></label><label>Profilbild / Avatar</label><div class="v7-avatar-grid">${Array.from({length:8},(_,i)=>`<button type="button" aria-label="Avatar ${i+1}" aria-pressed="${!draft.avatarImage&&draft.avatar===i}" class="${!draft.avatarImage&&draft.avatar===i?'on':''}" data-edit-avatar="${i}" style="${avatarCSS(i)}"></button>`).join('')}</div><label class="v7-upload">📸 Eigenes Profilbild aus Galerie wählen<input type="file" data-edit-avatar-upload accept="image/jpeg,image/png,image/webp"></label><label>Lieblingsfarbe</label><div class="v7-palette">${COLORS.map(c=>`<button type="button" aria-label="Profilfarbe ${c}" data-edit-color="${c}" class="${draft.color===c?'on':''}" style="--swatch:${c}"></button>`).join('')}</div><label>Lieblingsspiel<select name="favorite">${Object.entries(GAME_NAMES).map(([id,t])=>`<option value="${id}" ${draft.favorite===id?'selected':''}>${escapeHTML(t)}</option>`).join('')}</select></label>`;
   else fields=`<div class="v7-privacy-note">🔒 Dein Profil bleibt mit deinem Firebase-Konto verknüpft. E-Mail-Adresse und Passwort werden nicht als öffentliches Profilfeld angezeigt.</div><label class="v7-privacy-check"><input type="checkbox" name="publicStats" ${draft.publicStats?'checked':''}><span>Für zukünftige öffentliche Bestenlisten freigeben <small>Bis es öffentliche Bestenlisten gibt, hat diese Einstellung keine sichtbare Wirkung. Standardmäßig ausgeschaltet.</small></span></label><div class="v7-stat-description">🏆 Siege, XP und Level werden erst nach einer sicheren Spielanbindung freigeschaltet.</div><button id="v7-send-password-reset" type="button" class="btn pale">✉️ Passwort-Zurücksetzen per E-Mail senden</button><div class="v7-privacy-note">Eine dauerhafte Kontolöschung ist hier noch nicht implementiert. Es werden keine Löschungen vorgetäuscht.</div>`;
   dContent.innerHTML=`<p class="v7-dialog-description">Alle Änderungen werden erst nach deiner Bestätigung gemeinsam und sicher gespeichert.</p>${menu}<div class="v7-edit-main"><div class="v7-edit-fields">${fields}</div>${basePreview()}</div>`;
   wireControls();
  }
  function syncPreview(){
   const bn=$('v7-preview-banner'),av=$('v7-preview-avatar'),nm=$('v7-preview-name'),bio=$('v7-preview-bio');
   if(bn)bn.style.cssText=bannerPreviewStyle(draft);
   if(av)av.style.cssText=avatarCSS(draft)+`;--v7-preview-accent:${draft.color}`;
   if(nm)nm.textContent=draft.name||'Dein Spielername';
   if(bio)bio.textContent=draft.bio||'Dein Profil. Deine Spiele. Deine Erfolge.';
  }
  function wireControls(){
   dContent.querySelectorAll('[data-edit-tab]').forEach(b=>b.onclick=()=>{tab=b.dataset.editTab;formContent();});
   dContent.querySelector('[name="name"]')?.addEventListener('input',e=>{draft.name=e.target.value;syncPreview();});
   dContent.querySelector('[name="bio"]')?.addEventListener('input',e=>{draft.bio=e.target.value;$('v7-bio-counter').textContent=draft.bio.length+' / 180 Zeichen';syncPreview();});
   dContent.querySelector('[name="favorite"]')?.addEventListener('change',e=>{draft.favorite=e.target.value;});
   dContent.querySelector('[name="publicStats"]')?.addEventListener('change',e=>{draft.publicStats=e.target.checked;});
   dContent.querySelectorAll('[data-edit-banner]').forEach(b=>b.onclick=()=>{draft.banner=b.dataset.editBanner;draft.bannerImage=null;formContent();});
   dContent.querySelectorAll('[data-edit-avatar]').forEach(b=>b.onclick=()=>{draft.avatar=Number(b.dataset.editAvatar);draft.avatarImage=null;formContent();});
   dContent.querySelectorAll('[data-edit-color]').forEach(b=>b.onclick=()=>{draft.color=b.dataset.editColor;formContent();});
   const avatarInput=dContent.querySelector('[data-edit-avatar-upload]');
   if(avatarInput)avatarInput.onchange=async()=>{const f=avatarInput.files?.[0];if(!f||processing)return;processing=true;$('dialog-error').textContent='Bild wird verarbeitet …';try{draft.avatarImage=await window.SpielOnline.processImage(f);formContent();$('dialog-error').textContent='✓ Profilbild verarbeitet. Zum Speichern bestätigen.';}catch(e){$('dialog-error').textContent=e?.message||'Bildfehler';}finally{processing=false;}};
   const bannerInput=dContent.querySelector('[data-edit-banner-upload]');
   if(bannerInput)bannerInput.onchange=async()=>{const f=bannerInput.files?.[0];if(!f||processing)return;processing=true;$('dialog-error').textContent='Banner wird verarbeitet …';try{draft.bannerImage=await processBannerImage(f);formContent();$('dialog-error').textContent='✓ Banner verarbeitet. Zum Speichern bestätigen.';}catch(e){$('dialog-error').textContent=e?.message||'Bildfehler';}finally{processing=false;}};
   const reset=dContent.querySelector('#v7-send-password-reset');if(reset)reset.onclick=async()=>{const email=state()?.user?.email;if(!email){$('dialog-error').textContent='Für das Konto ist keine E-Mail vorhanden.';return;}if(!confirm(`Passwort-Link an ${email} senden?`))return;try{await window.SpielOnline.resetPassword(email);$('dialog-error').textContent='✓ E-Mail zum Zurücksetzen angefordert. Bitte Postfach prüfen.';}catch(e){$('dialog-error').textContent=e?.message||'E-Mail-Versand fehlgeschlagen.';}};
  }
  $('dialog-error').textContent='';formContent();dialog.showModal();
  form.onsubmit=async ev=>{
   ev.preventDefault();if(processing)return;
   const button=form.querySelector('button[type="submit"]');button.disabled=true;
   try{
    const name=cleanName(draft.name),bio=String(draft.bio||'').trim();
    if(name.length<2)throw Error('Bitte einen Spielernamen mit mindestens zwei Zeichen eingeben.');
    if(bio.length>180)throw Error('Die Profilbeschreibung darf höchstens 180 Zeichen haben.');
    if(busy)throw Error('Bitte warte, bis die letzte Änderung gespeichert ist.');
    busy=true;readyControls(false);feedback('⏳ Profileinstellungen werden sicher gespeichert …','busy');
    await update({name,edited:true,bio,banner:draft.banner,bannerImage:draft.bannerImage,avatar:draft.avatar,avatarImage:draft.avatarImage,color:draft.color,favorite:draft.favorite,publicStats:draft.publicStats});
    dialog.close();render();feedback('✓ Alle Profileinstellungen online gespeichert.','success');
   }catch(e){$('dialog-error').textContent=e?.message||'Speichern fehlgeschlagen.';feedback('⚠ Die Änderungen wurden nicht übernommen.','error');}
   finally{busy=false;button.disabled=false;readyControls(true);}
  };
 }
 $('profile-edit').addEventListener('click',editAll);
 $('profile-edit-hero')?.addEventListener('click',editAll);
 $('profile-edit-design')?.addEventListener('click',editAll);
 const signOut=async()=>{try{await window.SpielOnline.logout();}catch(e){feedback('⚠ Abmelden fehlgeschlagen: '+e.message,'error');}};
 $('profile-switch').addEventListener('click',signOut);
 $('profile-edit-top').addEventListener('click',signOut);
 $('dialog-cancel').addEventListener('click',()=>dialog.close());
 document.querySelectorAll('[data-choice-color]').forEach(b=>b.addEventListener('click',()=>modify({color:b.dataset.choiceColor},'✓ Lieblingsfarbe online gespeichert.')));
 document.querySelectorAll('[data-banner-choice]').forEach(b=>b.addEventListener('click',()=>modify({banner:b.dataset.bannerChoice,bannerImage:null},'✓ Profilbanner online gespeichert.')));
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
 window.addEventListener('visibilitychange',()=>{if(!document.hidden)render();});
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
