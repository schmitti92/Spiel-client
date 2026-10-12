/* Spielerportal – Firebase Authentication + ausschließlich Render-gesteuerte Profildaten.
 * Firebase Web SDK dient NUR zur Authentifizierung. Der Browser liest/schreibt
 * KEINE Profildokumente direkt in Firestore. Render ist die einzige Daten-API.
 * Kein localStorage-Profil, keine clientseitig bestätigten Siege oder Statistiken.
 */
(function(){
'use strict';
const COLORS=['#328cff','#ff5268','#20b986','#ffc741','#9261ec','#f281af'];
const GAME_NAMES={skyjo:'SKYJO Action',kreuz:'KreuzKunter',barikade:'Barikade',business:'Das große Business'};
const BOARD_VALUES=['standard','comic','christlich'];
const SDK_VERSION='10.12.5';
const BASE=String(window.SPIELPORTAL_CONFIG?.apiBase||'https://serverfinal-ynbe.onrender.com').replace(/\/+$/,'');
const status={phase:'loading',error:'',user:null,profile:null};
let auth=null,sdkPromise=null,registrationDraft=null,authGeneration=0,revision=0,updating=false;
const subscribers=new Set();
function escapeHTML(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function cleanName(v){return String(v||'').replace(/[<>\r\n]/g,'').replace(/\s+/g,' ').trim().slice(0,24);}
function errorText(e){
 const code=String(e?.code||e?.message||e||'');
 const errors={'auth/invalid-email':'Ungültige E-Mail-Adresse.','auth/invalid-credential':'E-Mail-Adresse oder Passwort ist falsch.','auth/wrong-password':'E-Mail-Adresse oder Passwort ist falsch.','auth/email-already-in-use':'Diese E-Mail-Adresse ist bereits registriert.','auth/weak-password':'Das Passwort muss mindestens 6 Zeichen lang sein.','auth/network-request-failed':'Netzwerkverbindung fehlgeschlagen.',
 'LOGIN_REQUIRED':'Bitte erneut anmelden.','TOKEN_INVALID':'Die Anmeldung ist abgelaufen. Bitte erneut anmelden.','PROFILE_FIREBASE_PROJECT_MISMATCH':'Firebase-Projekt von Render und Spielerportal stimmt nicht überein.','FIREBASE_NOT_CONFIGURED':'Firebase Admin ist auf Render nicht bereit.','DATABASE_UNAVAILABLE':'Der Profil-Datenspeicher auf Render ist gerade nicht erreichbar.','PROFILE_READ_FAILED':'Render konnte das Spielerprofil nicht laden.','PROFILE_WRITE_FAILED':'Render konnte die Profiländerung nicht speichern.','PROFILE_SETUP_FAILED':'Render konnte die Registrierung nicht abschließen.','PROFILE_CONFLICT':'Dein Profil wurde an anderer Stelle geändert. Bitte erneut versuchen.','SETUP_REQUIRED':'Bitte die Profilregistrierung abschließen.','INVALID_PROFILE':'Bitte Spielername, Farbe und Profilbild prüfen.','RATE_LIMIT':'Zu viele Änderungen. Versuche es in einer Minute erneut.'};
 return errors[code]||String(e?.message||e||'Unbekannter Fehler');
}
function announce(){try{window.dispatchEvent(new CustomEvent('spielprofil-change',{detail:{phase:status.phase,uid:status.user?.uid||null}}));}catch(_e){}for(const cb of subscribers)try{cb({...status});}catch(_e){}}
function onChange(cb){subscribers.add(cb);try{cb({...status});}catch(_e){}return ()=>subscribers.delete(cb);}
function avatarCSS(idx){idx=Math.max(0,Math.min(7,Number(idx)||0));const prefix=/\/(Skyjo|Barikade|Business|KreuzKunter)\//i.test(location.pathname)?'../':'';return "background-image:url('"+prefix+"profile-avatars.webp');background-size:400% 200%;background-position:"+(idx%4)*100/3+"% "+Math.floor(idx/4)*100+"%";}
function firebaseConfig(){return window.SPIELPORTAL_FIREBASE_CONFIG||window.SPIELPORTAL_CONFIG?.firebase||null;}
function configured(){const c=firebaseConfig();return !!(c&&c.apiKey&&c.authDomain&&c.projectId&&!String(c.apiKey).includes('HIER_'));}
function sdkScript(src){return new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=src;s.async=true;s.onload=resolve;s.onerror=()=>reject(new Error('Firebase Authentication konnte nicht geladen werden.'));document.head.appendChild(s);});}
async function loadSdk(){if(window.firebase?.auth&&window.firebase?.initializeApp)return;if(!sdkPromise)sdkPromise=(async()=>{const root='https://www.gstatic.com/firebasejs/'+SDK_VERSION+'/';if(!window.firebase?.initializeApp)await sdkScript(root+'firebase-app-compat.js');if(!window.firebase?.auth)await sdkScript(root+'firebase-auth-compat.js');})();return sdkPromise;}
function normalize(raw){
 const p=raw||{};
 return {...p,id:p.uid,name:cleanName(p.name)||'Spieler',color:COLORS.includes(p.color)?p.color:COLORS[0],favorite:GAME_NAMES[p.favorite]?p.favorite:'skyjo',avatar:Number.isInteger(p.avatar)&&p.avatar>=0&&p.avatar<=7?p.avatar:0,skyjoBoardFavorite:BOARD_VALUES.includes(p.skyjoBoardFavorite)?p.skyjoBoardFavorite:'standard'};
}
async function apiRequest(method,path,body,user){
 const who=user||auth?.currentUser;
 if(!who)throw Object.assign(new Error('LOGIN_REQUIRED'),{code:'LOGIN_REQUIRED'});
 const token=await who.getIdToken();
 const response=await fetch(BASE+path,{method,mode:'cors',cache:'no-store',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)})});
 const data=await response.json().catch(()=>({}));
 if(!response.ok||data.ok===false){const code=data.error||'HTTP_'+response.status;const err=new Error(code);err.code=code;err.details=data;throw err;}
 return data;
}
async function loadProfile(user,generation){
 try{
  let data=await apiRequest('GET','/api/profile/me',undefined,user);
  if(authGeneration!==generation||auth?.currentUser?.uid!==user.uid)return;
  if(data.profile?.setupComplete===false&&registrationDraft){
   try{
    data=await apiRequest('POST','/api/profile/complete',{name:registrationDraft.name,color:registrationDraft.color,avatar:registrationDraft.avatar,favorite:registrationDraft.favorite||'skyjo',skyjoBoardFavorite:registrationDraft.skyjoBoardFavorite||'standard',edited:true,avatarImage:null},user);
   }catch(e){
    if(e.code!=='ALREADY_COMPLETE')throw e;
    data=await apiRequest('GET','/api/profile/me',undefined,user);
   }
  }
  if(authGeneration!==generation||auth?.currentUser?.uid!==user.uid)return;
  const profile=normalize(data.profile);
  revision=Number(profile.revision)||0;
  status.profile=profile;status.error='';
  if(data.profile?.setupComplete===false){status.phase='needs_setup';}
  else{status.phase='ready';registrationDraft=null;}
  announce();
 }catch(e){
  if(authGeneration!==generation||auth?.currentUser?.uid!==user.uid)return;
  status.error=errorText(e);status.phase='error';announce();
 }
}
async function onAuthChanged(user){
 const generation=++authGeneration;
 status.user=user||null;status.profile=null;status.error='';revision=0;
 if(!user){registrationDraft=null;status.phase='signed_out';announce();return;}
 status.phase='loading_profile';announce();
 await loadProfile(user,generation);
}
async function init(){
 if(!configured()){status.phase='unconfigured';status.error='Firebase-Webkonfiguration fehlt.';announce();return;}
 try{
  await loadSdk();
  const name='spielportal-profile-v2',cfg=firebaseConfig();
  const app=window.firebase.apps?.find(a=>a.name===name)||window.firebase.initializeApp(cfg,name);
  auth=window.firebase.auth(app);
  await auth.setPersistence(window.firebase.auth.Auth.Persistence.SESSION);
  auth.onAuthStateChanged(onAuthChanged,e=>{status.phase='error';status.error=errorText(e);announce();});
 }catch(e){status.phase='error';status.error=errorText(e);announce();}
}
async function signIn(email,password){if(!auth)throw Error(status.error||'Firebase ist nicht bereit.');await auth.signInWithEmailAndPassword(String(email).trim(),String(password));}
async function register({email,password,name,avatar,color,skyjoBoardFavorite}){
 if(!auth)throw Error(status.error||'Firebase ist nicht bereit.');
 const n=cleanName(name);if(n.length<2)throw Error('Der Spielername muss mindestens zwei Zeichen lang sein.');
 registrationDraft={name:n,avatar:Number.isInteger(avatar)&&avatar>=0&&avatar<=7?avatar:0,color:COLORS.includes(color)?color:COLORS[0],favorite:'skyjo',skyjoBoardFavorite:BOARD_VALUES.includes(skyjoBoardFavorite)?skyjoBoardFavorite:'standard'};
 try{const credential=await auth.createUserWithEmailAndPassword(String(email).trim(),String(password));await credential.user.updateProfile({displayName:n});}
 catch(e){registrationDraft=null;throw e;}
}
async function completeRegistration(changes){
 if(!auth?.currentUser)throw Error('Bitte zuerst anmelden.');
 const name=cleanName(changes?.name);
 if(name.length<2)throw Error('Spielername muss mindestens zwei Zeichen haben.');
 const data=await apiRequest('POST','/api/profile/complete',{name,color:COLORS.includes(changes.color)?changes.color:COLORS[0],avatar:Number(changes.avatar)||0,favorite:GAME_NAMES[changes.favorite]?changes.favorite:'skyjo',skyjoBoardFavorite:BOARD_VALUES.includes(changes.skyjoBoardFavorite)?changes.skyjoBoardFavorite:'standard',edited:true,avatarImage:null});
 status.profile=normalize(data.profile);revision=Number(data.profile.revision)||0;status.phase='ready';status.error='';registrationDraft=null;announce();
}
async function signOut(){if(!auth)throw Error('Firebase ist nicht bereit.');registrationDraft=null;await auth.signOut();}
async function resetPassword(email){if(!auth)throw Error('Firebase ist nicht bereit.');await auth.sendPasswordResetEmail(String(email).trim());}
async function update(changes){
 if(updating)throw Error('Eine Änderung wird gerade gespeichert.');
 if(!auth?.currentUser||status.phase!=='ready')throw Error('Bitte melde dich zuerst an.');
 const old=status.profile||{};
 const next={...old,...changes};
 next.name=cleanName(next.name);
 if(next.name.length<2)throw Error('Der Spielername muss mindestens zwei Zeichen lang sein.');
 if(!COLORS.includes(next.color)||!GAME_NAMES[next.favorite]||!Number.isInteger(Number(next.avatar))||Number(next.avatar)<0||Number(next.avatar)>7||!BOARD_VALUES.includes(next.skyjoBoardFavorite))throw Error('Ungültige Profilangaben.');
 updating=true;
 try{
  const payload={name:next.name,color:next.color,favorite:next.favorite,avatar:Number(next.avatar),edited:changes.name!==undefined||!!old.edited,skyjoBoardFavorite:next.skyjoBoardFavorite,expectedRevision:revision};
  const response=await apiRequest('PUT','/api/profile/me',payload);
  status.profile=normalize(response.profile);revision=Number(response.profile.revision)||revision+1;status.error='';announce();
  return status.profile;
 }catch(e){
  if(e.code==='PROFILE_CONFLICT'){await loadProfile(auth.currentUser,authGeneration);}
  throw e;
 }finally{updating=false;}
}
function active(){return status.phase==='ready'?status.profile:null;}
function current(){return {...status};}
function retry(){if(auth?.currentUser){status.phase='loading_profile';status.error='';announce();return loadProfile(auth.currentUser,authGeneration);}return init();}
function registerLaunch(_url){/* Keine clientseitigen Profilzähler. Nur bestätigte Serverereignisse zählen. */}
window.SpielProfile={active,current,onChange,update,signIn,register,completeRegistration,signOut,resetPassword,retry,COLORS,BOARD_VALUES,escapeHTML,avatarCSS,registerLaunch,errorText,ready:()=>status.phase==='ready'};

