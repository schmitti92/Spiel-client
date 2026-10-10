/* Spieleportal – lokale Spielerprofile. Keine Anmeldung, kein Serverzugangsschutz. */
(function(){
'use strict';
const KEY='spielportal.profiles.v1';
const COLORS=['#328cff','#ff5268','#20b986','#ffc741','#9261ec','#f281af'];
const GAME_NAMES={skyjo:'SKYJO Action',kreuz:'KreuzKunter',barikade:'Barikade',business:'Das große Business'};
const STAMP='profileAutoSet';
let cached=null;
function fresh(){const id='p-'+Date.now().toString(36);return {profiles:[{id,name:'Spieler 1',color:COLORS[0],favorite:'skyjo',avatar:0,created:Date.now(),visits:{},edited:false}],activeId:id};}
function load(){if(cached)return cached;try{let v=JSON.parse(localStorage.getItem(KEY));if(v&&Array.isArray(v.profiles)&&v.profiles.length&&v.profiles.some(p=>p.id===v.activeId)){cached=v;return cached;}}catch(e){}cached=fresh();save();return cached;}
function save(){try{localStorage.setItem(KEY,JSON.stringify(cached));}catch(e){console.warn('Profil-Speicherplatz nicht verfügbar',e);}window.dispatchEvent(new CustomEvent('spielprofil-change'));}
function active(){const s=load();return s.profiles.find(p=>p.id===s.activeId)||s.profiles[0];}
function cleanName(v){return String(v||'').replace(/[<>\r\n]/g,'').replace(/\s+/g,' ').trim().slice(0,24);}
function update(obj){const p=active();Object.assign(p,obj);save();return p;}
function use(id){const s=load();if(!s.profiles.some(p=>p.id===id))return; s.activeId=id;save();}
function add(name){name=cleanName(name);if(!name)throw Error('Bitte einen Namen eingeben.');const s=load();if(s.profiles.length>=12)throw Error('Maximal 12 Profile pro Gerät.');if(s.profiles.some(p=>p.name.toLowerCase()===name.toLowerCase()))throw Error('Dieser Profilname existiert bereits.');let id='p-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,5);s.profiles.push({id,name,color:COLORS[(s.profiles.length)%COLORS.length],favorite:'skyjo',avatar:s.profiles.length%8,created:Date.now(),visits:{},edited:false});s.activeId=id;save();}
function rename(name){name=cleanName(name);if(!name)throw Error('Bitte einen Spielernamen eingeben.');if(load().profiles.some(p=>p.id!==active().id&&p.name.toLowerCase()===name.toLowerCase()))throw Error('Dieser Name ist bereits vergeben.');update({name,edited:true});}
function remove(){const s=load();s.profiles=s.profiles.filter(p=>p.id!==s.activeId);if(!s.profiles.length){cached=fresh();}else{s.activeId=s.profiles[0].id;}save();}
function escapeHTML(s){return String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function avatarCSS(idx){idx=Math.max(0,Math.min(7,Number(idx)||0));return `background-image:url('${location.pathname.includes('/Barikade/')||location.pathname.includes('/Skyjo/')||location.pathname.includes('/KreuzKunter/')||location.pathname.includes('/Business/')?'../':''}profile-avatars.webp');background-size:400% 200%;background-position:${(idx%4)*100/3}% ${Math.floor(idx/4)*100}%`}
function registerLaunch(url){const key=String(url||'').toLowerCase();let game=key.includes('skyjo')?'skyjo':key.includes('kreuzkunter')?'kreuz':key.includes('barikade')?'barikade':key.includes('business')?'business':null;if(!game)return;const p=active();if(!p.visits)p.visits={};p.visits[game]=(Number(p.visits[game])||0)+1;save();}
window.SpielProfile={load,active,use,add,rename,update,remove,COLORS,escapeHTML,avatarCSS,registerLaunch};

function setupIndex(){const head=document.querySelector('.page-head');if(!head)return;const p=active();head.style.position='relative';head.style.paddingRight='min(290px,31vw)';const wrapper=document.createElement('div');wrapper.className='sp-index-wrap';wrapper.innerHTML=`<button type="button" class="sp-profile-button" aria-expanded="false" aria-label="Spielerprofil auswählen"><span class="sp-avatar" style="${avatarCSS(p.avatar)}"></span><span class="sp-person-name"></span><span aria-hidden="true">⌄</span></button><div class="sp-index-menu" hidden><div class="sp-menu-head">👤 Spielerprofil wählen</div><div class="sp-options"></div><div class="sp-menu-actions"><a href="profile.html">⚙️ Profil bearbeiten</a><button type="button" class="sp-new">＋ Neues Profil</button></div></div>`;
head.appendChild(wrapper);const b=wrapper.querySelector('.sp-profile-button'),menu=wrapper.querySelector('.sp-index-menu');
function render(){const prof=active();wrapper.querySelector('.sp-avatar').style.cssText=avatarCSS(prof.avatar);wrapper.querySelector('.sp-person-name').textContent=prof.name;wrapper.querySelector('.sp-options').innerHTML='';load().profiles.forEach(other=>{let choice=document.createElement('button');choice.type='button';choice.className='sp-profile-choice';choice.innerHTML=`<span class="sp-avatar" style="${avatarCSS(other.avatar)}"></span><span></span><span>${other.id===prof.id?'✓':''}</span>`;choice.children[1].textContent=other.name;choice.onclick=()=>{use(other.id);render();menu.hidden=true;b.setAttribute('aria-expanded','false');};wrapper.querySelector('.sp-options').appendChild(choice);});}
render();b.onclick=()=>{menu.hidden=!menu.hidden;b.setAttribute('aria-expanded',String(!menu.hidden));if(!menu.hidden)render()};wrapper.querySelector('.sp-new').onclick=()=>{const s=prompt('Name für das neue Spielerprofil:');if(s!==null){try{add(s);render();menu.hidden=true}catch(e){alert(e.message)}}};
document.addEventListener('pointerdown',e=>{if(!wrapper.contains(e.target)){menu.hidden=true;b.setAttribute('aria-expanded','false')}});
// Startaufrufe sind keine abgeschlossenen Partien.
document.querySelectorAll('.game-grid a[href]').forEach(a=>a.addEventListener('click',()=>registerLaunch(a.getAttribute('href'))));
window.addEventListener('spielprofil-change',render);
}

function initProfilePage(){const shell=document.getElementById('profile-root');if(!shell)return;
let modal=null;const $=id=>document.getElementById(id);
function initials(p){return p.name?Array.from(p.name)[0].toUpperCase():'?';}
function modalOpen(title,form,action){modal=$('profile-dialog');$('dialog-title').textContent=title;$('dialog-content').innerHTML=form;modal.showModal();$('dialog-form').onsubmit=e=>{e.preventDefault();try{action(new FormData($('dialog-form')));modal.close();render();}catch(ex){$('dialog-error').textContent=ex.message||String(ex)}};$('dialog-error').textContent='';}
function render(){const p=active();$('profile-title-name').textContent=p.name;$('profile-short-name').textContent=p.name;$('profile-header-avatar').style.cssText=avatarCSS(p.avatar);$('profile-side-avatar').style.cssText=avatarCSS(p.avatar);$('profile-created').textContent=new Date(p.created||Date.now()).toLocaleDateString('de-DE',{month:'long',year:'numeric'});$('favorite-game-name').textContent=GAME_NAMES[p.favorite]||GAME_NAMES.skyjo;
for(const c of document.querySelectorAll('[data-choice-color]')){const on=c.dataset.choiceColor===p.color;c.classList.toggle('selected',on);c.setAttribute('aria-pressed',String(on));}
for(const el of document.querySelectorAll('[data-choice-game]')){const on=el.dataset.choiceGame===p.favorite;el.classList.toggle('selected',on);el.setAttribute('aria-pressed',String(on));}
for(const av of document.querySelectorAll('[data-choice-avatar]')){let n=+av.dataset.choiceAvatar;av.style.cssText=avatarCSS(n);av.classList.toggle('selected',n===p.avatar);av.setAttribute('aria-label','Avatar '+(n+1));av.setAttribute('aria-pressed',String(n===p.avatar));}
const v=p.visits||{};const total=Object.values(v).reduce((acc,n)=>acc+(Number(n)||0),0),unique=Object.values(v).filter(n=>n>0).length;
$('stat-launches').textContent=String(total);$('stat-games').textContent=String(unique);$('stat-profiles').textContent=String(load().profiles.length);$('stat-achievements').textContent=String(1+(p.edited?1:0)+(p.favorite!=='skyjo'?1:0)+(p.avatar!==0?1:0)+(unique>=2?1:0));
const badges=[['👑','Profilstarter','Profil angelegt',true],['🎨','Eigener Stil','Spielername bearbeitet',!!p.edited],['⭐','Spielefan','Lieblingsspiel geändert',p.favorite!=='skyjo'],['🖼️','Avatar-Fan','Profilbild angepasst',p.avatar!==0],['🎮','Spieleentdecker','Mindestens 2 Spiele geöffnet',unique>=2]];
$('achievement-list').innerHTML=badges.map(([ico,name,description,unlocked])=>`<div class="achievement ${unlocked?'':'locked'}"><span>${ico}</span><b>${escapeHTML(name)}</b><small>${escapeHTML(description)}</small></div>`).join('');
$('profile-switch-list').innerHTML='';load().profiles.forEach(other=>{const o=document.createElement('button');o.type='button';o.className='switch-choice'+(p.id===other.id?' selected':'');o.innerHTML=`<span class="avatar-tile" style="${avatarCSS(other.avatar)}"></span><span></span><strong>${p.id===other.id?'✓':''}</strong>`;o.children[1].textContent=other.name;o.onclick=()=>{use(other.id);$('switch-dialog').close();render()};$('profile-switch-list').append(o)});
}
$('profile-edit').onclick=()=>modalOpen('Spielerprofil bearbeiten',`<label>Spielername<input name="name" maxlength="24" required value="${escapeHTML(active().name)}" autocomplete="off"></label>`,f=>rename(f.get('name')));
$('profile-add').onclick=()=>modalOpen('Neues Profil erstellen',`<label>Spielername<input name="name" maxlength="24" required autofocus placeholder="z. B. Spieler 2"></label>`,f=>add(f.get('name')));
$('profile-edit-top').onclick=$('profile-switch').onclick=()=>{$('switch-dialog').showModal()};
$('profile-delete').onclick=()=>{const p=active();if(confirm(`Das lokale Profil „${p.name}“ wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.`)){remove();render()}};
$('dialog-cancel').onclick=()=>{$('profile-dialog').close()};$('switch-close').onclick=()=>{$('switch-dialog').close()};
document.querySelectorAll('[data-choice-color]').forEach(b=>b.onclick=()=>{update({color:b.dataset.choiceColor});render()});
document.querySelectorAll('[data-choice-game]').forEach(b=>b.onclick=()=>{update({favorite:b.dataset.choiceGame});render()});
document.querySelectorAll('[data-choice-avatar]').forEach(b=>b.onclick=()=>{update({avatar:Number(b.dataset.choiceAvatar)});render()});
render();
}

function initGame(){const name=active().name;
// Preset native name inputs only if their field contains a default/empty value. Players can always edit later.
const path=location.pathname.toLowerCase();
function updateInput(input){if(!input||input.dataset[STAMP])return;const v=(input.value||'').trim();input.value=name.slice(0,parseInt(input.maxLength,10)>0?parseInt(input.maxLength,10):24);input.dataset[STAMP]='1';input.dispatchEvent(new Event('input',{bubbles:true}));}
function sync(){if(path.includes('skyjo')){updateInput(document.getElementById('onlineName'));updateInput(document.getElementById('aiHumanName'));updateInput(document.querySelector('#names input.pname'));}
else if(path.includes('kreuzkunter')){updateInput(document.getElementById('name0'));updateInput(document.getElementById('net-name'));}
else if(path.includes('business')){updateInput(document.getElementById('name0'));updateInput(document.getElementById('boCustomName'));}
else if(path.includes('barikade')){const b=document.querySelector('.names button[data-name="Gast"]');if(b&&!['David','Vanessa','Christoph','Gast'].includes(name)){b.dataset.name=name;b.querySelector('.player-choice-name').textContent=name;b.querySelector('.player-choice-avatar').textContent=name[0].toUpperCase();b.setAttribute('title','Aktives Spielerprofil');}const choice=Array.from(document.querySelectorAll('.names button[data-name]')).find(b=>b.dataset.name===name);if(choice&&!choice.dataset[STAMP]){choice.dataset[STAMP]='1';if(!choice.disabled)choice.click();}}
}
sync();let c=0;const obs=new MutationObserver(()=>{sync();if(++c>1500)obs.disconnect()});obs.observe(document.body,{childList:true,subtree:true});setTimeout(()=>obs.disconnect(),45000);
}
function start(){const path=location.pathname.toLowerCase();if(document.getElementById('profile-root'))initProfilePage();else if(document.querySelector('.page-head')&&document.querySelector('.game-grid'))setupIndex();else if(path.includes('/barikade/')||path.includes('/skyjo/')||path.includes('/kreuzkunter/')||path.includes('/business/'))initGame();}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();
