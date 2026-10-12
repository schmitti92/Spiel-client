/* Spielerportal V130 – Firebase Authentication (nur E-Mail/Passwort) + Cloud Firestore.
   Kein lokales Profil und keine Passwortspeicherung im Browser durch dieses Skript.
   Benötigt firebase-config.js (window.SPIELPORTAL_FIREBASE_CONFIG).
   Firestore: playerProfiles/{auth.uid}; Regeln: siehe firestore_rules_V130.txt. */
(function(){
'use strict';
const COLORS=['#328cff','#ff5268','#20b986','#ffc741','#9261ec','#f281af'];
const GAME_NAMES={skyjo:'SKYJO Action',kreuz:'KreuzKunter',barikade:'Barikade',business:'Das große Business'};
const BOARD_VALUES=['standard','comic','christlich'];
const SDK_VERSION='10.12.5';
const status={phase:'loading',error:'',user:null,profile:null};
let auth=null, db=null, unsubscribeSnapshot=null, sdkPromise=null;
const subscribers=new Set();
function escapeHTML(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function cleanName(v){return String(v||'').replace(/[<>\r\n]/g,'').replace(/\s+/g,' ').trim().slice(0,24)}
function errorText(e){const code=e?.code||'';return ({'auth/invalid-email':'Ungültige E-Mail-Adresse.','auth/invalid-credential':'E-Mail-Adresse oder Passwort ist falsch.','auth/wrong-password':'E-Mail-Adresse oder Passwort ist falsch.','auth/email-already-in-use':'Diese E-Mail-Adresse ist bereits registriert.','auth/weak-password':'Das Passwort ist zu kurz (mindestens 6 Zeichen).','auth/network-request-failed':'Netzwerkverbindung fehlgeschlagen.','permission-denied':'Firestore-Zugriff verweigert. Bitte die Profilregeln veröffentlichen.'})[code]||String(e?.message||e||'Unbekannter Fehler');}
function announce(){try{window.dispatchEvent(new CustomEvent('spielprofil-change',{detail:{phase:status.phase,uid:status.user?.uid||null}}))}catch(_e){}for(const cb of subscribers)try{cb({...status})}catch(_e){}}
function onChange(cb){subscribers.add(cb);try{cb({...status})}catch(_e){}return ()=>subscribers.delete(cb)}
function avatarCSS(idx){idx=Math.max(0,Math.min(7,Number(idx)||0));const prefix=/\/(Skyjo|Barikade|Business|KreuzKunter)\//i.test(location.pathname)?'../':'';return `background-image:url('${prefix}profile-avatars.webp');background-size:400% 200%;background-position:${(idx%4)*100/3}% ${Math.floor(idx/4)*100}%`}
function validBoard(v){return BOARD_VALUES.includes(v)?v:'standard'}
function defaultProfile(u,custom={}){const username=cleanName(custom.name||u.displayName||u.email?.split('@')[0]||'Spieler');return {id:u.uid,name:username||'Spieler',color:COLORS.includes(custom.color)?custom.color:COLORS[0],favorite:'skyjo',skyjoBoardFavorite:validBoard(custom.skyjoBoardFavorite),avatar:Number.isInteger(custom.avatar)&&custom.avatar>=0&&custom.avatar<=7?custom.avatar:0,created:Date.now(),visits:{},edited:false,updatedAt:Date.now()}}
function normalizeProfile(u,raw){const def=defaultProfile(u);const p=raw||{};return {...def,...p,id:u.uid,name:cleanName(p.name)||def.name,color:COLORS.includes(p.color)?p.color:def.color,skyjoBoardFavorite:validBoard(p.skyjoBoardFavorite),favorite:GAME_NAMES[p.favorite]?p.favorite:'skyjo',avatar:Number.isInteger(p.avatar)&&p.avatar>=0&&p.avatar<=7?p.avatar:0,visits:p.visits&&typeof p.visits==='object'?p.visits:{}}}
function sanitize(changes){const data={};if(Object.hasOwn(changes,'name')){const n=cleanName(changes.name);if(!n)throw Error('Spielername darf nicht leer sein.');data.name=n;data.edited=true}if(Object.hasOwn(changes,'color')){if(!COLORS.includes(changes.color))throw Error('Ungültige Farbe.');data.color=changes.color}if(Object.hasOwn(changes,'avatar')){const a=Number(changes.avatar);if(!Number.isInteger(a)||a<0||a>7)throw Error('Ungültiger Avatar.');data.avatar=a}if(Object.hasOwn(changes,'favorite')){if(!GAME_NAMES[changes.favorite])throw Error('Ungültiges Lieblingsspiel.');data.favorite=changes.favorite}if(Object.hasOwn(changes,'skyjoBoardFavorite')){if(!BOARD_VALUES.includes(changes.skyjoBoardFavorite))throw Error('Ungültiges Spielfeld.');data.skyjoBoardFavorite=changes.skyjoBoardFavorite}return data}
function configured(){const c=window.SPIELPORTAL_FIREBASE_CONFIG;return !!(c&&typeof c==='object'&&c.apiKey&&c.authDomain&&c.projectId&&!String(c.apiKey).includes('HIER_'))}
function sdkScript(src){return new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=src;s.async=true;s.onload=resolve;s.onerror=()=>reject(new Error('Firebase SDK konnte nicht geladen werden.'));document.head.appendChild(s)})}
async function loadSdk(){if(window.firebase?.auth&&window.firebase?.firestore)return; if(!sdkPromise)sdkPromise=(async()=>{const root=`https://www.gstatic.com/firebasejs/${SDK_VERSION}/`;if(!window.firebase?.initializeApp)await sdkScript(root+'firebase-app-compat.js');if(!window.firebase?.auth)await sdkScript(root+'firebase-auth-compat.js');if(!window.firebase?.firestore)await sdkScript(root+'firebase-firestore-compat.js')})();return sdkPromise}
let registrationDraft=null;
async function init(){if(!configured()){status.phase='unconfigured';status.error='Firebase ist noch nicht konfiguriert. Trage deine Firebase-Web-App-Daten in firebase-config.js ein.';announce();return}
 try{await loadSdk();const cfg=window.SPIELPORTAL_FIREBASE_CONFIG;const app=window.firebase.apps?.length?window.firebase.app():window.firebase.initializeApp(cfg);auth=window.firebase.auth(app);db=window.firebase.firestore(app);
 const em=window.SPIELPORTAL_FIREBASE_EMULATORS;if(em){if(em.auth)auth.useEmulator(em.auth);if(em.firestore)db.useEmulator(em.firestore.host,em.firestore.port)}
 auth.onAuthStateChanged(async user=>{unsubscribeSnapshot?.();unsubscribeSnapshot=null;status.user=user||null;status.profile=null;status.error='';if(!user){status.phase='signed_out';announce();return}status.phase='loading_profile';announce();
 const ref=db.collection('playerProfiles').doc(user.uid);
 const registrationData=registrationDraft;
 try{const snap=await ref.get();if(!snap.exists){await ref.set(defaultProfile(user,registrationData||{}),{merge:true})}
 unsubscribeSnapshot=ref.onSnapshot(d=>{if(auth.currentUser?.uid!==user.uid)return;if(d.exists){status.profile=normalizeProfile(user,d.data());status.phase='ready';status.error='';registrationDraft=null;announce()}},err=>{status.phase='error';status.error=errorText(err);announce()})
 }catch(e){status.phase='error';status.error=errorText(e);announce()}
 },err=>{status.phase='error';status.error=errorText(err);announce()});
 }catch(e){status.phase='error';status.error=errorText(e);announce()}}
async function signIn(email,password){if(!auth)throw Error(status.error||'Firebase ist nicht bereit.');await auth.signInWithEmailAndPassword(String(email).trim(),String(password))}
async function register({email,password,name,avatar,color,skyjoBoardFavorite}){if(!auth)throw Error(status.error||'Firebase ist nicht bereit.');const n=cleanName(name);if(!n)throw Error('Bitte einen Spielernamen eingeben.');registrationDraft={name:n,avatar,color,skyjoBoardFavorite:validBoard(skyjoBoardFavorite)};try{const credential=await auth.createUserWithEmailAndPassword(String(email).trim(),String(password));await credential.user.updateProfile({displayName:n})}catch(e){registrationDraft=null;throw e}}
async function signOut(){if(!auth)throw Error('Firebase ist nicht bereit.');await auth.signOut()}
async function resetPassword(email){if(!auth)throw Error('Firebase ist nicht bereit.');await auth.sendPasswordResetEmail(String(email).trim())}
async function update(changes){if(!auth?.currentUser||status.phase!=='ready')throw Error('Bitte melde dich zuerst an.');const data=sanitize(changes);if(!Object.keys(data).length)return status.profile;await db.collection('playerProfiles').doc(auth.currentUser.uid).set({...data,updatedAt:Date.now()},{merge:true});status.profile={...status.profile,...data};announce();return status.profile}
function active(){return status.phase==='ready'?status.profile:null}
function current(){return {...status}}
function registerLaunch(url){const key=String(url||'').toLowerCase();const game=key.includes('skyjo')?'skyjo':key.includes('kreuzkunter')?'kreuz':key.includes('barikade')?'barikade':key.includes('business')?'business':null;if(!game||!auth?.currentUser||status.phase!=='ready')return;db.collection('playerProfiles').doc(auth.currentUser.uid).set({visits:{[game]:window.firebase.firestore.FieldValue.increment(1)},updatedAt:Date.now()},{merge:true}).catch(console.warn)}
window.SpielProfile={active,current,onChange,update,signIn,register,signOut,resetPassword,COLORS,BOARD_VALUES,escapeHTML,avatarCSS,registerLaunch,errorText,ready:()=>status.phase==='ready'};
function setupIndex(){const head=document.querySelector('.page-head');if(!head)return;head.style.position='relative';const container=document.createElement('div');container.className='sp-index-wrap';head.appendChild(container);
 const style=document.createElement('style');style.textContent='.sp-index-wrap{position:absolute;right:10px;top:10px;z-index:25}.sp-firebase-link{display:flex;align-items:center;gap:9px;text-decoration:none;color:white;background:#132b46;border:1px solid #6c91ad;border-radius:999px;padding:7px 14px;font-weight:750;max-width:240px;box-shadow:0 8px 20px #0005}.sp-firebase-avatar{width:30px;height:30px;flex:0 0 30px;border-radius:50%;background-color:#315d86}.sp-firebase-name{overflow:hidden;white-space:nowrap;text-overflow:ellipsis}';document.head.appendChild(style);
 function redraw(){const p=active();container.innerHTML=`<a class="sp-firebase-link" href="profile.html" aria-label="${p?'Profil bearbeiten':'Mit E-Mail anmelden'}"><span class="sp-firebase-avatar" ${p?`style="${avatarCSS(p.avatar)}"`:''}></span><span class="sp-firebase-name">${p?escapeHTML(p.name):'👤 Anmelden'}</span></a>`}
 onChange(redraw);document.querySelectorAll('.game-grid a[href]').forEach(a=>a.addEventListener('click',()=>registerLaunch(a.getAttribute('href'))))}
function initGame(){const path=location.pathname.toLowerCase();function sync(){const p=active();if(!p)return;let sel=[];if(path.includes('skyjo'))sel=['#onlineName','#aiHumanName','#names input.pname'];else if(path.includes('kreuzkunter'))sel=['#name0','#net-name'];else if(path.includes('business'))sel=['#name0','#boCustomName'];for(const s of sel){const el=document.querySelector(s);if(el&&!el.dataset.profilePreset&&(!el.value||/^(Spieler\s*1|Gast)$/i.test(el.value.trim()))){el.value=p.name;el.dataset.profilePreset='1';el.dispatchEvent(new Event('input',{bubbles:true}))}}}
 onChange(sync);const observer=new MutationObserver(sync);observer.observe(document.body,{childList:true,subtree:true});setTimeout(()=>observer.disconnect(),20000)}
function start(){const path=location.pathname.toLowerCase();if(document.querySelector('.page-head')&&document.querySelector('.game-grid'))setupIndex();else if(/\/(Skyjo|Barikade|KreuzKunter|Business)\//i.test(path))initGame()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();init();
})();