function setupIndex(){const head=document.querySelector('.page-head');if(!head)return;head.style.position='relative';const container=document.createElement('div');container.className='sp-index-wrap';head.appendChild(container);
 const style=document.createElement('style');style.textContent='.sp-index-wrap{position:absolute;right:10px;top:10px;z-index:25}.sp-firebase-link{display:flex;align-items:center;gap:9px;text-decoration:none;color:white;background:#132b46;border:1px solid #6c91ad;border-radius:999px;padding:7px 14px;font-weight:750;max-width:240px;box-shadow:0 8px 20px #0005}.sp-firebase-avatar{width:30px;height:30px;flex:0 0 30px;border-radius:50%;background-color:#315d86}.sp-firebase-name{overflow:hidden;white-space:nowrap;text-overflow:ellipsis}';document.head.appendChild(style);
 function redraw(){const p=active();container.innerHTML=`<a class="sp-firebase-link" href="profile.html" aria-label="${p?'Profil bearbeiten':'Mit E-Mail anmelden'}"><span class="sp-firebase-avatar" ${p?`style="${avatarCSS(p.avatar)}"`:''}></span><span class="sp-firebase-name">${p?escapeHTML(p.name):'👤 Anmelden'}</span></a>`}
 onChange(redraw);document.querySelectorAll('.game-grid a[href]').forEach(a=>a.addEventListener('click',()=>registerLaunch(a.getAttribute('href'))))}
function initGame(){const path=location.pathname.toLowerCase();function sync(){const p=active();if(!p)return;let sel=[];if(path.includes('skyjo'))sel=['#onlineName','#aiHumanName','#names input.pname'];else if(path.includes('kreuzkunter'))sel=['#name0','#net-name'];else if(path.includes('business'))sel=['#name0','#boCustomName'];for(const s of sel){const el=document.querySelector(s);if(el&&!el.dataset.profilePreset&&(!el.value||/^(Spieler\s*1|Gast)$/i.test(el.value.trim()))){el.value=p.name;el.dataset.profilePreset='1';el.dispatchEvent(new Event('input',{bubbles:true}))}}}
 onChange(sync);const observer=new MutationObserver(sync);observer.observe(document.body,{childList:true,subtree:true});setTimeout(()=>observer.disconnect(),20000)}
function start(){const path=location.pathname.toLowerCase();if(document.querySelector('.page-head')&&document.querySelector('.game-grid'))setupIndex();else if(/\/(Skyjo|Barikade|KreuzKunter|Business)\//i.test(path))initGame()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();init();
})();
