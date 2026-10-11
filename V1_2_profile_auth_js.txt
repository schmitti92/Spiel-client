/* Spieleportal Online-Profile V1: Firebase Auth + Render profile API.
   Online scores are intentionally NOT accepted from a browser. */
(function(){
'use strict';
const config=window.SPIELPORTAL_CONFIG||{};
const firebaseConfig=config.firebase||{};
const BASE=String(config.apiBase||'https://serverfinal-ynbe.onrender.com').replace(/\/+$/,'');
const configured=['apiKey','authDomain','projectId','appId'].every(key=>typeof firebaseConfig[key]==='string'&&firebaseConfig[key].length>5);
const current={status:configured?'initializing':'unconfigured',user:null,profile:null,error:'',message:'',configured};
let api=null,auth=null,saveQueue=Promise.resolve(),revision=0,authGeneration=0;
function state(){return current;}
function emit(){
  window.dispatchEvent(new CustomEvent('spielonline-change'));
  renderAccountPanel();
}
function setStatus(status,error=''){current.status=status;current.error=error;current.message='';emit();}
function humanError(err){
 const code=String(err?.code||err?.message||err||'');
 if(code.includes('auth/email-already-in-use'))return 'Diese E-Mail wird bereits verwendet.';
 if(code.includes('auth/invalid-email'))return 'Bitte eine gültige E-Mail eingeben.';
 if(code.includes('auth/weak-password'))return 'Das Passwort muss mindestens 6 Zeichen haben.';
 if(code.includes('auth/invalid-credential')||code.includes('auth/wrong-password'))return 'E-Mail oder Passwort stimmt nicht.';
 if(code.includes('auth/unauthorized-domain'))return 'Diese Domain ist in Firebase noch nicht zugelassen.';
 if(code.includes('auth/operation-not-allowed'))return 'Diese Anmeldemethode ist in Firebase noch nicht aktiviert.';
 if(code.includes('DATABASE_UNAVAILABLE')||code.includes('FIREBASE_NOT_CONFIGURED'))return 'Render hat noch keine funktionierende Firebase-Admin-Konfiguration.';
 if(code.includes('PROFILE_CONFLICT'))return 'Das Profil wurde auf einem anderen Gerät geändert. Bitte erneut laden.';
 if(code.includes('auth/too-many-requests'))return 'Zu viele Anmeldeversuche. Bitte später erneut versuchen.';
 if(code.includes('AbortError'))return 'Der Server antwortet momentan nicht. Bitte später erneut versuchen.';
 if(code.includes('Failed to fetch')||code.includes('NetworkError'))return 'Keine Verbindung zum Profilserver. Bitte später erneut versuchen.';
 return code.slice(0,190)||'Unbekannter Fehler';
}
function localSelectedProfile(){return window.SpielProfile?.localActive?.()||null;}
async function request(path,method='GET',body=null){
 if(!current.user)throw Error('LOGIN_REQUIRED');
 const token=await current.user.getIdToken();
 const ctrl=new AbortController();
 // The free Render instance may require 50+ seconds after sleeping.
 const timer=setTimeout(()=>ctrl.abort(),90000);
 try{
  const response=await fetch(`${BASE}/api/profile/${path}`,{method,mode:'cors',cache:'no-store',headers:{Authorization:`Bearer ${token}`, ...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined,signal:ctrl.signal});
  let data;try{data=await response.json();}catch{throw Error(`Serverantwort ${response.status} ungültig`);}
  if(!response.ok||!data.ok){const err=new Error(data.error||`HTTP_${response.status}`);err.status=response.status;err.profile=data.profile;throw err;}
  return data.profile;
 }finally{clearTimeout(timer);}
}
async function refresh(){
 if(!current.user)return null;
 const generation=authGeneration;
 setStatus('loading');
 try{
  const profile=await request('me');
  if(generation!==authGeneration)return null;
  current.profile=profile;revision=Number(profile.revision)||1;
  setStatus('online');return profile;
 }catch(err){
  if(generation!==authGeneration)return null;
  current.profile=null;setStatus('error',humanError(err));throw err;
 }
}
function prefsOf(p){return {name:String(p.name||''),color:p.color,favorite:p.favorite,avatar:Number(p.avatar),edited:!!p.edited};}
function saveProfile(optimistic){
 if(current.status!=='online'||!current.user||!current.profile)return Promise.reject(Error('Online-Profil nicht bereit'));
 const requestedUid=current.user.uid;
 const payload=prefsOf(optimistic);
 // Serializing edits prevents stale revisions and updates overtaking one another.
 saveQueue=saveQueue.catch(()=>{}).then(async()=>{
  if(!current.user||current.user.uid!==requestedUid)throw Error('Konto wurde gewechselt');
  const result=await request('me','PUT',{...payload,expectedRevision:revision});
  if(current.user?.uid!==requestedUid)return;
  revision=result.revision;
  if(current.profile){current.profile.revision=result.revision;current.profile.updated=result.updated;}
  emit();
 }).catch(async err=>{
  if(current.user?.uid===requestedUid){
    setStatus('error',humanError(err));
    try{await refresh();}catch{}
    // Keep the failure visible even if refresh succeeded.
    current.error=humanError(err);emit();
  }
  throw err;
 });
 return saveQueue;
}
async function importLocal(){
 if(current.status!=='online')throw Error('Bitte zuerst online anmelden.');
 const p=localSelectedProfile();
 if(!p)throw Error('Kein lokales Profil gefunden.');
 if(!confirm(`Lokales Profil „${p.name}“ einmalig in dieses Online-Konto übernehmen? Die lokalen Daten bleiben als Backup erhalten. Bisherige Siege werden nicht übertragen.`))return;
 const profile=await request('import-local','POST',prefsOf(p));
 current.profile=profile;revision=profile.revision;
 setStatus('online');return profile;
}
async function loginEmail(email,password){if(!api||!auth)throw Error('Firebase ist noch nicht eingerichtet.');return api.signInWithEmailAndPassword(auth,email,password);}
async function registerEmail(email,password){if(!api||!auth)throw Error('Firebase ist noch nicht eingerichtet.');return api.createUserWithEmailAndPassword(auth,email,password);}
async function logout(){if(!auth)throw Error('Keine Anmeldung vorhanden');await api.signOut(auth);}
async function resetPassword(email){if(!api||!auth)throw Error('Firebase ist noch nicht eingerichtet.');await api.sendPasswordResetEmail(auth,email);}
function renderAccountPanel(){
 const root=document.getElementById('online-account-panel');if(!root)return;
 const badge=root.querySelector('[data-online-status]'),details=root.querySelector('[data-online-detail]');
 const signed=!!current.user;
 const display={unconfigured:'⚙️ Einrichtung erforderlich',initializing:'⏳ Firebase wird geladen',loading:'⏳ Profil wird synchronisiert',online:'✅ Online verbunden',error:'⚠️ Synchronisierung fehlgeschlagen',local:'🔒 Lokal spielen'};
 badge.textContent=display[current.status]||'🔒 Lokal spielen';
 details.textContent=current.error||current.message||(current.status==='unconfigured'?'Für die Online-Anmeldung fehlen noch die öffentlichen Firebase-Web-App-Daten in profile-config.js. Deine lokalen Profile funktionieren weiterhin.':signed?`Angemeldet: ${current.user.email||current.user.displayName||'Spielerkonto'} · Deine Online-Einstellungen werden mit Firebase gespeichert.`:'Ohne Anmeldung bleiben deine Profile lokal auf diesem Gerät.');
 root.querySelector('[data-online-signed]').hidden=!signed;
 root.querySelector('[data-online-guest]').hidden=signed;
 const importBtn=root.querySelector('[data-online-import]');
 importBtn.hidden=!(current.status==='online'&&current.profile?.revision===1&&!current.profile?.importedLocal);
 root.querySelectorAll('button[data-online-action]').forEach(b=>b.disabled=current.status==='initializing'||current.status==='loading'||(current.status==='unconfigured'&&b.dataset.onlineAction!=='none'));
}
function installPanel(){
 const root=document.getElementById('online-account-panel');if(!root)return;
 root.addEventListener('submit',async ev=>{
  if(!ev.target.matches('[data-online-email-form]'))return;
  ev.preventDefault();
  const form=ev.target;const email=form.querySelector('[name="email"]').value.trim();const password=form.querySelector('[name="password"]').value;
  const action=ev.submitter?.dataset?.onlineAction||'login';
  const btns=Array.from(form.querySelectorAll('button'));btns.forEach(b=>b.disabled=true);
  try{if(action==='register')await registerEmail(email,password);else await loginEmail(email,password);form.querySelector('[name="password"]').value='';}
  catch(err){setStatus('error',humanError(err));}
  finally{btns.forEach(b=>b.disabled=false);}
 });
 root.addEventListener('click',async ev=>{
  const b=ev.target.closest('[data-online-action]');if(!b||b.disabled)return;
  // Formularbuttons müssen ihren normalen Submit auslösen; nicht vorher deaktivieren.
  if(b.closest('[data-online-email-form]'))return;
  b.disabled=true;
  try{
   if(b.dataset.onlineAction==='logout')await logout();
   else if(b.dataset.onlineAction==='reset'){
    const email=root.querySelector('[data-online-email-form] [name="email"]')?.value.trim();
    if(!email)throw Error('Bitte zuerst die E-Mail-Adresse eingeben.');
    await resetPassword(email);
    setStatus('local');
    current.message='Wenn die Adresse registriert ist, erhältst du eine E-Mail zum Zurücksetzen des Passworts.';emit();
   }
   else if(b.dataset.onlineAction==='import')await importLocal();
   else if(b.dataset.onlineAction==='retry')await refresh();
  }catch(err){setStatus('error',humanError(err));}
  finally{b.disabled=false;renderAccountPanel();}
 });
 renderAccountPanel();
}
window.SpielOnline={state,refresh,saveProfile,importLocal,loginEmail,registerEmail,logout,resetPassword};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',installPanel);else installPanel();
(async function initialize(){
 if(!configured){emit();return;}
 try{
  const [appModule,authModule]=await Promise.all([
   import('https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js'),
   import('https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js')
  ]);
  api=authModule;
  const application=appModule.initializeApp(firebaseConfig,'spielportal-profile-v1');
  auth=authModule.getAuth(application);
  authModule.onAuthStateChanged(auth,async user=>{
   ++authGeneration;
   const changedUid=current.user?.uid!==user?.uid;
   current.user=user;current.profile=null;revision=0;
   if(changedUid)saveQueue=Promise.resolve();
   if(user){try{await refresh();}catch{}}
   else setStatus('local');
  },err=>setStatus('error',humanError(err)));
 }catch(err){setStatus('error',humanError(err));}
})();
})();
